package replay

import (
	"encoding/json"
	"math"
	"path/filepath"
	"strings"
	"testing"

	"github.com/parquet-go/parquet-go"
)

func TestUtilityCatalogIsExactAndBuildAware(t *testing.T) {
	tests := []struct {
		build   string
		class   string
		want    bool
		ability string
	}{
		{"13.00", "Zone_Wraith_4_Smoke", true, "dark_cover"},
		{"13.00", "GameObject_Smonk_NewSmoke", false, ""},
		{"13.01", "GameObject_Smonk_NewSmoke", true, "ruse"},
		{"13.01", "GameObject_Deadeye_E_Trap", false, ""},
		{"13.02", "GameObject_Deadeye_E_Trap", true, "trademark"},
		{"13.08", "Pawn_BountyHunter_4_WolfHound", true, "prowler"},
		{"13.08", "Gameobject_Grenadier_E_SuppressionPulse", true, "zeropoint"},
		{"13.08", "Projectile_Wushu_4_Smoke", false, ""},
		{"13.08", "Ability_BountyHunter_4_WolfHoundBendable", false, ""},
		{"13.09", "GameObject_Smonk_NewSmoke", false, ""},
	}

	for _, test := range tests {
		t.Run(test.build+"/"+test.class, func(t *testing.T) {
			build, ok := utilityBuildNumber(test.build)
			entry, found := utilityCatalog[test.class]
			got := ok && build >= entry.minBuild && build <= 1308 && found
			if got != test.want {
				t.Fatalf("catalog inclusion = %v, want %v", got, test.want)
			}
			if got && entry.ability != test.ability {
				t.Fatalf("catalog ability id = %q, want %q", entry.ability, test.ability)
			}
		})
	}

	for classPath, entry := range utilityCatalog {
		if entry.ability == "" {
			t.Errorf("utility class %q has no ValoMapper ability id", classPath)
		}
	}
}

func TestBuildUtilityActorLivesHandlesDormancyAndSameTimeOrdering(t *testing.T) {
	class := "GameObject_Smonk_NewSmoke"
	position := &Position{X: 10, Y: 20}
	actor := &utilityActor{
		GUID:  9,
		Class: class,
		Events: []utilityActorEvent{
			{TimeMS: 100, PacketID: 1, Event: "open", ClassPath: class, Spawn: position},
			{TimeMS: 150, PacketID: 2, Event: "dormant"},
			{TimeMS: 200, PacketID: 3, Event: "wake"},
			{TimeMS: 300, PacketID: 4, Event: "close"},
			{TimeMS: 300, PacketID: 4, Event: "open", ClassPath: class, Spawn: position},
			{TimeMS: 400, PacketID: 5, Event: "close"},
			{TimeMS: 500, PacketID: 6, Event: "open", ClassPath: class, Spawn: position},
		},
	}
	entry := utilityCatalog[class]
	lives, invalid, missing := buildUtilityActorLives(actor, entry, 1000)
	if invalid != 0 || missing != 1 || len(lives) != 3 {
		t.Fatalf("lives/invalid/missing = %d/%d/%d, want 3/0/1", len(lives), invalid, missing)
	}
	if lives[0].openMS != 100 || lives[0].closeMS != 300 {
		t.Fatalf("first lifecycle = %d..%d, want 100..300", lives[0].openMS, lives[0].closeMS)
	}
	if lives[1].openMS != 300 || lives[1].closeMS != 400 {
		t.Fatalf("second lifecycle = %d..%d, want 300..400", lives[1].openMS, lives[1].closeMS)
	}

	zeroDuration := &utilityActor{GUID: 10, Class: class, Events: []utilityActorEvent{
		{TimeMS: 400, PacketID: 8, Event: "open", ClassPath: class, Spawn: position},
		{TimeMS: 400, PacketID: 8, Event: "close"},
	}}
	lives, invalid, missing = buildUtilityActorLives(zeroDuration, entry, 1000)
	if len(lives) != 0 || invalid != 1 || missing != 0 {
		t.Fatalf("zero-duration lifecycle = %d/%d/%d, want 0/1/0", len(lives), invalid, missing)
	}
}

