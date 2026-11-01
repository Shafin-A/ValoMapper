package replay

import (
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
)

const (
	maxUtilityWarnings   = 9999
	maxUtilityIntervals  = 5000
	maxUtilitySamples    = 256
	maxUtilityPathPoints = 256
)

type utilityCatalogEntry struct {
	kind     UtilityKind
	mobile   bool
	minBuild int
	ability  string
}

var utilityCatalog = map[string]utilityCatalogEntry{
	"Zone_Wraith_4_Smoke":                              {kind: UtilitySmoke, minBuild: 1300, ability: "dark_cover"},
	"GameObject_Smonk_NewSmoke":                        {kind: UtilitySmoke, minBuild: 1301, ability: "ruse"},
	"GameObject_Smonk_NewSmoke_PDS":                    {kind: UtilitySmoke, minBuild: 1301, ability: "ruse"},
	"GameObject_Wushu_4_SmokeZone":                     {kind: UtilitySmoke, minBuild: 1302, ability: "cloudburst"},
	"Patch_Phoenix_MolotovFire":                        {kind: UtilityMolly, minBuild: 1300, ability: "hot_hands"},
	"GameObject_Phoenix_Q_FlameWallManager_Production": {kind: UtilityWall, minBuild: 1300, ability: "blaze"},
	"GameObject_Deadeye_E_Trap":                        {kind: UtilityTrap, minBuild: 1302, ability: "trademark"},
	"Patch_Deadeye_E_Slow_Large":                       {kind: UtilityTrap, minBuild: 1308, ability: "trademark"},
	"GameObject_Thorne_E_Wall_Segment_Fortifying":      {kind: UtilityWall, minBuild: 1300, ability: "barrier_orb"},
	"Pawn_BountyHunter_4_WolfHound":                    {kind: UtilityMobile, mobile: true, minBuild: 1301, ability: "prowler"},
	"Pawn_Clay_E_Boomba":                               {kind: UtilityMobile, mobile: true, minBuild: 1301, ability: "boom_bot"},
}

type utilityActorEvent struct {
	TimeMS    uint32
	PacketID  uint32
	Event     string
	ClassPath string
	Spawn     *Position
}

type utilityActor struct {
	GUID   uint32
	Class  string
	Events []utilityActorEvent
}

type utilityActorLife struct {
	guid     uint32
	ordinal  int
	class    utilityCatalogEntry
	openMS   uint32
	closeMS  uint32
	position Position
	owner    string
}

type utilityOwnerWrite struct {
	TimeMS     uint32
	PacketID   uint32
	Owner      *uint32
	Instigator *uint32
}

type utilityPathWrite struct {
	TimeMS   uint32
	PacketID uint32
	Position Position
}

type utilitySegment struct {
	life       *utilityActorLife
	roundIndex int
	startMS    uint32
	endMS      uint32
	samples    []movementRow
	path       []utilityPathWrite
}

