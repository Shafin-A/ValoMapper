package replay

import (
	"encoding/binary"
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
		{"13.00", "GameObject_Rift_4_BlackHole", true, "gravity_well"},
		{"13.00", "GameObject_Rift_Q_FlashBurst", true, "nova_pulse"},
		{"13.00", "GameObject_Rift_E_SmokeZone", true, "nebula__dissipate"},
		{"13.00", "GameObject_Rift_E_SmokeZone_Fake", true, "nebula__dissipate"},
		{"13.00", "GameObject_Rift_X_GlobalWall", true, "cosmic_divide"},
		{"13.00", "GameObject_Rift_X_Markers", true, "astra_passive"},
		{"13.00", "GameObject_Breach_X_Shockwave", true, "rolling_thunder"},
		{"13.01", "GameObject_Gumshoe_4_TripWire", true, "trapwire"},
		{"13.01", "GameObject_Gumshoe_4_TripWire_SecondWire", true, "trapwire"},
		{"13.01", "GameObject_Gumshoe_Q_CageTrap", true, "cyber_cage"},
		{"13.01", "Zone_Gumshoe_Q_Cage", true, "cyber_cage"},
		{"13.01", "Pawn_Gumshoe_E_PossessableCamera", true, "spycam"},
		{"13.00", "Zone_Wraith_4_Smoke", true, "dark_cover"},
		{"13.00", "GameObject_Smonk_NewSmoke", false, ""},
		{"13.01", "GameObject_Smonk_NewSmoke", true, "ruse"},
		{"13.01", "GameObject_Deadeye_E_Trap", false, ""},
		{"13.02", "GameObject_Deadeye_E_Trap", true, "trademark"},
		{"13.08", "Pawn_BountyHunter_4_WolfHound", true, "prowler"},
		{"13.08", "Gameobject_Grenadier_E_SuppressionPulse", true, "zeropoint"},
		{"13.08", "Projectile_Wushu_4_Smoke", true, "cloudburst"},
		{"13.08", "Projectile_Hunter_4_ExplosiveBolt", true, "shock_bolt"},
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

func TestScanUtilitiesMapsCypherActorsAndPairsTrapwireEndpoints(t *testing.T) {
	dir := t.TempDir()
	wireClass := "GameObject_Gumshoe_4_TripWire"
	farWireClass := "GameObject_Gumshoe_4_TripWire_SecondWire"
	placedCageClass := "GameObject_Gumshoe_Q_CageTrap"
	cageClass := "Zone_Gumshoe_Q_Cage"
	cameraClass := "Pawn_Gumshoe_E_PossessableCamera"
	dartClass := "GameObject_RemovableObject_GumshoeTrackingDart"
	actors := []stateActorRow{
		{TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, Event: "open", ClassPath: &wireClass, SpawnX: float32Ptr(100), SpawnY: float32Ptr(100)},
		{TimeMS: 2500, PacketID: 2, ActorNetGUID: 700, Event: "close"},
		{TimeMS: 1000, PacketID: 1, ActorNetGUID: 701, Event: "open", ClassPath: &farWireClass, SpawnX: float32Ptr(100), SpawnY: float32Ptr(700)},
		{TimeMS: 2500, PacketID: 2, ActorNetGUID: 701, Event: "close"},
		{TimeMS: 1100, PacketID: 3, ActorNetGUID: 702, Event: "open", ClassPath: &cageClass, SpawnX: float32Ptr(200), SpawnY: float32Ptr(300)},
		{TimeMS: 2500, PacketID: 4, ActorNetGUID: 702, Event: "close"},
		{TimeMS: 1050, PacketID: 9, ActorNetGUID: 705, Event: "open", ClassPath: &placedCageClass, SpawnX: float32Ptr(150), SpawnY: float32Ptr(250)},
		{TimeMS: 2500, PacketID: 10, ActorNetGUID: 705, Event: "close"},
		{TimeMS: 1200, PacketID: 5, ActorNetGUID: 703, Event: "open", ClassPath: &cameraClass, SpawnX: float32Ptr(300), SpawnY: float32Ptr(400)},
		{TimeMS: 2500, PacketID: 6, ActorNetGUID: 703, Event: "close"},
		{TimeMS: 1300, PacketID: 7, ActorNetGUID: 704, Event: "open", ClassPath: &dartClass, SpawnX: float32Ptr(400), SpawnY: float32Ptr(500)},
		{TimeMS: 2500, PacketID: 8, ActorNetGUID: 704, Event: "close"},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}

	ownerName := "Owner"
	directOwner := int64(900)
	fields := []fieldRow{
		{TimeMS: 900, PacketID: 1, ActorNetGUID: 700, FieldName: &ownerName, ValueI64: &directOwner},
		{TimeMS: 900, PacketID: 1, ActorNetGUID: 701, FieldName: &ownerName, ValueI64: &directOwner},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "fields.parquet"), fields); err != nil {
		t.Fatal(err)
	}
	fieldData, err := scanFields(dir)
	if err != nil {
		t.Fatal(err)
	}

	utilities, _, err := scanUtilities(
		dir,
		"13.01",
		3000,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 3000}},
		newPlayerIndex(&Manifest{}),
		nil,
		nil,
		fieldData.UtilityOwners,
		fieldData.UtilityPaths,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 5 {
		t.Fatalf("utilities = %#v, want five utilities with the far endpoint suppressed", utilities)
	}

	byAbility := make(map[string]Utility)
	var cageUtilities []Utility
	for _, utility := range utilities[0] {
		if utility.AbilityID == "cyber_cage" {
			cageUtilities = append(cageUtilities, utility)
		} else {
			byAbility[utility.AbilityID] = utility
		}
	}
	wire, found := byAbility["trapwire"]
	if !found || wire.Position != (Position{X: 100, Y: 100}) ||
		math.Abs(wire.Yaw-90) > 1e-8 || math.Abs(wire.Length-6) > 1e-8 {
		t.Errorf("paired Trapwire = %+v, want start (100, 100), yaw 90, length 6m", wire)
	}
	if len(cageUtilities) != 2 {
		t.Fatalf("Cyber Cage utilities = %#v, want placed and activated states", cageUtilities)
	}
	var placedCage, activatedCage *Utility
	for i := range cageUtilities {
		switch cageUtilities[i].Kind {
		case UtilityMarker:
			placedCage = &cageUtilities[i]
		case UtilitySmoke:
			activatedCage = &cageUtilities[i]
		}
	}
	if placedCage == nil || !placedCage.IconOnly ||
		placedCage.Position != (Position{X: 150, Y: 250}) {
		t.Errorf("placed Cyber Cage = %+v, want icon-only marker at (150, 250)", placedCage)
	}
	if activatedCage == nil || activatedCage.IconOnly ||
		activatedCage.Position != (Position{X: 200, Y: 300}) {
		t.Errorf("activated Cyber Cage = %+v, want smoke zone at (200, 300)", activatedCage)
	}
	if _, found := byAbility["spycam"]; !found {
		t.Error("observed camera or tracking dart actor was not mapped")
	}
	spycamCount := 0
	for _, utility := range utilities[0] {
		if utility.AbilityID == "spycam" {
			spycamCount++
		}
	}
	if spycamCount != 2 {
		t.Errorf("spycam utilities = %d, want camera and Tracking Dart", spycamCount)
	}
}

