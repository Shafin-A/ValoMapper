package replay

import (
	"math"
	"sort"
	"strconv"
	"strings"
)

// Ability slot values on the wire. Anything else is counted and skipped rather
// than mapped onto a guessed ability.
var castSlotNames = map[int64]string{
	3: "Grenade",
	4: "Ability1",
	5: "Ability2",
	9: "Ultimate",
}

// castSlotOrder keeps the emitted map stable for tests and diffing.
var castSlotOrder = []int64{3, 4, 5, 9}

// maxCastResidualMS is how close a cast without a round number must land to a
// buy-end-relative time before it is trusted. Replications of one cast can be
// seconds late, so a wider window would attach casts to the wrong round.
const maxCastResidualMS = 5000

// castKey groups the members of one AbilityCastsThisRound[i] element. The array
// is re-sent on later replications, so packet_id is part of the identity.
type castKey struct {
	Actor    uint32
	TimeMS   uint32
	PacketID uint32
	Index    int
}

// castElement is one accumulated cast entry. The booleans separate a real zero
// from a member that never arrived.
type castElement struct {
	Slot            int64
	HasSlot         bool
	Round           int64
	HasRound        bool
	CastTime        float64
	HasCastTime     bool
	Player          string
	CastLocation    Position
	HasCastLocation bool
	EffectTimes     []float64
}

// castIdentity is the dedupe key: one ability, cast once, at one offset into
// the round.
type castIdentity struct {
	Subject string
	Round   int
	Slot    int64
	CastMS  int64
}

// castSlotKey collapses a player's repeated casts of one ability in one round.
type castSlotKey struct {
	Subject string
	Round   int
	Slot    int64
}

type castResolution struct {
	Casts         map[castIdentity]uint32
	Locations     map[castIdentity]Position
	EffectTimes   map[castIdentity][]float64
	Skipped       int
	UnknownSlot   int
	Unresolved    int
	WithoutBuyEnd int
	BeforeBuyEnd  int
}

// parseCastChild splits "AbilityCastsThisRound[<i>].<Member>_<type>_<hash>" into
// its index and member. The type and hash suffixes are cut at the first
// underscore; nested effect members never match a known member and are ignored.
func parseCastChild(fieldName string) (index int, member string, ok bool) {
	const marker = "AbilityCastsThisRound["

	start := strings.Index(fieldName, marker)
	if start < 0 {
		return 0, "", false
	}
	rest := fieldName[start+len(marker):]
	close := strings.IndexByte(rest, ']')
	if close < 0 || len(rest) <= close+1 || rest[close+1] != '.' {
		return 0, "", false
	}
	index, err := strconv.Atoi(rest[:close])
	if err != nil {
		return 0, "", false
	}
	member = rest[close+2:]
	if cut := strings.IndexByte(member, '_'); cut >= 0 {
		member = member[:cut]
	}
	if member == "" {
		return 0, "", false
	}
	return index, member, true
}

func appendUniqueCastTime(times []float64, value float64) []float64 {
	for _, existing := range times {
		if math.Abs(existing-value) < 0.001 {
			return times
		}
	}
	return append(times, value)
}

// collectCastField folds one cast member row into the element it belongs to.
func (s *fieldScan) collectCastField(row *fieldRow, name string) {
	if !strings.Contains(row.GroupPath, "Comp_AbilityStatisticsReplicator") {
		return
	}
	index, member, ok := parseCastChild(name)
	if !ok {
		return
	}
	isEffectTime := strings.HasPrefix(member, "Effects[") &&
		strings.HasSuffix(member, ".Time")
	if !isEffectTime {
		switch member {
		case "Slot", "Round", "CastTime", "Player", "CastLocation":
		default:
			return
		}
	}

	key := castKey{
		Actor:    row.ActorNetGUID,
		TimeMS:   row.TimeMS,
		PacketID: row.PacketID,
		Index:    index,
	}
	element := s.State.Casts[key]
	if element == nil {
		element = &castElement{}
		s.State.Casts[key] = element
	}

	if isEffectTime {
		if row.ValueF64 != nil {
			element.EffectTimes = appendUniqueCastTime(element.EffectTimes, *row.ValueF64)
		}
		return
	}

	switch member {
	case "Slot":
		if row.ValueI64 != nil {
			element.Slot = *row.ValueI64
			element.HasSlot = true
		}
	case "Round":
		if row.ValueI64 != nil {
			element.Round = *row.ValueI64
			element.HasRound = true
		}
	case "CastTime":
		if row.ValueF64 != nil {
			element.CastTime = *row.ValueF64
			element.HasCastTime = true
		}
	case "Player":
		if row.ValueStr != nil {
			element.Player = normaliseUUID(*row.ValueStr)
		}
	case "CastLocation":
		if row.ValueStr != nil {
			if position, ok := parseWorldPosition(*row.ValueStr); ok {
				element.CastLocation = position
				element.HasCastLocation = true
			}
		}
	}
}

