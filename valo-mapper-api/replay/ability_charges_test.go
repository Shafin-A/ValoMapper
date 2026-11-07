package replay

import "testing"

func TestAbilitySlotForClass(t *testing.T) {
	tests := []struct {
		class string
		slot  string
		ok    bool
	}{
		{"/Game/Characters/Killjoy/S0/Ability_E/Ability_Killjoy_E_Turret.Ability_Killjoy_E_Turret_C", "Ability2", true},
		{"/Game/Characters/Pine/S0/Ability_4/Ability_Pine_4_UsableTP.Ability_Pine_4_UsableTP_C", "Grenade", true},
		{"/Game/Characters/Veto/S0/Ability_Q/Ability_Veto_Q_Crosscut.Ability_Veto_Q_Crosscut_C", "Ability1", true},
		{"/Game/Characters/Viper/S0/Ability_X/Ability_Viper_X_VipersPit.Ability_Viper_X_VipersPit_C", "Ultimate", true},
		{"/Game/Characters/Killjoy/S0/Ability_C/Ability_Killjoy_C_Nanoswarm.Ability_Killjoy_C_Nanoswarm_C", "Grenade", true},
		{"/Game/Characters/Hunter/S0/Ability_4/Ability_Hunter_4_BoltExplosive.Ability_Hunter_4_BoltExplosive_C", "Ability1", true},
		{"/Game/Characters/Hunter/S0/Ability_Q/Ability_Hunter_Q_RevealBolt_Signature.Ability_Hunter_Q_RevealBolt_Signature_C", "Ability2", true},
		{"/Game/Characters/Hunter/S0/Ability_E/Drone/Ability_Hunter_E_DeployDrone.Ability_Hunter_E_DeployDrone_C", "Grenade", true},
		{"/Game/Characters/Sarge/S0/Ability_MapTargetSmoke/Ability_Sarge_4_MapTargetSmoke_Production.Ability_Sarge_4_MapTargetSmoke_Production_C", "Grenade", true},
		{"/Game/Characters/Sarge/S0/Ability_Molotov/Ability_Sarge_Q_Molotov_Production.Ability_Sarge_Q_Molotov_Production_C", "Ability1", true},
		{"/Game/Characters/Sarge/S0/Ability_SpeedStim/Ability_Sarge_E_SpeedStim.Ability_Sarge_E_SpeedStim_C", "Ability2", true},
		{"/Game/Characters/BountyHunter/S0/Ability_E/Ability_E_BountyHunter_ReconDivebomb.Ability_E_BountyHunter_ReconDivebomb_C", "Ability2", true},
		{"/Game/Characters/Unknown/Pawn_Unknown", "", false},
	}

	for _, test := range tests {
		slot, ok := abilitySlotForClass(test.class)
		if ok != test.ok || slot != test.slot {
			t.Errorf("abilitySlotForClass(%q) = %q/%v, want %q/%v",
				test.class, slot, ok, test.slot, test.ok)
		}
	}
}

func TestAbilityChargePointsForRoundSeedsZeroBeforePurchase(t *testing.T) {
	window := roundWindow{RoundNumber: 1, StartMS: 1000, EndMS: 5000}
	samples := []abilityChargeSample{
		{Subject: "s", Folder: "Ability_4", Slot: "Grenade", TimeMS: 3000, Charges: 1},
	}
	slots := map[string]string{"Ability_4": "Grenade"}
	chargeFolders := map[string]bool{"Ability_4": true}

	points := abilityChargePointsForRound(
		samples, "s", &window, slots, chargeFolders,
	)
	got := points["Grenade"]
	if len(got) != 2 || got[0] != (AbilityChargePoint{TimeMS: 0, Charges: 0}) ||
		got[1] != (AbilityChargePoint{TimeMS: 2000, Charges: 1}) {
		t.Fatalf("points = %+v", got)
	}
}