func TestScanUtilitiesTracksSpycamVisionOnlyWhilePossessed(t *testing.T) {
	dir := t.TempDir()
	cameraClass := "Pawn_Gumshoe_E_PossessableCamera"
	actors := []stateActorRow{
		{TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, Event: "open", ClassPath: &cameraClass, SpawnX: float32Ptr(100), SpawnY: float32Ptr(200), SpawnYaw: float32Ptr(45)},
		{TimeMS: 3500, PacketID: 5, ActorNetGUID: 700, Event: "close"},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}

	controllerName := "Controller"
	notPossessed, controller := int64(0), int64(900)
	fields := []fieldRow{
		{TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, FieldName: &controllerName, ValueI64: &notPossessed},
		{TimeMS: 1500, PacketID: 2, ActorNetGUID: 700, FieldName: &controllerName, ValueI64: &controller},
		{TimeMS: 2500, PacketID: 4, ActorNetGUID: 700, FieldName: &controllerName, ValueI64: &notPossessed},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "fields.parquet"), fields); err != nil {
		t.Fatal(err)
	}
	movement := []movementRow{
		{TimeMS: 900, CharacterNetGUID: 700, PosX: 100, PosY: 200, Yaw: 80},
		{TimeMS: 1500, CharacterNetGUID: 700, PosX: 100, PosY: 200, Yaw: 90},
		{TimeMS: 1700, CharacterNetGUID: 700, PosX: 100, PosY: 200, Yaw: 130},
		{TimeMS: 2600, CharacterNetGUID: 700, PosX: 100, PosY: 200, Yaw: 200},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "movement.parquet"), movement); err != nil {
		t.Fatal(err)
	}

	fieldData, err := scanFields(dir)
	if err != nil {
		t.Fatal(err)
	}
	utilities, _, err := scanUtilities(
		dir,
		"13.01",
		5000,
		[]roundWindow{{RoundNumber: 1, StartMS: 500, EndMS: 4000}},
		newPlayerIndex(&Manifest{}),
		nil,
		nil,
		fieldData.UtilityOwners,
		fieldData.UtilityPaths,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 1 {
		t.Fatalf("utilities = %#v, want one Spycam", utilities)
	}
	vision := utilities[0][0].Vision
	if len(vision) != 3 {
		t.Fatalf("Spycam vision samples = %#v, want activation, turn, and deactivation", vision)
	}
	if vision[0] != (UtilityVisionSample{TimeMS: 1000, Yaw: 90, Active: true}) ||
		vision[1] != (UtilityVisionSample{TimeMS: 1200, Yaw: 130, Active: true}) ||
		vision[2] != (UtilityVisionSample{TimeMS: 2000, Yaw: 130, Active: false}) {
		t.Errorf("Spycam vision timeline = %#v", vision)
	}
}