func TestScanUtilitiesClipsRoundsResolvesOwnersAndSamplesMobileMovement(t *testing.T) {
	dir := t.TempDir()
	smokeClass := "GameObject_Smonk_NewSmoke"
	mobileClass := "Pawn_BountyHunter_4_WolfHound"
	blazeClass := "GameObject_Phoenix_Q_FlameWallManager_Production"
	actors := []stateActorRow{
		{TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, Event: "open", ClassPath: &smokeClass, SpawnX: float32Ptr(100), SpawnY: float32Ptr(200)},
		{TimeMS: 7000, PacketID: 2, ActorNetGUID: 700, Event: "close"},
		{TimeMS: 2000, PacketID: 3, ActorNetGUID: 701, Event: "open", ClassPath: &mobileClass, SpawnX: float32Ptr(300), SpawnY: float32Ptr(400)},
		{TimeMS: 7000, PacketID: 4, ActorNetGUID: 701, Event: "close"},
		{TimeMS: 2500, PacketID: 5, ActorNetGUID: 702, Event: "open", ClassPath: &smokeClass, SpawnX: float32Ptr(float32(math.NaN())), SpawnY: float32Ptr(0)},
		{TimeMS: 1000, PacketID: 6, ActorNetGUID: 703, Event: "open", ClassPath: &blazeClass, SpawnX: float32Ptr(500), SpawnY: float32Ptr(600)},
		{TimeMS: 7000, PacketID: 7, ActorNetGUID: 703, Event: "close"},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}

	ownerName, instigatorName := "Owner", "Instigator"
	actorOwner, intermediateOwner := int64(800), int64(901)
	pathField := "MulticastAddSmokeScreenPoint.Translation"
	pathStart, pathMiddle, pathEnd, invalidPath := "(10,20,0)", "(30,40,0)", "(50,60,0)", "invalid"
	ownerFields := []fieldRow{
		{TimeMS: 900, PacketID: 1, ActorNetGUID: 700, FieldName: &ownerName, ValueI64: &actorOwner},
		{TimeMS: 800, PacketID: 2, ActorNetGUID: 800, FieldName: &instigatorName, ValueI64: &intermediateOwner},
		{TimeMS: 2000, PacketID: 3, ActorNetGUID: 703, FieldName: &pathField, ValueStr: &pathStart},
		{TimeMS: 3000, PacketID: 4, ActorNetGUID: 703, FieldName: &pathField, ValueStr: &pathMiddle},
		{TimeMS: 3050, PacketID: 5, ActorNetGUID: 703, FieldName: &pathField, ValueStr: &pathMiddle},
		{TimeMS: 3500, PacketID: 6, ActorNetGUID: 703, FieldName: &pathField, ValueStr: &invalidPath},
		{TimeMS: 4000, PacketID: 7, ActorNetGUID: 703, FieldName: &pathField, ValueStr: &pathEnd},
		{TimeMS: 6500, PacketID: 8, ActorNetGUID: 703, FieldName: &pathField, ValueStr: &pathStart},
		{TimeMS: 7000, PacketID: 9, ActorNetGUID: 703, FieldName: &pathField, ValueStr: &pathEnd},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "fields.parquet"), ownerFields); err != nil {
		t.Fatal(err)
	}

	movement := []movementRow{
		{TimeMS: 2500, CharacterNetGUID: 701, PosX: 301, PosY: 401},
		{TimeMS: 2550, CharacterNetGUID: 701, PosX: 302, PosY: 402},
		{TimeMS: 3500, CharacterNetGUID: 701, PosX: 303, PosY: 403},
		{TimeMS: 4500, CharacterNetGUID: 701, PosX: 304, PosY: 404},
		{TimeMS: 6500, CharacterNetGUID: 701, PosX: 305, PosY: 405},
		{TimeMS: 7100, CharacterNetGUID: 701, PosX: 306, PosY: 406},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "movement.parquet"), movement); err != nil {
		t.Fatal(err)
	}

	pawn := uint32(901)
	index := newPlayerIndex(&Manifest{Players: []ManifestPlayer{{
		ActorNetGUID: 902, Subject: "00000000-0000-0000-0000-000000000001",
		CharacterNetGUID: &pawn, CharacterNetGUIDs: []uint32{pawn},
	}}})
	subject := normaliseUUID("00000000-0000-0000-0000-000000000001")
	puuid := pseudonymousID(subject)
	windows := []roundWindow{
		{RoundNumber: 1, StartMS: 0, EndMS: 4000},
		{RoundNumber: 2, StartMS: 4000, EndMS: 8000},
	}
	fields, err := scanFields(dir)
	if err != nil {
		t.Fatal(err)
	}
	utilities, warnings, err := scanUtilities(dir, "13.08", 8000, windows, index,
		map[string]string{subject: puuid}, nil, fields.UtilityOwners, fields.UtilityPaths)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 2 || len(utilities[0]) != 3 || len(utilities[1]) != 3 {
		t.Fatalf("round utility counts = %#v, want three in each round", utilities)
	}
	if utilities[0][0].StartTimeMS != 1000 || utilities[0][0].EndTimeMS != 4000 ||
		utilities[1][0].StartTimeMS != 0 || utilities[1][0].EndTimeMS != 3000 {
		t.Fatalf("stationary intervals not clipped to round windows: %#v %#v", utilities[0][0], utilities[1][0])
	}
	if utilities[0][0].OwnerPuuid != puuid || utilities[1][0].OwnerPuuid != puuid {
		t.Fatal("owner chain did not resolve to the manifest pawn across both round segments")
	}
	if utilities[0][0].AbilityID != "ruse" || utilities[0][1].AbilityID != "blaze" ||
		utilities[0][2].AbilityID != "prowler" {
		t.Fatalf("utility ability ids = %q/%q/%q, want ruse/blaze/prowler",
			utilities[0][0].AbilityID, utilities[0][1].AbilityID, utilities[0][2].AbilityID)
	}
	if len(utilities[0][2].Samples) != 2 || utilities[0][2].Samples[0].TimeMS != 2550 ||
		len(utilities[1][1].Samples) != 2 || utilities[1][1].Samples[0].TimeMS != 500 {
		t.Fatalf("mobile samples were not clipped or made round-relative: %#v %#v", utilities[0][2], utilities[1][1])
	}
	if len(utilities[0][1].Path) != 2 || utilities[0][1].Path[0].TimeMS != 2000 ||
		utilities[0][1].Path[1].TimeMS != 3000 || len(utilities[1][2].Path) != 2 ||
		utilities[1][2].Path[0].TimeMS != 0 || utilities[1][2].Path[1].TimeMS != 2500 {
		t.Fatalf("Blaze path points were not deduplicated and clipped by round: %#v %#v",
			utilities[0][1].Path, utilities[1][2].Path)
	}
	if utilities[0][1].Path[1].X != 30 || utilities[1][2].Path[1].X != 10 {
		t.Fatalf("Blaze path coordinates were not preserved: %#v %#v",
			utilities[0][1].Path, utilities[1][2].Path)
	}
	if warnings.MissingCloses != 1 || warnings.MissingPositions != 1 {
		t.Fatalf("warning counters = %#v, want missingClose=1 missingPosition=1", warnings)
	}

	payload, err := json.Marshal(utilities)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(payload), "GameObject_Smonk") {
		t.Fatalf("utility wire payload exposed actor internals: %s", payload)
	}
}