func scanUtilities(
	exportDir string,
	build string,
	durationMS uint32,
	windows []roundWindow,
	index *playerIndex,
	puuidBySubject map[string]string,
	outer map[uint32]uint32,
	ownerWrites map[uint32][]utilityOwnerWrite,
	pathWrites map[uint32][]utilityPathWrite,
) ([][]Utility, UtilityWarnings, error) {
	result := make([][]Utility, len(windows))
	warnings := UtilityWarnings{}
	buildNumber, ok := utilityBuildNumber(build)
	if !ok || buildNumber < 1300 || buildNumber > 1308 {
		warnings.UnsupportedBuild = 1
		return result, warnings, nil
	}

	actors, err := readUtilityActors(exportDir)
	if err != nil {
		return nil, warnings, err
	}

	var lives []*utilityActorLife
	for _, actor := range actors {
		entry, known := utilityCatalog[classBasename(actor.Class)]
		if !known || buildNumber < entry.minBuild {
			if isUtilityCandidate(actor.Class) {
				incrementUtilityWarning(&warnings.UnknownActors)
			}
			continue
		}

		actorLives, invalid, missingClose := buildUtilityActorLives(actor, entry, durationMS)
		if invalid > 0 {
			incrementUtilityWarning(&warnings.InvalidActors, invalid)
		}
		if missingClose > 0 {
			incrementUtilityWarning(&warnings.MissingCloses, missingClose)
		}
		for i := range actorLives {
			life := &actorLives[i]
			if !validUtilityPosition(life.position) {
				incrementUtilityWarning(&warnings.MissingPositions)
				continue
			}
			lives = append(lives, life)
		}
	}
	sort.Slice(lives, func(i, j int) bool {
		if lives[i].guid != lives[j].guid {
			return lives[i].guid < lives[j].guid
		}
		return lives[i].ordinal < lives[j].ordinal
	})

	for _, life := range lives {
		if owner, hadLink, resolved := resolveUtilityOwner(
			life.guid, life.openMS, ownerWrites, index, outer, puuidBySubject,
		); resolved {
			life.owner = owner
		} else if hadLink {
			incrementUtilityWarning(&warnings.UnresolvedOwners)
		}
	}

	segments := make([]utilitySegment, 0)
	for _, life := range lives {
		for roundIndex, window := range windows {
			start := maxUint32(life.openMS, window.StartMS)
			end := minUint32(life.closeMS, window.EndMS)
			if start >= end {
				continue
			}
			segments = append(segments, utilitySegment{
				life:       life,
				roundIndex: roundIndex,
				startMS:    start,
				endMS:      end,
			})
		}
	}

	sortUtilitySegments(segments)
	if len(segments) > maxUtilityIntervals {
		incrementUtilityWarning(&warnings.TruncatedUtilities, len(segments)-maxUtilityIntervals)
		segments = segments[:maxUtilityIntervals]
	}

	mobileGUIDs := make(map[uint32]struct{})
	for _, segment := range segments {
		if segment.life.class.mobile {
			mobileGUIDs[segment.life.guid] = struct{}{}
		}
	}
	movementByGUID := make(map[uint32][]movementRow, len(mobileGUIDs))
	if len(mobileGUIDs) > 0 {
		_, err = readParquetRows[movementRow](exportDir+"/movement.parquet", func(rows []movementRow) error {
			for i := range rows {
				row := rows[i]
				if _, wanted := mobileGUIDs[row.CharacterNetGUID]; !wanted ||
					!isFinite32(row.PosX) || !isFinite32(row.PosY) ||
					math.Abs(float64(row.PosX)) > 1_000_000 ||
					math.Abs(float64(row.PosY)) > 1_000_000 {
					continue
				}
				movementByGUID[row.CharacterNetGUID] = append(
					movementByGUID[row.CharacterNetGUID], row,
				)
			}
			return nil
		})
		if err != nil {
			return nil, warnings, err
		}
	}

	for i := range segments {
		segment := &segments[i]
		if segment.life.class.ability == "blaze" {
			for _, write := range pathWrites[segment.life.guid] {
				if write.TimeMS >= segment.startMS && write.TimeMS < segment.endMS &&
					write.TimeMS >= segment.life.openMS && write.TimeMS < segment.life.closeMS {
					segment.path = append(segment.path, write)
				}
			}
			sort.SliceStable(segment.path, func(i, j int) bool {
				if segment.path[i].TimeMS != segment.path[j].TimeMS {
					return segment.path[i].TimeMS < segment.path[j].TimeMS
				}
				return segment.path[i].PacketID < segment.path[j].PacketID
			})
		}
		if !segment.life.class.mobile {
			continue
		}
		for _, row := range movementByGUID[segment.life.guid] {
			if row.TimeMS >= segment.startMS && row.TimeMS < segment.endMS &&
				row.TimeMS >= segment.life.openMS && row.TimeMS < segment.life.closeMS {
				segment.samples = append(segment.samples, row)
			}
		}
		if len(segment.samples) == 0 && len(movementByGUID[segment.life.guid]) == 0 {
			incrementUtilityWarning(&warnings.MissingMovement)
		}
	}

	segments = filterUtilitySegments(segments)
	nextID := 0
	for _, segment := range segments {
		window := windows[segment.roundIndex]
		utility := Utility{
			ID:          fmt.Sprintf("utility-%04d", nextID+1),
			Kind:        segment.life.class.kind,
			AbilityID:   segment.life.class.ability,
			StartTimeMS: int(segment.startMS - window.StartMS),
			EndTimeMS:   int(segment.endMS - window.StartMS),
			Position:    segment.life.position,
			OwnerPuuid:  segment.life.owner,
		}
		if segment.life.class.ability == "blaze" {
			var truncated bool
			utility.Path, truncated = sampleUtilityPath(segment.path, window.StartMS)
			if truncated {
				incrementUtilityWarning(&warnings.TruncatedPaths)
			}
		}
		if segment.life.class.mobile {
			var truncated bool
			utility.Samples, truncated = sampleUtilityMovement(segment.samples, window.StartMS)
			if truncated {
				incrementUtilityWarning(&warnings.TruncatedSamples)
			}
			if len(utility.Samples) == 0 {
				continue
			}
		}
		nextID++
		result[segment.roundIndex] = append(result[segment.roundIndex], utility)
	}

	return result, warnings, nil
}

