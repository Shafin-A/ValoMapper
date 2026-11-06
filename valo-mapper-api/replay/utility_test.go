package replay

import (
	"encoding/binary"
	"encoding/hex"
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
		{"13.09", "Gameobject_Grenadier_X_UltPulseManager", true, "nullcmd"},
		{"13.09", "Gameobject_Grenadier_X_UltPulse", true, "nullcmd"},
		{"13.08", "Projectile_Wushu_4_Smoke", true, "cloudburst"},
		{"13.08", "Projectile_Hunter_4_ExplosiveBolt", true, "shock_bolt"},
		{"13.08", "GameObject_Mage_4_SplashGrenade", true, "storm_surge"},
		{"13.09", "Projectile_Mage_4_SplashGrenade", true, "storm_surge"},
		{"13.08", "Projectile_Mage_Q_Wall", true, "high_tide"},
		{"13.09", "Patch_Cable_4_NetToss", true, "gravnet"},
		{"13.09", "Projectile_Cable_4_NetToss", true, "gravnet"},
		{"13.09", "GameObject_CableJamRoot", true, "barrier_mesh"},
		{"13.09", "Projectile_CableJam_InAir", true, "barrier_mesh"},
		{"13.09", "Actor_FishingHook", true, "annihilation"},
		{"13.09", "GameObject_FishingHook_CageSphere", true, "annihilation"},
		{"13.08", "GameObject_BountyHunter_X_WaveForm", true, "nightfall"},
		{"13.08", "GameObject_Mage_Q_WallManager", true, "high_tide"},
		{"13.08", "GameObject_Mage_E_WorldSmoke", true, "cove"},
		{"13.08", "GameObject_Mage_X_TidalWave", true, "reckoning"},
		{"13.09", "GameObject_Mage_X_TidalWave_Chunk", true, "reckoning"},
		{"13.09", "GameObject_Paprika_4_PullBlast", true, "flow"},
		{"13.09", "Projectile_Paprika_Q_RedirectFlash", true, "flashbulb"},
		{"13.09", "Projectile_Paprika_Q_RedirectFlash_Underhand", true, "flashbulb"},
		{"13.09", "Projectile_Paprika_E_RedirectPull", true, "displacement"},
		{"13.09", "GameObject_Paprika_E_RedirectPullArea", true, "displacement"},
		{"13.09", "Projectile_Paprika_X_FullBendPop", true, "suspension"},
		{"13.09", "GameObject_Paprika_X_LevitateZone", true, "suspension"},
		{"13.08", "GameObject_Pine_4_UsableTeleport", true, "crosscut"},
		{"13.08", "GameObject_Pine_Q_SeizeTrap", true, "chokehold"},
		{"13.08", "GameObject_Pine_Q_Tether_SphereExpansion", true, "chokehold"},
		{"13.08", "Pawn_Pine_E_RadEater", true, "interceptor"},
		{"13.08", "Patch_Pandemic_AcidMolotov_NewMolotov", true, "snake_bite"},
		{"13.08", "Projectile_Pandemic_Q_AcidGrenade", true, "snake_bite"},
		{"13.08", "GameObject_Pandemic_4_SmokeZone", true, "poison_cloud"},
		{"13.08", "Projectile_Pandemic_4_SmokeGrenade", true, "poison_cloud"},
		{"13.08", "GameObject_Pandemic_E_SmokeScreenManager", true, "toxic_screen"},
		{"13.08", "Patch_Pandemic_X_Circular", true, "vipers_pit"},
		{"13.08", "GameObject_Terra_C_TimeSlowGrenade_Explosion", true, "saturate"},
		{"13.08", "Projectile_Terra_C_TimeSlowGrenade", true, "saturate"},
		{"13.08", "GameObject_Terra_E_RewindTime_RewindTarget", true, "refract"},
		{"13.08", "GameObject_Terra_X_DelayedBeam_Beam", true, "convergent_paths"},
		{"13.09", "Projectile_Cashew_Q_ShellShockGrenade", true, "special_delivery"},
		{"13.09", "Projectile_Cashew_Q_ShellShockGrenade_Bounce", true, "special_delivery"},
		{"13.09", "GameObject_Cashew_Q_ShellShockGrenade", true, "special_delivery"},
		{"13.09", "Pawn_Cashew_4_Spider_LockOn", true, "stealth_drone"},
		{"13.09", "GameObject_Cashew_4_SonarPing", true, "stealth_drone"},
		{"13.09", "GameObject_Cashew_E_MapMissileMarker", true, "guided_salvo"},
		{"13.09", "GameObject_Cashew_E_MapMissileMarker_SecondRocket", true, "guided_salvo"},
		{"13.09", "AIPawn_Cashew_E_SeekingTargetMissile", true, "guided_salvo"},
		{"13.09", "GameObject_Cashew_E_AirStrikeMortar", true, "guided_salvo"},
		{"13.09", "GameObject_Cashew_X_SegmentManager", true, "armageddon"},
		{"13.08", "Ability_BountyHunter_4_WolfHoundBendable", false, ""},
		{"13.09", "GameObject_Smonk_NewSmoke", true, "ruse"},
		{"13.10", "GameObject_Smonk_NewSmoke", false, ""},
	}

	for _, test := range tests {
		t.Run(test.build+"/"+test.class, func(t *testing.T) {
			build, ok := utilityBuildNumber(test.build)
			entry, found := utilityCatalog[test.class]
			got := ok && build >= entry.minBuild && build <= 1309 && found
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

func TestPoisonCloudProjectileRendersIconOnly(t *testing.T) {
	entry, ok := utilityCatalog["Projectile_Pandemic_4_SmokeGrenade"]
	if !ok {
		t.Fatal("Viper Poison Cloud projectile is missing from the catalog")
	}
	if entry.kind != UtilityMobile || entry.ability != "poison_cloud" {
		t.Errorf("projectile entry = %+v, want a Poison Cloud mobile projectile", entry)
	}
	if !entry.iconOnly {
		t.Error("Poison Cloud projectile must render as an icon without the smoke circle")
	}
	if zone, ok := utilityCatalog["GameObject_Pandemic_4_SmokeZone"]; ok && zone.iconOnly {
		t.Error("the activated Poison Cloud must keep its smoke circle")
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
		fieldData.UtilityFuel,
		fieldData.UtilityDestroy,
		fieldData.UtilityActivation,
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
		fieldData.UtilityFuel,
		fieldData.UtilityDestroy,
		fieldData.UtilityActivation,
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
		{"Projectile_Cable_4_NetToss", "gravnet"},
		{"Projectile_CableJam_InAir", "barrier_mesh"},
		{"Projectile_Cashew_Q_ShellShockGrenade", "special_delivery"},
		{"Projectile_Cashew_Q_ShellShockGrenade_Bounce", "special_delivery"},
		{"Projectile_Clay_4_Projectile_Primary", "paint_shells"},
		{"Projectile_Clay_Q_Satchel_Arming", "blast_pack"},
		{"Projectile_Clay_X_Rocket", "showstopper"},
		{"Projectile_C_Grenadier_Flash", "flashdrive"},
		{"Projectile_C_Grenadier_Flash_Underhand", "flashdrive"},
		{"Projectile_Grenadier_E_SuppressionBlade", "zeropoint"},
		{"Projectile_Mage_4_SplashGrenade", "storm_surge"},
		{"Projectile_Mage_Q_Wall", "high_tide"},
		{"Projectile_Guide_E_HawkFlash", "guiding_light"},
		{"Projectile_Killjoy_4_RemoteBees_MultiDetonate", "nanoswarm"},
		{"Projectile_Pandemic_Q_AcidGrenade", "snake_bite"},
		{"Projectile_Pandemic_4_SmokeGrenade", "poison_cloud"},
		{"Projectile_Paprika_Q_RedirectFlash", "flashbulb"},
		{"Projectile_Paprika_Q_RedirectFlash_Underhand", "flashbulb"},
		{"Projectile_Paprika_E_RedirectPull", "displacement"},
		{"Projectile_Paprika_X_FullBendPop", "suspension"},
		{"Projectile_Sequoia_Q_FragileMissile", "undercut"},
		{"Projectile_Sprinter_4_GroundStrike", "relay_bolt"},
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
		{"Projectile_Terra_C_TimeSlowGrenade", "saturate"},
		{"Projectile_Thorne_4_SlowFIeld_Production", "slow_orb"},
		{"Projectile_Vampire_4_NearsightAoE", "leer"},
		{"Projectile_Wraith_Q_NearsightMissile", "paranoia"},
		{"Projectile_Wraith_4_Smoke", "dark_cover"},
		{"Projectile_Wushu_4_Smoke", "cloudburst"},
		{"Projectile_Stealth_Q_BounceFlash", "blindside"},
	}

	// These projectiles should fly as their ability icon plus a trail, without
	// drawing the placed ability's area or circle while still in flight.
	iconOnlyProjectiles := map[string]bool{
		"Projectile_Aggrobot_C_ExplodeyPatch":                     true,
		"Projectile_Cashew_Q_ShellShockGrenade":                   true,
		"Projectile_Cashew_Q_ShellShockGrenade_Bounce":            true,
		"Projectile_E_BountyHunter_Divebomb":                      true,
		"Projectile_Q_BountyHunter_TetherGrenade_SphereExpansion": true,
		"Projectile_Grenadier_E_SuppressionBlade":                 true,
		"Projectile_Killjoy_4_RemoteBees_MultiDetonate":           true,
		"Projectile_Mage_4_SplashGrenade":                         true,
		"Projectile_Pandemic_4_SmokeGrenade":                      true,
		"Projectile_Paprika_Q_RedirectFlash":                      true,
		"Projectile_Paprika_Q_RedirectFlash_Underhand":            true,
		"Projectile_Paprika_E_RedirectPull":                       true,
		"Projectile_Paprika_X_FullBendPop":                        true,
		"Projectile_Sprinter_4_GroundStrike":                      true,
		"Projectile_Sarge_E_SpeedStim":                            true,
		"Projectile_Sarge_Q_Molotov_Production":                   true,
		"Projectile_Hunter_4_ExplosiveBolt":                       true,
		"Projectile_Hunter_Q_RevealBolt":                          true,
		"Projectile_Thumper_Concuss":                              true,
		"Projectile_Thumper_Heal":                                 true,
		"Projectile_Nox_BarbedWire":                               true,
		"Projectile_Terra_C_TimeSlowGrenade":                      true,
		"Projectile_Cable_4_NetToss":                              true,
		"Projectile_NetToss":                                      true,
		"Projectile_CableJam_InAir":                               true,
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
			if want := iconOnlyProjectiles[test.class]; entry.iconOnly != want {
				t.Fatalf("iconOnly = %v, want %v", entry.iconOnly, want)
			}
		})
	}
}

func TestUtilityCatalogAddsHushAreas(t *testing.T) {
	tests := []struct {
		class   string
		kind    UtilityKind
		ability string
	}{
		{"GameObject_Paprika_4_PullBlast", UtilityMarker, "flow"},
		{"GameObject_Paprika_E_RedirectPullArea", UtilityArea, "displacement"},
		{"GameObject_Paprika_X_LevitateZone", UtilityArea, "suspension"},
	}

	for _, test := range tests {
		t.Run(test.class, func(t *testing.T) {
			entry, found := utilityCatalog[test.class]
			if !found {
				t.Fatal("Hush utility class is not catalogued")
			}
			if entry.kind != test.kind || entry.ability != test.ability {
				t.Fatalf("entry = %#v, want kind %q ability %q",
					entry, test.kind, test.ability)
			}
			if entry.iconOnly {
				t.Fatal("placed Hush utility must keep its marker or area rendering")
			}
		})
	}
}

func TestUtilityCatalogAddsTejoLandingAreas(t *testing.T) {
	tests := []struct {
		class      string
		kind       UtilityKind
		ability    string
		iconOnly   bool
		mobile     bool
		replicated bool
	}{
		{"GameObject_Cashew_Q_ShellShockGrenade", UtilityArea, "special_delivery", false, false, false},
		{"GameObject_Cashew_E_AirStrikeMortar", UtilityArea, "guided_salvo", false, false, false},
		{"AIPawn_Cashew_E_SeekingTargetMissile", UtilityMobile, "guided_salvo", true, true, false},
		{"GameObject_Cashew_X_SegmentManager", UtilityArea, "armageddon", false, false, false},
	}

	for _, test := range tests {
		t.Run(test.class, func(t *testing.T) {
			entry, found := utilityCatalog[test.class]
			if !found {
				t.Fatal("Tejo utility class is not catalogued")
			}
			if entry.kind != test.kind || entry.ability != test.ability {
				t.Fatalf("entry = %#v, want kind %q ability %q",
					entry, test.kind, test.ability)
			}
			if entry.iconOnly != test.iconOnly || entry.mobile != test.mobile ||
				entry.replicatedMovement != test.replicated {
				t.Fatalf("entry flags = %#v, want iconOnly=%v mobile=%v replicated=%v",
					entry, test.iconOnly, test.mobile, test.replicated)
			}
		})
	}

	armageddon := utilityCatalog["GameObject_Cashew_X_SegmentManager"]
	if armageddon.forwardMovement != 32 || armageddon.maxLifetimeMS != 5000 {
		t.Fatalf("Armageddon movement = %#v, want 32 m over 5000 ms", armageddon)
	}
}

func TestAddNanoswarmPlacedMarkersBridgesFlightAndActivation(t *testing.T) {
	utilities := [][]Utility{{
		{
			ID: "utility-flight", Kind: UtilityMobile, AbilityID: "nanoswarm",
			StartTimeMS: 100, EndTimeMS: 500, OwnerPuuid: "owner-1", IconOnly: true,
			Samples: []UtilityPositionSample{
				{TimeMS: 100, X: 1000, Y: 2000},
				{TimeMS: 400, X: 1500, Y: 2000},
			},
		},
		{
			ID: "utility-activation", Kind: UtilityMolly, AbilityID: "nanoswarm",
			StartTimeMS: 1800, EndTimeMS: 2600, OwnerPuuid: "owner-1",
			Position: Position{X: 1520, Y: 2000},
		},
	}}
	windows := []roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 3000}}

	addNanoswarmPlacedMarkers(utilities, windows)

	if len(utilities[0]) != 3 {
		t.Fatalf("utilities = %#v, want flight, placed marker, and activated zone", utilities[0])
	}
	var placed *Utility
	for i := range utilities[0] {
		if utilities[0][i].Kind == UtilityMarker {
			placed = &utilities[0][i]
		}
	}
	if placed == nil ||
		placed.StartTimeMS != 500 || placed.EndTimeMS != 1800 ||
		placed.Position != (Position{X: 1500, Y: 2000}) || !placed.IconOnly {
		t.Errorf("placed Nanoswarm = %+v, want icon marker from landing to activation", placed)
	}
	for _, utility := range utilities[0] {
		if utility.ID == "utility-activation" &&
			(utility.Kind != UtilityMolly || utility.IconOnly) {
			t.Errorf("activated Nanoswarm = %+v, want its circle shape", utility)
		}
	}
}