func TestPairCypherTrapwireEndpointsRequiresUniqueDirectOwnerAndSpawn(t *testing.T) {
	mainClass := utilityCatalog["GameObject_Gumshoe_4_TripWire"]
	farClass := utilityCatalog["GameObject_Gumshoe_4_TripWire_SecondWire"]
	owner := uint32(900)
	makeLives := func(mainCount int) []*utilityActorLife {
		lives := make([]*utilityActorLife, 0, mainCount+1)
		for i := 0; i < mainCount; i++ {
			lives = append(lives, &utilityActorLife{
				guid: uint32(700 + i), class: mainClass, openMS: 1000,
				position: Position{X: 100, Y: 100},
			})
		}
		lives = append(lives, &utilityActorLife{
			guid: 800, class: farClass, openMS: 1000,
			position: Position{X: 100, Y: 700},
		})
		return lives
	}
	makeWrites := func(mainCount int) map[uint32][]utilityOwnerWrite {
		writes := make(map[uint32][]utilityOwnerWrite)
		for guid := uint32(700); guid < uint32(700+mainCount); guid++ {
			writes[guid] = []utilityOwnerWrite{{TimeMS: 900, Owner: &owner}}
		}
		writes[800] = []utilityOwnerWrite{{TimeMS: 900, Owner: &owner}}
		return writes
	}

	t.Run("unique match", func(t *testing.T) {
		lives := makeLives(1)
		pairCypherTrapwireEndpoints(lives, makeWrites(1))
		if lives[0].lengthM != 6 || lives[0].yaw != 90 {
			t.Errorf("paired endpoint length/yaw = %v/%v, want 6/90", lives[0].lengthM, lives[0].yaw)
		}
	})
	t.Run("ambiguous main actor", func(t *testing.T) {
		lives := makeLives(2)
		pairCypherTrapwireEndpoints(lives, makeWrites(2))
		if lives[0].lengthM != 0 || lives[1].lengthM != 0 {
			t.Errorf("ambiguous endpoints assigned lengths: %v/%v", lives[0].lengthM, lives[1].lengthM)
		}
	})
	t.Run("different spawn times", func(t *testing.T) {
		lives := makeLives(1)
		lives[1].openMS++
		pairCypherTrapwireEndpoints(lives, makeWrites(1))
		if lives[0].lengthM != 0 {
			t.Errorf("different-spawn endpoint assigned length %v", lives[0].lengthM)
		}
	})
	t.Run("different direct owners", func(t *testing.T) {
		lives := makeLives(1)
		otherOwner := owner + 1
		writes := makeWrites(1)
		writes[800][0].Owner = &otherOwner
		pairCypherTrapwireEndpoints(lives, writes)
		if lives[0].lengthM != 0 {
			t.Errorf("different-owner endpoint assigned length %v", lives[0].lengthM)
		}
	})
	t.Run("missing direct owner", func(t *testing.T) {
		lives := makeLives(1)
		pairCypherTrapwireEndpoints(lives, nil)
		if lives[0].lengthM != 0 {
			t.Errorf("unowned endpoints assigned length %v", lives[0].lengthM)
		}
	})
}

