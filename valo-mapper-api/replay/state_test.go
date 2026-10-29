package replay

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"github.com/parquet-go/parquet-go"
)

func TestParseDamageChild(t *testing.T) {
	tests := []struct {
		name     string
		field    string
		function string
		index    int
		member   string
		ok       bool
	}{
		{
			name:     "point array changed component",
			field:    "MulticastNotifyDamage_Point.LifeChangeEvents[0].ChangedComponent",
			function: "MulticastNotifyDamage_Point",
			index:    0,
			member:   "ChangedComponent",
			ok:       true,
		},
		{
			name:     "base array multi digit life result",
			field:    "MulticastNotifyDamage_Base.LifeChangeEvents[12].LifeResult",
			function: "MulticastNotifyDamage_Base",
			index:    12,
			member:   "LifeResult",
			ok:       true,
		},
		{
			name:     "heal by section delta",
			field:    "MulticastNotifyHeal.LifeChangeBySection[3].DeltaLife",
			function: "MulticastNotifyHeal",
			index:    3,
			member:   "DeltaLife",
			ok:       true,
		},
		{
			name:     "section life change alive flag",
			field:    "MulticastSectionLifeChange.LifeChangeEvents[2].bAliveAfterChange",
			function: "MulticastSectionLifeChange",
			index:    2,
			member:   "bAliveAfterChange",
			ok:       true,
		},
		{
			name:  "array container row",
			field: "MulticastNotifyDamage_Point.LifeChangeEvents",
			ok:    false,
		},
		{
			name:  "array container by section row",
			field: "MulticastNotifyHeal.LifeChangeBySection",
			ok:    false,
		},
		{
			name:  "unrelated field",
			field: "Money",
			ok:    false,
		},
		{
			name:  "missing member",
			field: "MulticastNotifyDamage_Point.LifeChangeEvents[0]",
			ok:    false,
		},
		{
			name:  "non numeric index",
			field: "MulticastNotifyDamage_Point.LifeChangeEvents[x].LifeResult",
			ok:    false,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			function, index, member, ok := parseDamageChild(test.field)
			if ok != test.ok {
				t.Fatalf("ok = %v, want %v", ok, test.ok)
			}
			if !test.ok {
				return
			}
			if function != test.function || index != test.index || member != test.member {
				t.Fatalf("got %q/%d/%q, want %q/%d/%q",
					function, index, member, test.function, test.index, test.member)
			}
		})
	}
}

func TestResolveSectionKind(t *testing.T) {
	tests := map[string]sectionKind{
		healthDamageSection:   sectionHealth,
		attachedDamageSection: sectionArmour,
		shieldDamageSection:   sectionIgnored,
		overhealDamageSection: sectionIgnored,
		"ChildDamageSection":  sectionUnknown,
		"":                    sectionUnknown,
	}
	for path, want := range tests {
		if got := resolveSectionKind(path); got != want {
			t.Errorf("resolveSectionKind(%q) = %v, want %v", path, got, want)
		}
	}
}

func TestSampleAtRoundStartRule(t *testing.T) {
	timeline := []stateSample{
		{TimeMS: 100, HP: 0, Alive: false, Credits: 800, WeaponID: "W", HealthTimeMS: 100},
		{TimeMS: 250, HP: 0, Alive: false, Credits: 900, WeaponID: "W", HealthTimeMS: 250},
	}

	// A sample written before the round started is a full bar, regardless of
	// how the previous round ended. Credits and the gun still carry.
	before := sampleAt(timeline, 240, 200)
	if before.HP != 100 || !before.Alive {
		t.Errorf("pre-round health = %d/%v", before.HP, before.Alive)
	}
	if before.Credits != 800 || before.WeaponID != "W" {
		t.Errorf("carried state = %+v", before)
	}

	// A death inside the round is kept.
	during := sampleAt(timeline, 300, 200)
	if during.HP != 0 || during.Alive {
		t.Errorf("in-round death = %d/%v", during.HP, during.Alive)
	}

	if empty := sampleAt(nil, 500, 200); empty.HP != 100 || !empty.Alive {
		t.Errorf("empty timeline default = %+v", empty)
	}
}

