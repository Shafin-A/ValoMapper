package replay

import (
	"math"
	"sort"
	"strconv"
	"strings"
)

// rpcMatchWindowMS is how far a plant/defuse RPC detail may sit from the server
// event it belongs to. The two streams are not written in the same packet, so
// an exact timestamp match is never possible.
const rpcMatchWindowMS = 50

const eventGroupPrefix = "EReplayEventGroup::"

type rawKill struct {
	TimeMS uint32
	Killer *uint32
	Victim uint32
	Order  int
}

type rawSpike struct {
	TimeMS uint32
	Order  int
}

// eventScan is the single pass over events.parquet. Round starts feed the round
// windows; kills and spike events are attached to them after the windows exist.
type eventScan struct {
	Rows        int64
	Starts      []roundStartEvent
	Kills       []rawKill
	Plants      []rawSpike
	Defuses     []rawSpike
	Explodes    []rawSpike
	KnownGroups int
}

// scanEvents reads events.parquet. Unknown groups are counted and ignored: a
// newer build may add events the normaliser does not understand, which must not
// fail a replay that still has every round and kill.
func scanEvents(exportDir string) (*eventScan, error) {
	scan := &eventScan{}
	order := 0

	_, err := readParquetRows[eventRow](exportDir+"/events.parquet", func(rows []eventRow) error {
		for i := range rows {
			row := &rows[i]
			scan.Rows++
			group := normaliseEventGroup(row.Group)
			order++

			switch group {
			case "roundStarted":
				if row.Word0 == nil {
					continue
				}
				number := *row.Word0
				scan.Starts = append(scan.Starts, roundStartEvent{
					TimeMS: row.Time1,
					Number: &number,
				})
				scan.KnownGroups++
			case "characterDeath":
				if row.Word1 == nil {
					continue
				}
				kill := rawKill{
					TimeMS: row.Time1,
					Victim: *row.Word1,
					Order:  order,
				}
				if row.Word0 != nil && *row.Word0 != 0 {
					killer := *row.Word0
					kill.Killer = &killer
				}
				scan.Kills = append(scan.Kills, kill)
				scan.KnownGroups++
			case "spikePlanted":
				scan.Plants = append(scan.Plants, rawSpike{TimeMS: row.Time1, Order: order})
				scan.KnownGroups++
			case "spikeDefused":
				scan.Defuses = append(scan.Defuses, rawSpike{TimeMS: row.Time1, Order: order})
				scan.KnownGroups++
			case "spikeExploded":
				scan.Explodes = append(scan.Explodes, rawSpike{TimeMS: row.Time1, Order: order})
				scan.KnownGroups++
			case "switchTeams", "characterUltimateUsed":
				scan.KnownGroups++
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	sort.SliceStable(scan.Starts, func(i, j int) bool {
		return scan.Starts[i].TimeMS < scan.Starts[j].TimeMS
	})
	return scan, nil
}

func normaliseEventGroup(group string) string {
	trimmed := strings.TrimSpace(group)
	if index := strings.LastIndex(trimmed, "::"); index >= 0 {
		trimmed = trimmed[index+2:]
	}
	return trimmed
}

// roundLog is the per-round event log plus the stats derived from it.
type roundLog struct {
	Events []Event
	Stats  map[string]*PlayerStats
}

// buildRoundLogs attaches kills and spike events to their round windows. It is
// deliberately conservative: an event whose actor cannot be resolved is
// omitted with a warning rather than attributed to a guess.
func buildRoundLogs(
	windows []roundWindow,
	players []Player,
	index *playerIndex,
	events *eventScan,
	fields *fieldScan,
	warnings *warningList,
) map[int]*roundLog {
	logs := make(map[int]*roundLog, len(windows))
	for i := range windows {
		stats := make(map[string]*PlayerStats, len(players))
		for _, player := range players {
			stats[player.Puuid] = &PlayerStats{
				Puuid:        player.Puuid,
				AbilityCasts: map[string]int{},
			}
		}
		logs[windows[i].RoundNumber] = &roundLog{Stats: stats}
	}

	for _, kill := range events.Kills {
		windowIndex, ok := roundIndexAt(windows, kill.TimeMS)
		if !ok {
			continue
		}
		window := &windows[windowIndex]

		victimSubject, ok := index.subjectForCharacter(kill.Victim)
		if !ok {
			warnings.add("A kill's victim could not be identified; the kill was omitted.")
			continue
		}
		victimPuuid := pseudonymousID(victimSubject)

		killerPuuid := ""
		if kill.Killer != nil {
			killerSubject, ok := index.subjectForCharacter(*kill.Killer)
			if !ok {
				warnings.add("A kill's killer could not be identified; the kill was omitted.")
				continue
			}
			killerPuuid = pseudonymousID(killerSubject)
		}

		event := Event{
			EventType:                 "kill",
			TimeSinceRoundStartMillis: roundRelative(kill.TimeMS, window),
			KillerPuuid:               killerPuuid,
			VictimPuuid:               victimPuuid,
		}

		log := logs[window.RoundNumber]
		if log == nil {
			continue
		}
		log.Events = append(log.Events, event)
		if stats := log.Stats[victimPuuid]; stats != nil {
			stats.Deaths++
		}
		if killerPuuid != "" {
			if stats := log.Stats[killerPuuid]; stats != nil {
				stats.Kills++
			}
		}
	}

	for _, plant := range events.Plants {
		windowIndex, ok := roundIndexAt(windows, plant.TimeMS)
		if !ok {
			continue
		}
		window := &windows[windowIndex]

		planterPuuid := ""
		if write, ok := nearestRPC(fields.Planters, plant.TimeMS); ok {
			if guid, err := strconv.ParseUint(write.Value, 10, 32); err == nil {
				if subject, ok := index.subjectForCharacter(uint32(guid)); ok {
					planterPuuid = pseudonymousID(subject)
				}
			}
		}
		if planterPuuid == "" {
			warnings.add("A spike plant's planter could not be identified; the plant was omitted.")
			continue
		}

		event := Event{
			EventType:                 "spike_planted",
			TimeSinceRoundStartMillis: roundRelative(plant.TimeMS, window),
			PlanterPuuid:              planterPuuid,
		}
		if write, ok := nearestRPC(fields.PlantLocations, plant.TimeMS); ok {
			if position, ok := parseWorldPosition(write.Value); ok {
				event.PlantLocation = &position
			} else {
				warnings.add("A spike plant position could not be decoded; it was omitted.")
			}
		}

		if log := logs[window.RoundNumber]; log != nil {
			log.Events = append(log.Events, event)
		}
	}

	for _, defuse := range events.Defuses {
		windowIndex, ok := roundIndexAt(windows, defuse.TimeMS)
		if !ok {
			continue
		}
		window := &windows[windowIndex]

		defuserPuuid := ""
		if write, ok := nearestRPC(fields.Defusers, defuse.TimeMS); ok {
			if guid, err := strconv.ParseUint(write.Value, 10, 32); err == nil {
				if subject, ok := index.subjectForCharacter(uint32(guid)); ok {
					defuserPuuid = pseudonymousID(subject)
				}
			}
		}
		if defuserPuuid == "" {
			warnings.add("A spike defuse's defuser could not be identified; the defuse was omitted.")
			continue
		}

		event := Event{
			EventType:                 "spike_defused",
			TimeSinceRoundStartMillis: roundRelative(defuse.TimeMS, window),
			DefuserPuuid:              defuserPuuid,
		}
		if log := logs[window.RoundNumber]; log != nil {
			log.Events = append(log.Events, event)
		}
	}

	for _, explode := range events.Explodes {
		windowIndex, ok := roundIndexAt(windows, explode.TimeMS)
		if !ok {
			continue
		}
		window := &windows[windowIndex]
		event := Event{
			EventType:                 "spike_exploded",
			TimeSinceRoundStartMillis: roundRelative(explode.TimeMS, window),
		}
		if log := logs[window.RoundNumber]; log != nil {
			log.Events = append(log.Events, event)
		}
	}

	for _, log := range logs {
		if len(log.Events) < 2 {
			continue
		}
		sort.SliceStable(log.Events, func(i, j int) bool {
			return log.Events[i].TimeSinceRoundStartMillis < log.Events[j].TimeSinceRoundStartMillis
		})
	}

	return logs
}

// roundIndexAt returns the window containing a global timestamp. Windows are
// sorted by start and never overlap.
func roundIndexAt(windows []roundWindow, timeMS uint32) (int, bool) {
	index := sort.Search(len(windows), func(i int) bool {
		return windows[i].StartMS > timeMS
	}) - 1
	if index < 0 {
		return 0, false
	}
	if timeMS > windows[index].EndMS {
		return 0, false
	}
	return index, true
}

func roundRelative(timeMS uint32, window *roundWindow) int {
	if timeMS <= window.StartMS {
		return 0
	}
	duration := window.EndMS - window.StartMS
	relative := timeMS - window.StartMS
	if relative > duration {
		return int(duration)
	}
	return int(relative)
}

// nearestRPC picks the write closest to the event time, breaking ties by the
// earlier write. A write outside the match window is not used.
func nearestRPC(writes []rpcWrite, timeMS uint32) (rpcWrite, bool) {
	best := rpcWrite{}
	bestDelta := uint32(rpcMatchWindowMS + 1)
	for _, write := range writes {
		delta := absDiff(write.TimeMS, timeMS)
		if delta > rpcMatchWindowMS {
			continue
		}
		if delta < bestDelta || (delta == bestDelta && write.TimeMS < best.TimeMS) {
			best = write
			bestDelta = delta
		}
	}
	if bestDelta > rpcMatchWindowMS {
		return rpcWrite{}, false
	}
	return best, true
}

// parseWorldPosition decodes VRF's rendered vector, for example "(1234.5,678.0,12.0)".
func parseWorldPosition(value string) (Position, bool) {
	trimmed := strings.TrimSpace(value)
	trimmed = strings.TrimPrefix(trimmed, "(")
	trimmed = strings.TrimSuffix(trimmed, ")")
	parts := strings.Split(trimmed, ",")
	if len(parts) < 2 {
		return Position{}, false
	}
	x, err := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
	if err != nil || math.IsNaN(x) || math.IsInf(x, 0) {
		return Position{}, false
	}
	y, err := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
	if err != nil || math.IsNaN(y) || math.IsInf(y, 0) {
		return Position{}, false
	}
	return Position{X: x, Y: y}, true
}