func TestAddNanoswarmPlacedMarkersRemainUntilRoundEndWithoutActivation(t *testing.T) {
	utilities := [][]Utility{{
		{
			ID: "utility-flight", Kind: UtilityMobile, AbilityID: "nanoswarm",
			StartTimeMS: 100, EndTimeMS: 500, IconOnly: true,
			Samples: []UtilityPositionSample{{TimeMS: 400, X: 1500, Y: 2000}},
		},
	}}
	windows := []roundWindow{{RoundNumber: 1, StartMS: 1000, EndMS: 3000}}

	addNanoswarmPlacedMarkers(utilities, windows)

	if len(utilities[0]) != 2 {
		t.Fatalf("utilities = %#v, want flight and placed marker", utilities[0])
	}
	placed := utilities[0][1]
	if placed.StartTimeMS != 500 || placed.EndTimeMS != 2000 || !placed.IconOnly {
		t.Errorf("unactivated placed Nanoswarm = %+v, want icon marker until round end", placed)
	}
}

func TestAddNanoswarmPlacedMarkerEndsWhenActorClosesAfterSettling(t *testing.T) {
	utilities := [][]Utility{{
		{
			ID: "utility-flight-1", Kind: UtilityMobile, AbilityID: "nanoswarm",
			StartTimeMS: 100, EndTimeMS: 5000, OwnerPuuid: "owner-1",
			Samples: []UtilityPositionSample{{TimeMS: 400, X: 1000, Y: 2000}},
		},
		{
			ID: "utility-flight-2", Kind: UtilityMobile, AbilityID: "nanoswarm",
			StartTimeMS: 700, EndTimeMS: 1800, OwnerPuuid: "owner-1",
			Samples: []UtilityPositionSample{{TimeMS: 1000, X: 2000, Y: 2000}},
		},
		{
			ID: "utility-flight-3", Kind: UtilityMobile, AbilityID: "nanoswarm",
			StartTimeMS: 1300, EndTimeMS: 5000, OwnerPuuid: "owner-1",
			Samples: []UtilityPositionSample{{TimeMS: 1600, X: 3000, Y: 2000}},
		},
	}}
	buyEndMS := uint32(2500)
	windows := []roundWindow{{
		RoundNumber: 1, StartMS: 0, EndMS: 5000, BuyEndMS: &buyEndMS,
	}}

	addNanoswarmPlacedMarkers(utilities, windows)

	var placed []Utility
	for _, utility := range utilities[0] {
		if utility.Kind == UtilityMarker {
			placed = append(placed, utility)
		}
	}
	if len(placed) != 3 {
		t.Fatalf("placed markers = %d, want one for each throw", len(placed))
	}
	for _, utility := range placed {
		switch utility.ID {
		case "utility-flight-1-placed":
			if utility.EndTimeMS != 5000 {
				t.Errorf("marker end = %d, want round end 5000", utility.EndTimeMS)
			}
		case "utility-flight-2-placed":
			if utility.StartTimeMS != 1251 || utility.EndTimeMS != 1800 {
				t.Errorf("picked-up marker interval = %d..%d, want 1251..1800",
					utility.StartTimeMS, utility.EndTimeMS)
			}
		case "utility-flight-3-placed":
			if utility.EndTimeMS != 5000 {
				t.Errorf("marker %q end = %d, want round end 5000", utility.ID, utility.EndTimeMS)
			}
		default:
			t.Errorf("unexpected placed marker %q", utility.ID)
		}
	}
}

func TestAddNanoswarmPlacedMarkerEndsWhenActorClosesAfterBuyPhase(t *testing.T) {
	utilities := [][]Utility{{
		{
			ID: "utility-flight", Kind: UtilityMobile, AbilityID: "nanoswarm",
			StartTimeMS: 100, EndTimeMS: 2500, OwnerPuuid: "owner-1",
			Samples: []UtilityPositionSample{{TimeMS: 1000, X: 2000, Y: 2000}},
		},
	}}
	buyEndMS := uint32(2000)
	windows := []roundWindow{{
		RoundNumber: 1, StartMS: 0, EndMS: 3000, BuyEndMS: &buyEndMS,
	}}

	addNanoswarmPlacedMarkers(utilities, windows)

	if got := utilities[0][1].EndTimeMS; got != 2500 {
		t.Errorf("marker end = %d, want actor close time 2500", got)
	}
}

func TestAddNanoswarmPlacedMarkerWhenFlightActorLastsThroughRoundEnd(t *testing.T) {
	utilities := [][]Utility{{
		{
			ID: "utility-flight", Kind: UtilityMobile, AbilityID: "nanoswarm",
			StartTimeMS: 100, EndTimeMS: 2000, IconOnly: true,
			Samples: []UtilityPositionSample{
				{TimeMS: 100, X: 1400, Y: 2000},
				{TimeMS: 1500, X: 1500, Y: 2000},
			},
		},
	}}
	windows := []roundWindow{{RoundNumber: 1, StartMS: 1000, EndMS: 3000}}

	addNanoswarmPlacedMarkers(utilities, windows)

	if len(utilities[0]) != 2 {
		t.Fatalf("utilities = %#v, want flight and placed marker", utilities[0])
	}
	placed := utilities[0][1]
	if placed.StartTimeMS != 1751 || placed.EndTimeMS != 2000 || !placed.IconOnly {
		t.Errorf("round-clipped Nanoswarm marker = %+v, want icon marker after flight sample expires", placed)
	}
}

