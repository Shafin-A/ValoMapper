package replay

import "testing"

func TestLearnAbilitySlotsMatchesChargeDecrementsToCasts(t *testing.T) {
	const subject = "s"
	casts := map[string]map[int64][]uint32{
		subject: {
			3: {10000},
			4: {20000},
			5: {30000},
		},
	}
	charges := []abilityChargeSample{
		{Subject: subject, Folder: "Ability_E", Slot: "Ability2", TimeMS: 9000, Charges: 2},
		{Subject: subject, Folder: "Ability_E", Slot: "Ability2", TimeMS: 10000, Charges: 1},
		{Subject: subject, Folder: "Ability_4", Slot: "Grenade", TimeMS: 19000, Charges: 2},
		{Subject: subject, Folder: "Ability_4", Slot: "Grenade", TimeMS: 20000, Charges: 1},
		{Subject: subject, Folder: "Ability_Q", Slot: "Ability1", TimeMS: 29000, Charges: 1},
		{Subject: subject, Folder: "Ability_Q", Slot: "Ability1", TimeMS: 30000, Charges: 0},
	}

	got := learnAbilitySlots(charges, nil, casts)
	want := map[string]string{
		"Ability_E": "Grenade",
		"Ability_4": "Ability1",
		"Ability_Q": "Ability2",
	}
	for folder, slot := range want {
		if got[subject][folder] != slot {
			t.Errorf("folder %s = %q, want %q", folder, got[subject][folder], slot)
		}
	}
}

func TestLearnAbilitySlotsIgnoresRechargesAndDistantCasts(t *testing.T) {
	const subject = "s"
	casts := map[string]map[int64][]uint32{
		subject: {3: {10000}},
	}
	charges := []abilityChargeSample{
		{Subject: subject, Folder: "Ability_E", TimeMS: 9000, Charges: 1},
		{Subject: subject, Folder: "Ability_E", TimeMS: 10000, Charges: 2}, // recharge
		{Subject: subject, Folder: "Ability_4", TimeMS: 90000, Charges: 2},
		{Subject: subject, Folder: "Ability_4", TimeMS: 91000, Charges: 1}, // too far
	}

	got := learnAbilitySlots(charges, nil, casts)
	if mapped := got[subject]["Ability_E"]; mapped != "" {
		t.Errorf("recharge learned an ability slot: %q", mapped)
	}
	if mapped := got[subject]["Ability_4"]; mapped != "" {
		t.Errorf("distant decrement learned an ability slot: %q", mapped)
	}
}

func TestLearnAbilitySlotsUsesCooldownStarts(t *testing.T) {
	const subject = "s"
	casts := map[string]map[int64][]uint32{
		subject: {5: {30000}},
	}
	cooldowns := []cooldownWindow{
		{Subject: subject, Folder: "Ability_Q", Slot: "Ability1", StartMS: 30000, EndMS: 90000},
	}

	got := learnAbilitySlots(nil, cooldowns, casts)
	if got[subject]["Ability_Q"] != "Ability2" {
		t.Fatalf("cooldown folder mapped to %q, want Ability2", got[subject]["Ability_Q"])
	}
}

func TestAbilityChargePointsForRoundUsesLearnedSlot(t *testing.T) {
	window := roundWindow{RoundNumber: 1, StartMS: 1000, EndMS: 3000}
	samples := []abilityChargeSample{
		{Subject: "s", Folder: "Ability_4", Slot: "Grenade", TimeMS: 1000, Charges: 2},
		{Subject: "s", Folder: "Ability_4", Slot: "Grenade", TimeMS: 2000, Charges: 1},
		{Subject: "s", Folder: "Ability_E", Slot: "Ability2", TimeMS: 1500, Charges: 1},
	}
	slots := map[string]string{"Ability_4": "Ability1"}

	points := abilityChargePointsForRound(
		samples, "s", &window, slots, map[string]bool{"Ability_4": true},
	)
	if _, exists := points["Grenade"]; exists {
		t.Fatalf("guessed slot was emitted: %+v", points)
	}
	if _, exists := points["Ability2"]; exists {
		t.Fatalf("unmapped folder was emitted: %+v", points)
	}
	got := points["Ability1"]
	if len(got) != 2 || got[0].TimeMS != 0 || got[0].Charges != 2 ||
		got[1].TimeMS != 1000 || got[1].Charges != 1 {
		t.Fatalf("learned slot timeline = %+v", got)
	}
}

func TestCooldownWindowsForRoundUsesLearnedSlot(t *testing.T) {
	round := roundWindow{RoundNumber: 1, StartMS: 1000, EndMS: 3000}
	windows := []cooldownWindow{
		{Subject: "s", Folder: "Ability_Q", Slot: "Ability1", StartMS: 1500, EndMS: 2500},
	}
	slots := map[string]string{"Ability_Q": "Ability2"}

	got := cooldownWindowsForRound(windows, "s", &round, slots)
	if _, exists := got["Ability1"]; exists {
		t.Fatalf("guessed slot was emitted: %+v", got)
	}
	window := got["Ability2"]
	if len(window) != 1 || window[0].StartTimeMS != 500 || window[0].EndTimeMS != 1500 {
		t.Fatalf("learned slot window = %+v", got)
	}
}