// TestSampleAtIgnoresUnrelatedWritesAfterRoundStart guards the HealthTimeMS
// rule: a credits or weapon write inside the new round must not make an old
// health value look current.
func TestSampleAtIgnoresUnrelatedWritesAfterRoundStart(t *testing.T) {
	timeline := []stateSample{
		{TimeMS: 100, HP: 0, Alive: false, Credits: 800, HealthTimeMS: 100},
		{TimeMS: 300, HP: 0, Alive: false, Credits: 900, HealthTimeMS: 100},
	}
	got := sampleAt(timeline, 350, 200)
	if got.HP != 100 || !got.Alive {
		t.Fatalf("health = %d/%v, want a round-start reset", got.HP, got.Alive)
	}
	if got.Credits != 900 {
		t.Errorf("credits = %d, want 900", got.Credits)
	}
}

func TestTimelineBuilderArmourLifecycle(t *testing.T) {
	builder := &timelineBuilder{}
	builder.add(stateEvent{TimeMS: 50, Kind: eventWeapon, WeaponID: "GUN"})
	builder.add(stateEvent{TimeMS: 100, Kind: eventArmourOpen, ArmorItem: 10,
		ArmorID: "HEAVY", ArmorPoints: 50})
	builder.add(stateEvent{TimeMS: 200, Kind: eventArmourDamage, ArmorItem: 10, ArmorPoints: 30})
	builder.add(stateEvent{TimeMS: 300, Kind: eventArmourClose, ArmorItem: 10})
	builder.add(stateEvent{TimeMS: 400, Kind: eventArmourOpen, ArmorItem: 11,
		ArmorID: "LIGHT", ArmorPoints: 25})
	// A late damage write for the old item must not touch the new armour.
	builder.add(stateEvent{TimeMS: 500, Kind: eventArmourDamage, ArmorItem: 10, ArmorPoints: 1})
	builder.add(stateEvent{TimeMS: 600, Kind: eventHealth, HP: 0, Alive: false})

	timeline := builder.build()
	if len(timeline) == 0 {
		t.Fatal("empty timeline")
	}

	check := func(ms uint32, wantArmor string, wantPoints int) {
		t.Helper()
		got := sampleAt(timeline, ms, 0)
		if got.ArmorID != wantArmor || got.ArmorPoints != wantPoints {
			t.Fatalf("at %d armour = %q/%d, want %q/%d", ms, got.ArmorID, got.ArmorPoints, wantArmor, wantPoints)
		}
	}
	check(150, "HEAVY", 50)
	check(250, "HEAVY", 30)
	check(350, "", 0)
	check(450, "LIGHT", 25)
	check(550, "LIGHT", 25)
	check(650, "", 0)

	dead := sampleAt(timeline, 650, 0)
	if dead.Alive || dead.WeaponID != "" {
		t.Errorf("death did not clear state: %+v", dead)
	}
	if sampleAt(timeline, 75, 0).WeaponID != "GUN" {
		t.Errorf("weapon before death was lost")
	}
}

// TestScanStateDropsZeroLengthArmour guards the close-before-open ordering: an
// item whose open and close share a millisecond was never equipped, so neither
// event may be emitted.
func TestScanStateDropsZeroLengthArmour(t *testing.T) {
	dir := t.TempDir()
	const subject = testSubject
	const playerStateActor = uint32(100)
	const pawn = uint32(200)
	const item = uint32(700)

	const itemClass = "/Game/Gear/LightArmorItem.LightArmorItem_C"
	writeStateRows(t, dir, []fieldRow{
		{
			TimeMS: 100, PacketID: 1, ActorNetGUID: item,
			FieldName: ptr("Owner"), ValueI64: ptr(int64(pawn)),
		},
	})
	if err := parquet.WriteFile(filepath.Join(dir, "net_guids.parquet"), []netGuidRow{
		{NetGUID: item, Path: itemClass, OuterNetGUID: ptr(pawn)},
	}); err != nil {
		t.Fatalf("write net guids: %v", err)
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), []stateActorRow{
		{TimeMS: 100, PacketID: 2, ActorNetGUID: item, Event: "open", ClassPath: ptr(itemClass)},
		{TimeMS: 100, PacketID: 3, ActorNetGUID: item, Event: "close", ClassPath: ptr(itemClass)},
	}); err != nil {
		t.Fatalf("write actors: %v", err)
	}

	index := newPlayerIndex(&Manifest{Players: []ManifestPlayer{{
		ActorNetGUID:      playerStateActor,
		Subject:           subject,
		CharacterNetGUID:  ptr(pawn),
		CharacterNetGUIDs: []uint32{pawn},
	}}})

	fields, err := scanFields(dir)
	if err != nil {
		t.Fatalf("scanFields: %v", err)
	}
	state, err := scanState(dir, index, &fields.State)
	if err != nil {
		t.Fatalf("scanState: %v", err)
	}
	if state.ArmorItems != 1 || state.ArmorUnowned != 0 {
		t.Fatalf("counter = items %d unowned %d", state.ArmorItems, state.ArmorUnowned)
	}
	for _, sample := range state.Timelines[subject] {
		if sample.ArmorID != "" {
			t.Fatalf("zero-length armour leaked: %+v", sample)
		}
	}
}