func TestAddNanoswarmPlacedMarkerEndsWhenActivatedBeforeFlightActorCloses(t *testing.T) {
	utilities := [][]Utility{{
		{
			ID: "utility-flight", Kind: UtilityMobile, AbilityID: "nanoswarm",
			StartTimeMS: 100, EndTimeMS: 2500, OwnerPuuid: "owner-1", IconOnly: true,
			Samples: []UtilityPositionSample{
				{TimeMS: 100, X: 1400, Y: 2000},
				{TimeMS: 1500, X: 1500, Y: 2000},
			},
		},
		{
			ID: "utility-activation", Kind: UtilityMolly, AbilityID: "nanoswarm",
			StartTimeMS: 1800, EndTimeMS: 3000, OwnerPuuid: "owner-1",
			Position: Position{X: 1520, Y: 2000},
		},
	}}
	windows := []roundWindow{{RoundNumber: 1, StartMS: 1000, EndMS: 4000}}

	addNanoswarmPlacedMarkers(utilities, windows)

	var placed *Utility
	placedCount, activationCount := 0, 0
	for i := range utilities[0] {
		switch utilities[0][i].Kind {
		case UtilityMarker:
			placed = &utilities[0][i]
			placedCount++
		case UtilityMolly:
			activationCount++
		}
	}
	if placedCount != 1 || activationCount != 1 {
		t.Fatalf("placed/activated counts = %d/%d, want one each", placedCount, activationCount)
	}
	if placed.StartTimeMS != 1751 || placed.EndTimeMS != 1800 {
		t.Errorf("placed Nanoswarm interval = %d..%d, want 1751..1800",
			placed.StartTimeMS, placed.EndTimeMS)
	}
}

func TestNanoswarmActivatedUtilityLifetimeIsCappedAtFourSeconds(t *testing.T) {
	entry := utilityCatalog["GameObject_Killjoy_4_BeeSwarm_Damage"]
	if entry.maxLifetimeMS != 4000 {
		t.Fatalf("Nanoswarm activation max lifetime = %dms, want 4000ms", entry.maxLifetimeMS)
	}
}

func TestRazorvineRendersIconOnlyUntilActivated(t *testing.T) {
	projectile, ok := utilityCatalog["Projectile_Nox_BarbedWire"]
	if !ok {
		t.Fatal("Razorvine projectile is missing from the catalog")
	}
	if projectile.kind != UtilityMobile || !projectile.replicatedMovement {
		t.Errorf("Razorvine projectile entry = %+v, want a replicated-movement mobile utility", projectile)
	}
	if !projectile.iconOnly {
		t.Error("Razorvine projectile must render as an icon without a circle")
	}

	placed, ok := utilityCatalog["GameObject_Nox_BarbedWire"]
	if !ok {
		t.Fatal("Razorvine placed wire is missing from the catalog")
	}
	if placed.kind != UtilityMarker || !placed.iconOnly {
		t.Errorf("Razorvine placed wire entry = %+v, want an icon-only marker", placed)
	}

	activated, ok := utilityCatalog["Patch_Nox_BarbedWire"]
	if !ok {
		t.Fatal("Razorvine activation patch is missing from the catalog")
	}
	if activated.kind != UtilityMolly || activated.iconOnly {
		t.Errorf("Razorvine activation entry = %+v, want a molly circle", activated)
	}
	if activated.maxLifetimeMS != 6000 {
		t.Errorf("Razorvine activation max lifetime = %dms, want 6000ms", activated.maxLifetimeMS)
	}
}

func TestScanUtilitiesRendersRazorvinePlacedAndActivatedStates(t *testing.T) {
	placedClass := "GameObject_Nox_BarbedWire"
	patchClass := "Patch_Nox_BarbedWire"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, Event: "open",
			ClassPath: &placedClass, SpawnX: float32Ptr(150), SpawnY: float32Ptr(200),
		},
		{TimeMS: 3000, PacketID: 2, ActorNetGUID: 700, Event: "close"},
		{
			TimeMS: 3000, PacketID: 2, ActorNetGUID: 701, Event: "open",
			ClassPath: &patchClass, SpawnX: float32Ptr(150), SpawnY: float32Ptr(200),
		},
		{TimeMS: 9500, PacketID: 3, ActorNetGUID: 701, Event: "close"},
	}

	utilities := scanRazorvineFixture(t, actors, 12000)

	if len(utilities) != 2 {
		t.Fatalf("utilities = %#v, want one placed marker and one activation", utilities)
	}
	marker, activation := utilities[0], utilities[1]
	if marker.Kind != UtilityMarker || !marker.IconOnly ||
		marker.AbilityID != "razorvine" ||
		marker.StartTimeMS != 1000 || marker.EndTimeMS != 3000 {
		t.Errorf("Razorvine placed state = %+v, want icon-only marker 1000..3000", marker)
	}
	if activation.Kind != UtilityMolly || activation.IconOnly ||
		activation.AbilityID != "razorvine" ||
		activation.StartTimeMS != 3000 || activation.EndTimeMS != 9000 {
		t.Errorf("Razorvine activated state = %+v, want circle 3000..9000", activation)
	}
}

func TestScanUtilitiesClosesRazorvineMarkerOnPickup(t *testing.T) {
	placedClass := "GameObject_Nox_BarbedWire"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, Event: "open",
			ClassPath: &placedClass, SpawnX: float32Ptr(150), SpawnY: float32Ptr(200),
		},
		{TimeMS: 2500, PacketID: 2, ActorNetGUID: 700, Event: "close"},
	}

	utilities := scanRazorvineFixture(t, actors, 4000)

	if len(utilities) != 1 {
		t.Fatalf("utilities = %#v, want only the placed marker", utilities)
	}
	marker := utilities[0]
	if marker.Kind != UtilityMarker || !marker.IconOnly ||
		marker.AbilityID != "razorvine" ||
		marker.StartTimeMS != 1000 || marker.EndTimeMS != 2500 {
		t.Errorf("picked-up Razorvine = %+v, want icon-only marker 1000..2500", marker)
	}
}

func scanRazorvineFixture(t *testing.T, actors []stateActorRow, durationMS uint32) []Utility {
	t.Helper()
	dir := t.TempDir()
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}
	utilities, _, err := scanUtilities(
		dir,
		"13.08",
		durationMS,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: durationMS}},
		newPlayerIndex(&Manifest{}),
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 {
		t.Fatalf("round count = %d, want 1", len(utilities))
	}
	return utilities[0]
}

func TestAddPoisonCloudPlacedMarkersSplitsAroundEveryActivation(t *testing.T) {
	position := Position{X: 1500, Y: 2000}
	utilities := [][]Utility{{
		{
			ID: "utility-flight", Kind: UtilityMobile, AbilityID: "poison_cloud",
			StartTimeMS: 100, EndTimeMS: 500, OwnerPuuid: "owner-1",
			Samples: []UtilityPositionSample{
				{TimeMS: 100, X: 1000, Y: 2000},
				{TimeMS: 400, X: position.X, Y: position.Y},
			},
		},
		{
			ID: "utility-cloud-1", Kind: UtilitySmoke, AbilityID: "poison_cloud",
			StartTimeMS: 600, EndTimeMS: 1600, Position: position, OwnerPuuid: "owner-1",
		},
		{
			ID: "utility-cloud-2", Kind: UtilitySmoke, AbilityID: "poison_cloud",
			StartTimeMS: 2000, EndTimeMS: 3000, Position: position, OwnerPuuid: "owner-1",
		},
	}}
	windows := []roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 4000}}

	addPoisonCloudPlacedMarkers(utilities, windows)

	markers := make(map[string]Utility)
	for _, utility := range utilities[0] {
		if utility.Kind == UtilityMarker {
			markers[utility.ID] = utility
		}
	}
	want := map[string][2]int{
		"utility-flight-placed-1": {500, 600},
		"utility-flight-placed-2": {1600, 2000},
		"utility-flight-placed-3": {3000, 4000},
	}
	if len(markers) != len(want) {
		t.Fatalf("placed markers = %#v, want three inactive intervals", markers)
	}
	for id, interval := range want {
		marker, found := markers[id]
		if !found {
			t.Errorf("missing placed marker %q", id)
			continue
		}
		if marker.StartTimeMS != interval[0] || marker.EndTimeMS != interval[1] {
			t.Errorf("marker %q interval = %d..%d, want %d..%d",
				id, marker.StartTimeMS, marker.EndTimeMS, interval[0], interval[1])
		}
		if marker.AbilityID != "poison_cloud" || !marker.IconOnly ||
			marker.Position != position || marker.OwnerPuuid != "owner-1" {
			t.Errorf("marker %q = %+v, want an owned icon-only Poison Cloud marker", id, marker)
		}
	}
}

func TestAddPoisonCloudPlacedMarkerStaysUntilRoundEndWithoutActivation(t *testing.T) {
	utilities := [][]Utility{{
		{
			ID: "utility-flight", Kind: UtilityMobile, AbilityID: "poison_cloud",
			StartTimeMS: 100, EndTimeMS: 500,
			Samples: []UtilityPositionSample{{TimeMS: 400, X: 1500, Y: 2000}},
		},
	}}
	windows := []roundWindow{{RoundNumber: 1, StartMS: 1000, EndMS: 3000}}

	addPoisonCloudPlacedMarkers(utilities, windows)

	if len(utilities[0]) != 2 {
		t.Fatalf("utilities = %#v, want flight and placed marker", utilities[0])
	}
	placed := utilities[0][1]
	if placed.Kind != UtilityMarker || !placed.IconOnly ||
		placed.StartTimeMS != 500 || placed.EndTimeMS != 2000 {
		t.Errorf("unactivated Poison Cloud marker = %+v, want icon 500..2000", placed)
	}
}