func TestAbilityChargePointsForRoundSeedsCarriedCharges(t *testing.T) {
	window := roundWindow{RoundNumber: 2, StartMS: 1000, EndMS: 5000}
	samples := []abilityChargeSample{
		{Subject: "s", Folder: "Ability_4", Slot: "Grenade", TimeMS: 500, Charges: 2},
		{Subject: "s", Folder: "Ability_4", Slot: "Grenade", TimeMS: 3000, Charges: 1},
	}
	slots := map[string]string{"Ability_4": "Grenade"}
	chargeFolders := map[string]bool{"Ability_4": true}

	points := abilityChargePointsForRound(
		samples, "s", &window, slots, chargeFolders,
	)
	got := points["Grenade"]
	if len(got) != 2 || got[0] != (AbilityChargePoint{TimeMS: 0, Charges: 2}) ||
		got[1] != (AbilityChargePoint{TimeMS: 2000, Charges: 1}) {
		t.Fatalf("points = %+v", got)
	}
}

func TestBuildAbilityChargeSamples(t *testing.T) {
	const pawn = uint32(901)
	const subject = "00000000-0000-0000-0000-000000000001"
	class := "/Game/Characters/Killjoy/S0/Ability_E/Ability_Killjoy_E_Turret.Ability_Killjoy_E_Turret_C"

	raw := newFieldStateRows()
	raw.AbilityCharges = []abilityChargeWrite{
		{TimeMS: 1000, PacketID: 1, Actor: 700, Charges: 1},
		{TimeMS: 2000, PacketID: 2, Actor: 700, Charges: 0},
	}
	raw.OwnerWrites = []stateWrite{
		{TimeMS: 900, PacketID: 1, Actor: 700, Value: int64(pawn)},
	}
	actors := &stateActorView{ClassByActor: map[uint32]string{700: class}}
	index := newPlayerIndex(&Manifest{Players: []ManifestPlayer{{
		ActorNetGUID: 100, Subject: subject,
		CharacterNetGUID: ptr(pawn), CharacterNetGUIDs: []uint32{pawn},
	}}})

	samples, writes, unresolved, unknownSlot := buildAbilityChargeSamples(
		&raw, index, actors,
	)
	if writes != 2 || unresolved != 0 || unknownSlot != 0 {
		t.Fatalf("counts = %d/%d/%d, want 2/0/0", writes, unresolved, unknownSlot)
	}
	if len(samples) != 2 || samples[0].Subject != subject ||
		samples[0].Slot != "Ability2" || samples[0].Charges != 1 ||
		samples[1].Charges != 0 {
		t.Fatalf("samples = %+v", samples)
	}
}

func TestBuildAbilityChargeSamplesSkipsUnknownClassAndOwner(t *testing.T) {
	raw := newFieldStateRows()
	raw.AbilityCharges = []abilityChargeWrite{
		{TimeMS: 1000, PacketID: 1, Actor: 700, Charges: 1},
		{TimeMS: 1000, PacketID: 2, Actor: 701, Charges: 1},
	}
	actors := &stateActorView{ClassByActor: map[uint32]string{
		700: "/Game/Characters/Unknown/Pawn_Unknown",
		701: "/Game/Characters/Killjoy/S0/Ability_E/Ability_Killjoy_E_Turret.Ability_Killjoy_E_Turret_C",
	}}
	index := newPlayerIndex(&Manifest{})

	samples, _, unresolved, unknownSlot := buildAbilityChargeSamples(&raw, index, actors)
	if len(samples) != 0 || unresolved != 1 || unknownSlot != 1 {
		t.Fatalf("samples/counts = %d/%d/%d, want 0/1/1",
			len(samples), unresolved, unknownSlot)
	}
}

func TestAbilityChargePointsForRound(t *testing.T) {
	window := roundWindow{RoundNumber: 1, StartMS: 1000, EndMS: 3000}
	samples := []abilityChargeSample{
		{Subject: "s", Slot: "Ability2", TimeMS: 500, PacketID: 1, Charges: 2},
		{Subject: "s", Slot: "Ability2", TimeMS: 1500, PacketID: 2, Charges: 1},
		{Subject: "s", Slot: "Ability2", TimeMS: 2500, PacketID: 3, Charges: 0},
	}

	points := abilityChargePointsForRound(samples, "s", &window, nil, nil)
	got := points["Ability2"]
	if len(got) != 3 || got[0].TimeMS != 0 || got[0].Charges != 2 ||
		got[1].TimeMS != 500 || got[1].Charges != 1 ||
		got[2].TimeMS != 1500 || got[2].Charges != 0 {
		t.Fatalf("points = %+v", got)
	}
}