func TestBuildPawnIntervalsUsesActorRows(t *testing.T) {
	oldPawn := uint32(200)
	newPawn := uint32(201)
	unrelated := uint32(900)
	index := reconnectIndex(oldPawn, newPawn)
	view := &stateActorView{
		OpenByActor: map[uint32]actorMoment{
			oldPawn:   {TimeMS: 1000},
			newPawn:   {TimeMS: 5000},
			unrelated: {TimeMS: 2000},
		},
		CloseByActor: map[uint32]actorMoment{
			oldPawn:   {TimeMS: 4000},
			unrelated: {TimeMS: 3000},
		},
		PawnIntervals: make(map[uint32]pawnInterval),
	}

	buildPawnIntervals(view, index)

	oldInterval := view.PawnIntervals[oldPawn]
	if !oldInterval.HasOpen || oldInterval.OpenMS != 1000 || !oldInterval.HasClose || oldInterval.CloseMS != 4000 {
		t.Fatalf("old pawn interval = %+v", oldInterval)
	}
	newInterval := view.PawnIntervals[newPawn]
	if !newInterval.HasOpen || newInterval.OpenMS != 5000 || newInterval.HasClose {
		t.Fatalf("new pawn interval = %+v", newInterval)
	}
	if _, exists := view.PawnIntervals[unrelated]; exists {
		t.Fatal("a non-pawn actor became a pawn interval")
	}
}

func TestTimelineBuilderClosesBeforeOpeningAtTheSameTime(t *testing.T) {
	builder := &timelineBuilder{}
	builder.add(stateEvent{TimeMS: 100, Kind: eventArmourOpen, ArmorItem: 1,
		ArmorID: "HEAVY", ArmorPoints: 50})
	// Add the new item before the old item's close; ordering must still put the
	// close first so the replacement survives.
	builder.add(stateEvent{TimeMS: 200, Kind: eventArmourOpen, ArmorItem: 2,
		ArmorID: "LIGHT", ArmorPoints: 25})
	builder.add(stateEvent{TimeMS: 200, Kind: eventArmourClose, ArmorItem: 1})

	got := sampleAt(builder.build(), 250, 0)
	if got.ArmorID != "LIGHT" || got.ArmorPoints != 25 {
		t.Fatalf("armour = %q/%d, want LIGHT/25", got.ArmorID, got.ArmorPoints)
	}
}

func TestWeaponFolder(t *testing.T) {
	tests := []struct {
		path   string
		folder string
		ok     bool
	}{
		{"/Game/Equippables/Guns/Rifles/AK/AssaultRifle_AK.AssaultRifle_AK_C", "Guns/Rifles/AK", true},
		{"/Game/Equippables/Guns/Sidearms/BasePistol/BasePistol.BasePistol_C", "Guns/Sidearms/BasePistol", true},
		{"/Game/Equippables/Guns/SniperRifles/Boltsniper/BoltSniper.BoltSniper_C", "Guns/SniperRifles/Boltsniper", true},
		{"/Game/Equippables/Melee/Ability_Melee_Base.Ability_Melee_Base_C", "", false},
		{"/Game/Equippables/Guns/Rifles/AK", "", false},
		{"/Game/Gear/HeavyArmorItem.HeavyArmorItem_C", "", false},
	}
	for _, test := range tests {
		folder, ok := weaponFolder(test.path)
		if ok != test.ok || folder != test.folder {
			t.Errorf("weaponFolder(%q) = %q/%v, want %q/%v", test.path, folder, ok, test.folder, test.ok)
		}
	}
}

