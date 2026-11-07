package replay

import (
	"math"
	"sort"
)

// ultimatePointWrite is one replicated current ultimate point count.
type ultimatePointWrite struct {
	TimeMS   uint32
	PacketID uint32
	Actor    uint32
	Points   int
}

// ultimateActiveWrite is one replicated ultimate-active flag transition.
type ultimateActiveWrite struct {
	TimeMS   uint32
	PacketID uint32
	Actor    uint32
	Active   bool
}

// ultimateSample is a point or active event resolved to a player subject. The
// two field streams are merged later so one wire timeline carries both values.
type ultimateSample struct {
	Subject  string
	TimeMS   uint32
	PacketID uint32
	Kind     uint8 // 0 = points, 1 = active
	Points   int
	Active   bool
}

const (
	ultimateKindPoints uint8 = iota
	ultimateKindActive
)

// cooldownWriteKind orders rows that arrive in the same packet so a duration is
// applied before the active flag that starts the window.
type cooldownWriteKind uint8

const (
	cooldownKindSeconds cooldownWriteKind = iota
	cooldownKindActive
)

// cooldownWrite is one replicated signature-cooldown member.
type cooldownWrite struct {
	TimeMS   uint32
	PacketID uint32
	Actor    uint32
	Kind     cooldownWriteKind
	Seconds  float64
	Active   bool
}

// cooldownWindow is a resolved cooldown interval for one player and slot.
type cooldownWindow struct {
	Subject  string
	Slot     string
	Folder   string
	Recharge bool
	StartMS  uint32
	EndMS    uint32
	// RefillMS is when the charge actually refilled, if observed. It is used
	// only to suppress a projected recharge in a later round that starts after
	// the refill.
	RefillMS uint32
}

// buildUltimateSamples resolves ultimate point and active rows to subjects.
func buildUltimateSamples(
	points []ultimatePointWrite,
	active []ultimateActiveWrite,
	index *playerIndex,
) ([]ultimateSample, int) {
	if index == nil || (len(points) == 0 && len(active) == 0) {
		return nil, 0
	}

	samples := make([]ultimateSample, 0, len(points)+len(active))
	unresolved := 0
	for _, write := range points {
		subject, ok := index.subjectForActor(write.Actor)
		if !ok {
			unresolved++
			continue
		}
		samples = append(samples, ultimateSample{
			Subject:  subject,
			TimeMS:   write.TimeMS,
			PacketID: write.PacketID,
			Kind:     ultimateKindPoints,
			Points:   write.Points,
		})
	}
	for _, write := range active {
		subject, ok := index.subjectForActor(write.Actor)
		if !ok {
			unresolved++
			continue
		}
		samples = append(samples, ultimateSample{
			Subject:  subject,
			TimeMS:   write.TimeMS,
			PacketID: write.PacketID,
			Kind:     ultimateKindActive,
			Active:   write.Active,
		})
	}

	sort.SliceStable(samples, func(i, j int) bool {
		a, b := samples[i], samples[j]
		if a.Subject != b.Subject {
			return a.Subject < b.Subject
		}
		if a.TimeMS != b.TimeMS {
			return a.TimeMS < b.TimeMS
		}
		if a.PacketID != b.PacketID {
			return a.PacketID < b.PacketID
		}
		return a.Kind < b.Kind
	})
	return samples, unresolved
}

// ultimatePointsForRound merges point and active events into one round-relative
// timeline. A write before the round start seeds the round at time 0; ultimate
// points persist between rounds, so the seed matters.
//
// A player whose points never changed has no write at all, so time 0 is seeded
// with zero. Without it the UI would fall back to "available" for players who
// simply had not earned a point yet.
func ultimatePointsForRound(
	samples []ultimateSample,
	subject string,
	window *roundWindow,
) []UltimatePoint {
	if len(samples) == 0 {
		return nil
	}

	points := 0
	active := false
	bucket := make(map[int]UltimatePoint)
	bucket[0] = UltimatePoint{TimeMS: 0, Points: 0}
	for _, sample := range samples {
		if sample.Subject != subject || sample.TimeMS > window.EndMS {
			continue
		}
		switch sample.Kind {
		case ultimateKindPoints:
			points = sample.Points
		case ultimateKindActive:
			active = sample.Active
		}

		relative := 0
		if sample.TimeMS >= window.StartMS {
			relative = roundRelative(sample.TimeMS, window)
		}
		bucket[relative] = UltimatePoint{
			TimeMS: relative,
			Points: points,
			Active: active,
		}
	}

	times := make([]int, 0, len(bucket))
	for timeMS := range bucket {
		times = append(times, timeMS)
	}
	sort.Ints(times)
	result := make([]UltimatePoint, 0, len(times))
	for _, timeMS := range times {
		result = append(result, bucket[timeMS])
	}
	return result
}