func TestUtilityCatalogAddsObservedProjectileTrails(t *testing.T) {
	tests := []struct {
		class   string
		ability string
	}{
		{"Projectile_Aggrobot_C_ExplodeyPatch", "mosh_pit"},
		{"Projectile_E_Aggrobot_DiscTurret_PowerWave", "dizzy"},
		{"Projectile_E_BountyHunter_Divebomb", "haunt"},
		{"Projectile_Q_BountyHunter_TetherGrenade_SphereExpansion", "seize"},
		{"Projectile_Breach_4_FusionBlast", "aftershock"},
		{"Projectile_Breach_Q_ThroughWalls_Flash", "flashpoint"},
		{"Projectile_NetToss", "gravnet"},
		{"Projectile_CableJam_InAir", "barrier_mesh"},
		{"Projectile_Cashew_Q_ShellShockGrenade", "special_delivery"},
		{"Projectile_Cashew_Q_ShellShockGrenade_Bounce", "special_delivery"},
		{"Projectile_Clay_4_Projectile_Primary", "paint_shells"},
		{"Projectile_Clay_Q_Satchel_Arming", "blast_pack"},
		{"Projectile_Clay_X_Rocket", "showstopper"},
		{"Projectile_C_Grenadier_Flash", "flashdrive"},
		{"Projectile_C_Grenadier_Flash_Underhand", "flashdrive"},
		{"Projectile_Grenadier_E_SuppressionBlade", "zeropoint"},
		{"Projectile_Guide_E_HawkFlash", "guiding_light"},
		{"Projectile_Killjoy_4_RemoteBees_MultiDetonate", "nanoswarm"},
		{"Projectile_Sequoia_Q_FragileMissile", "undercut"},
		{"Projectile_Hunter_4_ExplosiveBolt", "shock_bolt"},
		{"Projectile_Hunter_Q_RevealBolt", "recon_bolt"},
		{"Projectile_Thumper_Concuss", "mpulse"},
		{"Projectile_Thumper_Heal", "mpulse_concuss"},
		{"Projectile_Nox_BarbedWire", "razorvine"},
		{"Projectile_Phoenix_4_Molotov_Production", "hot_hands"},
		{"Projectile_Phoenix_E_FlareCurve_Synced", "curveball"},
		{"Projectile_Phoenix_E_FlareCurve_Synced_Right", "curveball"},
		{"Projectile_Phoenix_Q_FlameWall_ThroughWall", "blaze"},
		{"Projectile_Sarge_E_SpeedStim", "stim_beacon"},
		{"Projectile_Sarge_Q_Molotov_Production", "incendiary"},
		{"Projectile_Smonk_DecayNade", "meddle"},
		{"Projectile_Thorne_4_SlowFIeld_Production", "slow_orb"},
		{"Projectile_Vampire_4_NearsightAoE", "leer"},
		{"Projectile_Wraith_Q_NearsightMissile", "paranoia"},
		{"Projectile_Wraith_4_Smoke", "dark_cover"},
		{"Projectile_Wushu_4_Smoke", "cloudburst"},
		{"Projectile_Stealth_Q_BounceFlash", "blindside"},
	}

	for _, test := range tests {
		t.Run(test.class, func(t *testing.T) {
			entry, found := utilityCatalog[test.class]
			if !found {
				t.Fatal("projectile class is not catalogued")
			}
			if entry.kind != UtilityMobile || !entry.replicatedMovement {
				t.Fatalf("entry = %#v, want a replicated-movement mobile utility", entry)
			}
			if entry.ability != test.ability {
				t.Fatalf("ability id = %q, want %q", entry.ability, test.ability)
			}
		})
	}
}

func TestCurveballCatalogRecordsFlareSide(t *testing.T) {
	left, leftOK := utilityCatalog["Projectile_Phoenix_E_FlareCurve_Synced"]
	right, rightOK := utilityCatalog["Projectile_Phoenix_E_FlareCurve_Synced_Right"]
	if !leftOK || !rightOK || left.curveballSide != -1 || right.curveballSide != 1 {
		t.Fatalf("Curveball sides = %d/%d (%v/%v), want synced -1 and synced-right +1",
			left.curveballSide, right.curveballSide, leftOK, rightOK)
	}
	if left.maxLifetimeMS != curveballFlightMS || right.maxLifetimeMS != curveballFlightMS {
		t.Errorf("Curveball max lifetimes = %d/%d, want %dms",
			left.maxLifetimeMS, right.maxLifetimeMS, curveballFlightMS)
	}
}

func TestApproximateCurveballMovementUsesForwardAndClassSide(t *testing.T) {
	start := Position{X: 1000, Y: 2000}
	left := approximateCurveballMovement(start, 0, 1, 1000, 1500)
	right := approximateCurveballMovement(start, 0, -1, 1000, 1500)
	if len(left) != 9 || len(right) != 9 {
		t.Fatalf("generated path lengths = %d/%d, want 9 each", len(left), len(right))
	}
	for _, path := range [][]utilityPathWrite{left, right} {
		if path[0].Position != start || path[0].TimeMS != 1000 ||
			path[len(path)-1].TimeMS != 1499 {
			t.Errorf("path endpoints/timing = %+v ... %+v", path[0], path[len(path)-1])
		}
	}
	leftEnd := left[len(left)-1].Position
	rightEnd := right[len(right)-1].Position
	if math.Abs(leftEnd.X-(start.X+400)) > 1e-8 ||
		math.Abs(leftEnd.Y-(start.Y+250)) > 1e-8 ||
		math.Abs(rightEnd.X-(start.X+400)) > 1e-8 ||
		math.Abs(rightEnd.Y-(start.Y-250)) > 1e-8 {
		t.Errorf("forward/side endpoints = %+v/%+v", leftEnd, rightEnd)
	}
	if got := approximateCurveballMovement(start, 0, 1, 1000, 1001); len(got) != 0 {
		t.Fatal("generated a trajectory that cannot have distinct sample times")
	}
	if got := approximateCurveballMovement(start, 0, 0, 1000, 1500); len(got) != 0 {
		t.Fatalf("generated a path without a known side: %#v", got)
	}
}