func TestWeaponTableIsCompleteAndUppercase(t *testing.T) {
	if len(weaponUUIDByFolder) != 20 {
		t.Fatalf("weapon table = %d folders, want 20", len(weaponUUIDByFolder))
	}
	uuidPattern := regexp.MustCompile(`^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$`)
	seen := make(map[string]string, len(weaponUUIDByFolder))
	for folder, id := range weaponUUIDByFolder {
		if !uuidPattern.MatchString(id) {
			t.Errorf("%s id %q is not an uppercase UUID", folder, id)
		}
		if previous, exists := seen[id]; exists {
			t.Errorf("%s reuses %s's UUID", folder, previous)
		}
		seen[id] = folder
	}
}

func TestScanStateBuildsTimelinesFromFoldedRows(t *testing.T) {
	dir := t.TempDir()
	const subject = testSubject
	const playerStateActor = uint32(100)
	const pawn = uint32(200)
	const gunActor = uint32(500)
	const healthSection = uint32(5000)

	writeStateRows(t, dir, []fieldRow{
		{
			TimeMS: 0, PacketID: 1, ActorNetGUID: playerStateActor,
			GroupPath: "/Script/ShooterGame.MoneyManagementComponent",
			FieldName: ptr("Money"), ValueI64: ptr(int64(800)),
		},
		{
			TimeMS: 50, PacketID: 2, ActorNetGUID: pawn,
			GroupPath: "/Script/ShooterGame.AresInventory",
			FieldName: ptr("CurrentEquippable"), ValueI64: ptr(int64(gunActor)),
		},
		{
			TimeMS: 60, PacketID: 3, ActorNetGUID: pawn,
			GroupPath: "/Script/ShooterGame.AresInventory",
			FieldName: ptr("CurrentEquippable"), ValueI64: ptr(int64(0)),
		},
		{
			TimeMS: 1000, PacketID: 4, ActorNetGUID: pawn,
			FieldName: ptr("MulticastNotifyDamage_Point.LifeChangeEvents[0].ChangedComponent"),
			ValueI64:  ptr(int64(healthSection)),
		},
		{
			TimeMS: 1000, PacketID: 4, ActorNetGUID: pawn,
			FieldName: ptr("MulticastNotifyDamage_Point.LifeChangeEvents[0].LifeResult"),
			ValueF64:  ptr(float64(37)),
		},
		{
			TimeMS: 1000, PacketID: 4, ActorNetGUID: pawn,
			FieldName: ptr("MulticastNotifyDamage_Point.LifeChangeEvents[0].DeltaLife"),
			ValueF64:  ptr(float64(-63)),
		},
		{
			TimeMS: 1000, PacketID: 4, ActorNetGUID: pawn,
			FieldName: ptr("MulticastNotifyDamage_Point.LifeChangeEvents[0].bAliveAfterChange"),
			ValueBool: ptr(true),
		},
	})
	if err := parquet.WriteFile(filepath.Join(dir, "net_guids.parquet"), []netGuidRow{
		{NetGUID: healthSection, Path: healthDamageSection, OuterNetGUID: ptr(pawn)},
	}); err != nil {
		t.Fatalf("write net guids: %v", err)
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), []stateActorRow{
		{ActorNetGUID: gunActor, Event: "open",
			ClassPath: ptr("/Game/Equippables/Guns/Rifles/AK/AssaultRifle_AK.AssaultRifle_AK_C")},
	}); err != nil {
		t.Fatalf("write actors: %v", err)
	}

	index := newPlayerIndex(&Manifest{Players: []ManifestPlayer{{
		ActorNetGUID:      playerStateActor,
		Subject:           subject,
		CharacterNetGUID:  ptr(pawn),
		CharacterNetGUIDs: []uint32{pawn},
	}}})

	fields, err := scanFields(dir)
	if err != nil {
		t.Fatalf("scanFields: %v", err)
	}
	state, err := scanState(dir, index, &fields.State)
	if err != nil {
		t.Fatalf("scanState: %v", err)
	}

	if state.HPWrites != 1 || state.HPUnresolvedSection != 0 || state.HPNonPlayer != 0 {
		t.Errorf("hp counters = %d/%d/%d", state.HPWrites, state.HPUnresolvedSection, state.HPNonPlayer)
	}
	if state.MoneyWrites != 1 {
		t.Errorf("money writes = %d", state.MoneyWrites)
	}
	if state.WeaponChanges != 1 || state.WeaponZero != 1 || state.WeaponUnresolved != 0 {
		t.Errorf("weapon counters = %d/%d/%d", state.WeaponChanges, state.WeaponZero, state.WeaponUnresolved)
	}

	early := state.stateFor(subject, 500, 0)
	if early.HP != 100 || !early.Alive || early.Credits != 800 || early.WeaponID == "" {
		t.Errorf("early state = %+v", early)
	}
	after := state.stateFor(subject, 1000, 0)
	if after.HP != 37 || !after.Alive {
		t.Errorf("health write = %+v", after)
	}
}

