package replay

import (
	"sort"
	"strings"
)

// abilityChargeWrite is one replicated current-charge value on an ability item.
type abilityChargeWrite struct {
	TimeMS    uint32
	PacketID  uint32
	Actor     uint32
	Charges   int
	Signature bool
}

// abilityChargeSample is a resolved charge event for one player and slot.
type abilityChargeSample struct {
	Subject   string
	Slot      string
	Folder    string
	Actor     uint32
	TimeMS    uint32
	PacketID  uint32
	Charges   int
	Signature bool
}

// abilityClassFolder returns the /Ability_*/ path component. It is a stable
// per-agent ability key, but it is not always the input slot (Sova's Shock Bolt
// lives under Ability_4 while Owl Drone lives under Ability_E).
func abilityClassFolder(classPath string) (string, bool) {
	for _, part := range strings.Split(classPath, "/") {
		if strings.HasPrefix(part, "Ability_") && len(part) > len("Ability_") {
			return part, true
		}
	}
	return "", false
}

// abilitySlotOverrides handles agents whose ability-item folders do not match
// their input slots. Sova's folders are legacy-shuffled: Shock Bolt is under
// Ability_4, Recon Bolt under Ability_Q and Owl Drone under Ability_E.
var abilitySlotOverrides = map[string]map[string]string{
	"Hunter": {
		"Ability_4": "Ability1", // Shock Bolt (Q)
		"Ability_Q": "Ability2", // Recon Bolt (E)
		"Ability_E": "Grenade",  // Owl Drone (C)
	},
}

// characterClassFolder returns the /Game/Characters/<Agent>/ component, which
// is the internal agent name used by ability class paths.
func characterClassFolder(classPath string) (string, bool) {
	parts := strings.Split(classPath, "/")
	for i, part := range parts {
		if part == "Characters" && i+1 < len(parts) {
			return parts[i+1], true
		}
	}
	return "", false
}

// abilitySlotFromClassName reads the slot letter from the ability class name.
// Some agents use descriptive folders (Brimstone's Ability_MapTargetSmoke), so
// the /Ability_*/ folder is not enough. Ability item classes are named
// Ability_<Agent>_<SlotLetter>_* (Brimstone) or Ability_<SlotLetter>_<Agent>_*
// (Fade); when the third token is not a slot letter this returns false and the
// folder fallback is used.
func abilitySlotFromClassName(classPath string) (string, bool) {
	base := classPath
	if slash := strings.LastIndex(base, "/"); slash >= 0 {
		base = base[slash+1:]
	}
	if dot := strings.IndexByte(base, '.'); dot >= 0 {
		base = base[:dot]
	}
	parts := strings.Split(base, "_")
	if len(parts) < 3 || parts[0] != "Ability" {
		return "", false
	}
	return abilitySlotForLetter(parts[2])
}

func abilitySlotForLetter(letter string) (string, bool) {
	switch letter {
	case "4", "C":
		return castSlotNames[3], true
	case "Q":
		return castSlotNames[4], true
	case "E":
		return castSlotNames[5], true
	case "X":
		return castSlotNames[9], true
	}
	return "", false
}

// abilitySlotForClass maps an ability item class to its guessed wire slot. The
// folder letter is only a guess; abilitySlotOverrides records known exceptions
// and applyRoundStats learns anything else from charge decrements and casts.
func abilitySlotForClass(classPath string) (string, bool) {
	folder, ok := abilityClassFolder(classPath)
	if !ok {
		return "", false
	}
	if agent, ok := characterClassFolder(classPath); ok {
		if slot, ok := abilitySlotOverrides[agent][folder]; ok {
			return slot, true
		}
	}
	if slot, ok := abilitySlotFromClassName(classPath); ok {
		return slot, true
	}
	return abilitySlotForLetter(folder[len("Ability_"):])
}