func TestAddPoisonCloudPlacedMarkersIgnoreUnmatchedActivations(t *testing.T) {
	tests := []struct {
		name       string
		flight     Utility
		activation Utility
	}{
		{
			name: "different owner",
			flight: Utility{
				ID: "utility-flight", Kind: UtilityMobile, AbilityID: "poison_cloud",
				StartTimeMS: 100, EndTimeMS: 500, OwnerPuuid: "owner-1",
				Samples: []UtilityPositionSample{{TimeMS: 400, X: 1500, Y: 2000}},
			},
			activation: Utility{
				ID: "utility-cloud", Kind: UtilitySmoke, AbilityID: "poison_cloud",
				StartTimeMS: 600, EndTimeMS: 1600, Position: Position{X: 1500, Y: 2000},
				OwnerPuuid: "owner-2",
			},
		},
		{
			name: "too far away",
			flight: Utility{
				ID: "utility-flight", Kind: UtilityMobile, AbilityID: "poison_cloud",
				StartTimeMS: 100, EndTimeMS: 500, OwnerPuuid: "owner-1",
				Samples: []UtilityPositionSample{{TimeMS: 400, X: 1500, Y: 2000}},
			},
			activation: Utility{
				ID: "utility-cloud", Kind: UtilitySmoke, AbilityID: "poison_cloud",
				StartTimeMS: 600, EndTimeMS: 1600, Position: Position{X: 2001, Y: 2000},
				OwnerPuuid: "owner-1",
			},
		},
		{
			name: "activation before landing",
			flight: Utility{
				ID: "utility-flight", Kind: UtilityMobile, AbilityID: "poison_cloud",
				StartTimeMS: 100, EndTimeMS: 500, OwnerPuuid: "owner-1",
				Samples: []UtilityPositionSample{{TimeMS: 400, X: 1500, Y: 2000}},
			},
			activation: Utility{
				ID: "utility-cloud", Kind: UtilitySmoke, AbilityID: "poison_cloud",
				StartTimeMS: 300, EndTimeMS: 1600, Position: Position{X: 1500, Y: 2000},
				OwnerPuuid: "owner-1",
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			utilities := [][]Utility{{test.flight, test.activation}}
			windows := []roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 3000}}

			addPoisonCloudPlacedMarkers(utilities, windows)

			markers := 0
			for _, utility := range utilities[0] {
				if utility.Kind != UtilityMarker {
					continue
				}
				markers++
				if utility.StartTimeMS != 500 || utility.EndTimeMS != 3000 {
					t.Errorf("unmatched marker interval = %d..%d, want 500..3000",
						utility.StartTimeMS, utility.EndTimeMS)
				}
			}
			if markers != 1 {
				t.Errorf("placed markers = %d, want the full inactive interval", markers)
			}
		})
	}
}

func TestAddPoisonCloudPlacedMarkersRequireObservedFlightSamples(t *testing.T) {
	utilities := [][]Utility{{
		{
			ID: "utility-flight", Kind: UtilityMobile, AbilityID: "poison_cloud",
			StartTimeMS: 100, EndTimeMS: 500,
		},
	}}
	windows := []roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 3000}}

	addPoisonCloudPlacedMarkers(utilities, windows)

	if len(utilities[0]) != 1 || utilities[0][0].Kind != UtilityMobile {
		t.Errorf("utilities = %#v, want no marker without a landing sample", utilities[0])
	}
}

func TestScanUtilitiesTrimsPoisonCloudToDestroySignal(t *testing.T) {
	tests := []struct {
		name      string
		destroyMS uint32
		wantEnd   int
	}{
		{name: "deactivation before actor close", destroyMS: 2000, wantEnd: 2000},
		{name: "destroy outside lifecycle is ignored", destroyMS: 3500, wantEnd: 3000},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			dir := t.TempDir()
			class := "GameObject_Pandemic_4_SmokeZone"
			actors := []stateActorRow{
				{
					TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, Event: "open",
					ClassPath: &class, SpawnX: float32Ptr(100), SpawnY: float32Ptr(200),
				},
				{TimeMS: 3000, PacketID: 2, ActorNetGUID: 700, Event: "close"},
			}
			if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
				t.Fatal(err)
			}
			destroyName := "Multicast Destroy Smoke"
			fields := []fieldRow{
				{TimeMS: test.destroyMS, PacketID: 2, ActorNetGUID: 700, FieldName: &destroyName},
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
				fieldData.UtilityOwners,
				fieldData.UtilityPaths,
				fieldData.UtilityFuel,
				fieldData.UtilityDestroy,
				fieldData.UtilityActivation,
			)
			if err != nil {
				t.Fatal(err)
			}
			if len(utilities) != 1 || len(utilities[0]) != 1 {
				t.Fatalf("utilities = %#v, want one Poison Cloud", utilities)
			}
			utility := utilities[0][0]
			if utility.AbilityID != "poison_cloud" ||
				utility.StartTimeMS != 1000 || utility.EndTimeMS != test.wantEnd {
				t.Errorf("Poison Cloud interval = %d..%d, want 1000..%d",
					utility.StartTimeMS, utility.EndTimeMS, test.wantEnd)
			}
		})
	}
}

func TestScanUtilitiesTrimsPoisonCloudToFuelDrainFallback(t *testing.T) {
	dir := t.TempDir()
	class := "GameObject_Pandemic_4_SmokeZone"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, Event: "open",
			ClassPath: &class, SpawnX: float32Ptr(100), SpawnY: float32Ptr(200),
		},
		{TimeMS: 3000, PacketID: 2, ActorNetGUID: 700, Event: "close"},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}

	ownerName := "Instigator"
	fuelGroup := "/Game/Characters/Components/Comp_AbilityFuelSystem.Comp_AbilityFuelSystem_C"
	fuelName := "CurrentFuel"
	drainingName := "IsFuelDraining"
	ownerActor := int64(800)
	fuel := 0.8
	draining, stopped := true, false
	fields := []fieldRow{
		{TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, FieldName: &ownerName, ValueI64: &ownerActor},
		{TimeMS: 1000, PacketID: 1, ActorNetGUID: 800, GroupPath: fuelGroup, FieldName: &fuelName, ValueF64: &fuel},
		{TimeMS: 1500, PacketID: 2, ActorNetGUID: 800, GroupPath: fuelGroup, FieldName: &drainingName, ValueBool: &draining},
		{TimeMS: 2000, PacketID: 3, ActorNetGUID: 800, GroupPath: fuelGroup, FieldName: &drainingName, ValueBool: &stopped},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "fields.parquet"), fields); err != nil {
		t.Fatal(err)
	}

	pawn := uint32(800)
	subject := normaliseUUID("00000000-0000-0000-0000-000000000001")
	index := newPlayerIndex(&Manifest{Players: []ManifestPlayer{{
		ActorNetGUID: 900, Subject: subject,
		CharacterNetGUID: &pawn, CharacterNetGUIDs: []uint32{pawn},
	}}})
	fieldData, err := scanFields(dir)
	if err != nil {
		t.Fatal(err)
	}
	if got := len(fieldData.UtilityFuel[800]); got != 3 {
		t.Fatalf("fuel writes = %d, want CurrentFuel plus both drain transitions", got)
	}
	utilities, _, err := scanUtilities(
		dir,
		"13.08",
		4000,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 4000}},
		index,
		map[string]string{subject: pseudonymousID(subject)},
		nil,
		fieldData.UtilityOwners,
		fieldData.UtilityPaths,
		fieldData.UtilityFuel,
		fieldData.UtilityDestroy,
		fieldData.UtilityActivation,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 1 {
		t.Fatalf("utilities = %#v, want one Poison Cloud", utilities)
	}
	utility := utilities[0][0]
	if utility.AbilityID != "poison_cloud" ||
		utility.StartTimeMS != 1000 || utility.EndTimeMS != 2000 {
		t.Errorf("Poison Cloud interval = %d..%d, want 1000..2000",
			utility.StartTimeMS, utility.EndTimeMS)
	}
}

func TestPoisonCloudActivationEndPrefersDestroySignal(t *testing.T) {
	drain := func(timeMS uint32, value bool) utilityFuelWrite {
		return utilityFuelWrite{TimeMS: timeMS, Draining: &value}
	}
	endMS, ok := poisonCloudActivationEndMS(
		1000,
		3000,
		[]utilityDestroyWrite{{TimeMS: 2500}, {TimeMS: 2000}},
		[]utilityFuelWrite{drain(1500, true), drain(2200, false)},
	)
	if !ok || endMS != 2000 {
		t.Fatalf("activation end = %d/%v, want earliest destroy at 2000", endMS, ok)
	}
}

