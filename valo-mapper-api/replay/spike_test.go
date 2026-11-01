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

func TestResolveSpikeOwner(t *testing.T) {
	state := &stateScan{
		Actors: &stateActorView{
			ClassByActor: map[uint32]string{
				11: "/Game/Equippables/Spike/EquippableGroundPickup_C",
				12: "/Game/Equippables/Spike/EquippablePickupProjectile_C",
				20: "/Game/Characters/Wingman/Wingman_C",
			},
			SpawnByActor: map[uint32]Position{
				11: {X: 1175, Y: 800},
				12: {X: 900, Y: 700},
			},
		},
	}
	index := &playerIndex{subjectByPawn: map[uint32]string{42: "s1"}}
	instigatorByActor := map[uint32][]stateWrite{
		20: {{TimeMS: 1000, Value: 42}},
	}

	tests := []struct {
		name        string
		guid        uint32
		timeMS      uint32
		wantSubject string
		wantLoose   bool
		wantPos     Position
		wantHasPos  bool
		wantOK      bool
	}{
		{
			name: "owner pawn", guid: 42, timeMS: 1000,
			wantSubject: "s1", wantOK: true,
		},
		{
			name: "ground pickup", guid: 11, timeMS: 1000,
			wantLoose: true, wantPos: Position{X: 1175, Y: 800}, wantHasPos: true, wantOK: true,
		},
		{
			name: "pickup projectile", guid: 12, timeMS: 1000,
			wantLoose: true, wantPos: Position{X: 900, Y: 700}, wantHasPos: true, wantOK: true,
		},
		{
			name: "wingman instigator", guid: 20, timeMS: 1000,
			wantSubject: "s1", wantOK: true,
		},
		{
			name: "instigator write is later", guid: 20, timeMS: 500,
		},
		{
			name: "unknown actor", guid: 99, timeMS: 1000,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			subject, loose, position, hasPosition, ok := resolveSpikeOwner(
				test.guid, state, index, instigatorByActor, test.timeMS,
			)
			if subject != test.wantSubject || loose != test.wantLoose ||
				position != test.wantPos || hasPosition != test.wantHasPos || ok != test.wantOK {
				t.Fatalf("resolveSpikeOwner = %q/%v/%+v/%v/%v, want %q/%v/%+v/%v/%v",
					subject, loose, position, hasPosition, ok,
					test.wantSubject, test.wantLoose, test.wantPos, test.wantHasPos, test.wantOK)
			}
		})
	}
}

func TestResolveSpikeOwnerInstigatorDepth(t *testing.T) {
	state := &stateScan{Actors: &stateActorView{}}
	index := &playerIndex{subjectByPawn: map[uint32]string{42: "s1"}}

	chain := func(last uint32) map[uint32][]stateWrite {
		writes := make(map[uint32][]stateWrite, last-100+1)
		for actor := uint32(100); actor < last; actor++ {
			writes[actor] = []stateWrite{{TimeMS: 1000, Value: int64(actor + 1)}}
		}
		writes[last] = []stateWrite{{TimeMS: 1000, Value: 42}}
		return writes
	}

	// Seven intermediate actors stay inside the depth cap.
	within := chain(106)
	if subject, _, _, _, ok := resolveSpikeOwner(100, state, index, within, 1000); !ok || subject != "s1" {
		t.Fatalf("seven-hop instigator chain = %q/%v, want s1/true", subject, ok)
	}

	// A chain deeper than the cap is unresolved rather than guessed.
	deep := chain(109)
	if subject, _, _, _, ok := resolveSpikeOwner(100, state, index, deep, 1000); ok || subject != "" {
		t.Fatalf("ten-hop instigator chain = %q/%v, want unresolved", subject, ok)
	}
}

func TestBuildCustodySpansHidesSameTimestampTie(t *testing.T) {
	state := &stateScan{Actors: &stateActorView{}}
	index := &playerIndex{subjectByPawn: map[uint32]string{42: "s1", 43: "s2"}}
	timeline := &spikeTimeline{}
	warnings := newWarnings()
	writes := []stateWrite{
		{TimeMS: 11000, PacketID: 1, Actor: 555, Value: 42},
		{TimeMS: 11000, PacketID: 2, Actor: 555, Value: 43},
	}

	spans := buildCustodySpans(
		writes, state, index, &roundWindow{StartMS: 10000}, nil, timeline, warnings,
	)

	if len(spans) != 1 || spans[0].Subject != "" || spans[0].Loose {
		t.Fatalf("tie spans = %+v, want one unresolved span", spans)
	}
	if timeline.Ties != 1 {
		t.Fatalf("ties = %d, want 1", timeline.Ties)
	}
	if len(warnings.all()) != 1 {
		t.Fatalf("warnings = %v, want one tie warning", warnings.all())
	}
}

