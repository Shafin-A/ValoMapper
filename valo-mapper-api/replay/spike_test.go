package replay

import "testing"

func TestBuildCustodySpansSeparatesPickupPositions(t *testing.T) {
	state := &stateScan{
		Actors: &stateActorView{
			ClassByActor: map[uint32]string{
				11: "/Game/Equippables/Spike/EquippableGroundPickup_C",
				12: "/Game/Equippables/Spike/EquippablePickupProjectile_C",
			},
			SpawnByActor: map[uint32]Position{
				11: {X: 1175, Y: 800},
				12: {X: 900, Y: 700},
			},
		},
		Outer: map[uint32]uint32{},
	}
	index := &playerIndex{subjectByActor: map[uint32]string{42: "s1"}}
	window := &roundWindow{StartMS: 10000}
	timeline := &spikeTimeline{}
	warnings := newWarnings()
	writes := []stateWrite{
		{TimeMS: 11000, PacketID: 1, Actor: 555, Value: 11},
		{TimeMS: 11500, PacketID: 2, Actor: 555, Value: 11},
		{TimeMS: 12000, PacketID: 3, Actor: 555, Value: 12},
		{TimeMS: 13000, PacketID: 4, Actor: 555, Value: 11},
		{TimeMS: 14000, PacketID: 5, Actor: 555, Value: 42},
	}

	spans := buildCustodySpans(writes, state, index, window, nil, timeline, warnings)

	want := []spikeCustodySpan{
		{StartMS: 1000, Loose: true, Position: Position{X: 1175, Y: 800}, HasPosition: true},
		{StartMS: 2000, Loose: true, Position: Position{X: 900, Y: 700}, HasPosition: true},
		{StartMS: 3000, Loose: true, Position: Position{X: 1175, Y: 800}, HasPosition: true},
		{StartMS: 4000, Subject: "s1"},
	}
	if len(spans) != len(want) {
		t.Fatalf("got %d spans, want %d: %+v", len(spans), len(want), spans)
	}
	for i := range want {
		if spans[i] != want[i] {
			t.Fatalf("span %d = %+v, want %+v", i, spans[i], want[i])
		}
	}
	if timeline.LooseSpans != 1 {
		t.Fatalf("loose spans = %d, want 1", timeline.LooseSpans)
	}
	if timeline.LooseUnplaced != 0 {
		t.Fatalf("loose unplaced = %d, want 0", timeline.LooseUnplaced)
	}
}

func TestBuildCustodySpansCountsLooseWithoutPosition(t *testing.T) {
	state := &stateScan{
		Actors: &stateActorView{
			ClassByActor: map[uint32]string{
				11: "/Game/Equippables/Spike/EquippableGroundPickup_C",
			},
			SpawnByActor: map[uint32]Position{},
		},
		Outer: map[uint32]uint32{},
	}
	timeline := &spikeTimeline{}
	warnings := newWarnings()
	writes := []stateWrite{
		{TimeMS: 11000, PacketID: 1, Actor: 555, Value: 11},
		{TimeMS: 12000, PacketID: 2, Actor: 555, Value: 11},
	}

	spans := buildCustodySpans(
		writes, state, &playerIndex{}, &roundWindow{StartMS: 10000}, nil, timeline, warnings,
	)

	if len(spans) != 1 || !spans[0].Loose || spans[0].HasPosition {
		t.Fatalf("spans = %+v, want one loose span without a position", spans)
	}
	if timeline.LooseUnplaced != 1 {
		t.Fatalf("loose unplaced = %d, want 1", timeline.LooseUnplaced)
	}
	if len(warnings.all()) != 1 {
		t.Fatalf("warnings = %v, want one de-duplicated warning", warnings.all())
	}
}

func TestSpikeFrameAtRendersLooseAndCarriedStates(t *testing.T) {
	timeline := &spikeTimeline{Rounds: []spikeRound{{
		Custody: []spikeCustodySpan{
			{StartMS: 0, Loose: true, Position: Position{X: 1175, Y: 800}, HasPosition: true},
			{StartMS: 500, Subject: "s1"},
			{StartMS: 1000, Loose: true, Position: Position{X: 2000, Y: 1500}, HasPosition: true},
		},
		PlantMS:     1500,
		HasPlant:    true,
		Site:        "B",
		Position:    Position{X: 2100, Y: 1600},
		HasPosition: true,
	}}}
	poseAt := func(subject string, timeMS uint32) (Position, bool) {
		if subject != "s1" {
			return Position{}, false
		}
		return Position{X: 50, Y: 60}, true
	}
	puuidBySubject := map[string]string{"s1": "p1"}

	tests := []struct {
		timeMS uint32
		want   *SpikeFrame
	}{
		{
			timeMS: 0,
			want:   &SpikeFrame{X: 1175, Y: 800, State: "loose"},
		},
		{
			timeMS: 600,
			want:   &SpikeFrame{X: 50, Y: 60, State: "carried", CarrierPuuid: "p1"},
		},
		{
			timeMS: 1200,
			want:   &SpikeFrame{X: 2000, Y: 1500, State: "loose"},
		},
		{
			timeMS: 1500,
			want:   &SpikeFrame{X: 2100, Y: 1600, State: "planted", Site: "B"},
		},
	}

	for _, test := range tests {
		got := timeline.frameAt(0, test.timeMS, poseAt, puuidBySubject)
		if got == nil {
			t.Fatalf("frame at %d was nil, want %+v", test.timeMS, test.want)
		}
		if *got != *test.want {
			t.Fatalf("frame at %d = %+v, want %+v", test.timeMS, *got, *test.want)
		}
	}
}

func TestSpikeFrameAtHidesLooseWithoutPosition(t *testing.T) {
	timeline := &spikeTimeline{Rounds: []spikeRound{{
		Custody: []spikeCustodySpan{
			{StartMS: 0, Loose: true},
			{StartMS: 500, Subject: "s1"},
		},
	}}}
	poseAt := func(subject string, timeMS uint32) (Position, bool) {
		return Position{X: 1, Y: 2}, true
	}

	if frame := timeline.frameAt(0, 0, poseAt, nil); frame != nil {
		t.Fatalf("loose frame without a position = %+v, want nil", frame)
	}
	if frame := timeline.frameAt(0, 600, poseAt, nil); frame == nil ||
		frame.State != "carried" || frame.X != 1 || frame.Y != 2 {
		t.Fatalf("carried frame = %+v, want the carrier pose", frame)
	}
}

func TestAppendSpikeSpanMergesIdenticalLooseSpans(t *testing.T) {
	position := Position{X: 10, Y: 20}
	spans := appendSpikeSpan(nil, spikeCustodySpan{
		StartMS: 0, Loose: true, Position: position, HasPosition: true,
	})
	spans = appendSpikeSpan(spans, spikeCustodySpan{
		StartMS: 100, Loose: true, Position: position, HasPosition: true,
	})
	if len(spans) != 1 {
		t.Fatalf("identical loose spans = %+v, want one span", spans)
	}

	spans = appendSpikeSpan(spans, spikeCustodySpan{
		StartMS: 200, Loose: true, Position: Position{X: 30, Y: 40}, HasPosition: true,
	})
	if len(spans) != 2 {
		t.Fatalf("moved loose span = %+v, want a new span", spans)
	}
}