func TestPoisonCloudActivationEndFallsBackToObservedFuelDrain(t *testing.T) {
	drain := func(timeMS uint32, value bool) utilityFuelWrite {
		return utilityFuelWrite{TimeMS: timeMS, Draining: &value}
	}
	tests := []struct {
		name   string
		fuel   []utilityFuelWrite
		open   uint32
		close  uint32
		wantMS uint32
		wantOK bool
	}{
		{
			name:   "manual deactivation",
			fuel:   []utilityFuelWrite{drain(900, false), drain(1500, true), drain(2000, false)},
			open:   1000,
			close:  3000,
			wantMS: 2000,
			wantOK: true,
		},
		{
			name:   "pre-existing drain is not attributed",
			fuel:   []utilityFuelWrite{drain(500, true), drain(2000, false)},
			open:   1000,
			close:  3000,
			wantOK: false,
		},
		{
			name:   "stop after actor close is rejected",
			fuel:   []utilityFuelWrite{drain(1500, true), drain(3500, false)},
			open:   1000,
			close:  3000,
			wantOK: false,
		},
		{
			name:   "drain start after actor close is ignored",
			fuel:   []utilityFuelWrite{drain(3500, true), drain(3600, false)},
			open:   1000,
			close:  3000,
			wantOK: false,
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			gotMS, gotOK := poisonCloudFuelStopMS(test.open, test.close, test.fuel)
			if gotMS != test.wantMS || gotOK != test.wantOK {
				t.Errorf("fuel drain stop = %d/%v, want %d/%v",
					gotMS, gotOK, test.wantMS, test.wantOK)
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
		{
			name:        "Nanoswarm",
			class:       "GameObject_Killjoy_4_BeeSwarm_Damage",
			ability:     "nanoswarm",
			maxLifetime: 4000,
		},
		{
			name:        "Zero Point",
			class:       "Gameobject_Grenadier_E_SuppressionPulse",
			ability:     "zeropoint",
			maxLifetime: 1000,
		},
		{
			name:        "Orbital Strike",
			class:       "GameObject_Sarge_X_OrbitalStrike_Production",
			ability:     "orbital_strike",
			maxLifetime: 4000,
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
		fieldData.UtilityFuel,
		fieldData.UtilityDestroy,
		fieldData.UtilityActivation,
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

func TestDeadlockBarrierMeshUsesRootWithDeployerArms(t *testing.T) {
	entry, found := utilityCatalog["GameObject_CableJamRoot"]
	if !found {
		t.Fatal("Deadlock Barrier Mesh root is not catalogued")
	}
	if entry.kind != UtilityWall || entry.ability != "barrier_mesh" || !entry.wallArms {
		t.Fatalf("root entry = %#v, want a Barrier Mesh wall with arms", entry)
	}
	if _, found := utilityCatalog["GameObject_CableJam_CableDeployer_Precomputed"]; found {
		t.Fatal("Barrier Mesh deployers must not be emitted as independent walls")
	}
}

func TestScanUtilitiesBuildsBarrierMeshArmsFromDeployers(t *testing.T) {
	dir := t.TempDir()
	rootClass := "GameObject_CableJamRoot"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, Event: "open",
			ClassPath: &rootClass, SpawnX: float32Ptr(9609.5), SpawnY: float32Ptr(-5623),
		},
		{TimeMS: 4000, PacketID: 20, ActorNetGUID: 700, Event: "close"},
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
	ownerName := "Owner"
	destinationName := "MulticastInitialize.Destination"
	destinations := []Position{
		{X: 9809.4, Y: -5423.2},
		{X: 9165.0, Y: -5178.4},
		{X: 9023.2, Y: -6209.3},
		{X: 10178.7, Y: -6192.1},
	}
	fields := make([]fieldRow, 0, len(destinations)*2)
	rootGUID := int64(700)
	for i, destination := range destinations {
		guid := uint32(701 + i)
		fields = append(fields,
			fieldRow{
				TimeMS: 1000, PacketID: uint32(2 + i*2), ActorNetGUID: guid,
				FieldName: &ownerName, ValueI64: &rootGUID,
			},
			fieldRow{
				TimeMS: 1000, PacketID: uint32(3 + i*2), ActorNetGUID: guid,
				FieldName: &destinationName, BitCount: 192,
				RawBits: rawVector(destination.X, destination.Y, 0),
			},
		)
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
		"13.09",
		5000,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 5000}},
		newPlayerIndex(&Manifest{}),
		nil,
		nil,
		fieldData.UtilityOwners,
		fieldData.UtilityPaths,
		fieldData.UtilityFuel,
		fieldData.UtilityDestroy,
		fieldData.UtilityActivation,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 1 {
		t.Fatalf("utilities = %#v, want one Barrier Mesh wall", utilities)
	}
	wall := utilities[0][0]
	if wall.AbilityID != "barrier_mesh" || wall.Kind != UtilityWall {
		t.Fatalf("wall identity = %q/%q, want wall barrier_mesh", wall.Kind, wall.AbilityID)
	}
	if wall.Position != (Position{X: 9609.5, Y: -5623}) {
		t.Errorf("wall position = %v, want the central deployer", wall.Position)
	}
	if len(wall.Path) != len(destinations) {
		t.Fatalf("wall path = %#v, want %d arm endpoints", wall.Path, len(destinations))
	}
	for i, destination := range destinations {
		point := wall.Path[i]
		if point.TimeMS != wall.StartTimeMS || point.X != destination.X || point.Y != destination.Y {
			t.Errorf("arm %d = %#v, want %v at t=%d", i, point, destination, wall.StartTimeMS)
		}
	}
}

func TestScanUtilitiesBuildsAnnihilationHookTrajectory(t *testing.T) {
	dir := t.TempDir()
	hookClass := "Actor_FishingHook"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 900, Event: "open",
			ClassPath: &hookClass, SpawnX: float32Ptr(0), SpawnY: float32Ptr(0),
		},
		{TimeMS: 3000, PacketID: 10, ActorNetGUID: 900, Event: "close"},
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
	ownerName := "Owner"
	startName := "Multicast Initialize Segment.SegmentLocation_5_ABC"
	endName := "Multicast Initialize Segment.SegmentEndLocation_27_DEF"
	stopName := "Multicast Stop Collider"
	ownerGUID := int64(900)
	fields := []fieldRow{
		{TimeMS: 1000, PacketID: 2, ActorNetGUID: 901, FieldName: &ownerName, ValueI64: &ownerGUID},
		{TimeMS: 1000, PacketID: 2, ActorNetGUID: 901, FieldName: &startName, BitCount: 192, RawBits: rawVector(0, 0, 0)},
		{TimeMS: 1000, PacketID: 2, ActorNetGUID: 901, FieldName: &endName, BitCount: 192, RawBits: rawVector(100, 100, 0)},
		{TimeMS: 1000, PacketID: 3, ActorNetGUID: 902, FieldName: &ownerName, ValueI64: &ownerGUID},
		{TimeMS: 1000, PacketID: 3, ActorNetGUID: 902, FieldName: &startName, BitCount: 192, RawBits: rawVector(100, 100, 0)},
		{TimeMS: 1000, PacketID: 3, ActorNetGUID: 902, FieldName: &endName, BitCount: 192, RawBits: rawVector(200, 0, 0)},
		{TimeMS: 1800, PacketID: 4, ActorNetGUID: 900, FieldName: &stopName},
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
		"13.09",
		5000,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 5000}},
		nil,
		nil,
		nil,
		fieldData.UtilityOwners,
		fieldData.UtilityPaths,
		fieldData.UtilityFuel,
		fieldData.UtilityDestroy,
		fieldData.UtilityActivation,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 1 {
		t.Fatalf("utilities = %#v, want one Annihilation hook", utilities)
	}
	hook := utilities[0][0]
	if hook.AbilityID != "annihilation" || hook.Kind != UtilityMobile {
		t.Fatalf("hook identity = %q/%q, want mobile annihilation", hook.Kind, hook.AbilityID)
	}
	if hook.StartTimeMS != 1000 || hook.EndTimeMS != 1800 {
		t.Errorf("hook interval = %d..%d, want 1000..1800",
			hook.StartTimeMS, hook.EndTimeMS)
	}
	if len(hook.Samples) < 2 {
		t.Fatalf("hook samples = %#v, want a sampled trajectory", hook.Samples)
	}
	first := hook.Samples[0]
	last := hook.Samples[len(hook.Samples)-1]
	if first.X != 0 || first.Y != 0 {
		t.Errorf("first hook sample = %v, want the cast point", first)
	}
	if math.Abs(last.X-200) > 1 || math.Abs(last.Y) > 1 {
		t.Errorf("last hook sample = %v, want the trajectory end (200, 0)", last)
	}
}

func TestScanUtilitiesFollowsAnnihilationCageAndRelease(t *testing.T) {
	dir := t.TempDir()
	cageClass := "GameObject_FishingHook_CageSphere"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 910, Event: "open",
			ClassPath: &cageClass, SpawnX: float32Ptr(50), SpawnY: float32Ptr(50),
		},
		{TimeMS: 4000, PacketID: 10, ActorNetGUID: 910, Event: "close"},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}

	attachName := "AttachParent"
	releaseName := "Multicast Try Release Cage"
	parentGUID := int64(800)
	fields := []fieldRow{
		{TimeMS: 1000, PacketID: 2, ActorNetGUID: 910, FieldName: &attachName, ValueI64: &parentGUID},
		{TimeMS: 2500, PacketID: 5, ActorNetGUID: 910, FieldName: &releaseName},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "fields.parquet"), fields); err != nil {
		t.Fatal(err)
	}
	movement := []movementRow{
		{TimeMS: 1000, CharacterNetGUID: 800, PosX: 0, PosY: 0},
		{TimeMS: 1500, CharacterNetGUID: 800, PosX: 100, PosY: 0},
		{TimeMS: 2000, CharacterNetGUID: 800, PosX: 200, PosY: 0},
		{TimeMS: 2500, CharacterNetGUID: 800, PosX: 300, PosY: 0},
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
		"13.09",
		5000,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 5000}},
		nil,
		nil,
		nil,
		fieldData.UtilityOwners,
		fieldData.UtilityPaths,
		fieldData.UtilityFuel,
		fieldData.UtilityDestroy,
		fieldData.UtilityActivation,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 1 {
		t.Fatalf("utilities = %#v, want one Annihilation cage", utilities)
	}
	cage := utilities[0][0]
	if cage.AbilityID != "annihilation" || cage.Kind != UtilityMobile {
		t.Fatalf("cage identity = %q/%q, want mobile annihilation", cage.Kind, cage.AbilityID)
	}
	if cage.StartTimeMS != 1000 || cage.EndTimeMS != 2500 {
		t.Errorf("cage interval = %d..%d, want release at 2500",
			cage.StartTimeMS, cage.EndTimeMS)
	}
	if len(cage.Samples) != 3 {
		t.Fatalf("cage samples = %#v, want the parent's three samples", cage.Samples)
	}
	if cage.Samples[0].X != 0 || cage.Samples[0].Y != 0 {
		t.Errorf("first cage sample = %v, want parent position (0, 0)", cage.Samples[0])
	}
	if cage.Samples[2].X != 200 || cage.Samples[2].Y != 0 {
		t.Errorf("last cage sample = %v, want parent position (200, 0)", cage.Samples[2])
	}
}

