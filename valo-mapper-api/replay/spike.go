package replay

import (
	"sort"
	"strconv"
	"strings"
)

const (
	// spikePoseGapMS is how stale a carrier pose may be before the spike is
	// hidden instead of snapped to it.
	spikePoseGapMS = 500

	bombEquippableClass = "BombEquippable"
)

// spikeCustodySpan is one round-relative custody interval. An empty Subject
// means the spike was loose or the write could not be resolved, so the frame
// carries no spike.
type spikeCustodySpan struct {
	StartMS uint32
	Subject string
}

// spikeRound is everything needed to place the spike inside one round.
type spikeRound struct {
	Custody []spikeCustodySpan

	PlantMS     uint32
	HasPlant    bool
	Site        string
	Position    Position
	HasPosition bool

	DefusedMS     uint32
	HasDefuse     bool
	DetonatedMS   uint32
	HasDetonation bool
}

// spikeTimeline is the per-round spike state plus the counters logged with the
// parse.
type spikeTimeline struct {
	Rounds []spikeRound

	Actors       int
	OwnerWrites  int
	LooseSpans   int
	Ties         int
	Unresolved   int
	Plants       int
	SiteWarnings int
	MissingSpots int
	// OutOfRound counts spike events that did not land inside any round window.
	// They are kept out of playback rather than stretched into a neighbour.
	OutOfRound int
}

// buildSpikeTimeline turns the bomb equippable's ownership history and the
// plant/defuse/detonation events into per-round custody and plant state. It
// never guesses: a tie or an unresolved owner becomes a hidden span.
func buildSpikeTimeline(
	fields *fieldScan,
	state *stateScan,
	index *playerIndex,
	windows []roundWindow,
	events *eventScan,
	warnings *warningList,
) *spikeTimeline {
	timeline := &spikeTimeline{Rounds: make([]spikeRound, len(windows))}
	if state == nil || state.Actors == nil || len(windows) == 0 {
		return timeline
	}

	writesByActor := make(map[uint32][]stateWrite)
	for _, write := range fields.State.OwnerWrites {
		writesByActor[write.Actor] = append(writesByActor[write.Actor], write)
	}
	instigatorByActor := make(map[uint32][]stateWrite)
	for _, write := range fields.State.InstigatorWrites {
		instigatorByActor[write.Actor] = append(instigatorByActor[write.Actor], write)
	}
	for actor := range instigatorByActor {
		sort.Slice(instigatorByActor[actor], func(i, j int) bool {
			return stateWriteLess(instigatorByActor[actor][i], instigatorByActor[actor][j])
		})
	}

	roundWrites := make([][]stateWrite, len(windows))
	for actor, class := range state.Actors.ClassByActor {
		if !strings.Contains(class, bombEquippableClass) {
			continue
		}
		timeline.Actors++

		writes := writesByActor[actor]
		openMS, hasOpen := windowStart(state.Actors, actor)
		closeMS, hasClose := windowClose(state.Actors, actor)
		roundIndex, ok := bombActorRound(openMS, hasOpen, closeMS, hasClose, windows, events)
		if !ok {
			continue
		}
		roundWrites[roundIndex] = append(roundWrites[roundIndex], writes...)
	}

	for roundIndex := range windows {
		writes := roundWrites[roundIndex]
		if len(writes) == 0 {
			continue
		}
		sort.SliceStable(writes, func(i, j int) bool {
			return stateWriteLess(writes[i], writes[j])
		})
		timeline.OwnerWrites += len(writes)
		timeline.Rounds[roundIndex].Custody = buildCustodySpans(
			writes, state, index, &windows[roundIndex], instigatorByActor, timeline, warnings,
		)
	}

	buildSpikePlants(fields, state, windows, events, timeline, warnings)
	return timeline
}

func windowStart(actors *stateActorView, actor uint32) (uint32, bool) {
	moment, ok := actors.OpenByActor[actor]
	return moment.TimeMS, ok
}

