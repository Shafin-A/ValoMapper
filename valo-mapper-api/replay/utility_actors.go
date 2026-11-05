package replay

import (
	"math"
	"sort"
	"strings"
)

func readUtilityActors(exportDir string) (map[uint32]*utilityActor, error) {
	actors := make(map[uint32]*utilityActor)
	_, err := readParquetRows(exportDir+"/actors.parquet", func(rows []stateActorRow) error {
		for i := range rows {
			row := &rows[i]
			actor := actors[row.ActorNetGUID]
			if actor == nil {
				actor = &utilityActor{GUID: row.ActorNetGUID}
				actors[row.ActorNetGUID] = actor
			}
			event := utilityActorEvent{
				TimeMS:   row.TimeMS,
				PacketID: row.PacketID,
				Event:    row.Event,
			}
			if row.ClassPath != nil {
				event.ClassPath = *row.ClassPath
				if event.ClassPath != "" {
					actor.Class = event.ClassPath
				}
			}
			if row.SpawnX != nil && row.SpawnY != nil {
				event.Spawn = &Position{
					X: float64(*row.SpawnX),
					Y: float64(*row.SpawnY),
				}
			}
			if row.SpawnYaw != nil && isFinite32(*row.SpawnYaw) {
				yaw := *row.SpawnYaw
				event.SpawnYaw = &yaw
			}
			actor.Events = append(actor.Events, event)
		}
		return nil
	})
	return actors, err
}

func buildUtilityActorLives(
	actor *utilityActor,
	entry utilityCatalogEntry,
	durationMS uint32,
) ([]utilityActorLife, int, int) {
	events := append([]utilityActorEvent(nil), actor.Events...)
	sort.SliceStable(events, func(i, j int) bool {
		if events[i].TimeMS != events[j].TimeMS {
			return events[i].TimeMS < events[j].TimeMS
		}
		if events[i].PacketID != events[j].PacketID {
			return events[i].PacketID < events[j].PacketID
		}
		if events[i].Event != events[j].Event {
			return events[i].Event == "close"
		}
		return false
	})

	var result []utilityActorLife
	var current *utilityActorLife
	ordinal, invalid, missingClose := 0, 0, 0
	startLife := func(event utilityActorEvent) {
		if current != nil || event.TimeMS >= durationMS {
			invalid++
			return
		}
		ordinal++
		class := event.ClassPath
		if class == "" {
			class = actor.Class
		}
		resolved, ok := utilityCatalog[classBasename(class)]
		if !ok {
			resolved = entry
		}
		current = &utilityActorLife{
			guid:    actor.GUID,
			ordinal: ordinal,
			class:   resolved,
			openMS:  event.TimeMS,
			closeMS: durationMS,
		}
		if event.Spawn != nil {
			current.position = *event.Spawn
		}
		if event.SpawnYaw != nil {
			current.yaw = float64(*event.SpawnYaw)
			current.hasYaw = true
		}
	}
	closeLife := func(event utilityActorEvent) {
		if current == nil {
			invalid++
			return
		}
		if event.TimeMS <= current.openMS {
			invalid++
			current = nil
			return
		}
		current.closeMS = minUint32(event.TimeMS, durationMS)
		result = append(result, *current)
		current = nil
	}
	for i := 0; i < len(events); {
		j := i + 1
		for j < len(events) && events[j].TimeMS == events[i].TimeMS &&
			events[j].PacketID == events[i].PacketID {
			j++
		}
		var opens, closes []utilityActorEvent
		for _, event := range events[i:j] {
			switch event.Event {
			case "open":
				opens = append(opens, event)
			case "close":
				closes = append(closes, event)
			case "dormant", "wake":
				// These are state transitions inside the same actor life.
			}
		}
		if current != nil {
			for _, event := range closes {
				closeLife(event)
			}
			for _, event := range opens {
				startLife(event)
			}
		} else {
			for _, event := range opens {
				startLife(event)
			}
			for _, event := range closes {
				closeLife(event)
			}
		}
		i = j
	}
	if current != nil {
		missingClose++
		result = append(result, *current)
	}
	return result, invalid, missingClose
}

func utilityOwnerField(name string) string {
	leaf := strings.TrimSpace(name)
	if dot := strings.LastIndex(leaf, "."); dot >= 0 {
		leaf = leaf[dot+1:]
	}
	switch strings.ToLower(leaf) {
	case "owner":
		return "owner"
	case "instigator":
		return "instigator"
	case "controller":
		return "controller"
	case "attachparent":
		return "attachparent"
	default:
		return ""
	}
}

func sortUtilityOwnerWrites(writes map[uint32][]utilityOwnerWrite) {
	for guid := range writes {
		sort.SliceStable(writes[guid], func(i, j int) bool {
			if writes[guid][i].TimeMS != writes[guid][j].TimeMS {
				return writes[guid][i].TimeMS < writes[guid][j].TimeMS
			}
			return writes[guid][i].PacketID < writes[guid][j].PacketID
		})
	}
}

func utilityOwnerGUIDAt(
	actor uint32,
	at uint32,
	writes map[uint32][]utilityOwnerWrite,
) (uint32, bool) {
	var owner uint32
	found := false
	for _, write := range writes[actor] {
		if write.TimeMS > at {
			break
		}
		if write.Owner != nil {
			owner = *write.Owner
			found = true
		}
	}
	return owner, found
}

