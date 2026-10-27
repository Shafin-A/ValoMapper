package replay

import (
	"math"
	"path/filepath"
	"testing"

	"github.com/parquet-go/parquet-go"
)

const testSubject = "11111111-2222-3333-4444-555555555555"

func TestNormaliseFrameHz(t *testing.T) {
	cases := []struct {
		in    int
		want  int
		valid bool
	}{
		{0, defaultFrameHz, true},
		{8, 8, true},
		{15, 15, true},
		{5, defaultFrameHz, false},
		{30, defaultFrameHz, false},
		{-1, defaultFrameHz, false},
	}

	for _, testCase := range cases {
		got, valid := NormaliseFrameHz(testCase.in)
		if got != testCase.want || valid != testCase.valid {
			t.Errorf("NormaliseFrameHz(%d) = %d/%v, want %d/%v",
				testCase.in, got, valid, testCase.want, testCase.valid)
		}
	}
}

func TestBinWidthMS(t *testing.T) {
	if width := binWidthMS(8); width != 125 {
		t.Errorf("8 Hz bin = %d", width)
	}
	if width := binWidthMS(15); width != 67 {
		t.Errorf("15 Hz bin = %d", width)
	}
}

func TestScanMovementKeepsLastRowPerBin(t *testing.T) {
	dir := t.TempDir()
	pawn := uint32(200)
	writeMovementRows(t, dir, []movementRow{
		{TimeMS: 900, CharacterNetGUID: pawn, PosX: 1, PosY: 1},    // before the round
		{TimeMS: 1000, CharacterNetGUID: pawn, PosX: 10, PosY: 20}, // bin 0
		{TimeMS: 1124, CharacterNetGUID: pawn, PosX: 30, PosY: 40}, // bin 0, wins
		{TimeMS: 1125, CharacterNetGUID: pawn, PosX: 50, PosY: 60}, // bin 1
	})

	windows := []roundWindow{{RoundNumber: 1, StartMS: 1000, EndMS: 5000}}
	index := newPlayerIndex(&Manifest{Players: []ManifestPlayer{{
		Subject:          testSubject,
		CharacterNetGUID: &pawn,
	}}})

	scan, err := scanMovement(dir, windows, index, 8)
	if err != nil {
		t.Fatalf("scanMovement: %v", err)
	}

	samples := scan.samplesFor(0, testSubject)
	if len(samples) != 2 {
		t.Fatalf("samples = %+v", samples)
	}
	if samples[0].TimeMS != 0 || samples[0].X != 30 || samples[0].Y != 40 {
		t.Errorf("bin 0 = %+v", samples[0])
	}
	if samples[1].TimeMS != 125 || samples[1].X != 50 {
		t.Errorf("bin 1 = %+v", samples[1])
	}
}

func TestScanMovementDropsUnmatchedAndNonFiniteRows(t *testing.T) {
	dir := t.TempDir()
	pawn := uint32(200)
	writeMovementRows(t, dir, []movementRow{
		{TimeMS: 1000, CharacterNetGUID: pawn, PosX: 10, PosY: 20},
		{TimeMS: 1001, CharacterNetGUID: 999, PosX: 10, PosY: 20},
		{TimeMS: 1002, CharacterNetGUID: pawn, PosX: float32(math.NaN()), PosY: 20},
	})

	windows := []roundWindow{{RoundNumber: 1, StartMS: 1000, EndMS: 5000}}
	index := newPlayerIndex(&Manifest{Players: []ManifestPlayer{{
		Subject:          testSubject,
		CharacterNetGUID: &pawn,
	}}})

	scan, err := scanMovement(dir, windows, index, 8)
	if err != nil {
		t.Fatalf("scanMovement: %v", err)
	}
	if scan.UnmatchedRows != 1 {
		t.Errorf("unmatched rows = %d", scan.UnmatchedRows)
	}
	if samples := scan.samplesFor(0, testSubject); len(samples) != 1 {
		t.Errorf("samples = %+v", samples)
	}
}

func TestInsertKeyframesPinsTheLastPoseBeforeTheEvent(t *testing.T) {
	samples := []timelineSample{
		{TimeMS: 0, X: 1, Y: 1},
		{TimeMS: 125, X: 2, Y: 2},
		{TimeMS: 250, X: 3, Y: 3},
	}
	keyframes := []uint32{0, 200, 250, 400}

	got := insertKeyframes(samples, keyframes)

	wantTimes := []uint32{0, 125, 200, 250, 400}
	if len(got) != len(wantTimes) {
		t.Fatalf("keyframed = %+v", got)
	}
	for i, want := range wantTimes {
		if got[i].TimeMS != want {
			t.Fatalf("sample %d time = %d, want %d (%+v)", i, got[i].TimeMS, want, got)
		}
	}
	// The 200 ms keyframe holds the 125 ms pose; the 400 ms keyframe holds the
	// 250 ms pose rather than inventing a new one.
	if got[2].X != 2 {
		t.Errorf("200 ms keyframe = %+v", got[2])
	}
	if got[4].X != 3 {
		t.Errorf("400 ms keyframe = %+v", got[4])
	}
}