func TestScanUtilitiesMovesNightfallWaveForward(t *testing.T) {
	dir := t.TempDir()
	waveClass := "GameObject_BountyHunter_X_WaveForm"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 900, Event: "open",
			ClassPath: &waveClass, SpawnX: float32Ptr(100), SpawnY: float32Ptr(200),
			SpawnYaw: float32Ptr(0),
		},
		{TimeMS: 6000, PacketID: 20, ActorNetGUID: 900, Event: "close"},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}

	utilities, _, err := scanUtilities(
		dir,
		"13.08",
		3000,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 3000}},
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 1 {
		t.Fatalf("utilities = %#v, want one Nightfall wave", utilities)
	}
	wave := utilities[0][0]
	if wave.AbilityID != "nightfall" || wave.Kind != UtilityArea {
		t.Fatalf("wave identity = %q/%q, want area nightfall",
			wave.Kind, wave.AbilityID)
	}
	if wave.StartTimeMS != 1000 || wave.EndTimeMS != 2000 {
		t.Errorf("wave interval = %d..%d, want the one-second display window",
			wave.StartTimeMS, wave.EndTimeMS)
	}
	if wave.Position != (Position{X: 100, Y: 200}) || wave.Yaw != 0 {
		t.Errorf("wave origin = %v yaw %v, want (100, 200) yaw 0",
			wave.Position, wave.Yaw)
	}
	if len(wave.Samples) < 2 {
		t.Fatalf("wave samples = %#v, want forward movement", wave.Samples)
	}
	first := wave.Samples[0]
	last := wave.Samples[len(wave.Samples)-1]
	if first.X != 100 || first.Y != 200 {
		t.Errorf("first wave sample = %v, want the cast point", first)
	}
	if math.Abs(last.X-4100) > 1 || math.Abs(last.Y-200) > 1 {
		t.Errorf("last wave sample = %v, want the 40 m forward endpoint", last)
	}
}

func TestScanUtilitiesMovesRollingThunderForward(t *testing.T) {
	dir := t.TempDir()
	waveClass := "GameObject_Breach_X_Shockwave"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 900, Event: "open",
			ClassPath: &waveClass, SpawnX: float32Ptr(100), SpawnY: float32Ptr(200),
			SpawnYaw: float32Ptr(90),
		},
		{TimeMS: 6000, PacketID: 20, ActorNetGUID: 900, Event: "close"},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}

	utilities, _, err := scanUtilities(
		dir,
		"13.08",
		4000,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 4000}},
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 1 {
		t.Fatalf("utilities = %#v, want one Rolling Thunder wave", utilities)
	}
	wave := utilities[0][0]
	if wave.AbilityID != "rolling_thunder" || wave.Kind != UtilityArea {
		t.Fatalf("wave identity = %q/%q, want area rolling_thunder",
			wave.Kind, wave.AbilityID)
	}
	if wave.StartTimeMS != 1000 || wave.EndTimeMS != 3004 {
		t.Errorf("wave interval = %d..%d, want the existing 2004 ms window",
			wave.StartTimeMS, wave.EndTimeMS)
	}
	if wave.Position != (Position{X: 100, Y: 200}) || wave.Yaw != 90 {
		t.Errorf("wave origin = %v yaw %v, want (100, 200) yaw 90",
			wave.Position, wave.Yaw)
	}
	if len(wave.Samples) < 2 {
		t.Fatalf("wave samples = %#v, want forward movement", wave.Samples)
	}
	first := wave.Samples[0]
	last := wave.Samples[len(wave.Samples)-1]
	if first.X != 100 || first.Y != 200 {
		t.Errorf("first wave sample = %v, want the cast point", first)
	}
	if math.Abs(last.X-100) > 1 || math.Abs(last.Y-3400) > 1 {
		t.Errorf("last wave sample = %v, want the 32 m forward endpoint", last)
	}
}

func TestScanUtilitiesMovesArmageddonForward(t *testing.T) {
	dir := t.TempDir()
	waveClass := "GameObject_Cashew_X_SegmentManager"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 900, Event: "open",
			ClassPath: &waveClass, SpawnX: float32Ptr(100), SpawnY: float32Ptr(200),
			SpawnYaw: float32Ptr(90),
		},
		{TimeMS: 9000, PacketID: 20, ActorNetGUID: 900, Event: "close"},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}

	utilities, _, err := scanUtilities(
		dir,
		"13.09",
		10000,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 10000}},
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 1 {
		t.Fatalf("utilities = %#v, want one Armageddon wave", utilities)
	}
	wave := utilities[0][0]
	if wave.AbilityID != "armageddon" || wave.Kind != UtilityArea {
		t.Fatalf("wave identity = %q/%q, want area armageddon",
			wave.Kind, wave.AbilityID)
	}
	if wave.StartTimeMS != 1000 || wave.EndTimeMS != 6000 {
		t.Errorf("wave interval = %d..%d, want the five-second display window",
			wave.StartTimeMS, wave.EndTimeMS)
	}
	if wave.Position != (Position{X: 100, Y: 200}) || wave.Yaw != 90 {
		t.Errorf("wave origin = %v yaw %v, want (100, 200) yaw 90",
			wave.Position, wave.Yaw)
	}
	if len(wave.Samples) < 2 {
		t.Fatalf("wave samples = %#v, want forward movement", wave.Samples)
	}
	first := wave.Samples[0]
	last := wave.Samples[len(wave.Samples)-1]
	if first.X != 100 || first.Y != 200 {
		t.Errorf("first wave sample = %v, want the cast point", first)
	}
	if math.Abs(last.X-100) > 1 || math.Abs(last.Y-3400) > 1 {
		t.Errorf("last wave sample = %v, want the 32 m forward endpoint", last)
	}
}

func TestScanUtilitiesKeepsSpecialDeliveryIconOnlyUntilLanding(t *testing.T) {
	dir := t.TempDir()
	projectileClass := "Projectile_Cashew_Q_ShellShockGrenade"
	landingClass := "GameObject_Cashew_Q_ShellShockGrenade"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 760, Event: "open",
			ClassPath: &projectileClass, SpawnX: float32Ptr(100), SpawnY: float32Ptr(200),
		},
		{TimeMS: 1800, PacketID: 8, ActorNetGUID: 760, Event: "close"},
		{
			TimeMS: 1750, PacketID: 2, ActorNetGUID: 761, Event: "open",
			ClassPath: &landingClass, SpawnX: float32Ptr(150), SpawnY: float32Ptr(250),
		},
		{TimeMS: 2500, PacketID: 9, ActorNetGUID: 761, Event: "close"},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}

	fieldName := "ReplicatedMovement"
	movementRows := []fieldRow{
		{
			TimeMS: 1100, PacketID: 3, ActorNetGUID: 760, FieldName: &fieldName,
			ValueStr: stringPtr(`{"location":{"x":110,"y":210,"z":10}}`),
		},
		{
			TimeMS: 1600, PacketID: 4, ActorNetGUID: 760, FieldName: &fieldName,
			ValueStr: stringPtr(`{"location":{"x":160,"y":260,"z":10}}`),
		},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "fields.parquet"), movementRows); err != nil {
		t.Fatal(err)
	}

	utilities, _, err := scanUtilities(
		dir,
		"13.09",
		3000,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 3000}},
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 2 {
		t.Fatalf("utilities = %#v, want a throw and a landing", utilities)
	}
	projectile, landing := utilities[0][0], utilities[0][1]
	if projectile.Kind != UtilityMobile || projectile.AbilityID != "special_delivery" || !projectile.IconOnly {
		t.Fatalf("projectile = %+v, want an icon-only special_delivery throw", projectile)
	}
	if landing.Kind != UtilityArea || landing.AbilityID != "special_delivery" || landing.IconOnly {
		t.Fatalf("landing = %+v, want a visible special_delivery area", landing)
	}
	if landing.StartTimeMS != 1750 || landing.EndTimeMS != 2500 {
		t.Errorf("landing interval = %d..%d, want 1750..2500",
			landing.StartTimeMS, landing.EndTimeMS)
	}
	if landing.Position != (Position{X: 150, Y: 250}) {
		t.Errorf("landing position = %v, want (150, 250)", landing.Position)
	}
}

func TestScanUtilitiesBuildsKayONullCmdFromPulses(t *testing.T) {
	dir := t.TempDir()
	managerClass := "Gameobject_Grenadier_X_UltPulseManager"
	pulseClass := "Gameobject_Grenadier_X_UltPulse"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 900, Event: "open",
			ClassPath: &managerClass, SpawnX: float32Ptr(0), SpawnY: float32Ptr(0),
		},
		{TimeMS: 5000, PacketID: 10, ActorNetGUID: 900, Event: "close"},
		{
			TimeMS: 2000, PacketID: 2, ActorNetGUID: 901, Event: "open",
			ClassPath: &pulseClass, SpawnX: float32Ptr(100), SpawnY: float32Ptr(0),
		},
		{TimeMS: 3000, PacketID: 11, ActorNetGUID: 901, Event: "close"},
		{
			TimeMS: 3000, PacketID: 3, ActorNetGUID: 902, Event: "open",
			ClassPath: &pulseClass, SpawnX: float32Ptr(200), SpawnY: float32Ptr(0),
		},
		{TimeMS: 4000, PacketID: 12, ActorNetGUID: 902, Event: "close"},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}
	ownerName := "Owner"
	managerGUID := int64(900)
	fields := []fieldRow{
		{TimeMS: 2000, PacketID: 2, ActorNetGUID: 901, FieldName: &ownerName, ValueI64: &managerGUID},
		{TimeMS: 3000, PacketID: 3, ActorNetGUID: 902, FieldName: &ownerName, ValueI64: &managerGUID},
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
		"13.09",
		6000,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 6000}},
		nil,
		nil,
		nil,
		fieldData.UtilityOwners,
		fieldData.UtilityPaths,
		fieldData.UtilityFuel,
		fieldData.UtilityDestroy,
		fieldData.UtilityActivation,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 1 {
		t.Fatalf("utilities = %#v, want only the NULL/cmd manager", utilities)
	}
	ult := utilities[0][0]
	if ult.AbilityID != "nullcmd" || ult.Kind != UtilityArea {
		t.Fatalf("ult identity = %q/%q, want area nullcmd", ult.Kind, ult.AbilityID)
	}
	if ult.StartTimeMS != 1000 || ult.EndTimeMS != 5000 {
		t.Errorf("ult interval = %d..%d, want 1000..5000",
			ult.StartTimeMS, ult.EndTimeMS)
	}
	if len(ult.Samples) != 3 {
		t.Fatalf("samples = %#v, want manager start plus two pulses", ult.Samples)
	}
	expected := []Position{{X: 0, Y: 0}, {X: 100, Y: 0}, {X: 200, Y: 0}}
	for i, position := range expected {
		if ult.Samples[i].X != position.X || ult.Samples[i].Y != position.Y {
			t.Errorf("sample %d = %v, want %v", i, ult.Samples[i], position)
		}
	}
}