func writeStateRows(t *testing.T, dir string, rows []fieldRow) {
	t.Helper()
	if err := parquet.WriteFile(filepath.Join(dir, "fields.parquet"), rows); err != nil {
		t.Fatalf("write fields: %v", err)
	}
}

func TestCoverageWarningOnlyAboveOnePercent(t *testing.T) {
	const message = "gap"
	if got := coverageWarning(1, 100, message); got != "" {
		t.Errorf("1%% warning = %q", got)
	}
	if got := coverageWarning(0, 100, message); got != "" {
		t.Errorf("0 warning = %q", got)
	}
	if got := coverageWarning(2, 100, message); got != message {
		t.Errorf("2%% warning = %q", got)
	}
	if got := coverageWarning(1, 0, message); got != "" {
		t.Errorf("empty stream warning = %q", got)
	}
}

func TestWeaponFolderDoesNotAnchorOnEarlierPathText(t *testing.T) {
	// The folder key must be sliced at the Guns marker, not at a hard-coded
	// offset from the start of the string.
	folder, ok := weaponFolder("/Some/Prefix/Game/Equippables/Guns/Rifles/AK/AK.AK_C")
	if !ok || folder != "Guns/Rifles/AK" {
		t.Fatalf("folder = %q/%v", folder, ok)
	}
}

// TestWeaponAssetsExist guards the link between the folder table and the
// killstream images the browser player loads. Renaming or deleting an asset
// must fail here rather than leave a broken image in the client.
func TestWeaponAssetsExist(t *testing.T) {
	assetDir := filepath.Join("..", "..", "valo-mapper", "public", "weapons")
	if _, err := os.Stat(assetDir); err != nil {
		t.Fatalf("weapon asset directory %s: %v", assetDir, err)
	}

	for folder, id := range weaponUUIDByFolder {
		if !strings.HasPrefix(folder, "Guns/") {
			t.Errorf("%s is not a gun folder", folder)
		}
		path := filepath.Join(assetDir, id+"_killstream.png")
		info, err := os.Stat(path)
		if err != nil {
			t.Errorf("%s: missing killstream asset %s: %v", folder, path, err)
			continue
		}
		if info.Size() == 0 {
			t.Errorf("%s: killstream asset %s is empty", folder, path)
		}
	}
}

func TestSampleAtUsesExactTimeAndLatestSample(t *testing.T) {
	timeline := []stateSample{
		{TimeMS: 100, HP: 80, Alive: true, Credits: 800, HealthTimeMS: 100},
		{TimeMS: 200, HP: 40, Alive: true, Credits: 900, HealthTimeMS: 200},
	}

	exact := sampleAt(timeline, 200, 0)
	if exact.HP != 40 || exact.Credits != 900 {
		t.Errorf("exact frame time = %+v, want the write at 200", exact)
	}

	// Before the later write the earlier sample is still the latest one.
	latest := sampleAt(timeline, 199, 0)
	if latest.HP != 80 || latest.Credits != 800 {
		t.Errorf("latest sample = %+v, want the write at 100", latest)
	}

	// A frame before any write has no state: the round seed applies.
	seed := sampleAt(timeline, 50, 0)
	if seed.HP != 100 || !seed.Alive || seed.Credits != 0 || seed.WeaponID != "" {
		t.Errorf("pre-write seed = %+v", seed)
	}
}