func windowClose(actors *stateActorView, actor uint32) (uint32, bool) {
	moment, ok := actors.CloseByActor[actor]
	return moment.TimeMS, ok
}

// stateWriteLess orders writes by time, then packet, then actor so a round
// built from several bomb actors is deterministic.
func stateWriteLess(a, b stateWrite) bool {
	if a.TimeMS != b.TimeMS {
		return a.TimeMS < b.TimeMS
	}
	if a.PacketID != b.PacketID {
		return a.PacketID < b.PacketID
	}
	return a.Actor < b.Actor
}

func bombActorRound(
	openMS uint32,
	hasOpen bool,
	closeMS uint32,
	hasClose bool,
	windows []roundWindow,
	events *eventScan,
) (int, bool) {
	if hasOpen {
		if roundIndex, ok := roundIndexAt(windows, openMS); ok {
			return roundIndex, true
		}
	}
	if hasOpen && hasClose {
		for _, plant := range events.Plants {
			if plant.TimeMS < openMS || plant.TimeMS > closeMS {
				continue
			}
			if roundIndex, ok := roundIndexAt(windows, plant.TimeMS); ok {
				return roundIndex, true
			}
		}
	}
	return 0, false
}

func buildCustodySpans(
	writes []stateWrite,
	state *stateScan,
	index *playerIndex,
	window *roundWindow,
	instigatorByActor map[uint32][]stateWrite,
	timeline *spikeTimeline,
	warnings *warningList,
) []spikeCustodySpan {
	spans := make([]spikeCustodySpan, 0, len(writes))
	lastKind := ""

	for i := 0; i < len(writes); {
		j := i + 1
		owners := map[uint32]struct{}{uint32(writes[i].Value): {}}
		for j < len(writes) && writes[j].TimeMS == writes[i].TimeMS {
			owners[uint32(writes[j].Value)] = struct{}{}
			j++
		}

		start := spikeRelative(writes[i].TimeMS, window)
		kind := "unresolved"
		subject := ""

		switch {
		case len(owners) > 1:
			timeline.Ties++
			warnings.add("A spike custody write had more than one owner at the same instant; the spike was hidden for that instant.")
		case len(owners) == 1:
			var loose bool
			var resolved bool
			subject, loose, resolved = resolveSpikeOwner(uint32(writes[i].Value), state, index, instigatorByActor, writes[i].TimeMS)
			switch {
			case !resolved:
				timeline.Unresolved++
				warnings.add("Some spike custody writes could not be attributed to a player.")
			case loose:
				kind = "loose"
			default:
				kind = "carried"
			}
		}

		if kind == "loose" && lastKind != "loose" {
			timeline.LooseSpans++
		}
		lastKind = kind
		spans = appendSpikeSpan(spans, start, subject)
		i = j
	}

	return spans
}

func appendSpikeSpan(spans []spikeCustodySpan, start uint32, subject string) []spikeCustodySpan {
	if len(spans) > 0 {
		last := &spans[len(spans)-1]
		if last.StartMS == start {
			last.Subject = subject
			return spans
		}
		if last.Subject == subject {
			return spans
		}
	}
	return append(spans, spikeCustodySpan{StartMS: start, Subject: subject})
}

func spikeRelative(timeMS uint32, window *roundWindow) uint32 {
	if timeMS <= window.StartMS {
		return 0
	}
	return timeMS - window.StartMS
}

// resolveSpikeOwner maps an owner GUID to a player subject, a loose pickup, or
// an unresolved value. Pickup classes are loose even when their Instigator
// points at a player: the spike is on the ground.
func resolveSpikeOwner(
	guid uint32,
	state *stateScan,
	index *playerIndex,
	instigatorByActor map[uint32][]stateWrite,
	timeMS uint32,
) (subject string, loose bool, resolved bool) {
	current := guid
	visited := make(map[uint32]struct{})

	for depth := 0; depth < 8; depth++ {
		if _, seen := visited[current]; seen {
			return "", false, false
		}
		visited[current] = struct{}{}

		if subject, ok := index.subjectForCharacter(current); ok {
			return subject, false, true
		}
		class := state.Actors.ClassByActor[current]
		if isSpikePickupClass(class) {
			return "", true, true
		}
		if next, ok := spikeInstigator(current, timeMS, instigatorByActor); ok && next != 0 && next != current {
			current = next
			continue
		}
		if subject, ok := spikeOuterSubject(current, index, state.Outer); ok {
			return subject, false, true
		}
		return "", false, false
	}
	return "", false, false
}