// resolveCasts turns the collected elements into one absolute timestamp per
// unique cast. Elements that carry a round number use that round's buy end;
// elements without one are matched to the round whose buy end best explains the
// replication time, within maxCastResidualMS.
func resolveCasts(windows []roundWindow, index *playerIndex, raw *fieldStateRows) castResolution {
	resolution := castResolution{
		Casts:       make(map[castIdentity]uint32),
		Locations:   make(map[castIdentity]Position),
		EffectTimes: make(map[castIdentity][]float64),
	}
	if raw == nil || len(raw.Casts) == 0 {
		return resolution
	}

	buyEnd := make(map[int]uint32, len(windows))
	exists := make(map[int]bool, len(windows))
	for i := range windows {
		round := windows[i].RoundNumber - 1
		exists[round] = true
		if windows[i].BuyEndMS != nil {
			buyEnd[round] = *windows[i].BuyEndMS
		}
	}

	keys := make([]castKey, 0, len(raw.Casts))
	for key := range raw.Casts {
		keys = append(keys, key)
	}
	sort.Slice(keys, func(i, j int) bool {
		a, b := &keys[i], &keys[j]
		if a.TimeMS != b.TimeMS {
			return a.TimeMS < b.TimeMS
		}
		if a.PacketID != b.PacketID {
			return a.PacketID < b.PacketID
		}
		if a.Index != b.Index {
			return a.Index < b.Index
		}
		return a.Actor < b.Actor
	})

	for _, key := range keys {
		element := raw.Casts[key]
		if element == nil || !element.HasSlot || !element.HasCastTime {
			continue
		}
		if _, known := castSlotNames[element.Slot]; !known {
			resolution.UnknownSlot++
			continue
		}

		castMS := int64(element.CastTime * 1000)
		if castMS < 0 {
			resolution.BeforeBuyEnd++
		}

		subject, ok := index.subjectForPawn(key.Actor)
		if !ok && element.Player != "" {
			if _, known := index.bySubject[element.Player]; known {
				subject, ok = element.Player, true
			}
		}
		if !ok {
			resolution.Unresolved++
			continue
		}

		var roundIndex int
		var abs uint32
		if element.HasRound {
			roundIndex = int(element.Round)
			if !exists[roundIndex] {
				resolution.Skipped++
				continue
			}
			if be, hasBuyEnd := buyEnd[roundIndex]; hasBuyEnd {
				candidate := int64(be) + castMS
				if candidate < 0 || candidate > math.MaxUint32 {
					resolution.Skipped++
					continue
				}
				abs = uint32(candidate)
			} else {
				// No buy phase for the round: the replication time is the only
				// clock available, so keep the cast with an approximate time.
				abs = key.TimeMS
				resolution.WithoutBuyEnd++
			}
		} else {
			matched, matchedAbs, found := nearestCastRound(windows, key.TimeMS, castMS)
			if !found {
				resolution.Skipped++
				continue
			}
			roundIndex = matched
			abs = matchedAbs
		}

		identity := castIdentity{
			Subject: subject,
			Round:   roundIndex,
			Slot:    element.Slot,
			CastMS:  castMS,
		}
		for _, effectTime := range element.EffectTimes {
			resolution.EffectTimes[identity] = appendUniqueCastTime(
				resolution.EffectTimes[identity], effectTime,
			)
		}
		if previous, exists := resolution.Casts[identity]; !exists || abs < previous {
			resolution.Casts[identity] = abs
			if element.HasCastLocation {
				resolution.Locations[identity] = element.CastLocation
			}
		}
	}

	return resolution
}