func TestTimelineBuilderZeroHPDeathReviveAndArmour(t *testing.T) {
	builder := &timelineBuilder{}
	builder.add(stateEvent{TimeMS: 100, Kind: eventWeapon, WeaponID: "GUN"})
	builder.add(stateEvent{TimeMS: 150, Kind: eventArmourOpen, ArmorItem: 7,
		ArmorID: "HEAVY", ArmorPoints: 50})
	// A 0 HP sample that is still alive (KAY-O after a revive or during a
	// damage tick) must not be treated as a death.
	builder.add(stateEvent{TimeMS: 200, Kind: eventHealth, HP: 0, Alive: true})
	// Armour damage at 0 HP changes only the armour points.
	builder.add(stateEvent{TimeMS: 250, Kind: eventArmourDamage, ArmorItem: 7, ArmorPoints: 20})
	builder.add(stateEvent{TimeMS: 300, Kind: eventHealth, HP: 0, Alive: false})
	builder.add(stateEvent{TimeMS: 400, Kind: eventHealth, HP: 100, Alive: true})

	timeline := builder.build()

	zero := sampleAt(timeline, 220, 0)
	if zero.HP != 0 || !zero.Alive {
		t.Fatalf("0 HP alive = %+v", zero)
	}
	if zero.WeaponID != "GUN" || zero.ArmorID != "HEAVY" || zero.ArmorPoints != 50 {
		t.Errorf("equipment at 0 HP = %+v", zero)
	}

	afterArmour := sampleAt(timeline, 260, 0)
	if afterArmour.HP != zero.HP || afterArmour.Alive != zero.Alive {
		t.Errorf("armour damage changed health: %+v -> %+v", zero, afterArmour)
	}
	if afterArmour.ArmorPoints != 20 {
		t.Errorf("armour points = %d, want 20", afterArmour.ArmorPoints)
	}

	dead := sampleAt(timeline, 350, 0)
	if dead.Alive || dead.WeaponID != "" || dead.ArmorID != "" || dead.ArmorPoints != 0 {
		t.Errorf("death did not clear equipment: %+v", dead)
	}

	revived := sampleAt(timeline, 450, 0)
	if revived.HP != 100 || !revived.Alive {
		t.Errorf("revive = %+v", revived)
	}
	if revived.WeaponID != "" || revived.ArmorID != "" {
		t.Errorf("revive restored equipment that was lost on death: %+v", revived)
	}
}

func TestArmourClassesMapToUIIDs(t *testing.T) {
	tests := map[string]armourClass{
		heavyArmorClass:  {"822BCAB2-40A2-324E-C137-E09195AD7692", 50},
		lightArmorClass:  {"4DEC83D5-4902-9AB3-BED6-A7A390761157", 25},
		plasmaArmorClass: {"B1B9086D-41BD-A516-5D29-E3B34A6F1644", 25},
	}
	if len(armourClasses) != len(tests) {
		t.Fatalf("armour table = %d classes, want %d", len(armourClasses), len(tests))
	}
	seen := make(map[string]string, len(tests))
	for class, want := range tests {
		got, ok := armourClasses[class]
		if !ok {
			t.Errorf("missing class %s", class)
			continue
		}
		if got != want {
			t.Errorf("%s = %+v, want %+v", class, got, want)
		}
		if previous, exists := seen[got.ID]; exists {
			t.Errorf("%s reuses %s's id", class, previous)
		}
		seen[got.ID] = class
	}
}

func TestCollectStateFieldIgnoresZeroOwner(t *testing.T) {
	scan := &fieldScan{State: newFieldStateRows()}

	zero := int64(0)
	scan.collectStateField(&fieldRow{
		ActorNetGUID: 700, FieldName: ptr("Owner"), ValueI64: &zero,
	}, "Owner")
	if _, ok := scan.State.Owners[700]; ok {
		t.Fatal("Owner 0 registered an owner")
	}

	owner := int64(200)
	scan.collectStateField(&fieldRow{
		ActorNetGUID: 701, FieldName: ptr("Owner"), ValueI64: &owner,
	}, "Owner")
	if scan.State.Owners[701] != 200 {
		t.Errorf("owner = %d, want 200", scan.State.Owners[701])
	}
}

func TestScanStateCreditsPersistAcrossRoundsAndSideSwitch(t *testing.T) {
	const pawn = uint32(200)
	state := scanStateFromRows(t, testPlayerIndex(pawn), []fieldRow{
		moneyRow(1000, 1, 100, 3900),
		moneyRow(60000, 2, 100, 800),
	}, nil, nil)

	first := state.stateFor(testSubject, 50000, 10000)
	if first.Credits != 3900 {
		t.Errorf("first-round credits = %d, want 3900", first.Credits)
	}

	// Money is never reset at a round boundary, so the last write carries.
	between := state.stateFor(testSubject, 55000, 50000)
	if between.Credits != 3900 {
		t.Errorf("credits between rounds = %d, want 3900", between.Credits)
	}

	// A side-switch drop is a real write and is kept.
	second := state.stateFor(testSubject, 70000, 55000)
	if second.Credits != 800 {
		t.Errorf("post-side-switch credits = %d, want 800", second.Credits)
	}
}