func spikeInstigator(actor uint32, timeMS uint32, writes map[uint32][]stateWrite) (uint32, bool) {
	list := writes[actor]
	if len(list) == 0 {
		return 0, false
	}
	index := sort.Search(len(list), func(i int) bool { return list[i].TimeMS > timeMS }) - 1
	if index < 0 {
		return 0, false
	}
	return uint32(list[index].Value), true
}

func spikeOuterSubject(guid uint32, index *playerIndex, outer map[uint32]uint32) (string, bool) {
	current := guid
	for depth := 0; depth < 8; depth++ {
		if subject, ok := index.subjectForCharacter(current); ok {
			return subject, true
		}
		next, ok := outer[current]
		if !ok || next == 0 || next == current {
			break
		}
		current = next
	}
	return "", false
}

func isSpikePickupClass(class string) bool {
	return strings.Contains(class, "EquippableGroundPickup") ||
		strings.Contains(class, "EquippablePickupProjectile")
}

// buildSpikePlants resolves the site and position for every plant event.
func buildSpikePlants(
	fields *fieldScan,
	state *stateScan,
	windows []roundWindow,
	events *eventScan,
	timeline *spikeTimeline,
	warnings *warningList,
) {
	for _, plant := range events.Plants {
		roundIndex, ok := roundIndexAt(windows, plant.TimeMS)
		if !ok {
			timeline.OutOfRound++
			warnings.add("A spike event fell outside every round; it was not shown.")
			continue
		}
		round := &timeline.Rounds[roundIndex]
		if round.HasPlant {
			warnings.add("A round contained more than one spike plant; only the first was used.")
			continue
		}

		round.HasPlant = true
		round.PlantMS = spikeRelative(plant.TimeMS, &windows[roundIndex])
		timeline.Plants++

		fieldSite, hasFieldSite := nearestStateWrite(fields.State.PlantedAtSites, plant.TimeMS, rpcMatchWindowMS)
		rpcSite, hasRPCSite := nearestRPC(fields.PlantSitesRPC, plant.TimeMS)
		site, siteWarning := resolvePlantSite(fieldSite, hasFieldSite, rpcSite, hasRPCSite)
		if siteWarning {
			timeline.SiteWarnings++
			warnings.add("A spike plant site disagreed with the plant RPC; the plant-site value was used.")
		}
		if site == "" {
			warnings.add("A spike plant site used an unknown ordinal; the site was omitted.")
		}
		round.Site = site

		location, hasLocation := nearestRPC(fields.PlantLocations, plant.TimeMS)
		if !hasLocation {
			timeline.MissingSpots++
			warnings.add("A spike plant position could not be decoded; the planted spike was not shown.")
			continue
		}
		position, ok := parseWorldPosition(location.Value)
		if !ok {
			timeline.MissingSpots++
			warnings.add("A spike plant position could not be decoded; the planted spike was not shown.")
			continue
		}
		round.Position = position
		round.HasPosition = true
	}

	for _, defuse := range events.Defuses {
		roundIndex, ok := roundIndexAt(windows, defuse.TimeMS)
		if !ok {
			timeline.OutOfRound++
			warnings.add("A spike event fell outside every round; it was not shown.")
			continue
		}
		round := &timeline.Rounds[roundIndex]
		if !round.HasPlant || round.HasDefuse {
			continue
		}
		round.HasDefuse = true
		round.DefusedMS = spikeRelative(defuse.TimeMS, &windows[roundIndex])
	}

	for _, explode := range events.Explodes {
		roundIndex, ok := roundIndexAt(windows, explode.TimeMS)
		if !ok {
			timeline.OutOfRound++
			warnings.add("A spike event fell outside every round; it was not shown.")
			continue
		}
		round := &timeline.Rounds[roundIndex]
		if !round.HasPlant || round.HasDetonation {
			continue
		}
		round.HasDetonation = true
		round.DetonatedMS = spikeRelative(explode.TimeMS, &windows[roundIndex])
	}
}