func TestScanUtilitiesUsesNeonTunnelPoints(t *testing.T) {
	dir := t.TempDir()
	class := "GameObject_Sprinter_4_Tunnel"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, Event: "open",
			ClassPath: &class, SpawnX: float32Ptr(100), SpawnY: float32Ptr(200),
			SpawnYaw: float32Ptr(35),
		},
		{TimeMS: 3000, PacketID: 4, ActorNetGUID: 700, Event: "close"},
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
	tunnelPointName := "MulticastAddTunnelPoint.Translation"
	fields := []fieldRow{
		{TimeMS: 1100, PacketID: 2, ActorNetGUID: 700, FieldName: &tunnelPointName, BitCount: 192, RawBits: rawVector(1000, 2000, 10)},
		{TimeMS: 1200, PacketID: 3, ActorNetGUID: 700, FieldName: &tunnelPointName, BitCount: 192, RawBits: rawVector(1000, 3000, 10)},
		{TimeMS: 1300, PacketID: 5, ActorNetGUID: 700, FieldName: &tunnelPointName, BitCount: 192, RawBits: rawVector(1000, 4000, 10)},
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
		"13.09",
		4000,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 4000}},
		newPlayerIndex(&Manifest{}),
		nil,
		nil,
		nil,
		fieldData.UtilityPaths,
		fieldData.UtilityFuel,
		fieldData.UtilityDestroy,
		fieldData.UtilityActivation,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 1 {
		t.Fatalf("utilities = %#v, want one Fast Lane wall", utilities)
	}
	wall := utilities[0][0]
	if wall.AbilityID != "fast_lane" || wall.Kind != UtilityWall {
		t.Fatalf("wall identity = %q/%q, want wall fast_lane", wall.Kind, wall.AbilityID)
	}
	if wall.Position != (Position{X: 1000, Y: 2000}) ||
		wall.Yaw != 90 || wall.Length != 20 {
		t.Errorf("wall geometry = pos %+v yaw %v length %v, want (1000,2000)/90/20",
			wall.Position, wall.Yaw, wall.Length)
	}
	wantLengths := []UtilityLengthSample{
		{TimeMS: 1100, Length: 0},
		{TimeMS: 1200, Length: 10},
		{TimeMS: 1300, Length: 20},
	}
	if len(wall.LengthSamples) != len(wantLengths) {
		t.Fatalf("length samples = %#v, want %#v", wall.LengthSamples, wantLengths)
	}
	for i, want := range wantLengths {
		if wall.LengthSamples[i] != want {
			t.Errorf("length sample %d = %#v, want %#v", i, wall.LengthSamples[i], want)
		}
	}
}

func TestScanUtilitiesUsesHarborAnchorPoints(t *testing.T) {
	dir := t.TempDir()
	class := "GameObject_Mage_Q_WallManager"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, Event: "open",
			ClassPath: &class, SpawnX: float32Ptr(1000), SpawnY: float32Ptr(2000),
			SpawnYaw: float32Ptr(0),
		},
		{TimeMS: 3000, PacketID: 4, ActorNetGUID: 700, Event: "close"},
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
	anchorName := "MulticastAddAnchor.Translation"
	fields := []fieldRow{
		{TimeMS: 1100, PacketID: 2, ActorNetGUID: 700, FieldName: &anchorName, BitCount: 192, RawBits: rawVector(1000, 2000, 10)},
		{TimeMS: 1200, PacketID: 3, ActorNetGUID: 700, FieldName: &anchorName, BitCount: 192, RawBits: rawVector(1100, 3000, 10)},
		{TimeMS: 1300, PacketID: 5, ActorNetGUID: 700, FieldName: &anchorName, BitCount: 192, RawBits: rawVector(1300, 3500, 10)},
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
		"13.09",
		4000,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 4000}},
		newPlayerIndex(&Manifest{}),
		nil,
		nil,
		nil,
		fieldData.UtilityPaths,
		fieldData.UtilityFuel,
		fieldData.UtilityDestroy,
		fieldData.UtilityActivation,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 1 {
		t.Fatalf("utilities = %#v, want one High Tide wall", utilities)
	}
	wall := utilities[0][0]
	if wall.AbilityID != "high_tide" || wall.Kind != UtilityWall {
		t.Fatalf("wall identity = %q/%q, want wall high_tide", wall.Kind, wall.AbilityID)
	}
	wantPath := []UtilityPositionSample{
		{TimeMS: 1100, X: 1000, Y: 2000},
		{TimeMS: 1200, X: 1100, Y: 3000},
		{TimeMS: 1300, X: 1300, Y: 3500},
	}
	if len(wall.Path) != len(wantPath) {
		t.Fatalf("wall path = %#v, want %#v", wall.Path, wantPath)
	}
	for i, want := range wantPath {
		if wall.Path[i] != want {
			t.Errorf("wall path point %d = %#v, want %#v", i, wall.Path[i], want)
		}
	}
}

func TestScanUtilitiesSamplesReckoningFromChunks(t *testing.T) {
	dir := t.TempDir()
	managerClass := "GameObject_Mage_X_TidalWave"
	chunkClass := "GameObject_Mage_X_TidalWave_Chunk"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, Event: "open",
			ClassPath: &managerClass, SpawnX: float32Ptr(1000), SpawnY: float32Ptr(2000),
			SpawnYaw: float32Ptr(0),
		},
		{TimeMS: 6000, PacketID: 4, ActorNetGUID: 700, Event: "close"},
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 701, Event: "open",
			ClassPath: &chunkClass, SpawnX: float32Ptr(900), SpawnY: float32Ptr(2000),
			SpawnYaw: float32Ptr(0),
		},
		{TimeMS: 6000, PacketID: 4, ActorNetGUID: 701, Event: "close"},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}

	rawFloat32 := func(value float32) []byte {
		raw := make([]byte, 4)
		binary.LittleEndian.PutUint32(raw, math.Float32bits(value))
		return raw
	}
	ownerName := "Owner"
	positionName := "ServerPosition"
	fields := []fieldRow{
		{TimeMS: 1000, PacketID: 1, ActorNetGUID: 701, FieldName: &ownerName, ValueI64: ptr(int64(700))},
		{TimeMS: 1100, PacketID: 2, ActorNetGUID: 701, FieldName: &positionName, BitCount: 32, RawBits: rawFloat32(1)},
		{TimeMS: 1600, PacketID: 3, ActorNetGUID: 701, FieldName: &positionName, BitCount: 32, RawBits: rawFloat32(10.5)},
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
		"13.09",
		7000,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 7000}},
		newPlayerIndex(&Manifest{}),
		nil,
		nil,
		fieldData.UtilityOwners,
		fieldData.UtilityPaths,
		fieldData.UtilityFuel,
		fieldData.UtilityDestroy,
		fieldData.UtilityActivation,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 1 {
		t.Fatalf("utilities = %#v, want one Reckoning wave", utilities)
	}
	wave := utilities[0][0]
	if wave.AbilityID != "reckoning" || wave.Kind != UtilityArea {
		t.Fatalf("wave identity = %q/%q, want area reckoning", wave.Kind, wave.AbilityID)
	}
	wantSamples := []UtilityPositionSample{
		{TimeMS: 1000, X: 1000, Y: 2000},
		{TimeMS: 1100, X: 1100, Y: 2000},
		{TimeMS: 1600, X: 2050, Y: 2000},
	}
	if len(wave.Samples) != len(wantSamples) {
		t.Fatalf("movement samples = %#v, want %#v", wave.Samples, wantSamples)
	}
	for i, want := range wantSamples {
		got := wave.Samples[i]
		if got.TimeMS != want.TimeMS ||
			math.Abs(got.X-want.X) > 0.01 || math.Abs(got.Y-want.Y) > 0.01 {
			t.Errorf("movement sample %d = %#v, want %#v", i, got, want)
		}
	}
	if wave.StopFraction == nil || math.Abs(*wave.StopFraction-0.5) > 0.001 {
		t.Fatalf("stop fraction = %v, want 0.5", wave.StopFraction)
	}
}

func TestScanUtilitiesSamplesIsoMovingCoverSpline(t *testing.T) {
	dir := t.TempDir()
	class := "GameObject_Sequoia_4_MovingCover"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, Event: "open",
			ClassPath: &class, SpawnX: float32Ptr(1000), SpawnY: float32Ptr(2000),
			SpawnYaw: float32Ptr(0),
		},
		{TimeMS: 6000, PacketID: 4, ActorNetGUID: 700, Event: "close"},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}

	rawFloat32 := func(value float32) []byte {
		raw := make([]byte, 4)
		binary.LittleEndian.PutUint32(raw, math.Float32bits(value))
		return raw
	}
	fieldName := "ServerPosition"
	fields := []fieldRow{
		{TimeMS: 1100, PacketID: 2, ActorNetGUID: 700, FieldName: &fieldName, BitCount: 32, RawBits: rawFloat32(1)},
		{TimeMS: 1600, PacketID: 3, ActorNetGUID: 700, FieldName: &fieldName, BitCount: 32, RawBits: rawFloat32(3.6)},
		{TimeMS: 2100, PacketID: 5, ActorNetGUID: 700, FieldName: &fieldName, BitCount: 32, RawBits: rawFloat32(6.2)},
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
		"13.09",
		7000,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 7000}},
		newPlayerIndex(&Manifest{}),
		nil,
		nil,
		nil,
		fieldData.UtilityPaths,
		fieldData.UtilityFuel,
		fieldData.UtilityDestroy,
		fieldData.UtilityActivation,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 1 {
		t.Fatalf("utilities = %#v, want one Contingency wall", utilities)
	}
	wall := utilities[0][0]
	if wall.AbilityID != "contingency" || wall.Kind != UtilityWall {
		t.Fatalf("wall identity = %q/%q, want wall contingency", wall.Kind, wall.AbilityID)
	}
	wantSamples := []UtilityPositionSample{
		{TimeMS: 1000, X: 1000, Y: 2000},
		{TimeMS: 1100, X: 1100, Y: 2000},
		{TimeMS: 1600, X: 1360, Y: 2000},
		{TimeMS: 2100, X: 1620, Y: 2000},
	}
	if len(wall.Samples) != len(wantSamples) {
		t.Fatalf("movement samples = %#v, want %#v", wall.Samples, wantSamples)
	}
	for i, want := range wantSamples {
		got := wall.Samples[i]
		if got.TimeMS != want.TimeMS ||
			math.Abs(got.X-want.X) > 0.01 || math.Abs(got.Y-want.Y) > 0.01 {
			t.Errorf("movement sample %d = %#v, want %#v", i, got, want)
		}
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
		map[string]string{subject: puuid}, nil, fields.UtilityOwners, fields.UtilityPaths,
		fields.UtilityFuel, fields.UtilityDestroy, fields.UtilityActivation)
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

