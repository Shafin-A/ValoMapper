package replay

import "sort"

// minRechargeWindows is the number of consistent refills required before a
// charge is treated as a timed recharge. One interval cannot distinguish a
// recharge from a buy-phase purchase or an ability recall.
const minRechargeWindows = 2

// rechargeCandidate is one observed depletion -> refill interval.
type rechargeCandidate struct {
	subject     string
	folder      string
	start       uint32
	end         uint32
	afterBuyEnd bool
}

// buildRechargeWindows derives cooldown windows from charge refills for
// signature abilities that recharge over time, such as Sova's Recon Bolt,
// Fade's Haunt and Omen's Dark Cover. Those abilities use
// EquipmentChargeComponent rather than Comp_Ability_CooldownComponent.
//
// Mid-round refills establish the nominal recharge interval. Every depletion
// then gets that full interval, even if the observed refill happened earlier
// at a round boundary, so a use near the end of a round still shows the real
// timer. The observed refill is retained only to stop the window leaking into
// a later round that started after the charge was already restored. Folders
// with an authoritative cooldown-timer window are left to that source.
func buildRechargeWindows(
	charges []abilityChargeSample,
	windows []roundWindow,
	slots map[string]map[string]string,
	existing []cooldownWindow,
) []cooldownWindow {
	if len(charges) == 0 || len(windows) == 0 {
		return nil
	}

	covered := make(map[abilityFolderKey]struct{})
	for _, window := range existing {
		if window.Folder != "" {
			covered[abilityFolderKey{window.Subject, window.Folder}] = struct{}{}
		}
	}
	// Kill-refresh signatures (Raze Paint Shells, Phoenix Curveball, Jett
	// Tailwind) refill on an event, not a timer. Their charge timeline already
	// shows the refill at the kill, so never synthesize a cooldown for them.
	signatureFolders := make(map[abilityFolderKey]bool)
	for _, sample := range charges {
		if sample.Signature {
			signatureFolders[abilityFolderKey{sample.Subject, sample.Folder}] = true
		}
	}

	groups := make(map[abilityActorKey][]abilityChargeSample)
	for _, sample := range charges {
		key := abilityActorKey{sample.Subject, sample.Folder, sample.Actor}
		groups[key] = append(groups[key], sample)
	}

	byFolder := make(map[abilityFolderKey][]rechargeCandidate)
	depletionsByFolder := make(map[abilityFolderKey]map[uint32]struct{})
	refillByDepletion := make(map[abilityFolderKey]map[uint32]uint32)
	for key, samples := range groups {
		folderKey := abilityFolderKey{key.subject, key.folder}
		if _, skip := covered[folderKey]; skip {
			continue
		}
		if signatureFolders[folderKey] {
			continue
		}
		sort.Slice(samples, func(i, j int) bool {
			return samples[i].TimeMS < samples[j].TimeMS
		})
		if depletionsByFolder[folderKey] == nil {
			depletionsByFolder[folderKey] = make(map[uint32]struct{})
			refillByDepletion[folderKey] = make(map[uint32]uint32)
		}

		var pending []uint32
		previous := samples[0].Charges
		for _, sample := range samples[1:] {
			delta := sample.Charges - previous
			previous = sample.Charges
			if delta < 0 {
				for i := 0; i < -delta; i++ {
					pending = append(pending, sample.TimeMS)
					depletionsByFolder[folderKey][sample.TimeMS] = struct{}{}
				}
				continue
			}
			if delta == 0 {
				continue
			}
			for i := 0; i < delta && len(pending) > 0; i++ {
				start := pending[0]
				pending = pending[1:]
				if _, exists := refillByDepletion[folderKey][start]; !exists {
					refillByDepletion[folderKey][start] = sample.TimeMS
				}
				byFolder[folderKey] = append(byFolder[folderKey], rechargeCandidate{
					subject:     key.subject,
					folder:      key.folder,
					start:       start,
					end:         sample.TimeMS,
					afterBuyEnd: increaseAfterBuyEnd(windows, sample.TimeMS),
				})
			}
		}
	}

	result := make([]cooldownWindow, 0)
	seen := make(map[cooldownWindow]struct{})
	for key, candidates := range byFolder {
		slot := slots[key.subject][key.folder]
		if slot == "" {
			continue
		}

		// Mid-round refills establish the nominal recharge interval. It is
		// deliberately not derived from a short refill that happens at a round
		// boundary, because the ability's timer is still the full duration.
		mid := make([]rechargeCandidate, 0, len(candidates))
		for _, candidate := range candidates {
			if candidate.afterBuyEnd {
				mid = append(mid, candidate)
			}
		}
		if len(mid) < minRechargeWindows {
			continue
		}

		durations := make([]int, 0, len(mid))
		for _, candidate := range mid {
			durations = append(durations, int(candidate.end-candidate.start))
		}
		sort.Ints(durations)
		median := durations[len(durations)/2]
		low, high := median/2, median*3/2

		consistent := 0
		for _, duration := range durations {
			if duration >= low && duration <= high {
				consistent++
			}
		}
		if consistent < minRechargeWindows {
			continue
		}

		depletions := make([]uint32, 0, len(depletionsByFolder[key]))
		for start := range depletionsByFolder[key] {
			depletions = append(depletions, start)
		}
		sort.Slice(depletions, func(i, j int) bool { return depletions[i] < depletions[j] })

		for _, start := range depletions {
			window := cooldownWindow{
				Subject:  key.subject,
				Slot:     slot,
				Folder:   key.folder,
				Recharge: true,
				StartMS:  start,
				EndMS:    start + uint32(median),
				RefillMS: refillByDepletion[key][start],
			}
			if _, exists := seen[window]; exists {
				continue
			}
			seen[window] = struct{}{}
			result = append(result, window)
		}
	}

	sort.SliceStable(result, func(i, j int) bool {
		a, b := result[i], result[j]
		if a.Subject != b.Subject {
			return a.Subject < b.Subject
		}
		if a.Slot != b.Slot {
			return a.Slot < b.Slot
		}
		return a.StartMS < b.StartMS
	})
	return result
}

func increaseAfterBuyEnd(windows []roundWindow, at uint32) bool {
	index, ok := roundIndexAt(windows, at)
	if !ok {
		return false
	}
	buyEnd := windows[index].BuyEndMS
	return buyEnd != nil && at >= *buyEnd
}
