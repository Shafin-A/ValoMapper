package replay

import "testing"

func TestBuildUltimateSamplesResolvesPlayerStateActor(t *testing.T) {
	const subject = "00000000-0000-0000-0000-000000000001"
	index := newPlayerIndex(&Manifest{Players: []ManifestPlayer{{
		ActorNetGUID: 100, Subject: subject,
	}}})

	samples, unresolved := buildUltimateSamples(
		[]ultimatePointWrite{
			{TimeMS: 1000, PacketID: 1, Actor: 100, Points: 3},
			{TimeMS: 2000, PacketID: 2, Actor: 999, Points: 4},
		},
		[]ultimateActiveWrite{
			{TimeMS: 1500, PacketID: 3, Actor: 100, Active: true},
		},
		index,
	)
	if unresolved != 1 {
		t.Fatalf("unresolved = %d, want 1", unresolved)
	}
	if len(samples) != 2 {
		t.Fatalf("samples = %+v", samples)
	}
	if samples[0].Subject != subject || samples[0].Kind != ultimateKindPoints ||
		samples[0].Points != 3 {
		t.Fatalf("point sample = %+v", samples[0])
	}
	if samples[1].Kind != ultimateKindActive || !samples[1].Active {
		t.Fatalf("active sample = %+v", samples[1])
	}
}

func TestUltimatePointsForRoundMergesPointsAndActive(t *testing.T) {
	window := roundWindow{RoundNumber: 1, StartMS: 1000, EndMS: 3000}
	samples := []ultimateSample{
		{Subject: "s", TimeMS: 500, PacketID: 1, Kind: ultimateKindPoints, Points: 2},
		{Subject: "s", TimeMS: 500, PacketID: 1, Kind: ultimateKindActive, Active: false},
		{Subject: "q", TimeMS: 500, PacketID: 2, Kind: ultimateKindPoints, Points: 1},
		{Subject: "s", TimeMS: 1500, PacketID: 3, Kind: ultimateKindPoints, Points: 3},
		{Subject: "s", TimeMS: 1600, PacketID: 4, Kind: ultimateKindActive, Active: true},
		{Subject: "s", TimeMS: 2000, PacketID: 5, Kind: ultimateKindActive, Active: false},
	}

	points := ultimatePointsForRound(samples, "s", &window)
	want := []UltimatePoint{
		{TimeMS: 0, Points: 2},
		{TimeMS: 500, Points: 3},
		{TimeMS: 600, Points: 3, Active: true},
		{TimeMS: 1000, Points: 3},
	}
	if len(points) != len(want) {
		t.Fatalf("points = %+v, want %+v", points, want)
	}
	for i := range want {
		if points[i] != want[i] {
			t.Fatalf("point %d = %+v, want %+v", i, points[i], want[i])
		}
	}
}

func TestUltimatePointsForRoundSeedsZeroWithoutWrites(t *testing.T) {
	window := roundWindow{RoundNumber: 1, StartMS: 1000, EndMS: 3000}
	samples := []ultimateSample{
		{Subject: "other", TimeMS: 1500, PacketID: 1, Kind: ultimateKindPoints, Points: 4},
	}

	points := ultimatePointsForRound(samples, "s", &window)
	if len(points) != 1 || points[0] != (UltimatePoint{TimeMS: 0, Points: 0}) {
		t.Fatalf("points = %+v", points)
	}
}

func TestUltimatePointsForRoundStopsAtRoundEnd(t *testing.T) {
	window := roundWindow{RoundNumber: 1, StartMS: 1000, EndMS: 3000}
	samples := []ultimateSample{
		{Subject: "s", TimeMS: 1000, PacketID: 1, Kind: ultimateKindPoints, Points: 1},
		{Subject: "s", TimeMS: 3001, PacketID: 2, Kind: ultimateKindPoints, Points: 9},
	}

	points := ultimatePointsForRound(samples, "s", &window)
	if len(points) != 1 || points[0].Points != 1 {
		t.Fatalf("points = %+v", points)
	}
}

func TestBuildCooldownWindowsResolvesOwnerAndSlot(t *testing.T) {
	const subject = "00000000-0000-0000-0000-000000000001"
	const pawn = uint32(200)
	index := newPlayerIndex(&Manifest{Players: []ManifestPlayer{{
		ActorNetGUID: 100, Subject: subject,
		CharacterNetGUID: ptr(pawn), CharacterNetGUIDs: []uint32{pawn},
	}}})
	actors := &stateActorView{ClassByActor: map[uint32]string{
		700: "/Game/Characters/Killjoy/S0/Ability_E/Ability_Killjoy_E_Turret.Ability_Killjoy_E_Turret_C",
	}}
	owners := map[uint32][]stateWrite{
		700: {{TimeMS: 500, PacketID: 1, Actor: 700, Value: int64(pawn)}},
	}

	windows, unresolved, unknownSlot := buildCooldownWindows(
		[]cooldownWrite{
			{TimeMS: 1000, PacketID: 2, Actor: 700, Kind: cooldownKindSeconds, Seconds: 60},
			{TimeMS: 1000, PacketID: 2, Actor: 700, Kind: cooldownKindActive, Active: true},
			{TimeMS: 61000, PacketID: 3, Actor: 700, Kind: cooldownKindActive, Active: false},
			{TimeMS: 62000, PacketID: 4, Actor: 700, Kind: cooldownKindSeconds, Seconds: 20},
			{TimeMS: 62000, PacketID: 4, Actor: 700, Kind: cooldownKindActive, Active: true},
		},
		index, actors, owners, nil,
	)
	if unresolved != 0 || unknownSlot != 0 {
		t.Fatalf("counts = %d/%d", unresolved, unknownSlot)
	}
	if len(windows) != 2 {
		t.Fatalf("windows = %+v", windows)
	}
	if windows[0].Subject != subject || windows[0].Slot != "Ability2" ||
		windows[0].StartMS != 1000 || windows[0].EndMS != 61000 {
		t.Fatalf("first window = %+v", windows[0])
	}
	if windows[1].StartMS != 62000 || windows[1].EndMS != 82000 {
		t.Fatalf("second window = %+v", windows[1])
	}
}