func TestResolvePlantSite(t *testing.T) {
	tests := []struct {
		name     string
		field    stateWrite
		hasField bool
		rpc      rpcWrite
		hasRPC   bool
		want     string
		warn     bool
	}{
		{name: "field A", field: stateWrite{Value: 0}, hasField: true, want: "A"},
		{name: "field B", field: stateWrite{Value: 1}, hasField: true, want: "B"},
		{name: "field C", field: stateWrite{Value: 2}, hasField: true, want: "C"},
		{name: "absent field means A", want: "A"},
		{
			name: "RPC fallback", rpc: rpcWrite{Value: "2"}, hasRPC: true, want: "C",
		},
		{
			name:  "field wins and warns",
			field: stateWrite{Value: 1}, hasField: true,
			rpc: rpcWrite{Value: "0"}, hasRPC: true,
			want: "B", warn: true,
		},
		{name: "unknown ordinal", field: stateWrite{Value: 9}, hasField: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, warned := resolvePlantSite(test.field, test.hasField, test.rpc, test.hasRPC)
			if got != test.want || warned != test.warn {
				t.Fatalf("resolvePlantSite = %q/%v, want %q/%v", got, warned, test.want, test.warn)
			}
		})
	}
}

func TestBuildSpikePlantsUsesPlantLocationForPosition(t *testing.T) {
	fields := &fieldScan{State: newFieldStateRows()}
	fields.State.PlantedAtSites = []stateWrite{{TimeMS: 20000, Value: 1}}
	fields.PlantSitesRPC = []rpcWrite{{TimeMS: 20000, Value: "2"}}
	fields.PlantLocations = []rpcWrite{{TimeMS: 20000, Value: "(1200.5,2400.5,0.0)"}}
	events := &eventScan{Plants: []rawSpike{{TimeMS: 20000}}}
	windows := []roundWindow{{RoundNumber: 1, StartMS: 10000, EndMS: 50000}}
	timeline := &spikeTimeline{Rounds: make([]spikeRound, 1)}
	warnings := newWarnings()

	buildSpikePlants(fields, nil, windows, events, timeline, warnings)

	round := timeline.Rounds[0]
	if !round.HasPlant || round.PlantMS != 10000 {
		t.Fatalf("plant = %+v, want at 10000", round)
	}
	if round.Site != "B" {
		t.Errorf("site = %q, want the field value B", round.Site)
	}
	if !round.HasPosition || round.Position != (Position{X: 1200.5, Y: 2400.5}) {
		t.Errorf("position = %+v, want the decoded plant location", round.Position)
	}
	if timeline.SiteWarnings != 1 || len(warnings.all()) == 0 {
		t.Errorf("site warnings = %d/%v, want a disagreement warning", timeline.SiteWarnings, warnings.all())
	}
}

func TestSpikeFrameAtTransitions(t *testing.T) {
	timeline := &spikeTimeline{Rounds: []spikeRound{{
		Custody: []spikeCustodySpan{
			{StartMS: 0, Subject: "s1"},
		},
		PlantMS:       1000,
		HasPlant:      true,
		Site:          "C",
		Position:      Position{X: 10, Y: 20},
		HasPosition:   true,
		DefusedMS:     2000,
		HasDefuse:     true,
		DetonatedMS:   3000,
		HasDetonation: true,
	}}}
	poseAt := func(subject string, timeMS uint32) (Position, bool) {
		return Position{X: 50, Y: 60}, subject == "s1"
	}
	puuidBySubject := map[string]string{"s1": "p1"}

	tests := []struct {
		timeMS uint32
		state  string
	}{
		{timeMS: 0, state: "carried"},
		{timeMS: 999, state: "carried"},
		{timeMS: 1000, state: "planted"},
		{timeMS: 1999, state: "planted"},
		{timeMS: 2000, state: "defused"},
		{timeMS: 2999, state: "defused"},
		{timeMS: 3000, state: "detonated"},
		{timeMS: 5000, state: "detonated"},
	}

	for _, test := range tests {
		frame := timeline.frameAt(0, test.timeMS, poseAt, puuidBySubject)
		if frame == nil {
			t.Fatalf("frame at %d was nil, want %s", test.timeMS, test.state)
		}
		if frame.State != test.state {
			t.Fatalf("frame at %d = %q, want %q", test.timeMS, frame.State, test.state)
		}
		if test.state != "carried" {
			if frame.Site != "C" || frame.X != 10 || frame.Y != 20 {
				t.Errorf("post-plant frame at %d = %+v, want site C at the plant position", test.timeMS, frame)
			}
		}
	}
}

func TestSpikeFrameAtStartsAtFirstCustodyWrite(t *testing.T) {
	timeline := &spikeTimeline{Rounds: []spikeRound{{
		Custody: []spikeCustodySpan{{StartMS: 500, Subject: "s1"}},
	}}}
	poseAt := func(subject string, timeMS uint32) (Position, bool) {
		return Position{X: 1, Y: 2}, true
	}

	if frame := timeline.frameAt(0, 0, poseAt, nil); frame != nil {
		t.Fatalf("frame before the first owner write = %+v, want nil", frame)
	}
	if frame := timeline.frameAt(0, 500, poseAt, nil); frame == nil ||
		frame.State != "carried" || frame.X != 1 || frame.Y != 2 {
		t.Fatalf("frame at the first owner write = %+v, want the carrier pose", frame)
	}
}

func TestSpikeFrameAtHidesCarriedWithoutAPose(t *testing.T) {
	timeline := &spikeTimeline{Rounds: []spikeRound{{
		Custody: []spikeCustodySpan{{StartMS: 0, Subject: "s1"}},
	}}}
	poseAt := func(subject string, timeMS uint32) (Position, bool) {
		return Position{}, false
	}

	if frame := timeline.frameAt(0, 0, poseAt, map[string]string{"s1": "p1"}); frame != nil {
		t.Fatalf("carried frame without a carrier pose = %+v, want nil", frame)
	}
}