func nearestStateWrite(writes []stateWrite, timeMS uint32, window uint32) (stateWrite, bool) {
	best := stateWrite{}
	bestDelta := window + 1
	for _, write := range writes {
		delta := absDiff(write.TimeMS, timeMS)
		if delta > window {
			continue
		}
		if delta < bestDelta || (delta == bestDelta && write.TimeMS < best.TimeMS) {
			best = write
			bestDelta = delta
		}
	}
	if bestDelta > window {
		return stateWrite{}, false
	}
	return best, true
}

// resolvePlantSite prefers TimedBomb.PlantedAtSite, falls back to the plant
// RPC when the field is missing, and treats both as absent = A. A present
// disagreement is reported so the caller can warn; the field still wins.
func resolvePlantSite(
	fieldSite stateWrite,
	hasFieldSite bool,
	rpcSite rpcWrite,
	hasRPCSite bool,
) (string, bool) {
	fieldName := ""
	if hasFieldSite {
		fieldName = siteName(fieldSite.Value)
	}
	rpcName := ""
	if hasRPCSite {
		if value, err := strconv.ParseInt(rpcSite.Value, 10, 64); err == nil {
			rpcName = siteName(value)
		}
	}

	switch {
	case fieldName != "" && rpcName != "" && fieldName != rpcName:
		return fieldName, true
	case fieldName != "":
		return fieldName, false
	case rpcName != "":
		return rpcName, false
	case hasFieldSite || hasRPCSite:
		// A site write exists but its ordinal is outside A/B/C. Do not guess.
		return "", false
	default:
		// The field is omitted when the site is A, so absence is a value.
		return "A", false
	}
}

func siteName(ordinal int64) string {
	switch ordinal {
	case 0:
		return "A"
	case 1:
		return "B"
	case 2:
		return "C"
	default:
		return ""
	}
}

// frameAt returns the spike state at one round-relative timestamp. poseAt
// supplies the carrier's current pose; a stale or missing pose hides the spike.
func (t *spikeTimeline) frameAt(
	roundIndex int,
	timeMS uint32,
	poseAt func(subject string, timeMS uint32) (Position, bool),
	puuidBySubject map[string]string,
) *SpikeFrame {
	if t == nil || roundIndex < 0 || roundIndex >= len(t.Rounds) {
		return nil
	}
	round := &t.Rounds[roundIndex]

	switch {
	case round.HasDetonation && timeMS >= round.DetonatedMS:
		return round.plantedFrame("detonated")
	case round.HasDefuse && timeMS >= round.DefusedMS:
		return round.plantedFrame("defused")
	case round.HasPlant && timeMS >= round.PlantMS:
		return round.plantedFrame("planted")
	}

	subject := round.custodyAt(timeMS)
	if subject == "" {
		return nil
	}
	position, ok := poseAt(subject, timeMS)
	if !ok {
		return nil
	}
	return &SpikeFrame{
		X:            position.X,
		Y:            position.Y,
		State:        "carried",
		CarrierPuuid: puuidBySubject[subject],
	}
}

func (r *spikeRound) custodyAt(timeMS uint32) string {
	if len(r.Custody) == 0 {
		return ""
	}
	index := sort.Search(len(r.Custody), func(i int) bool {
		return r.Custody[i].StartMS > timeMS
	}) - 1
	if index < 0 {
		return ""
	}
	return r.Custody[index].Subject
}

func (r *spikeRound) plantedFrame(state string) *SpikeFrame {
	if !r.HasPosition {
		return nil
	}
	return &SpikeFrame{
		X:     r.Position.X,
		Y:     r.Position.Y,
		State: state,
		Site:  r.Site,
	}
}