func TestInsertKeyframesIgnoresLeadingEvents(t *testing.T) {
	samples := []timelineSample{{TimeMS: 500, X: 4, Y: 4}}
	got := insertKeyframes(samples, []uint32{0, 100, 500})
	if len(got) != 1 || got[0].TimeMS != 500 {
		t.Fatalf("keyframed = %+v", got)
	}
}

func TestInsertTeleportCuts(t *testing.T) {
	samples := []timelineSample{
		{TimeMS: 0, X: 0, Y: 0},
		{TimeMS: 125, X: 4000, Y: 0}, // 4000 cm in 125 ms
		{TimeMS: 250, X: 4100, Y: 0},
	}

	got, cuts := insertTeleportCuts(samples)
	if cuts != 1 {
		t.Fatalf("cuts = %d (%+v)", cuts, got)
	}
	if len(got) != 4 {
		t.Fatalf("samples = %+v", got)
	}
	if got[1].TimeMS != 124 || got[1].X != 0 {
		t.Errorf("pre-jump cut = %+v", got[1])
	}
	if got[2].TimeMS != 125 || got[2].X != 4000 {
		t.Errorf("post-jump pose = %+v", got[2])
	}
}

func TestInsertTeleportCutsIgnoresSlowMovement(t *testing.T) {
	samples := []timelineSample{
		{TimeMS: 0, X: 0, Y: 0},
		{TimeMS: 125, X: 90, Y: 0},
		{TimeMS: 250, X: 180, Y: 0},
	}

	if _, cuts := insertTeleportCuts(samples); cuts != 0 {
		t.Errorf("cuts = %d", cuts)
	}
}

func TestInsertTeleportCutsIgnoresLongGaps(t *testing.T) {
	// A gap longer than the teleport window is a missing sample, not a jump;
	// the client handles it with the interpolation gap rule.
	samples := []timelineSample{
		{TimeMS: 0, X: 0, Y: 0},
		{TimeMS: 2000, X: 9000, Y: 0},
	}

	if _, cuts := insertTeleportCuts(samples); cuts != 0 {
		t.Errorf("cuts = %d", cuts)
	}
}

func TestRoundKeyframesIncludesStartBuyEndEventsAndEnd(t *testing.T) {
	buyEnd := uint32(5000)
	window := &roundWindow{RoundNumber: 1, StartMS: 1000, EndMS: 40000, BuyEndMS: &buyEnd}
	log := &roundLog{Events: []Event{
		{EventType: "kill", TimeSinceRoundStartMillis: 15000},
		{EventType: "spike_planted", TimeSinceRoundStartMillis: 20000},
	}}

	got := roundKeyframes(window, log, 39000)
	want := []uint32{0, 4000, 15000, 20000, 39000}
	if len(got) != len(want) {
		t.Fatalf("keyframes = %v", got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("keyframes = %v, want %v", got, want)
		}
	}
}

func TestAssembleFramesUnionsSampleTimes(t *testing.T) {
	players := []Player{{Puuid: "a"}, {Puuid: "b"}}
	timelines := map[string][]timelineSample{
		"a": {
			{TimeMS: 0, X: 1, HP: 73, Credits: 900, Alive: true, WeaponID: "GUN"},
			{TimeMS: 125, X: 2, HP: 0, Credits: 900, Alive: false},
		},
		"b": {{TimeMS: 0, X: 3, HP: 100, Alive: true}},
	}

	frames := assembleFrames(players, timelines)
	if len(frames) != 2 {
		t.Fatalf("frames = %+v", frames)
	}
	if len(frames[0].Players) != 2 || len(frames[1].Players) != 1 {
		t.Errorf("frame players = %d/%d", len(frames[0].Players), len(frames[1].Players))
	}
	if frames[0].Players[0].Puuid != "a" || frames[0].Players[1].Puuid != "b" {
		t.Errorf("player order = %+v", frames[0].Players)
	}
	if frames[0].Players[0].HP != 73 || frames[0].Players[0].Credits != 900 ||
		!frames[0].Players[0].Alive || frames[0].Players[0].WeaponID != "GUN" {
		t.Errorf("copied state = %+v", frames[0].Players[0])
	}
	if frames[1].Players[0].Alive {
		t.Errorf("death was not copied: %+v", frames[1].Players[0])
	}
}

func TestBuildTimelineFramesWarnsAboutMissingPlayers(t *testing.T) {
	players := []Player{{Puuid: "vrf-a"}}
	puuidBySubject := map[string]string{testSubject: "vrf-a"}
	windows := []roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 1000}}
	scan := &movementScan{
		BinMS:     125,
		timelines: []map[string][]timelineSample{{}},
	}
	warnings := newWarnings()

	frames, stats := buildTimelineFrames(players, puuidBySubject, windows, scan, nil, nil, warnings)
	if len(frames) != 1 || len(frames[0]) != 0 {
		t.Fatalf("frames = %+v", frames)
	}
	if stats.Missing != 1 {
		t.Errorf("missing = %d", stats.Missing)
	}
	if len(warnings.all()) == 0 {
		t.Error("expected a missing-movement warning")
	}
}

func writeMovementRows(t *testing.T, dir string, rows []movementRow) {
	t.Helper()
	if err := parquet.WriteFile(filepath.Join(dir, "movement.parquet"), rows); err != nil {
		t.Fatalf("write movement: %v", err)
	}
}