func sortStateWrites(writes map[uint32][]stateWrite) {
	for actor := range writes {
		sort.SliceStable(writes[actor], func(i, j int) bool {
			if writes[actor][i].TimeMS != writes[actor][j].TimeMS {
				return writes[actor][i].TimeMS < writes[actor][j].TimeMS
			}
			return writes[actor][i].PacketID < writes[actor][j].PacketID
		})
	}
}

func latestStateWrite(writes []stateWrite, at uint32) (uint32, bool) {
	var value uint32
	found := false
	for _, write := range writes {
		if write.TimeMS > at {
			break
		}
		value = uint32(write.Value)
		found = value != 0
	}
	return value, found
}

func resolveAbilityChargeOwner(
	actor uint32,
	at uint32,
	owners map[uint32][]stateWrite,
	instigators map[uint32][]stateWrite,
	index *playerIndex,
) (string, bool) {
	owner, ok := latestStateWrite(owners[actor], at)
	if !ok {
		owner, ok = latestStateWrite(instigators[actor], at)
	}
	if !ok || owner == 0 {
		return "", false
	}
	if subject, ok := index.subjectForCharacter(owner); ok {
		return subject, true
	}

	// Follow one proxy link (for example an ability spawned by another actor).
	next, ok := latestStateWrite(owners[owner], at)
	if !ok {
		next, ok = latestStateWrite(instigators[owner], at)
	}
	if ok {
		if subject, ok := index.subjectForCharacter(next); ok {
			return subject, true
		}
	}
	return "", false
}

// collectChargeFolders maps every EquipmentChargeComponent actor to its subject
// and ability folder, including abilities that are never bought in the match.
// The slot is only a guess; the learned cast mapping corrects it later.
func collectChargeFolders(
	actors map[uint32]struct{},
	view *stateActorView,
	index *playerIndex,
	owners map[uint32][]stateWrite,
	instigators map[uint32][]stateWrite,
) map[string]map[string]string {
	if len(actors) == 0 || view == nil || index == nil {
		return nil
	}
	folders := make(map[string]map[string]string)
	for actor := range actors {
		class, ok := view.ClassByActor[actor]
		if !ok {
			continue
		}
		folder, ok := abilityClassFolder(class)
		if !ok {
			continue
		}
		slot, ok := abilitySlotForClass(class)
		if !ok || slot == castSlotNames[9] {
			continue
		}
		subject, ok := resolveAbilityChargeOwner(
			actor, ^uint32(0), owners, instigators, index,
		)
		if !ok {
			continue
		}
		if folders[subject] == nil {
			folders[subject] = make(map[string]string)
		}
		folders[subject][folder] = slot
	}
	return folders
}