func TestSampleUtilityPathKeepsOneSamplePerTick(t *testing.T) {
	writes := []utilityPathWrite{
		{TimeMS: 100, PacketID: 1, Position: Position{X: 1, Y: 2}},
		{TimeMS: 100, PacketID: 2, Position: Position{X: 3, Y: 4}},
		{TimeMS: 200, PacketID: 3, Position: Position{X: 5, Y: 6}},
	}

	samples, truncated := sampleUtilityPath(writes, 0)
	if truncated {
		t.Fatal("unexpected truncation")
	}
	if len(samples) != 2 {
		t.Fatalf("samples = %+v, want one per tick", samples)
	}
	if samples[0].TimeMS != 100 || samples[0].X != 3 || samples[0].Y != 4 {
		t.Errorf("tick 100 = %+v, want the latest write", samples[0])
	}
	if samples[1].TimeMS != 200 || samples[1].X != 5 || samples[1].Y != 6 {
		t.Errorf("tick 200 = %+v", samples[1])
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

func TestParseRawReplicatedMovementPosition(t *testing.T) {
	// A Hush Flashbulb ReplicatedMovement row: four flag bits followed by a
	// quantized FRepMovement location. vrfkit leaves the class untyped, so the
	// replay normaliser has to read the location from the raw payload.
	raw, err := hex.DecodeString("d0348d1ddcb5bcd8a8595685b8f101")
	if err != nil {
		t.Fatal(err)
	}
	position, ok := parseRawReplicatedMovementPosition(raw, 115)
	if !ok || position != (Position{X: -3674, Y: -995}) {
		t.Fatalf("parsed position = %#v/%v, want x=-3674 y=-995", position, ok)
	}
	if _, ok := parseRawReplicatedMovementPosition(raw[:4], 115); ok {
		t.Fatal("accepted a truncated raw movement payload")
	}
	if _, ok := parseRawReplicatedMovementPosition(raw, 0); ok {
		t.Fatal("accepted a zero-bit raw movement payload")
	}
}

func TestScanUtilitiesOmitsUnsupportedBuildsWithoutFailing(t *testing.T) {
	utilities, warnings, err := scanUtilities(
		t.TempDir(),
		"13.10",
		1000,
		[]roundWindow{{StartMS: 0, EndMS: 1000}},
		nil,
		nil,
		nil,
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

func TestScanUtilitiesAcceptsLatestSupportedBuild(t *testing.T) {
	dir := t.TempDir()
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), []stateActorRow{}); err != nil {
		t.Fatal(err)
	}
	utilities, warnings, err := scanUtilities(
		dir,
		"13.09",
		1000,
		[]roundWindow{{StartMS: 0, EndMS: 1000}},
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || warnings.UnsupportedBuild != 0 {
		t.Fatalf("supported build result = %#v/%#v", utilities, warnings)
	}
}

func TestScanUtilitiesSplitsToxicScreenIntoActiveIntervals(t *testing.T) {
	dir := t.TempDir()
	class := "GameObject_Pandemic_E_SmokeScreenManager"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, Event: "open",
			ClassPath: &class, SpawnX: float32Ptr(100), SpawnY: float32Ptr(200),
			SpawnYaw: float32Ptr(35),
		},
		{TimeMS: 12000, PacketID: 20, ActorNetGUID: 700, Event: "close"},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}

	pointName := "MulticastAddSmokeScreenPoint.Translation"
	activationName := "WallActivated"
	fields := []fieldRow{
		{TimeMS: 1100, PacketID: 2, ActorNetGUID: 700, FieldName: &pointName, ValueStr: stringPtr("(1000,2000,0)")},
		{TimeMS: 1200, PacketID: 3, ActorNetGUID: 700, FieldName: &pointName, ValueStr: stringPtr("(10000,2000,0)")},
		{TimeMS: 3000, PacketID: 4, ActorNetGUID: 700, FieldName: &activationName, ValueBool: boolPtr(true)},
		{TimeMS: 5000, PacketID: 5, ActorNetGUID: 700, FieldName: &activationName, ValueBool: boolPtr(false)},
		{TimeMS: 7000, PacketID: 6, ActorNetGUID: 700, FieldName: &activationName, ValueBool: boolPtr(true)},
		{TimeMS: 9000, PacketID: 7, ActorNetGUID: 700, FieldName: &activationName, ValueBool: boolPtr(false)},
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
		12000,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 12000}},
		newPlayerIndex(&Manifest{}),
		nil,
		nil,
		fieldData.UtilityOwners,
		fieldData.UtilityPaths,
		fieldData.UtilityFuel,
		fieldData.UtilityDestroy,
		fieldData.UtilityActivation,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 5 {
		t.Fatalf("utilities = %#v, want two walls and three inactive markers", utilities)
	}

	want := []struct {
		startMS, endMS int
		inactive       bool
	}{
		{1200, 3000, true},
		{3000, 5000, false},
		{5000, 7000, true},
		{7000, 9000, false},
		{9000, 12000, true},
	}
	for i, expected := range want {
		utility := utilities[0][i]
		if utility.StartTimeMS != expected.startMS || utility.EndTimeMS != expected.endMS {
			t.Errorf("utility[%d] = %d..%d, want %d..%d",
				i, utility.StartTimeMS, utility.EndTimeMS, expected.startMS, expected.endMS)
		}
		if utility.AbilityID != "toxic_screen" {
			t.Errorf("utility[%d] ability = %q, want toxic_screen", i, utility.AbilityID)
		}
		if utility.Kind != UtilityWall || utility.IconOnly {
			t.Errorf("utility[%d] = %+v, want a wall line", i, utility)
		}
		if utility.Inactive != expected.inactive {
			t.Errorf("utility[%d] inactive = %v, want %v", i, utility.Inactive, expected.inactive)
		}
		if utility.Position != (Position{X: 1000, Y: 2000}) ||
			utility.Yaw != 0 || utility.Length != 90 {
			t.Errorf("wall geometry = pos %+v yaw %v length %v, want (1000,2000)/0/90",
				utility.Position, utility.Yaw, utility.Length)
		}
	}
}

func TestToxicScreenActivationFallsBackToFuelDrainStop(t *testing.T) {
	interval := wallActivationIntervals(
		1000,
		12000,
		[]utilityActivationWrite{{TimeMS: 3000, Active: boolPtr(true)}},
		[]utilityFuelWrite{
			{TimeMS: 3500, Draining: boolPtr(true)},
			{TimeMS: 6000, Draining: boolPtr(false)},
		},
	)
	if len(interval) != 1 || interval[0].startMS != 3000 || interval[0].endMS != 6000 {
		t.Fatalf("activation intervals = %#v, want 3000..6000", interval)
	}
}

func TestToxicScreenIgnoresUnrelatedFuelDrain(t *testing.T) {
	interval := wallActivationIntervals(
		1000,
		12000,
		[]utilityActivationWrite{{TimeMS: 3000, Active: boolPtr(true)}},
		[]utilityFuelWrite{
			{TimeMS: 7000, Draining: boolPtr(true)},
			{TimeMS: 9000, Draining: boolPtr(false)},
		},
	)
	if len(interval) != 1 || interval[0].startMS != 3000 || interval[0].endMS != 12000 {
		t.Fatalf("activation intervals = %#v, want the wall to stay open until actor close", interval)
	}
}

func TestToxicScreenWithoutActivationShowsInactiveWall(t *testing.T) {
	interval := wallActivationIntervals(1000, 12000, nil, nil)
	if interval == nil || len(interval) != 0 {
		t.Fatalf("activation intervals = %#v, want an empty non-nil slice without WallActivated", interval)
	}

	dir := t.TempDir()
	class := "GameObject_Pandemic_E_SmokeScreenManager"
	actors := []stateActorRow{
		{
			TimeMS: 1000, PacketID: 1, ActorNetGUID: 700, Event: "open",
			ClassPath: &class, SpawnX: float32Ptr(100), SpawnY: float32Ptr(200),
		},
		{TimeMS: 12000, PacketID: 20, ActorNetGUID: 700, Event: "close"},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}
	pointName := "MulticastAddSmokeScreenPoint.Translation"
	fields := []fieldRow{
		{TimeMS: 1100, PacketID: 2, ActorNetGUID: 700, FieldName: &pointName, ValueStr: stringPtr("(1000,2000,0)")},
		{TimeMS: 1200, PacketID: 3, ActorNetGUID: 700, FieldName: &pointName, ValueStr: stringPtr("(10000,2000,0)")},
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
		12000,
		[]roundWindow{{RoundNumber: 1, StartMS: 0, EndMS: 12000}},
		newPlayerIndex(&Manifest{}),
		nil,
		nil,
		fieldData.UtilityOwners,
		fieldData.UtilityPaths,
		fieldData.UtilityFuel,
		fieldData.UtilityDestroy,
		fieldData.UtilityActivation,
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(utilities) != 1 || len(utilities[0]) != 1 {
		t.Fatalf("utilities = %#v, want one inactive wall", utilities)
	}
	wall := utilities[0][0]
	if wall.Kind != UtilityWall || wall.IconOnly || !wall.Inactive ||
		wall.StartTimeMS != 1200 || wall.EndTimeMS != 12000 {
		t.Errorf("wall = %+v, want an inactive wall from 1200 to 12000", wall)
	}
}

func float32Ptr(value float32) *float32 { return &value }

func stringPtr(value string) *string { return &value }

func uint32Ptr(value uint32) *uint32 { return &value }

func boolPtr(value bool) *bool { return &value }
