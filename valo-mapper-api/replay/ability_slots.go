package replay

import "sort"

// maxAbilityCastMatchMS is how close a charge decrement or cooldown start may
// be to a resolved cast before it is used as slot evidence. The two timestamps
// match exactly in practice; the window only absorbs replication jitter.
const maxAbilityCastMatchMS = 2000

type abilityFolderKey struct {
	subject string
	folder  string
}

type abilityActorKey struct {
	subject string
	folder  string
	actor   uint32
}

// learnAbilitySlots derives subject -> folder -> wire slot from charge
// decrements and cooldown starts matched to resolved casts. The ability folder
// is not a reliable input slot: Sova's Shock Bolt is /Ability_4/, Recon Bolt is
// /Ability_Q/ and Owl Drone is /Ability_E/. Matching the ability's own events to
// the cast record gives the real slot without an agent-specific table.
//
// Folders with no evidence keep their folder-letter guess, but only when that
// slot is not already claimed by a learned folder. This keeps coverage for
// buy-phase placements while never letting two folders write the same slot.
func learnAbilitySlots(
	charges []abilityChargeSample,
	cooldowns []cooldownWindow,
	casts map[string]map[int64][]uint32,
) map[string]map[string]string {
	if len(casts) == 0 {
		return nil
	}

	guesses := make(map[string]map[string]string)
	recordGuess := func(subject, folder, slot string) {
		if subject == "" || folder == "" || slot == "" {
			return
		}
		if guesses[subject] == nil {
			guesses[subject] = make(map[string]string)
		}
		guesses[subject][folder] = slot
	}

	votes := make(map[abilityFolderKey]map[string]int)
	lastCharges := make(map[abilityActorKey]int)
	for _, sample := range charges {
		recordGuess(sample.Subject, sample.Folder, sample.Slot)
		key := abilityFolderKey{sample.Subject, sample.Folder}
		actorKey := abilityActorKey{sample.Subject, sample.Folder, sample.Actor}
		previous, seen := lastCharges[actorKey]
		lastCharges[actorKey] = sample.Charges
		if !seen || sample.Charges >= previous {
			continue
		}
		voteForCast(votes, key, sample.TimeMS, casts)
	}
	for _, window := range cooldowns {
		recordGuess(window.Subject, window.Folder, window.Slot)
		voteForCast(
			votes, abilityFolderKey{window.Subject, window.Folder},
			window.StartMS, casts,
		)
	}

	// One folder per subject+slot: the strongest vote wins, a tie proves
	// nothing.
	type folderVote struct {
		slot  string
		votes int
	}
	bestByFolder := make(map[abilityFolderKey]folderVote)
	for key, counts := range votes {
		best, bestCount, tied := "", 0, false
		for slot, count := range counts {
			switch {
			case count > bestCount:
				best, bestCount, tied = slot, count, false
			case count == bestCount:
				tied = true
			}
		}
		if best == "" || tied {
			continue
		}
		bestByFolder[key] = folderVote{best, bestCount}
	}

	type slotWinner struct {
		folder string
		votes  int
	}
	winners := make(map[string]map[string]slotWinner)
	for key, vote := range bestByFolder {
		if winners[key.subject] == nil {
			winners[key.subject] = make(map[string]slotWinner)
		}
		current, exists := winners[key.subject][vote.slot]
		switch {
		case !exists || vote.votes > current.votes:
			winners[key.subject][vote.slot] = slotWinner{key.folder, vote.votes}
		case vote.votes == current.votes:
			winners[key.subject][vote.slot] = slotWinner{"", vote.votes}
		}
	}

	learned := make(map[string]map[string]string)
	for subject, slots := range winners {
		learned[subject] = make(map[string]string)
		for slot, winner := range slots {
			if winner.folder == "" {
				continue
			}
			learned[subject][winner.folder] = slot
		}
	}

	// Fill folders without evidence with their folder-letter guess, provided
	// the slot is still free for this subject.
	for subject, folders := range guesses {
		if learned[subject] == nil {
			learned[subject] = make(map[string]string)
		}
		used := make(map[string]bool, len(learned[subject]))
		for _, slot := range learned[subject] {
			used[slot] = true
		}
		names := make([]string, 0, len(folders))
		for folder := range folders {
			names = append(names, folder)
		}
		sort.Strings(names)
		for _, folder := range names {
			if _, ok := learned[subject][folder]; ok {
				continue
			}
			slot := folders[folder]
			if used[slot] {
				continue
			}
			learned[subject][folder] = slot
			used[slot] = true
		}
	}
	if len(learned) == 0 {
		return nil
	}
	return learned
}

// voteForCast adds one vote for the wire slot whose cast is closest to at. A
// tie between two slots is discarded because it proves nothing.
func voteForCast(
	votes map[abilityFolderKey]map[string]int,
	key abilityFolderKey,
	at uint32,
	casts map[string]map[int64][]uint32,
) {
	bySlot := casts[key.subject]
	if len(bySlot) == 0 {
		return
	}

	bestSlot := int64(-1)
	bestDiff := uint32(maxAbilityCastMatchMS) + 1
	tied := false
	for _, slot := range castSlotOrder {
		for _, castAt := range bySlot[slot] {
			var diff uint32
			if castAt > at {
				diff = castAt - at
			} else {
				diff = at - castAt
			}
			switch {
			case diff < bestDiff:
				bestDiff = diff
				bestSlot = slot
				tied = false
			case diff == bestDiff && slot != bestSlot:
				tied = true
			}
		}
	}
	if bestSlot < 0 || tied || bestDiff > maxAbilityCastMatchMS {
		return
	}
	if votes[key] == nil {
		votes[key] = make(map[string]int)
	}
	votes[key][castSlotNames[bestSlot]]++
}

// sortCastTimes keeps the nearest-cast scan deterministic and cheap.
func sortCastTimes(casts map[string]map[int64][]uint32) {
	for _, bySlot := range casts {
		for slot := range bySlot {
			times := bySlot[slot]
			sort.Slice(times, func(i, j int) bool { return times[i] < times[j] })
		}
	}
}