func TestScanUtilitiesApproximatesCurveballOnlyWithoutMeasuredTrajectory(t *testing.T) {
	tests := []struct {
		name        string
		class       string
		yaw         *float32
		fields      []fieldRow
		wantSamples int
		wantEndY    float64
	}{
		{
			name:        "single movement sample uses left-class approximation",
			class:       "Projectile_Phoenix_E_FlareCurve_Synced",
			yaw:         float32Ptr(0),
			fields:      []fieldRow{{TimeMS: 1100, PacketID: 2, ActorNetGUID: 700, FieldName: stringPtr("ReplicatedMovement"), ValueStr: stringPtr(`{"location":{"x":120,"y":220,"z":0}}`)}},
			wantSamples: 9,
			wantEndY:    -50,
		},
		{
			name:        "single movement sample uses right-class approximation",
			class:       "Projectile_Phoenix_E_FlareCurve_Synced_Right",
			yaw:         float32Ptr(0),
			fields:      []fieldRow{{TimeMS: 1100, PacketID: 2, ActorNetGUID: 700, FieldName: stringPtr("ReplicatedMovement"), ValueStr: stringPtr(`{"location":{"x":120,"y":220,"z":0}}`)}},
			wantSamples: 9,
			wantEndY:    450,
		},
		{
			name:        "missing yaw keeps observed sample",
			class:       "Projectile_Phoenix_E_FlareCurve_Synced",
			fields:      []fieldRow{{TimeMS: 1100, PacketID: 2, ActorNetGUID: 700, FieldName: stringPtr("ReplicatedMovement"), ValueStr: stringPtr(`{"location":{"x":120,"y":220,"z":0}}`)}},
			wantSamples: 1,
		},
		{
			name:  "multiple distinct measured samples take precedence",
			class: "Projectile_Phoenix_E_FlareCurve_Synced",
			yaw:   float32Ptr(0),
			fields: []fieldRow{
				{TimeMS: 1100, PacketID: 2, ActorNetGUID: 700, FieldName: stringPtr("ReplicatedMovement"), ValueStr: stringPtr(`{"location":{"x":120,"y":220,"z":0}}`)},
				{TimeMS: 1200, PacketID: 3, ActorNetGUID: 700, FieldName: stringPtr("ReplicatedMovement"), ValueStr: stringPtr(`{"location":{"x":130,"y":230,"z":0}}`)},
			},
			wantSamples: 2,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			dir := t.TempDir()
			class := test.class
			actors := []stateActorRow{
				{
					TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, Event: "open",
					ClassPath: &class, SpawnX: float32Ptr(100), SpawnY: float32Ptr(200),
					SpawnYaw: test.yaw,
				},
				{TimeMS: 1800, PacketID: 4, ActorNetGUID: 700, Event: "close"},
			}
			if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
				t.Fatal(err)
			}
			if err := parquet.WriteFile(filepath.Join(dir, "fields.parquet"), test.fields); err != nil {
				t.Fatal(err)
			}

			utilities, _, err := scanUtilities(
				dir,
				"13.08",
				2000,
				[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 2000}},
				newPlayerIndex(&Manifest{}),
				nil,
				nil,
				nil,
				nil,
			)
			if err != nil {
				t.Fatal(err)
			}
			if len(utilities) != 1 || len(utilities[0]) != 1 {
				t.Fatalf("utilities = %#v, want one Curveball", utilities)
			}
			got := utilities[0][0]
			if got.EndTimeMS != 1600 {
				t.Errorf("utility end = %d, want spawn + 600ms (1600)", got.EndTimeMS)
			}
			if len(got.Samples) != test.wantSamples {
				t.Fatalf("sample count = %d, want %d: %+v", len(got.Samples), test.wantSamples, got.Samples)
			}
			if test.wantEndY != 0 && got.Samples[len(got.Samples)-1].Y != test.wantEndY {
				t.Errorf("final Y = %v, want %v", got.Samples[len(got.Samples)-1].Y, test.wantEndY)
			}
			if test.name == "multiple distinct measured samples take precedence" &&
				(got.Samples[0].X != 120 || got.Samples[1].X != 130) {
				t.Errorf("measured samples were replaced: %+v", got.Samples)
			}
		})
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