func resolveUtilityOwner(
	actor uint32,
	at uint32,
	writes map[uint32][]utilityOwnerWrite,
	index *playerIndex,
	outer map[uint32]uint32,
	puuidBySubject map[string]string,
) (string, bool, bool) {
	if index == nil {
		return "", false, false
	}
	type queuedGUID struct {
		guid  uint32
		depth int
	}
	queue := []queuedGUID{{guid: actor}}
	seen := make(map[uint32]struct{})
	owners := make(map[string]struct{})
	hadLink := false
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		if current.guid == 0 || current.depth > 8 {
			continue
		}
		if _, exists := seen[current.guid]; exists {
			continue
		}
		seen[current.guid] = struct{}{}
		if subject, ok := index.subjectForCharacter(current.guid); ok {
			if puuid := puuidBySubject[subject]; puuid != "" {
				owners[puuid] = struct{}{}
			}
		}
		if current.depth == 8 {
			continue
		}
		var owner, instigator *uint32
		for _, write := range writes[current.guid] {
			if write.TimeMS > at {
				break
			}
			if write.Owner != nil {
				target := *write.Owner
				owner = &target
			}
			if write.Instigator != nil {
				target := *write.Instigator
				instigator = &target
			}
		}
		if owner != nil {
			hadLink = true
			if *owner != 0 {
				queue = append(queue, queuedGUID{guid: *owner, depth: current.depth + 1})
			}
		}
		if instigator != nil {
			hadLink = true
			if *instigator != 0 {
				queue = append(queue, queuedGUID{guid: *instigator, depth: current.depth + 1})
			}
		}
		if parent := outer[current.guid]; parent != 0 {
			queue = append(queue, queuedGUID{guid: parent, depth: current.depth + 1})
		}
	}
	if len(owners) != 1 {
		return "", hadLink, false
	}
	for owner := range owners {
		return owner, hadLink, true
	}
	return "", hadLink, false
}

func pairCypherTrapwireEndpoints(
	lives []*utilityActorLife,
	writes map[uint32][]utilityOwnerWrite,
) {
	type ownerSpawn struct {
		timeMS uint32
		owner  uint32
	}
	mainBySpawn := make(map[ownerSpawn][]*utilityActorLife)
	farBySpawn := make(map[ownerSpawn][]*utilityActorLife)
	for _, life := range lives {
		if life.class.ability != "trapwire" {
			continue
		}
		owner, ok := utilityDirectOwnerAt(life.guid, life.openMS, writes)
		if !ok {
			continue
		}
		key := ownerSpawn{timeMS: life.openMS, owner: owner}
		if life.class.trapwireFarEnd {
			farBySpawn[key] = append(farBySpawn[key], life)
		} else {
			mainBySpawn[key] = append(mainBySpawn[key], life)
		}
	}

	for key, mainLives := range mainBySpawn {
		farLives := farBySpawn[key]
		if len(mainLives) != 1 || len(farLives) != 1 {
			continue
		}
		main, far := mainLives[0], farLives[0]
		dx := far.position.X - main.position.X
		dy := far.position.Y - main.position.Y
		lengthM := math.Hypot(dx, dy) / 100
		if lengthM <= 0 || !isFinite64(lengthM) {
			continue
		}
		main.yaw = math.Atan2(dy, dx) * 180 / math.Pi
		main.hasYaw = true
		main.lengthM = lengthM
	}
}

func utilityDirectOwnerAt(
	actor uint32,
	at uint32,
	writes map[uint32][]utilityOwnerWrite,
) (uint32, bool) {
	var owner uint32
	found := false
	for _, write := range writes[actor] {
		if write.TimeMS > at {
			break
		}
		if write.Owner == nil {
			continue
		}
		owner = *write.Owner
		found = owner != 0
	}
	return owner, found
}

func utilityAttachParentAt(
	actor uint32,
	at uint32,
	writes map[uint32][]utilityOwnerWrite,
) (uint32, bool) {
	var parent uint32
	found := false
	for _, write := range writes[actor] {
		if write.TimeMS > at {
			break
		}
		if write.AttachParent == nil {
			continue
		}
		parent = *write.AttachParent
		found = parent != 0
	}
	return parent, found
}

func utilityEventTime(
	writes []utilityDestroyWrite,
	startMS, endMS uint32,
	names ...string,
) (uint32, bool) {
	wanted := make(map[string]struct{}, len(names))
	for _, name := range names {
		wanted[name] = struct{}{}
	}
	for _, write := range writes {
		if _, ok := wanted[write.Name]; !ok {
			continue
		}
		if write.TimeMS >= startMS && write.TimeMS < endMS {
			return write.TimeMS, true
		}
	}
	return 0, false
}

func utilityControllerAt(writes []utilityOwnerWrite, at uint32) (bool, bool) {
	active, found := false, false
	for _, write := range writes {
		if write.TimeMS > at {
			break
		}
		if write.Controller == nil {
			continue
		}
		active = *write.Controller != 0
		found = true
	}
	return active, found
}

func hasActiveUtilityControllerWrite(writes []utilityOwnerWrite) bool {
	for _, write := range writes {
		if write.Controller != nil && *write.Controller != 0 {
			return true
		}
	}
	return false
}