func TestScanStateShowsKnifeAndKeepsLastGunForOtherEquippables(t *testing.T) {
	const pawn = uint32(200)
	const gun = uint32(500)
	const melee = uint32(501)
	const spike = uint32(502)
	const totem = uint32(503)
	const unlisted = uint32(504)
	const akFolder = "Guns/Rifles/AK"

	state := scanStateFromRows(t, testPlayerIndex(pawn), []fieldRow{
		inventoryRow(100, 1, pawn, gun),
		inventoryRow(200, 2, pawn, melee),
		inventoryRow(250, 3, pawn, spike),
		inventoryRow(270, 4, pawn, totem),
		inventoryRow(300, 5, pawn, unlisted),
	}, nil, []stateActorRow{
		{ActorNetGUID: gun, Event: "open",
			ClassPath: ptr("/Game/Equippables/Guns/Rifles/AK/AssaultRifle_AK.AssaultRifle_AK_C")},
		{ActorNetGUID: melee, Event: "open",
			ClassPath: ptr("/Game/Equippables/Melee/Ability_Melee_Base.Ability_Melee_Base_C")},
		{ActorNetGUID: spike, Event: "open",
			ClassPath: ptr("/Game/Equippables/Spike/Spike.Spike_C")},
		{ActorNetGUID: totem, Event: "open",
			ClassPath: ptr("/Game/Equippables/Totem/KilljoyTurret.KilljoyTurret_C")},
		{ActorNetGUID: unlisted, Event: "open",
			ClassPath: ptr("/Game/Equippables/Guns/Rifles/Unlisted/Unlisted.Unlisted_C")},
	})

	if state.WeaponChanges != 2 {
		t.Errorf("weapon changes = %d, want 2 (the gun and the knife)", state.WeaponChanges)
	}
	// The gun, the knife and the two ignored equippables are all writes; the
	// unlisted folder is counted as unresolved instead.
	if state.WeaponWrites != 4 {
		t.Errorf("weapon writes = %d, want 4", state.WeaponWrites)
	}
	if state.WeaponUnresolved != 1 {
		t.Errorf("unresolved weapons = %d, want 1", state.WeaponUnresolved)
	}

	got := state.stateFor(testSubject, 400, 0)
	if got.WeaponID != meleeWeaponID {
		t.Errorf("weapon = %q, want the knife to survive the unknown equips", got.WeaponID)
	}

	afterGun := state.stateFor(testSubject, 150, 0)
	if afterGun.WeaponID != weaponUUIDByFolder[akFolder] {
		t.Errorf("weapon at 150 = %q, want the AK before melee", afterGun.WeaponID)
	}
}

func TestScanStateArmourCarriesAndIgnoresHealthSectionResults(t *testing.T) {
	const pawn = uint32(200)
	const item = uint32(700)
	const section = uint32(710)

	rows := []fieldRow{
		// Owner 0 is a no-op; the outer chain still attributes the item.
		{TimeMS: 50, PacketID: 1, ActorNetGUID: item,
			FieldName: ptr("Owner"), ValueI64: ptr(int64(0))},
	}
	// Damage on the item's own section is armour damage, never HP.
	rows = append(rows, damageRows(30000, 4, pawn, "MulticastNotifyDamage_Point", 0, int64(section), 30, -20, true)...)

	state := scanStateFromRows(t, testPlayerIndex(pawn), rows, []netGuidRow{
		{NetGUID: item, Path: heavyArmorClass, OuterNetGUID: ptr(pawn)},
		{NetGUID: section, Path: attachedDamageSection, OuterNetGUID: ptr(item)},
	}, []stateActorRow{
		{TimeMS: 1000, PacketID: 2, ActorNetGUID: item, Event: "open", ClassPath: ptr(heavyArmorClass)},
		{TimeMS: 60000, PacketID: 3, ActorNetGUID: item, Event: "close", ClassPath: ptr(heavyArmorClass)},
	})

	if state.HPWrites != 0 {
		t.Errorf("armour section was counted as %d health writes", state.HPWrites)
	}
	if state.ArmorUnattributed != 0 {
		t.Errorf("armour damage was not attributed: %d", state.ArmorUnattributed)
	}

	during := state.stateFor(testSubject, 35000, 0)
	if during.HP != 100 || !during.Alive {
		t.Errorf("armour damage changed HP: %+v", during)
	}
	if during.ArmorID != armourClasses[heavyArmorClass].ID || during.ArmorPoints != 30 {
		t.Errorf("armour during round = %q/%d, want heavy/30", during.ArmorID, during.ArmorPoints)
	}

	// The item closes after the next round starts, so a survivor carries it.
	carried := state.stateFor(testSubject, 55000, 50000)
	if carried.ArmorID != armourClasses[heavyArmorClass].ID || carried.ArmorPoints != 30 {
		t.Errorf("carried armour = %q/%d, want heavy/30", carried.ArmorID, carried.ArmorPoints)
	}

	closed := state.stateFor(testSubject, 60000, 50000)
	if closed.ArmorID != "" || closed.ArmorPoints != 0 {
		t.Errorf("closed armour = %q/%d, want clear", closed.ArmorID, closed.ArmorPoints)
	}
}