func TestScanUtilitiesCapsBreachUtilityLifetimes(t *testing.T) {
	tests := []struct {
		name        string
		class       string
		ability     string
		maxLifetime uint32
	}{
		{
			name:        "Aftershock",
			class:       "GameObject_Breach_4_FusionBlast",
			ability:     "aftershock",
			maxLifetime: 2200,
		},
		{
			name:        "Fault Line",
			class:       "GameObject_Breach_E_SweetSpotFissure",
			ability:     "fault_line",
			maxLifetime: 1100,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			dir := t.TempDir()
			class := test.class
			actors := []stateActorRow{
				{
					TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, Event: "open",
					ClassPath: &class, SpawnX: float32Ptr(100), SpawnY: float32Ptr(200),
				},
				{TimeMS: 9000, PacketID: 2, ActorNetGUID: 700, Event: "close"},
			}
			if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
				t.Fatal(err)
			}

			utilities, _, err := scanUtilities(
				dir,
				"13.08",
				10000,
				[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 10000}},
				newPlayerIndex(&Manifest{}),
				nil,
				nil,
				nil,
				nil,
			)
			if err != nil {
				t.Fatal(err)
			}
			if len(utilities) != 1 || len(utilities[0]) != 1 {
				t.Fatalf("utilities = %#v, want one %s utility", utilities, test.ability)
			}
			utility := utilities[0][0]
			if utility.AbilityID != test.ability {
				t.Fatalf("ability id = %q, want %q", utility.AbilityID, test.ability)
			}
			if utility.StartTimeMS != 1000 ||
				utility.EndTimeMS != int(1000+test.maxLifetime) {
				t.Errorf(
					"utility interval = %d..%d, want %d..%d",
					utility.StartTimeMS,
					utility.EndTimeMS,
					1000,
					1000+test.maxLifetime,
				)
			}
		})
	}
}

func TestScanUtilitiesUsesVyseWallAnchorVectors(t *testing.T) {
	dir := t.TempDir()
	wallClass := "GameObject_Nox_Wall"
	trapClass := "GameObject_Nox_WallTrap"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, Event: "open",
			ClassPath: &wallClass, SpawnX: float32Ptr(100), SpawnY: float32Ptr(200),
			SpawnYaw: float32Ptr(35),
		},
		{TimeMS: 3000, PacketID: 4, ActorNetGUID: 700, Event: "close"},
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 701, Event: "open",
			ClassPath: &trapClass, SpawnX: float32Ptr(300), SpawnY: float32Ptr(400),
			SpawnYaw: float32Ptr(90),
		},
		{TimeMS: 3000, PacketID: 4, ActorNetGUID: 701, Event: "close"},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}

	rawVector := func(x, y, z float64) []byte {
		raw := make([]byte, 24)
		binary.LittleEndian.PutUint64(raw[0:8], math.Float64bits(x))
		binary.LittleEndian.PutUint64(raw[8:16], math.Float64bits(y))
		binary.LittleEndian.PutUint64(raw[16:24], math.Float64bits(z))
		return raw
	}
	wallStartName := "MulticastInitializeWall.WallStartLocation"
	wallEndName := "MulticastInitializeWall.WallEndLocation"
	trapStartName := "MulticastInitializeTrapAnchors.WallStartPoint"
	trapEndName := "MulticastInitializeTrapAnchors.WallEndPoint"
	subobjectGUID := uint32(999)
	fields := []fieldRow{
		{TimeMS: 1100, PacketID: 2, ActorNetGUID: 700, FieldName: &wallStartName, BitCount: 192, RawBits: rawVector(1000, 2000, 10)},
		{TimeMS: 1100, PacketID: 2, ActorNetGUID: 700, ObjectNetGUID: &subobjectGUID, FieldName: &wallStartName, BitCount: 192, RawBits: rawVector(50000, 50000, 10)},
		{TimeMS: 1100, PacketID: 2, ActorNetGUID: 700, FieldName: &wallEndName, BitCount: 192, RawBits: rawVector(10000, 2000, 10)},
		{TimeMS: 1100, PacketID: 2, ActorNetGUID: 701, FieldName: &trapStartName, BitCount: 192, RawBits: rawVector(2000, 1000, 10)},
		{TimeMS: 1100, PacketID: 2, ActorNetGUID: 701, FieldName: &trapEndName, BitCount: 192, RawBits: rawVector(2000, 10000, 10)},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "fields.parquet"), fields); err != nil {
		t.Fatal(err)
	}
	fieldData, err := scanFields(dir)
	if err != nil {
		t.Fatal(err)
	}

	utilities, _, err := scanUtilities(
		dir,
		"13.08",
		4000,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 4000}},
		newPlayerIndex(&Manifest{}),
		nil,
		nil,
		nil,
		fieldData.UtilityPaths,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 2 {
		t.Fatalf("utilities = %#v, want both Vyse wall actors", utilities)
	}
	wall, trap := utilities[0][0], utilities[0][1]
	if wall.AbilityID != "shear" || wall.Position != (Position{X: 5500, Y: 2000}) || wall.Yaw != -90 {
		t.Errorf("raised wall geometry = %+v, want midpoint (5500, 2000), yaw -90", wall)
	}
	if trap.AbilityID != "shear" || trap.Position != (Position{X: 2000, Y: 5500}) || trap.Yaw != 0 {
		t.Errorf("trap geometry = %+v, want midpoint (2000, 5500), yaw 0", trap)
	}
}