// abilityChargePointsForRound creates one round-relative charge timeline per
// slot. Every known folder is seeded at time 0 with the last value carried into
// the round, defaulting to zero, so an ability bought later in the buy phase
// starts empty instead of appearing fully stocked.
//
// slots carries the learned folder -> wire slot mapping for this player. When
// it is present, a folder without a mapping is omitted rather than guessed,
// because the folder letter is wrong for agents like Sova.
func abilityChargePointsForRound(
	samples []abilityChargeSample,
	subject string,
	window *roundWindow,
	slots map[string]string,
	chargeFolders map[string]bool,
) map[string][]AbilityChargePoint {
	pointsBySlot := make(map[string]map[int]int)

	if len(slots) == 0 {
		// Legacy path: no folder map, so only writes can create a timeline.
		for _, sample := range samples {
			if sample.Subject != subject || sample.TimeMS > window.EndMS {
				continue
			}
			relative := 0
			if sample.TimeMS >= window.StartMS {
				relative = roundRelative(sample.TimeMS, window)
			}
			bucket := pointsBySlot[sample.Slot]
			if bucket == nil {
				bucket = make(map[int]int)
				pointsBySlot[sample.Slot] = bucket
			}
			bucket[relative] = sample.Charges
		}
	} else {
		last := make(map[string]int)
		for _, sample := range samples {
			if sample.Subject != subject || sample.TimeMS >= window.StartMS {
				continue
			}
			last[sample.Folder] = sample.Charges
		}

		folders := make([]string, 0, len(slots))
		for folder := range slots {
			folders = append(folders, folder)
		}
		sort.Strings(folders)
		for _, folder := range folders {
			if !chargeFolders[folder] {
				continue
			}
			slot := slots[folder]
			bucket := pointsBySlot[slot]
			if bucket == nil {
				bucket = make(map[int]int)
				pointsBySlot[slot] = bucket
			}
			bucket[0] = last[folder]
		}

		for _, sample := range samples {
			if sample.Subject != subject ||
				sample.TimeMS < window.StartMS ||
				sample.TimeMS > window.EndMS {
				continue
			}
			slot, ok := slots[sample.Folder]
			if !ok {
				continue
			}
			relative := roundRelative(sample.TimeMS, window)
			bucket := pointsBySlot[slot]
			if bucket == nil {
				bucket = make(map[int]int)
				pointsBySlot[slot] = bucket
			}
			bucket[relative] = sample.Charges
		}
	}

	result := make(map[string][]AbilityChargePoint, len(pointsBySlot))
	for slot, bucket := range pointsBySlot {
		times := make([]int, 0, len(bucket))
		for timeMS := range bucket {
			times = append(times, timeMS)
		}
		sort.Ints(times)
		points := make([]AbilityChargePoint, 0, len(times))
		for _, timeMS := range times {
			points = append(points, AbilityChargePoint{
				TimeMS:  timeMS,
				Charges: bucket[timeMS],
			})
		}
		result[slot] = points
	}
	return result
}

// buildAbilityChargeSamples resolves the raw current-charge writes collected in
// the single fields pass into subject/slot events.
func buildAbilityChargeSamples(
	raw *fieldStateRows,
	index *playerIndex,
	actors *stateActorView,
) ([]abilityChargeSample, int, int, int) {
	if raw == nil || len(raw.AbilityCharges) == 0 || index == nil || actors == nil {
		return nil, 0, 0, 0
	}

	owners := make(map[uint32][]stateWrite)
	for _, write := range raw.OwnerWrites {
		owners[write.Actor] = append(owners[write.Actor], write)
	}
	instigators := make(map[uint32][]stateWrite)
	for _, write := range raw.InstigatorWrites {
		instigators[write.Actor] = append(instigators[write.Actor], write)
	}
	sortStateWrites(owners)
	sortStateWrites(instigators)

	samples := make([]abilityChargeSample, 0, len(raw.AbilityCharges))
	unresolved, unknownSlot := 0, 0
	for _, write := range raw.AbilityCharges {
		folder, ok := abilityClassFolder(actors.ClassByActor[write.Actor])
		if !ok {
			unknownSlot++
			continue
		}
		slot, ok := abilitySlotForClass(actors.ClassByActor[write.Actor])
		if !ok {
			unknownSlot++
			continue
		}
		subject, ok := resolveAbilityChargeOwner(
			write.Actor, write.TimeMS, owners, instigators, index,
		)
		if !ok {
			unresolved++
			continue
		}
		samples = append(samples, abilityChargeSample{
			Subject:   subject,
			Slot:      slot,
			Folder:    folder,
			Actor:     write.Actor,
			TimeMS:    write.TimeMS,
			PacketID:  write.PacketID,
			Charges:   write.Charges,
			Signature: write.Signature,
		})
	}

	sort.SliceStable(samples, func(i, j int) bool {
		a, b := samples[i], samples[j]
		if a.Subject != b.Subject {
			return a.Subject < b.Subject
		}
		if a.Slot != b.Slot {
			return a.Slot < b.Slot
		}
		if a.TimeMS != b.TimeMS {
			return a.TimeMS < b.TimeMS
		}
		return a.PacketID < b.PacketID
	})
	return samples, len(samples), unresolved, unknownSlot
}