// nearestCastRound picks the round whose buy end plus the cast offset lands
// closest to the replication time. Rounds are visited in order so equal
// residuals always resolve to the earlier round.
func nearestCastRound(windows []roundWindow, timeMS uint32, castMS int64) (int, uint32, bool) {
	bestRound := -1
	var bestAbs uint32
	bestResidual := int64(maxCastResidualMS) + 1

	for i := range windows {
		if windows[i].BuyEndMS == nil {
			continue
		}
		candidate := int64(*windows[i].BuyEndMS) + castMS
		if candidate < 0 || candidate > math.MaxUint32 {
			continue
		}
		residual := int64(timeMS) - candidate
		if residual < 0 {
			residual = -residual
		}
		if residual < bestResidual {
			bestResidual = residual
			bestRound = windows[i].RoundNumber - 1
			bestAbs = uint32(candidate)
		}
	}

	if bestRound < 0 || bestResidual > maxCastResidualMS {
		return 0, 0, false
	}
	return bestRound, bestAbs, true
}

// applyRoundStats fills the per-round scoreboard stats from the state timelines
// and the resolved casts. It runs after the event logs exist and before the
// frames are built.
func applyRoundStats(
	windows []roundWindow,
	players []Player,
	index *playerIndex,
	puuidBySubject map[string]string,
	state *stateScan,
	raw *fieldStateRows,
	logs map[int]*roundLog,
	warnings *warningList,
) {
	if state == nil {
		return
	}

	applyPlantCreditBonuses(windows, players, puuidBySubject, state, logs)

	casts := resolveCasts(windows, index, raw)
	state.CastsUnique = len(casts.Casts)
	state.CastsSkipped = casts.Skipped
	state.CastsUnknownSlot = casts.UnknownSlot
	state.CastsUnresolved = casts.Unresolved
	state.CastsWithoutBuyEnd = casts.WithoutBuyEnd
	state.CastsBeforeBuyEnd = casts.BeforeBuyEnd
	if casts.WithoutBuyEnd > 0 && warnings != nil {
		warnings.add("An ability cast in a round without a resolved buy phase used its replication time.")
	}

	castTimesBySlot := make(map[castSlotKey][]uint32, len(casts.Casts))
	castTimesBySubjectSlot := make(map[string]map[int64][]uint32)
	for identity, abs := range casts.Casts {
		key := castSlotKey{
			Subject: identity.Subject,
			Round:   identity.Round,
			Slot:    identity.Slot,
		}
		castTimesBySlot[key] = append(castTimesBySlot[key], abs)

		bySlot := castTimesBySubjectSlot[identity.Subject]
		if bySlot == nil {
			bySlot = make(map[int64][]uint32)
			castTimesBySubjectSlot[identity.Subject] = bySlot
		}
		bySlot[identity.Slot] = append(bySlot[identity.Slot], abs)
	}
	for key := range castTimesBySlot {
		sort.Slice(castTimesBySlot[key], func(i, j int) bool {
			return castTimesBySlot[key][i] < castTimesBySlot[key][j]
		})
	}
	sortCastTimes(castTimesBySubjectSlot)

	// The folder letter is not always the input slot, so learn the real
	// mapping from this player's casts before it is used for charges or
	// cooldowns.
	abilitySlots := learnAbilitySlots(
		state.AbilityCharges, state.Cooldowns, castTimesBySubjectSlot,
	)
	for _, sample := range state.AbilityCharges {
		if slots := abilitySlots[sample.Subject]; len(slots) > 0 {
			if _, ok := slots[sample.Folder]; !ok {
				state.AbilityChargeUnmapped++
			}
		}
	}
	for _, window := range state.Cooldowns {
		if slots := abilitySlots[window.Subject]; len(slots) > 0 {
			if _, ok := slots[window.Folder]; !ok {
				state.CooldownUnmapped++
			}
		}
	}

	// Keep charge-capable folders that never produced a value write so their
	// slots still start the round empty instead of falling back to a full kit.
	for subject, folders := range state.ChargeFolders {
		if abilitySlots[subject] == nil {
			abilitySlots[subject] = make(map[string]string)
		}
		used := make(map[string]bool, len(abilitySlots[subject]))
		for _, slot := range abilitySlots[subject] {
			used[slot] = true
		}
		names := make([]string, 0, len(folders))
		for folder := range folders {
			names = append(names, folder)
		}
		sort.Strings(names)
		for _, folder := range names {
			if _, ok := abilitySlots[subject][folder]; ok {
				continue
			}
			slot := folders[folder]
			if used[slot] {
				continue
			}
			abilitySlots[subject][folder] = slot
			used[slot] = true
		}
	}

	recharges := buildRechargeWindows(
		state.AbilityCharges, windows, abilitySlots, state.Cooldowns,
	)
	state.RechargeWindows = len(recharges)
	state.Cooldowns = append(state.Cooldowns, recharges...)

	chargeFoldersBySubject := make(map[string]map[string]bool)
	for subject, folders := range state.ChargeFolders {
		chargeFoldersBySubject[subject] = make(map[string]bool, len(folders))
		for folder := range folders {
			chargeFoldersBySubject[subject][folder] = true
		}
	}
	for _, sample := range state.AbilityCharges {
		if chargeFoldersBySubject[sample.Subject] == nil {
			chargeFoldersBySubject[sample.Subject] = make(map[string]bool)
		}
		chargeFoldersBySubject[sample.Subject][sample.Folder] = true
		if sample.Signature {
			state.SignatureChargeWrites++
		}
	}

	damage := make(map[int]map[string]float64, len(windows))
	for _, write := range state.Incoming {
		roundIndex, ok := roundIndexAt(windows, write.TimeMS)
		if !ok {
			continue
		}
		bucket := damage[roundIndex]
		if bucket == nil {
			bucket = make(map[string]float64)
			damage[roundIndex] = bucket
		}
		bucket[write.Subject] += write.Damage
	}

	subjectByPuuid := make(map[string]string, len(puuidBySubject))
	for subject, puuid := range puuidBySubject {
		subjectByPuuid[puuid] = subject
	}

	for i := range windows {
		window := &windows[i]
		log := logs[window.RoundNumber]
		if log == nil {
			continue
		}

		// Stats are the state at barrier drop. A round without a usable buy
		// end falls back to the round start.
		statsTime := window.StartMS
		if window.BuyEndMS != nil &&
			*window.BuyEndMS >= window.StartMS &&
			*window.BuyEndMS <= window.EndMS {
			statsTime = *window.BuyEndMS
		}
		roundIndex := window.RoundNumber - 1

		for _, player := range players {
			stats := log.Stats[player.Puuid]
			if stats == nil {
				continue
			}
			subject := subjectByPuuid[player.Puuid]
			if subject == "" {
				continue
			}

			sample := state.stateFor(subject, statsTime, window.StartMS)
			stats.Economy.Remaining = sample.Credits
			stats.WeaponID = sample.WeaponID
			stats.ArmorID = sample.ArmorID
			stats.IncomingDamage = int(math.Round(damage[roundIndex][subject]))

			if stats.AbilityCasts == nil {
				stats.AbilityCasts = make(map[string]int, len(castSlotOrder))
			}
			if stats.AbilityCastTimes == nil {
				stats.AbilityCastTimes = make(map[string][]int, len(castSlotOrder))
			}
			for _, slot := range castSlotOrder {
				absTimes := castTimesBySlot[castSlotKey{
					Subject: subject,
					Round:   roundIndex,
					Slot:    slot,
				}]
				if len(absTimes) == 0 {
					continue
				}

				times := make([]int, 0, len(absTimes))
				seen := make(map[int]struct{}, len(absTimes))
				for _, abs := range absTimes {
					relative := roundRelative(abs, window)
					if _, exists := seen[relative]; exists {
						continue
					}
					seen[relative] = struct{}{}
					times = append(times, relative)
				}
				if len(times) == 0 {
					continue
				}
				stats.AbilityCasts[castSlotNames[slot]] = times[0]
				stats.AbilityCastTimes[castSlotNames[slot]] = times
			}

			if len(state.AbilityCharges) > 0 {
				chargeFolders := chargeFoldersBySubject[subject]
				if chargeFolders == nil {
					chargeFolders = map[string]bool{}
				}
				chargePoints := abilityChargePointsForRound(
					state.AbilityCharges, subject, window,
					abilitySlots[subject], chargeFolders,
				)
				if len(chargePoints) > 0 {
					stats.AbilityCharges = chargePoints
				}
			}

			if len(state.UltimateSamples) > 0 {
				ultimatePoints := ultimatePointsForRound(
					state.UltimateSamples, subject, window,
				)
				if len(ultimatePoints) > 0 {
					stats.UltimatePoints = ultimatePoints
				}
			}

			if len(state.Cooldowns) > 0 {
				cooldowns := cooldownWindowsForRound(
					state.Cooldowns, subject, window, abilitySlots[subject],
				)
				if len(cooldowns) > 0 {
					stats.Cooldowns = cooldowns
				}
			}
		}
	}
}