// buildCooldownWindows resolves signature-cooldown rows into absolute intervals.
// The replication time is used as the window start because StartTimeStamp is on
// a game clock that does not share the replay's time base.
func buildCooldownWindows(
	writes []cooldownWrite,
	index *playerIndex,
	actors *stateActorView,
	owners map[uint32][]stateWrite,
	instigators map[uint32][]stateWrite,
) ([]cooldownWindow, int, int) {
	if index == nil || actors == nil || len(writes) == 0 {
		return nil, 0, 0
	}

	byActor := make(map[uint32][]cooldownWrite)
	for _, write := range writes {
		byActor[write.Actor] = append(byActor[write.Actor], write)
	}
	actorIDs := make([]uint32, 0, len(byActor))
	for actor := range byActor {
		actorIDs = append(actorIDs, actor)
	}
	sort.Slice(actorIDs, func(i, j int) bool { return actorIDs[i] < actorIDs[j] })

	windows := make([]cooldownWindow, 0, len(actorIDs))
	seen := make(map[cooldownWindow]struct{})
	unresolved, unknownSlot := 0, 0
	for _, actor := range actorIDs {
		folder, ok := abilityClassFolder(actors.ClassByActor[actor])
		if !ok {
			unknownSlot++
			continue
		}
		slot, ok := abilitySlotForClass(actors.ClassByActor[actor])
		if !ok {
			unknownSlot++
			continue
		}

		rows := byActor[actor]
		sort.SliceStable(rows, func(i, j int) bool {
			if rows[i].TimeMS != rows[j].TimeMS {
				return rows[i].TimeMS < rows[j].TimeMS
			}
			if rows[i].PacketID != rows[j].PacketID {
				return rows[i].PacketID < rows[j].PacketID
			}
			return rows[i].Kind < rows[j].Kind
		})

		seconds := 0.0
		open := false
		openSeconds := 0.0
		var start uint32
		var subject string
		emit := func(end uint32) {
			if end <= start || subject == "" {
				return
			}
			window := cooldownWindow{
				Subject: subject, Slot: slot, Folder: folder,
				StartMS: start, EndMS: end,
			}
			if _, exists := seen[window]; exists {
				return
			}
			seen[window] = struct{}{}
			windows = append(windows, window)
		}

		for _, row := range rows {
			switch row.Kind {
			case cooldownKindSeconds:
				if row.Seconds > 0 {
					seconds = row.Seconds
				}
			case cooldownKindActive:
				if row.Active {
					if open {
						end := start + cooldownDurationMS(openSeconds)
						if row.TimeMS < end {
							end = row.TimeMS
						}
						emit(end)
					}
					resolved, ok := resolveAbilityChargeOwner(
						actor, row.TimeMS, owners, instigators, index,
					)
					if !ok {
						unresolved++
						open = false
						continue
					}
					subject = resolved
					start = row.TimeMS
					openSeconds = seconds
					open = true
					continue
				}
				if open {
					end := start + cooldownDurationMS(openSeconds)
					if row.TimeMS < end {
						end = row.TimeMS
					}
					emit(end)
					open = false
				}
			}
		}
		if open {
			emit(start + cooldownDurationMS(openSeconds))
		}
	}

	sort.SliceStable(windows, func(i, j int) bool {
		a, b := windows[i], windows[j]
		if a.Subject != b.Subject {
			return a.Subject < b.Subject
		}
		if a.Slot != b.Slot {
			return a.Slot < b.Slot
		}
		return a.StartMS < b.StartMS
	})
	return windows, unresolved, unknownSlot
}

func cooldownDurationMS(seconds float64) uint32 {
	if seconds <= 0 {
		return 0
	}
	milliseconds := math.Round(seconds * 1000)
	if milliseconds > math.MaxUint32 {
		return math.MaxUint32
	}
	return uint32(milliseconds)
}

// cooldownWindowsForRound clips leading and trailing parts of each interval to
// the round and returns slot-keyed, round-relative windows. When slots carries
// a learned folder -> wire slot mapping, unmapped folders are omitted.
func cooldownWindowsForRound(
	windows []cooldownWindow,
	subject string,
	round *roundWindow,
	slots map[string]string,
) map[string][]CooldownWindow {
	result := make(map[string][]CooldownWindow)
	seen := make(map[CooldownWindow]struct{})
	for _, window := range windows {
		if window.Subject != subject || window.EndMS <= round.StartMS ||
			window.StartMS >= round.EndMS {
			continue
		}
		// A projected recharge must not leak into a round that started after
		// the charge actually refilled.
		if window.Recharge && window.StartMS < round.StartMS &&
			window.RefillMS != 0 && window.RefillMS <= round.StartMS {
			continue
		}
		slot := window.Slot
		if len(slots) > 0 {
			mapped, ok := slots[window.Folder]
			if !ok {
				continue
			}
			slot = mapped
		}
		start := window.StartMS
		if start < round.StartMS {
			start = round.StartMS
		}
		end := window.EndMS
		var startRelative, endRelative int
		if window.Recharge {
			// A recharge can outlive the round; keep its true end so the
			// countdown does not hit zero at the round boundary.
			startRelative = roundRelative(start, round)
			if end <= round.StartMS {
				continue
			}
			endRelative = int(end - round.StartMS)
		} else {
			if end > round.EndMS {
				end = round.EndMS
			}
			if start >= end {
				continue
			}
			startRelative = roundRelative(start, round)
			endRelative = roundRelative(end, round)
		}
		point := CooldownWindow{
			StartTimeMS: startRelative,
			EndTimeMS:   endRelative,
			Recharge:    window.Recharge,
		}
		if point.EndTimeMS <= point.StartTimeMS {
			continue
		}
		if _, exists := seen[point]; exists {
			continue
		}
		seen[point] = struct{}{}
		result[slot] = append(result[slot], point)
	}
	for slot := range result {
		sort.Slice(result[slot], func(i, j int) bool {
			return result[slot][i].StartTimeMS < result[slot][j].StartTimeMS
		})
	}
	if len(result) == 0 {
		return nil
	}
	return result
}