func TestResolveUtilityOwnerRejectsAmbiguousChains(t *testing.T) {
	ownerName, instigatorName := uint32(2), uint32(3)
	writes := map[uint32][]utilityOwnerWrite{
		1: {{TimeMS: 10, Owner: &ownerName}},
		2: {{TimeMS: 10, Instigator: &instigatorName}},
	}
	index := newPlayerIndex(&Manifest{Players: []ManifestPlayer{
		{ActorNetGUID: 11, Subject: "00000000-0000-0000-0000-000000000001", CharacterNetGUID: uint32Ptr(2)},
		{ActorNetGUID: 12, Subject: "00000000-0000-0000-0000-000000000002", CharacterNetGUID: uint32Ptr(3)},
	}})
	puuids := map[string]string{
		normaliseUUID("00000000-0000-0000-0000-000000000001"): "player-one",
		normaliseUUID("00000000-0000-0000-0000-000000000002"): "player-two",
	}
	if owner, hadLink, resolved := resolveUtilityOwner(1, 20, writes, index, nil, puuids); resolved || !hadLink || owner != "" {
		t.Fatalf("ambiguous chain resolved as %q/%v/%v", owner, hadLink, resolved)
	}
}

func TestUtilityWarningsAreBounded(t *testing.T) {
	counter := 0
	incrementUtilityWarning(&counter, maxUtilityWarnings+10)
	if counter != maxUtilityWarnings {
		t.Fatalf("warning count = %d, want cap %d", counter, maxUtilityWarnings)
	}
}

func TestSampleUtilityPathCapsPoints(t *testing.T) {
	writes := make([]utilityPathWrite, maxUtilityPathPoints+1)
	for i := range writes {
		writes[i] = utilityPathWrite{
			TimeMS: uint32(i),
			Position: Position{
				X: float64(i),
				Y: float64(i * 2),
			},
		}
	}

	samples, truncated := sampleUtilityPath(writes, 0)
	if !truncated || len(samples) != maxUtilityPathPoints {
		t.Fatalf("path output = %d points, truncated=%v; want capped at %d",
			len(samples), truncated, maxUtilityPathPoints)
	}
}

func TestScanUtilitiesOmitsUnsupportedBuildsWithoutFailing(t *testing.T) {
	utilities, warnings, err := scanUtilities(
		t.TempDir(),
		"13.09",
		1000,
		[]roundWindow{{StartMS: 0, EndMS: 1000}},
		nil,
		nil,
		nil,
		nil,
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 0 || warnings.UnsupportedBuild != 1 {
		t.Fatalf("unsupported build result = %#v/%#v", utilities, warnings)
	}
}

func float32Ptr(value float32) *float32 { return &value }

func uint32Ptr(value uint32) *uint32 { return &value }
