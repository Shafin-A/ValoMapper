package replay

import (
	"path/filepath"
	"regexp"
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