// scanStateFromRows writes the small state-only export and returns the built
// scan. Nil guid or actor slices get one harmless row so the parquet files
// still carry a schema.
func scanStateFromRows(
	t *testing.T,
	index *playerIndex,
	rows []fieldRow,
	guids []netGuidRow,
	actors []stateActorRow,
) *stateScan {
	t.Helper()

	dir := t.TempDir()
	writeStateRows(t, dir, rows)
	if len(guids) == 0 {
		guids = []netGuidRow{{NetGUID: 1, Path: "PersistentLevel"}}
	}
	if len(actors) == 0 {
		actors = []stateActorRow{{ActorNetGUID: 1, Event: "open"}}
	}
	if err := parquet.WriteFile(filepath.Join(dir, "net_guids.parquet"), guids); err != nil {
		t.Fatalf("write net guids: %v", err)
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatalf("write actors: %v", err)
	}

	fields, err := scanFields(dir)
	if err != nil {
		t.Fatalf("scanFields: %v", err)
	}
	state, err := scanState(dir, index, &fields.State)
	if err != nil {
		t.Fatalf("scanState: %v", err)
	}
	return state
}

func testPlayerIndex(pawn uint32) *playerIndex {
	return newPlayerIndex(&Manifest{Players: []ManifestPlayer{{
		ActorNetGUID:      100,
		Subject:           testSubject,
		CharacterNetGUID:  ptr(pawn),
		CharacterNetGUIDs: []uint32{pawn},
	}}})
}

func moneyRow(timeMS, packetID uint32, actor uint32, value int64) fieldRow {
	return fieldRow{
		TimeMS:       timeMS,
		PacketID:     packetID,
		ActorNetGUID: actor,
		GroupPath:    "/Script/ShooterGame.MoneyManagementComponent",
		FieldName:    ptr("Money"),
		ValueI64:     ptr(value),
	}
}

func inventoryRow(timeMS, packetID uint32, pawn, guid uint32) fieldRow {
	return fieldRow{
		TimeMS:       timeMS,
		PacketID:     packetID,
		ActorNetGUID: pawn,
		GroupPath:    "/Script/ShooterGame.AresInventory",
		FieldName:    ptr("CurrentEquippable"),
		ValueI64:     ptr(int64(guid)),
	}
}

// damageRows builds the four member rows of one LifeChangeEvents element.
func damageRows(
	timeMS, packetID, actor uint32,
	function string,
	element int,
	section int64,
	result, delta float64,
	alive bool,
) []fieldRow {
	prefix := fmt.Sprintf("%s.LifeChangeEvents[%d].", function, element)
	return []fieldRow{
		{TimeMS: timeMS, PacketID: packetID, ActorNetGUID: actor,
			FieldName: ptr(prefix + "ChangedComponent"), ValueI64: ptr(section)},
		{TimeMS: timeMS, PacketID: packetID, ActorNetGUID: actor,
			FieldName: ptr(prefix + "LifeResult"), ValueF64: ptr(result)},
		{TimeMS: timeMS, PacketID: packetID, ActorNetGUID: actor,
			FieldName: ptr(prefix + "DeltaLife"), ValueF64: ptr(delta)},
		{TimeMS: timeMS, PacketID: packetID, ActorNetGUID: actor,
			FieldName: ptr(prefix + "bAliveAfterChange"), ValueBool: ptr(alive)},
	}
}