func sampleUtilityPath(writes []utilityPathWrite, roundStart uint32) ([]UtilityPositionSample, bool) {
	samples := make([]UtilityPositionSample, 0, minInt(len(writes), maxUtilityPathPoints))
	truncated := false
	for _, write := range writes {
		if len(samples) > 0 {
			last := samples[len(samples)-1]
			if last.X == write.Position.X && last.Y == write.Position.Y {
				continue
			}
		}
		if len(samples) == maxUtilityPathPoints {
			truncated = true
			break
		}
		samples = append(samples, UtilityPositionSample{
			TimeMS: int(write.TimeMS - roundStart),
			X:      write.Position.X,
			Y:      write.Position.Y,
		})
	}
	return samples, truncated
}

func readUtilityActors(exportDir string) (map[uint32]*utilityActor, error) {
	actors := make(map[uint32]*utilityActor)
	_, err := readParquetRows[stateActorRow](exportDir+"/actors.parquet", func(rows []stateActorRow) error {
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

func filterUtilitySegments(segments []utilitySegment) []utilitySegment {
	result := segments[:0]
	for _, segment := range segments {
		if segment.life.class.mobile && len(segment.samples) == 0 {
			continue
		}
		result = append(result, segment)
	}
	return result
}

func sortUtilitySegments(segments []utilitySegment) {
	sort.SliceStable(segments, func(i, j int) bool {
		if segments[i].startMS != segments[j].startMS {
			return segments[i].startMS < segments[j].startMS
		}
		if segments[i].life.guid != segments[j].life.guid {
			return segments[i].life.guid < segments[j].life.guid
		}
		if segments[i].life.ordinal != segments[j].life.ordinal {
			return segments[i].life.ordinal < segments[j].life.ordinal
		}
		return segments[i].roundIndex < segments[j].roundIndex
	})
}

func sampleUtilityMovement(rows []movementRow, roundStart uint32) ([]UtilityPositionSample, bool) {
	if len(rows) == 0 {
		return nil, false
	}
	sort.SliceStable(rows, func(i, j int) bool { return rows[i].TimeMS < rows[j].TimeMS })
	const sampleStepMS = uint32(100)
	sampled := make([]movementRow, 0, len(rows))
	var lastBin uint32
	for i, row := range rows {
		bin := row.TimeMS / sampleStepMS
		if i == 0 || bin != lastBin {
			sampled = append(sampled, row)
			lastBin = bin
		} else {
			sampled[len(sampled)-1] = row
		}
	}
	truncated := len(sampled) > maxUtilitySamples
	if truncated {
		reduced := make([]movementRow, maxUtilitySamples)
		for i := range reduced {
			index := i * (len(sampled) - 1) / (maxUtilitySamples - 1)
			reduced[i] = sampled[index]
		}
		sampled = reduced
	}
	result := make([]UtilityPositionSample, 0, len(sampled))
	for _, row := range sampled {
		result = append(result, UtilityPositionSample{
			TimeMS: int(row.TimeMS - roundStart),
			X:      float64(row.PosX),
			Y:      float64(row.PosY),
		})
	}
	return result, truncated
}

func utilityBuildNumber(build string) (int, bool) {
	parts := strings.Split(strings.TrimSpace(build), ".")
	if len(parts) != 2 {
		return 0, false
	}
	major, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, false
	}
	minor, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, false
	}
	return major*100 + minor, true
}

func classBasename(classPath string) string {
	path := classPath
	if slash := strings.LastIndexAny(path, "/\\"); slash >= 0 {
		path = path[slash+1:]
	}
	if dot := strings.Index(path, "."); dot >= 0 {
		path = path[:dot]
	}
	return path
}

func isUtilityCandidate(classPath string) bool {
	lower := strings.ToLower(classPath)
	for _, token := range []string{
		"smoke", "smok", "molly", "molotov", "flamewall", "wall_segment",
		"trap", "boomba", "wolfhound", "poisonorb",
	} {
		if strings.Contains(lower, token) {
			return true
		}
	}
	return false
}

func validUtilityPosition(position Position) bool {
	return !math.IsNaN(position.X) && !math.IsNaN(position.Y) &&
		!math.IsInf(position.X, 0) && !math.IsInf(position.Y, 0) &&
		math.Abs(position.X) <= 1_000_000 && math.Abs(position.Y) <= 1_000_000
}

func incrementUtilityWarning(counter *int, amounts ...int) {
	amount := 1
	if len(amounts) > 0 {
		amount = amounts[0]
	}
	*counter = minInt(maxUtilityWarnings, *counter+amount)
}

func minUint32(a, b uint32) uint32 {
	if a < b {
		return a
	}
	return b
}

func maxUint32(a, b uint32) uint32 {
	if a > b {
		return a
	}
	return b
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