func TestParseUtilityRawVectorRejectsInvalidEncoding(t *testing.T) {
	raw := make([]byte, 24)
	binary.LittleEndian.PutUint64(raw[0:8], math.Float64bits(1))
	binary.LittleEndian.PutUint64(raw[8:16], math.Float64bits(2))
	binary.LittleEndian.PutUint64(raw[16:24], math.Float64bits(3))
	if position, ok := parseUtilityRawVector(raw, 192); !ok ||
		position != (Position{X: 1, Y: 2}) {
		t.Fatalf("valid vector = %+v/%v, want (1, 2)/true", position, ok)
	}
	if _, ok := parseUtilityRawVector(raw, 191); ok {
		t.Fatal("accepted a vector with a non-192-bit encoding")
	}
	if _, ok := parseUtilityRawVector(raw[:23], 192); ok {
		t.Fatal("accepted a truncated vector")
	}
	binary.LittleEndian.PutUint64(raw[16:24], math.Float64bits(math.NaN()))
	if _, ok := parseUtilityRawVector(raw, 192); ok {
		t.Fatal("accepted a vector with a non-finite Z coordinate")
	}
}

func TestScanUtilitiesUsesVyseTrapYawFallback(t *testing.T) {
	dir := t.TempDir()
	class := "GameObject_Nox_WallTrap"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, Event: "open",
			ClassPath: &class, SpawnX: float32Ptr(100), SpawnY: float32Ptr(200),
			SpawnYaw: float32Ptr(90),
		},
		{TimeMS: 2000, PacketID: 2, ActorNetGUID: 700, Event: "close"},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}

	utilities, _, err := scanUtilities(
		dir,
		"13.08",
		3000,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 3000}},
		newPlayerIndex(&Manifest{}),
		nil,
		nil,
		nil,
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 1 {
		t.Fatalf("utilities = %#v, want one trap utility", utilities)
	}
	if utilities[0][0].Yaw != 0 {
		t.Errorf("trap yaw = %v, want 0 after compensating its along-wall actor yaw", utilities[0][0].Yaw)
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

func TestScanUtilitiesPreservesDirectionalAbilityYaw(t *testing.T) {
	dir := t.TempDir()
	aftershockClass := "GameObject_Breach_4_FusionBlast"
	faultLineClass := "GameObject_Breach_E_SweetSpotFissure"
	bassquakeClass := "GameObject_Iris_X_SonicWave"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, Event: "open",
			ClassPath: &aftershockClass, SpawnX: float32Ptr(100), SpawnY: float32Ptr(200),
			SpawnYaw: float32Ptr(90),
		},
		{TimeMS: 3000, PacketID: 2, ActorNetGUID: 700, Event: "close"},
		{
			TimeMS: 1500, PacketID: 3, ActorNetGUID: 701, Event: "open",
			ClassPath: &faultLineClass, SpawnX: float32Ptr(300), SpawnY: float32Ptr(400),
			SpawnYaw: float32Ptr(180),
		},
		{TimeMS: 3500, PacketID: 4, ActorNetGUID: 701, Event: "close"},
		{
			TimeMS: 2000, PacketID: 5, ActorNetGUID: 702, Event: "open",
			ClassPath: &bassquakeClass, SpawnX: float32Ptr(500), SpawnY: float32Ptr(600),
			SpawnYaw: float32Ptr(0),
		},
		{TimeMS: 3500, PacketID: 6, ActorNetGUID: 702, Event: "close"},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}

	utilities, _, err := scanUtilities(
		dir,
		"13.08",
		4000,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 4000}},
		newPlayerIndex(&Manifest{}),
		nil,
		nil,
		nil,
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 3 {
		t.Fatalf("utilities = %#v, want two directional Breach utilities and Bassquake", utilities)
	}
	if utilities[0][0].AbilityID != "aftershock" || utilities[0][0].Yaw != 90 {
		t.Errorf("Aftershock utility = %+v, want yaw 90", utilities[0][0])
	}
	if utilities[0][1].AbilityID != "fault_line" || utilities[0][1].Yaw != 180 {
		t.Errorf("Fault Line utility = %+v, want yaw 180", utilities[0][1])
	}
	if utilities[0][2].AbilityID != "bassquake" || utilities[0][2].Yaw != 0 {
		t.Errorf("Bassquake utility = %+v, want explicit yaw 0", utilities[0][2])
	}
	payload, err := json.Marshal(utilities[0][2])
	if err != nil {
		t.Fatalf("marshal Bassquake utility: %v", err)
	}
	if !strings.Contains(string(payload), `"yaw":0`) {
		t.Errorf("zero yaw missing from utility JSON: %s", payload)
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

func TestScanUtilitiesSamplesShockBoltReplicatedMovement(t *testing.T) {
	dir := t.TempDir()
	class := "/Game/Characters/Hunter/S0/Ability_4/Projectile_Hunter_4_ExplosiveBolt.Projectile_Hunter_4_ExplosiveBolt_C"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 750, Event: "open",
			ClassPath: &class, SpawnX: float32Ptr(100), SpawnY: float32Ptr(200),
		},
		{TimeMS: 1800, PacketID: 8, ActorNetGUID: 750, Event: "close"},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}

	fieldName := "ReplicatedMovement"
	movementRows := []fieldRow{
		{
			TimeMS: 1200, PacketID: 3, ActorNetGUID: 750, FieldName: &fieldName,
			ValueStr: stringPtr(`{"location":{"x":120.5,"y":220.5,"z":10}}`),
		},
		{
			TimeMS: 1150, PacketID: 5, ActorNetGUID: 750, ObjectNetGUID: uint32Ptr(991), FieldName: &fieldName,
			ValueStr: stringPtr(`{"location":{"x":115.5,"y":215.5,"z":10}}`),
		},
		{
			TimeMS: 1050, PacketID: 2, ActorNetGUID: 750, FieldName: &fieldName,
			ValueStr: stringPtr(`{"location":{"x":105.5,"y":205.5,"z":10}}`),
		},
		{
			TimeMS: 1850, PacketID: 9, ActorNetGUID: 750, FieldName: &fieldName,
			ValueStr: stringPtr(`{"location":{"x":185.5,"y":285.5,"z":10}}`),
		},
		{
			TimeMS: 1100, PacketID: 4, ActorNetGUID: 751, FieldName: &fieldName,
			ValueStr: stringPtr(`{"location":{"x":999,"y":999,"z":10}}`),
		},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "fields.parquet"), movementRows); err != nil {
		t.Fatal(err)
	}

	utilities, _, err := scanUtilities(
		dir,
		"13.08",
		3000,
		[]roundWindow{{RoundNumber: 1, StartMS: 900, EndMS: 2000}},
		newPlayerIndex(&Manifest{}),
		nil,
		nil,
		nil,
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 1 {
		t.Fatalf("utilities = %#v, want one Shock Bolt projectile", utilities)
	}
	projectile := utilities[0][0]
	if projectile.Kind != UtilityMobile || projectile.AbilityID != "shock_bolt" {
		t.Fatalf("projectile identity = %q/%q, want mobile shock_bolt", projectile.Kind, projectile.AbilityID)
	}
	if projectile.StartTimeMS != 100 || projectile.EndTimeMS != 900 {
		t.Fatalf("projectile lifetime = %d..%d, want 100..900", projectile.StartTimeMS, projectile.EndTimeMS)
	}
	if len(projectile.Samples) != 2 ||
		projectile.Samples[0] != (UtilityPositionSample{TimeMS: 150, X: 105.5, Y: 205.5}) ||
		projectile.Samples[1] != (UtilityPositionSample{TimeMS: 300, X: 120.5, Y: 220.5}) {
		t.Fatalf("projectile samples = %#v, want sorted, round-relative samples within actor lifetime", projectile.Samples)
	}
}

func TestParseReplicatedMovementPosition(t *testing.T) {
	position, ok := parseReplicatedMovementPosition(`{"location":{"x":12.5,"y":-34.25,"z":99}}`)
	if !ok || position != (Position{X: 12.5, Y: -34.25}) {
		t.Fatalf("parsed position = %#v/%v, want x=12.5 y=-34.25", position, ok)
	}
	for _, invalid := range []string{
		`{}`,
		`{"location":{"x":"bad","y":1}}`,
		`{"location":{"x":1e999,"y":1}}`,
	} {
		if _, ok := parseReplicatedMovementPosition(invalid); ok {
			t.Errorf("accepted invalid movement value %q", invalid)
		}
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

func stringPtr(value string) *string { return &value }

func uint32Ptr(value uint32) *uint32 { return &value }
