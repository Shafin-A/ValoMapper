package replay

import "testing"

func rechargeTestRound() []roundWindow {
	return []roundWindow{{
		RoundNumber: 1, StartMS: 0, EndMS: 200000,
		BuyEndMS: ptr(uint32(10000)),
	}}
}

func TestBuildRechargeWindowsDerivesConsistentIntervals(t *testing.T) {
	charges := []abilityChargeSample{
		{Subject: "s", Folder: "Ability_Q", Actor: 7, TimeMS: 0, Charges: 1},
		{Subject: "s", Folder: "Ability_Q", Actor: 7, TimeMS: 20000, Charges: 0},
		{Subject: "s", Folder: "Ability_Q", Actor: 7, TimeMS: 70000, Charges: 1},
		{Subject: "s", Folder: "Ability_Q", Actor: 7, TimeMS: 90000, Charges: 0},
		{Subject: "s", Folder: "Ability_Q", Actor: 7, TimeMS: 140000, Charges: 1},
	}
	slots := map[string]map[string]string{
		"s": {"Ability_Q": "Ability2"},
	}

	got := buildRechargeWindows(charges, rechargeTestRound(), slots, nil)
	if len(got) != 2 {
		t.Fatalf("windows = %+v", got)
	}
	if got[0] != (cooldownWindow{Subject: "s", Slot: "Ability2", Folder: "Ability_Q", Recharge: true, StartMS: 20000, EndMS: 70000, RefillMS: 70000}) {
		t.Fatalf("first window = %+v", got[0])
	}
	if got[1] != (cooldownWindow{Subject: "s", Slot: "Ability2", Folder: "Ability_Q", Recharge: true, StartMS: 90000, EndMS: 140000, RefillMS: 140000}) {
		t.Fatalf("second window = %+v", got[1])
	}
}

func TestBuildRechargeWindowsIgnoresBuyPhaseRefills(t *testing.T) {
	charges := []abilityChargeSample{
		{Subject: "s", Folder: "Ability_4", Actor: 7, TimeMS: 0, Charges: 1},
		{Subject: "s", Folder: "Ability_4", Actor: 7, TimeMS: 5000, Charges: 0},
		{Subject: "s", Folder: "Ability_4", Actor: 7, TimeMS: 8000, Charges: 1},
		{Subject: "s", Folder: "Ability_4", Actor: 7, TimeMS: 9000, Charges: 0},
		{Subject: "s", Folder: "Ability_4", Actor: 7, TimeMS: 9500, Charges: 1},
	}
	slots := map[string]map[string]string{
		"s": {"Ability_4": "Grenade"},
	}

	if got := buildRechargeWindows(charges, rechargeTestRound(), slots, nil); len(got) != 0 {
		t.Fatalf("buy-phase refills became recharges: %+v", got)
	}
}

func TestBuildRechargeWindowsKeepsNominalDuration(t *testing.T) {
	charges := []abilityChargeSample{
		{Subject: "s", Folder: "Ability_4", Actor: 7, TimeMS: 0, Charges: 1},
		{Subject: "s", Folder: "Ability_4", Actor: 7, TimeMS: 10000, Charges: 0},
		{Subject: "s", Folder: "Ability_4", Actor: 7, TimeMS: 50000, Charges: 1},
		{Subject: "s", Folder: "Ability_4", Actor: 7, TimeMS: 60000, Charges: 0},
		{Subject: "s", Folder: "Ability_4", Actor: 7, TimeMS: 100000, Charges: 1},
		{Subject: "s", Folder: "Ability_4", Actor: 7, TimeMS: 110000, Charges: 0},
		{Subject: "s", Folder: "Ability_4", Actor: 7, TimeMS: 190000, Charges: 1},
	}
	slots := map[string]map[string]string{
		"s": {"Ability_4": "Ability2"},
	}

	got := buildRechargeWindows(charges, rechargeTestRound(), slots, nil)
	if len(got) != 3 {
		t.Fatalf("windows = %+v", got)
	}
	for _, window := range got {
		if window.EndMS-window.StartMS != 40000 {
			t.Fatalf("window does not use the nominal duration: %+v", window)
		}
	}
	if got[2].RefillMS != 190000 {
		t.Fatalf("observed refill was not retained: %+v", got[2])
	}
}