func TestBuildCooldownWindowsSkipsUnknownSlotAndOwner(t *testing.T) {
	actors := &stateActorView{ClassByActor: map[uint32]string{
		700: "/Game/Characters/Unknown/Pawn_Unknown",
		701: "/Game/Characters/Killjoy/S0/Ability_E/Ability_Killjoy_E_Turret.Ability_Killjoy_E_Turret_C",
	}}
	windows, unresolved, unknownSlot := buildCooldownWindows(
		[]cooldownWrite{
			{TimeMS: 1000, PacketID: 2, Actor: 700, Kind: cooldownKindSeconds, Seconds: 60},
			{TimeMS: 1000, PacketID: 2, Actor: 700, Kind: cooldownKindActive, Active: true},
			{TimeMS: 1000, PacketID: 2, Actor: 701, Kind: cooldownKindSeconds, Seconds: 60},
			{TimeMS: 1000, PacketID: 2, Actor: 701, Kind: cooldownKindActive, Active: true},
		},
		newPlayerIndex(&Manifest{}), actors, nil, nil,
	)
	if len(windows) != 0 || unresolved != 1 || unknownSlot != 1 {
		t.Fatalf("windows/counts = %d/%d/%d", len(windows), unresolved, unknownSlot)
	}
}

func TestCooldownWindowsForRoundSkipsRefilledRecharge(t *testing.T) {
	round := roundWindow{RoundNumber: 2, StartMS: 1000, EndMS: 5000}
	windows := []cooldownWindow{
		{Subject: "s", Slot: "Ability2", Folder: "Ability_Q", Recharge: true, StartMS: 0, EndMS: 3000, RefillMS: 500},
	}

	got := cooldownWindowsForRound(windows, "s", &round, nil)
	if len(got["Ability2"]) != 0 {
		t.Fatalf("refilled recharge leaked into the next round: %+v", got)
	}
}

func TestCooldownWindowsForRoundKeepsRechargeEndPastRound(t *testing.T) {
	round := roundWindow{RoundNumber: 1, StartMS: 1000, EndMS: 3000}
	windows := []cooldownWindow{
		{Subject: "s", Slot: "Ability2", Folder: "Ability_Q", Recharge: true, StartMS: 2000, EndMS: 6000},
	}

	got := cooldownWindowsForRound(windows, "s", &round, nil)
	points := got["Ability2"]
	if len(points) != 1 {
		t.Fatalf("windows = %+v", points)
	}
	if points[0].StartTimeMS != 1000 || points[0].EndTimeMS != 5000 || !points[0].Recharge {
		t.Fatalf("recharge window = %+v", points[0])
	}
}

func TestCooldownWindowsForRoundClipsTimerEnd(t *testing.T) {
	round := roundWindow{RoundNumber: 1, StartMS: 1000, EndMS: 3000}
	windows := []cooldownWindow{
		{Subject: "s", Slot: "Ability2", Folder: "Ability_E", StartMS: 2000, EndMS: 6000},
	}

	got := cooldownWindowsForRound(windows, "s", &round, nil)
	points := got["Ability2"]
	if len(points) != 1 {
		t.Fatalf("windows = %+v", points)
	}
	if points[0].StartTimeMS != 1000 || points[0].EndTimeMS != 2000 || points[0].Recharge {
		t.Fatalf("timer window = %+v", points[0])
	}
}

func TestCooldownWindowsForRoundClipsToRound(t *testing.T) {
	round := roundWindow{RoundNumber: 1, StartMS: 1000, EndMS: 3000}
	windows := []cooldownWindow{
		{Subject: "s", Slot: "Ability2", StartMS: 500, EndMS: 4000},
		{Subject: "s", Slot: "Ability2", StartMS: 1500, EndMS: 2500},
		{Subject: "q", Slot: "Ability2", StartMS: 1500, EndMS: 2500},
	}

	got := cooldownWindowsForRound(windows, "s", &round, nil)
	points := got["Ability2"]
	if len(points) != 2 {
		t.Fatalf("windows = %+v", points)
	}
	if points[0] != (CooldownWindow{StartTimeMS: 0, EndTimeMS: 2000}) {
		t.Fatalf("clipped window = %+v", points[0])
	}
	if points[1] != (CooldownWindow{StartTimeMS: 500, EndTimeMS: 1500}) {
		t.Fatalf("inside window = %+v", points[1])
	}
}