func TestBuildRechargeWindowsProjectsUnobservedRefill(t *testing.T) {
	charges := []abilityChargeSample{
		{Subject: "s", Folder: "Ability_Q", Actor: 7, TimeMS: 0, Charges: 1},
		{Subject: "s", Folder: "Ability_Q", Actor: 7, TimeMS: 10000, Charges: 0},
		{Subject: "s", Folder: "Ability_Q", Actor: 7, TimeMS: 50000, Charges: 1},
		{Subject: "s", Folder: "Ability_Q", Actor: 7, TimeMS: 60000, Charges: 0},
		{Subject: "s", Folder: "Ability_Q", Actor: 7, TimeMS: 100000, Charges: 1},
		{Subject: "s", Folder: "Ability_Q", Actor: 7, TimeMS: 110000, Charges: 0},
	}
	slots := map[string]map[string]string{
		"s": {"Ability_Q": "Ability2"},
	}

	got := buildRechargeWindows(charges, rechargeTestRound(), slots, nil)
	if len(got) != 3 {
		t.Fatalf("windows = %+v", got)
	}
	last := got[len(got)-1]
	if last.StartMS != 110000 || last.EndMS != 150000 || !last.Recharge {
		t.Fatalf("projected window = %+v", last)
	}
}

func TestBuildRechargeWindowsIncludesBuyPhaseRefill(t *testing.T) {
	windows := []roundWindow{
		{RoundNumber: 1, StartMS: 0, EndMS: 100000, BuyEndMS: ptr(uint32(10000))},
		{RoundNumber: 2, StartMS: 100000, EndMS: 200000, BuyEndMS: ptr(uint32(120000))},
	}
	charges := []abilityChargeSample{
		{Subject: "s", Folder: "Ability_E", Actor: 7, TimeMS: 0, Charges: 2},
		{Subject: "s", Folder: "Ability_E", Actor: 7, TimeMS: 10000, Charges: 1},
		{Subject: "s", Folder: "Ability_E", Actor: 7, TimeMS: 20000, Charges: 0},
		{Subject: "s", Folder: "Ability_E", Actor: 7, TimeMS: 50000, Charges: 1},
		{Subject: "s", Folder: "Ability_E", Actor: 7, TimeMS: 60000, Charges: 2},
		{Subject: "s", Folder: "Ability_E", Actor: 7, TimeMS: 70000, Charges: 1},
		{Subject: "s", Folder: "Ability_E", Actor: 7, TimeMS: 110000, Charges: 2},
	}
	slots := map[string]map[string]string{
		"s": {"Ability_E": "Ability2"},
	}

	got := buildRechargeWindows(charges, windows, slots, nil)
	if len(got) != 3 {
		t.Fatalf("windows = %+v", got)
	}
	if got[2] != (cooldownWindow{
		Subject: "s", Slot: "Ability2", Folder: "Ability_E",
		Recharge: true, StartMS: 70000, EndMS: 110000, RefillMS: 110000,
	}) {
		t.Fatalf("buy-phase window = %+v", got[2])
	}
}

func TestBuildRechargeWindowsSkipsSignatureFolders(t *testing.T) {
	charges := []abilityChargeSample{
		{Subject: "s", Folder: "Ability_4", Actor: 7, TimeMS: 0, Charges: 1, Signature: true},
		{Subject: "s", Folder: "Ability_4", Actor: 7, TimeMS: 10000, Charges: 0, Signature: true},
		{Subject: "s", Folder: "Ability_4", Actor: 7, TimeMS: 50000, Charges: 1, Signature: true},
		{Subject: "s", Folder: "Ability_4", Actor: 7, TimeMS: 60000, Charges: 0, Signature: true},
		{Subject: "s", Folder: "Ability_4", Actor: 7, TimeMS: 100000, Charges: 1, Signature: true},
	}
	slots := map[string]map[string]string{
		"s": {"Ability_4": "Ability2"},
	}

	if got := buildRechargeWindows(charges, rechargeTestRound(), slots, nil); len(got) != 0 {
		t.Fatalf("kill-refresh signature produced timed recharges: %+v", got)
	}
}

func TestBuildRechargeWindowsSkipsFoldersWithTimerWindows(t *testing.T) {
	charges := []abilityChargeSample{
		{Subject: "s", Folder: "Ability_E", Actor: 7, TimeMS: 0, Charges: 1},
		{Subject: "s", Folder: "Ability_E", Actor: 7, TimeMS: 20000, Charges: 0},
		{Subject: "s", Folder: "Ability_E", Actor: 7, TimeMS: 50000, Charges: 1},
		{Subject: "s", Folder: "Ability_E", Actor: 7, TimeMS: 90000, Charges: 0},
		{Subject: "s", Folder: "Ability_E", Actor: 7, TimeMS: 120000, Charges: 1},
	}
	slots := map[string]map[string]string{
		"s": {"Ability_E": "Ability2"},
	}
	existing := []cooldownWindow{{
		Subject: "s", Slot: "Ability2", Folder: "Ability_E",
		StartMS: 20000, EndMS: 50000,
	}}

	if got := buildRechargeWindows(charges, rechargeTestRound(), slots, existing); len(got) != 0 {
		t.Fatalf("timer-covered folder also produced recharges: %+v", got)
	}
}
