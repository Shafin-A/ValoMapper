package replay

import (
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
)

const (
	maxUtilityWarnings   = 9999
	maxUtilityIntervals  = 5000
	maxUtilitySamples    = 256
	maxUtilityPathPoints = 256
)

type utilityCatalogEntry struct {
	kind               UtilityKind
	mobile             bool
	replicatedMovement bool
	minBuild           int
	maxLifetimeMS      uint32
	ability            string
}

var utilityCatalog = map[string]utilityCatalogEntry{
	// Breach
	"GameObject_Breach_4_FusionBlast":        {kind: UtilityArea, minBuild: 1300, maxLifetimeMS: 2200, ability: "aftershock"},
	"GameObject_Breach_E_SweetSpotFissure":   {kind: UtilityArea, minBuild: 1300, maxLifetimeMS: 1100, ability: "fault_line"},
	"Projectile_Breach_4_FusionBlast":        {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "aftershock"},
	"Projectile_Breach_Q_ThroughWalls_Flash": {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "flashpoint"},

	// Brimstone
	"GameObject_Sarge_E_SpeedStim":                {kind: UtilityArea, minBuild: 1300, ability: "stim_beacon"},
	"Patch_Sarge_Q_Molotov_Production":            {kind: UtilityMolly, minBuild: 1300, ability: "incendiary"},
	"GameObject_Sarge_4_Smoke_ProductionNEW":      {kind: UtilitySmoke, minBuild: 1300, ability: "sky_smoke"},
	"GameObject_Sarge_X_OrbitalStrike_Production": {kind: UtilityArea, minBuild: 1300, ability: "orbital_strike"},
	"Projectile_Sarge_E_SpeedStim":                {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "stim_beacon"},
	"Projectile_Sarge_Q_Molotov_Production":       {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "incendiary"},

	// Chamber
	"Patch_Deadeye_E_Slow_Large":             {kind: UtilityArea, minBuild: 1308, ability: "trademark"},
	"GameObject_Deadeye_E_Teleporter_Tether": {kind: UtilityMarker, minBuild: 1300, ability: "rendezvous"},
	"GameObject_Deadeye_E_Trap":              {kind: UtilityTrap, minBuild: 1302, ability: "trademark"},

	// Clove
	"GameObject_Smonk_Q_DecayExplosion": {kind: UtilityArea, minBuild: 1301, ability: "meddle"},
	"GameObject_Smonk_NewSmoke":         {kind: UtilitySmoke, minBuild: 1301, ability: "ruse"},
	"GameObject_Smonk_NewSmoke_PDS":     {kind: UtilitySmoke, minBuild: 1301, ability: "ruse"},
	"Projectile_Smonk_DecayNade":        {kind: UtilityMobile, replicatedMovement: true, minBuild: 1301, ability: "meddle"},

	// Cypher
	"GameObject_Gumshoe_E_TripWire":                  {kind: UtilityWall, minBuild: 1300, ability: "trapwire"},
	"Zone_Gumshoe_4_Cage":                            {kind: UtilitySmoke, minBuild: 1300, ability: "cyber_cage"},
	"Pawn_Gumshoe_Q_PossessableCamera":               {kind: UtilityMarker, minBuild: 1300, ability: "spycam"},
	"GameObject_RemovableObject_GumshoeTrackingDart": {kind: UtilityMarker, minBuild: 1300, ability: "spycam"},

	// Deadlock
	"Patch_NetToss":                           {kind: UtilityArea, minBuild: 1300, ability: "gravnet"},
	"Projectile_NetToss":                      {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "gravnet"},
	"Projectile_CableJam_InAir":               {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "barrier_mesh"},
	"GameObject_StealthingTrap_SoundSensor":   {kind: UtilityTrap, minBuild: 1300, ability: "sonic_sensor"},
	"GameObject_SoundSensor_SweetSpotFissure": {kind: UtilityTrap, minBuild: 1300, ability: "sonic_sensor"},
	"GameObject_CableJamRoot":                 {kind: UtilityWall, minBuild: 1300, ability: "barrier_mesh"},

	// Fade
	"GameObject_BountyHunter_E_LoSReveal_Source_Reactivate":   {kind: UtilityMarker, minBuild: 1300, ability: "haunt"},
	"GameObject_BountyHunter_X_WaveForm":                      {kind: UtilityArea, minBuild: 1300, ability: "nightfall"},
	"Pawn_BountyHunter_4_WolfHound":                           {kind: UtilityMobile, mobile: true, minBuild: 1301, ability: "prowler"},
	"GameObject_Q_BountyHunter_Tether_SphereExpansion":        {kind: UtilityArea, minBuild: 1300, ability: "seize"},
	"Projectile_E_BountyHunter_Divebomb":                      {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "haunt"},
	"Projectile_Q_BountyHunter_TetherGrenade_SphereExpansion": {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "seize"},

	// Gekko
	"Patch_Aggrobot_C_ExplodeyPatch":             {kind: UtilityMolly, minBuild: 1300, ability: "mosh_pit"},
	"Projectile_Aggrobot_C_ExplodeyPatch":        {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "mosh_pit"},
	"Projectile_E_Aggrobot_DiscTurret_PowerWave": {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "dizzy"},
	"Pawn_Aggrobot_SeekerNade":                   {kind: UtilityMobile, mobile: true, minBuild: 1300, ability: "wingman"},
	"Pawn_Aggrobot_RollyPolly":                   {kind: UtilityMobile, mobile: true, minBuild: 1300, ability: "thrash"},

	// Iso
	"GameObject_FishingHook_CageSphere":   {kind: UtilityArea, minBuild: 1300, ability: "annihilation"},
	"GameObject_Sequoia_4_MovingCover":    {kind: UtilityWall, minBuild: 1300, ability: "contingency"},
	"GameObject_Sequoia_E_Orb":            {kind: UtilityMarker, minBuild: 1300, ability: "double_tap"},
	"GameObject_Sequoia_X_LineCapture":    {kind: UtilityArea, minBuild: 1300, ability: "kill_contract"},
	"Projectile_Sequoia_Q_FragileMissile": {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "undercut"},

	// Jett
	"GameObject_Wushu_4_SmokeZone": {kind: UtilitySmoke, minBuild: 1302, ability: "cloudburst"},
	"Projectile_Wushu_4_Smoke":     {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "cloudburst"},

	// KAY/O
	"Gameobject_Grenadier_E_SuppressionPulse": {kind: UtilityArea, minBuild: 1300, ability: "zeropoint"},
	"Projectile_C_Grenadier_Flash":            {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "flashdrive"},
	"Projectile_C_Grenadier_Flash_Underhand":  {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "flashdrive"},
	"Projectile_Grenadier_E_SuppressionBlade": {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "zeropoint"},

	// Killjoy
	"GameObject_Killjoy_4_BeeSwarm_Damage":          {kind: UtilityMolly, minBuild: 1300, ability: "nanoswarm"},
	"Projectile_Killjoy_4_RemoteBees_MultiDetonate": {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "nanoswarm"},
	"Pawn_Killjoy_Q_StealthAlarmbot":                {kind: UtilityTrap, minBuild: 1300, ability: "alarmbot"},
	"Pawn_Killjoy_E_Turret":                         {kind: UtilityTrap, minBuild: 1300, ability: "turret"},
	"GameObject_Killjoy_X_Bomb":                     {kind: UtilityArea, minBuild: 1300, ability: "lockdown"},

	// Miks
	"GameObject_Thumper_Concuss":  {kind: UtilityArea, minBuild: 1300, ability: "mpulse"},
	"GameObject_Thumper_Heal":     {kind: UtilityArea, minBuild: 1300, ability: "mpulse_concuss"},
	"Projectile_Thumper_Concuss":  {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "mpulse"},
	"Projectile_Thumper_Heal":     {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "mpulse_concuss"},
	"GameObject_Iris_E_Smoke":     {kind: UtilitySmoke, minBuild: 1300, ability: "waveform"},
	"GameObject_Iris_X_SonicWave": {kind: UtilityArea, minBuild: 1300, ability: "bassquake"},

	// Neon
	"GameObject_Sprinter_4_Tunnel":         {kind: UtilityWall, minBuild: 1300, ability: "fast_lane"},
	"GameObject_Sprinter_Q_ElectricSphere": {kind: UtilityArea, minBuild: 1300, ability: "relay_bolt"},

	// Omen
	"Zone_Wraith_4_Smoke":                  {kind: UtilitySmoke, minBuild: 1300, ability: "dark_cover"},
	"Projectile_Wraith_Q_NearsightMissile": {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "paranoia"},
	"Projectile_Wraith_4_Smoke":            {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "dark_cover"},

	// Phoenix
	"Patch_Phoenix_MolotovFire":                        {kind: UtilityMolly, minBuild: 1300, ability: "hot_hands"},
	"GameObject_Phoenix_Q_FlameWallManager_Production": {kind: UtilityWall, minBuild: 1300, ability: "blaze"},
	"GameObject_Phoenix_X_ResTarget_Production":        {kind: UtilityMarker, minBuild: 1300, ability: "run_it_back"},
	"Projectile_Phoenix_4_Molotov_Production":          {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "hot_hands"},
	"Projectile_Phoenix_E_FlareCurve_Synced":           {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "curveball"},
	"Projectile_Phoenix_E_FlareCurve_Synced_Right":     {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "curveball"},
	"Projectile_Phoenix_Q_FlameWall_ThroughWall":       {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "blaze"},

	// Raze
	"Pawn_Clay_E_Boomba":                   {kind: UtilityMobile, mobile: true, minBuild: 1301, ability: "boom_bot"},
	"Projectile_Clay_4_Projectile_Primary": {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "paint_shells"},
	"Projectile_Clay_Q_Satchel_Arming":     {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "blast_pack"},
	"Projectile_Clay_X_Rocket":             {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "showstopper"},

	// Reyna
	"GameObject_Vampire_4_NearsightAOE_Source": {kind: UtilityMarker, minBuild: 1300, ability: "leer"},
	"Projectile_Vampire_4_NearsightAoE":        {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "leer"},

	// Sage
	"GameObject_Thorne_E_Wall_Fortifying":      {kind: UtilityWall, minBuild: 1300, ability: "barrier_orb"},
	"Patch_Thorne_4_SlowField_Production":      {kind: UtilityArea, minBuild: 1300, ability: "slow_orb"},
	"Projectile_Thorne_4_SlowFIeld_Production": {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "slow_orb"},

	// Skye
	"Pawn_Guide_Q_PossessableScout":            {kind: UtilityMobile, mobile: true, minBuild: 1300, ability: "trailblazer"},
	"GameObject_Guide_4_Heal_AOE":              {kind: UtilityArea, minBuild: 1300, ability: "regrowth"},
	"GameObject_Guide_E_HawkFlash_FlashSource": {kind: UtilityMarker, minBuild: 1300, ability: "guiding_light"},
	"Projectile_Guide_E_HawkFlash":             {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "guiding_light"},
	"Pawn_Guide_X_Pack":                        {kind: UtilityMobile, mobile: true, minBuild: 1300, ability: "seekers"},

	// Sova
	"GameObject_Hunter_4_ExplosiveBolt_Explosion": {kind: UtilityArea, minBuild: 1300, maxLifetimeMS: 450, ability: "shock_bolt"},
	"Projectile_Hunter_4_ExplosiveBolt":           {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "shock_bolt"},
	"Pawn_Hunter_E_Drone":                         {kind: UtilityMobile, mobile: true, minBuild: 1300, ability: "owl_drone"},
	"GameObject_Hunter_E_Drone_RevealDart":        {kind: UtilityMarker, minBuild: 1300, ability: "owl_drone"},
	"GameObject_Hunter_Q_SonarBolt":               {kind: UtilityArea, minBuild: 1300, ability: "recon_bolt"},
	"Projectile_Hunter_Q_RevealBolt":              {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "recon_bolt"},

	// Tejo
	"Projectile_Cashew_Q_ShellShockGrenade":        {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "special_delivery"},
	"Projectile_Cashew_Q_ShellShockGrenade_Bounce": {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "special_delivery"},

	"Pawn_Cashew_4_Spider_LockOn":                       {kind: UtilityMobile, mobile: true, minBuild: 1300, ability: "stealth_drone"},
	"GameObject_Cashew_4_SonarPing":                     {kind: UtilityArea, minBuild: 1300, ability: "stealth_drone"},
	"GameObject_Cashew_E_MapMissileMarker":              {kind: UtilityArea, minBuild: 1300, ability: "guided_salvo"},
	"GameObject_Cashew_E_MapMissileMarker_SecondRocket": {kind: UtilityArea, minBuild: 1300, ability: "guided_salvo"},
	"GameObject_Cashew_X_SegmentManager":                {kind: UtilityArea, minBuild: 1300, ability: "armageddon"},

	// Vyse
	"GameObject_Nox_Wall":                   {kind: UtilityWall, minBuild: 1300, ability: "shear"},
	"GameObject_Nox_WallTrap":               {kind: UtilityWall, minBuild: 1300, ability: "shear"},
	"GameObject_Nox_BarbedWire":             {kind: UtilityMolly, minBuild: 1300, ability: "razorvine"},
	"Patch_Nox_BarbedWire":                  {kind: UtilityMolly, minBuild: 1300, ability: "razorvine"},
	"Projectile_Nox_BarbedWire":             {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "razorvine"},
	"GameObject_Nox_StealthingTrap_Flash_2": {kind: UtilityTrap, minBuild: 1300, ability: "arc_rose"},
	"Gameobject_Nox_DisarmPulse":            {kind: UtilityArea, minBuild: 1300, ability: "steel_garden"},

	// Yoru
	"Projectile_Stealth_Q_BounceFlash":           {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "blindside"},
	"Pawn_Stealth_4_Decoy_V2":                    {kind: UtilityMobile, mobile: true, minBuild: 1300, ability: "fakeout"},
	"Pawn_Stealth_E_TeleporterMoving_FakeTP":     {kind: UtilityMobile, mobile: true, minBuild: 1300, ability: "gatecrash"},
	"Pawn_Stealth_E_TeleporterStationary_FakeTP": {kind: UtilityMarker, minBuild: 1300, ability: "gatecrash"},
}

type utilityActorEvent struct {
	TimeMS    uint32
	PacketID  uint32
	Event     string
	ClassPath string
	Spawn     *Position
	SpawnYaw  *float32
}

type utilityActor struct {
	GUID   uint32
	Class  string
	Events []utilityActorEvent
}

type utilityActorLife struct {
	guid     uint32
	ordinal  int
	class    utilityCatalogEntry
	openMS   uint32
	closeMS  uint32
	position Position
	yaw      float64
	owner    string
}

type utilityOwnerWrite struct {
	TimeMS     uint32
	PacketID   uint32
	Owner      *uint32
	Instigator *uint32
}

type utilityPathWrite struct {
	TimeMS   uint32
	PacketID uint32
	Position Position
}

type utilitySegment struct {
	life               *utilityActorLife
	roundIndex         int
	startMS            uint32
	endMS              uint32
	samples            []movementRow
	replicatedMovement []utilityPathWrite
	path               []utilityPathWrite
}

func scanUtilities(
	exportDir string,
	build string,
	durationMS uint32,
	windows []roundWindow,
	index *playerIndex,
	puuidBySubject map[string]string,
	outer map[uint32]uint32,
	ownerWrites map[uint32][]utilityOwnerWrite,
	pathWrites map[uint32][]utilityPathWrite,
) ([][]Utility, UtilityWarnings, error) {
	result := make([][]Utility, len(windows))
	warnings := UtilityWarnings{}
	buildNumber, ok := utilityBuildNumber(build)
	if !ok || buildNumber < 1300 || buildNumber > 1308 {
		warnings.UnsupportedBuild = 1
		return result, warnings, nil
	}

	actors, err := readUtilityActors(exportDir)
	if err != nil {
		return nil, warnings, err
	}

	var lives []*utilityActorLife
	for _, actor := range actors {
		entry, known := utilityCatalog[classBasename(actor.Class)]
		if !known || buildNumber < entry.minBuild {
			if isUtilityCandidate(actor.Class) {
				incrementUtilityWarning(&warnings.UnknownActors)
			}
			continue
		}

		actorLives, invalid, missingClose := buildUtilityActorLives(actor, entry, durationMS)
		if invalid > 0 {
			incrementUtilityWarning(&warnings.InvalidActors, invalid)
		}
		if missingClose > 0 {
			incrementUtilityWarning(&warnings.MissingCloses, missingClose)
		}
		for i := range actorLives {
			life := &actorLives[i]
			if !validUtilityPosition(life.position) {
				incrementUtilityWarning(&warnings.MissingPositions)
				continue
			}
			if life.class.maxLifetimeMS > 0 &&
				life.closeMS-life.openMS > life.class.maxLifetimeMS {
				life.closeMS = life.openMS + life.class.maxLifetimeMS
			}
			lives = append(lives, life)
		}
	}
	sort.Slice(lives, func(i, j int) bool {
		if lives[i].guid != lives[j].guid {
			return lives[i].guid < lives[j].guid
		}
		return lives[i].ordinal < lives[j].ordinal
	})

	for _, life := range lives {
		if owner, hadLink, resolved := resolveUtilityOwner(
			life.guid, life.openMS, ownerWrites, index, outer, puuidBySubject,
		); resolved {
			life.owner = owner
		} else if hadLink {
			incrementUtilityWarning(&warnings.UnresolvedOwners)
		}
	}

	segments := make([]utilitySegment, 0)
	for _, life := range lives {
		for roundIndex, window := range windows {
			start := maxUint32(life.openMS, window.StartMS)
			end := minUint32(life.closeMS, window.EndMS)
			if start >= end {
				continue
			}
			segments = append(segments, utilitySegment{
				life:       life,
				roundIndex: roundIndex,
				startMS:    start,
				endMS:      end,
			})
		}
	}

	sortUtilitySegments(segments)
	if len(segments) > maxUtilityIntervals {
		incrementUtilityWarning(&warnings.TruncatedUtilities, len(segments)-maxUtilityIntervals)
		segments = segments[:maxUtilityIntervals]
	}

	mobileGUIDs := make(map[uint32]struct{})
	replicatedMovementGUIDs := make(map[uint32]struct{})
	for _, segment := range segments {
		if segment.life.class.mobile {
			mobileGUIDs[segment.life.guid] = struct{}{}
		}
		if segment.life.class.replicatedMovement {
			replicatedMovementGUIDs[segment.life.guid] = struct{}{}
		}
	}
	movementByGUID := make(map[uint32][]movementRow, len(mobileGUIDs))
	if len(mobileGUIDs) > 0 {
		_, err = readParquetRows[movementRow](exportDir+"/movement.parquet", func(rows []movementRow) error {
			for i := range rows {
				row := rows[i]
				if _, wanted := mobileGUIDs[row.CharacterNetGUID]; !wanted ||
					!isFinite32(row.PosX) || !isFinite32(row.PosY) ||
					math.Abs(float64(row.PosX)) > 1_000_000 ||
					math.Abs(float64(row.PosY)) > 1_000_000 {
					continue
				}
				movementByGUID[row.CharacterNetGUID] = append(
					movementByGUID[row.CharacterNetGUID], row,
				)
			}
			return nil
		})
		if err != nil {
			return nil, warnings, err
		}
	}
	replicatedMovementByGUID, err := readUtilityReplicatedMovement(
		exportDir,
		replicatedMovementGUIDs,
	)
	if err != nil {
		return nil, warnings, err
	}

	for i := range segments {
		segment := &segments[i]
		if segment.life.class.ability == "blaze" {
			for _, write := range pathWrites[segment.life.guid] {
				if write.TimeMS >= segment.startMS && write.TimeMS < segment.endMS &&
					write.TimeMS >= segment.life.openMS && write.TimeMS < segment.life.closeMS {
					segment.path = append(segment.path, write)
				}
			}
			sortUtilityPathWrites(segment.path)
		}
		if segment.life.class.replicatedMovement {
			for _, write := range replicatedMovementByGUID[segment.life.guid] {
				if write.TimeMS >= segment.startMS && write.TimeMS < segment.endMS &&
					write.TimeMS >= segment.life.openMS && write.TimeMS < segment.life.closeMS {
					segment.replicatedMovement = append(segment.replicatedMovement, write)
				}
			}
			sortUtilityPathWrites(segment.replicatedMovement)
			if len(segment.replicatedMovement) == 0 &&
				len(replicatedMovementByGUID[segment.life.guid]) == 0 {
				incrementUtilityWarning(&warnings.MissingMovement)
			}
		}
		if !segment.life.class.mobile {
			continue
		}
		for _, row := range movementByGUID[segment.life.guid] {
			if row.TimeMS >= segment.startMS && row.TimeMS < segment.endMS &&
				row.TimeMS >= segment.life.openMS && row.TimeMS < segment.life.closeMS {
				segment.samples = append(segment.samples, row)
			}
		}
		if len(segment.samples) == 0 && len(movementByGUID[segment.life.guid]) == 0 {
			incrementUtilityWarning(&warnings.MissingMovement)
		}
	}

	segments = filterUtilitySegments(segments)
	nextID := 0
	for _, segment := range segments {
		window := windows[segment.roundIndex]
		utility := Utility{
			ID:          fmt.Sprintf("utility-%04d", nextID+1),
			Kind:        segment.life.class.kind,
			AbilityID:   segment.life.class.ability,
			StartTimeMS: int(segment.startMS - window.StartMS),
			EndTimeMS:   int(segment.endMS - window.StartMS),
			Position:    segment.life.position,
			Yaw:         segment.life.yaw,
			OwnerPuuid:  segment.life.owner,
		}
		if segment.life.class.ability == "blaze" {
			var truncated bool
			utility.Path, truncated = sampleUtilityPath(segment.path, window.StartMS)
			if truncated {
				incrementUtilityWarning(&warnings.TruncatedPaths)
			}
		}
		if segment.life.class.mobile {
			var truncated bool
			utility.Samples, truncated = sampleUtilityMovement(segment.samples, window.StartMS)
			if truncated {
				incrementUtilityWarning(&warnings.TruncatedSamples)
			}
			if len(utility.Samples) == 0 {
				continue
			}
		} else if segment.life.class.replicatedMovement {
			var truncated bool
			utility.Samples, truncated = sampleUtilityPath(segment.replicatedMovement, window.StartMS)
			if truncated {
				incrementUtilityWarning(&warnings.TruncatedSamples)
			}
			if len(utility.Samples) == 0 {
				continue
			}
		}
		nextID++
		result[segment.roundIndex] = append(result[segment.roundIndex], utility)
	}

	return result, warnings, nil
}

func sampleUtilityPath(writes []utilityPathWrite, roundStart uint32) ([]UtilityPositionSample, bool) {
	samples := make([]UtilityPositionSample, 0, minInt(len(writes), maxUtilityPathPoints))
	truncated := false
	for _, write := range writes {
		if len(samples) > 0 {
			last := samples[len(samples)-1]
			if last.X == write.Position.X && last.Y == write.Position.Y {
				continue
			}
		}
		if len(samples) == maxUtilityPathPoints {
			truncated = true
			break
		}
		samples = append(samples, UtilityPositionSample{
			TimeMS: int(write.TimeMS - roundStart),
			X:      write.Position.X,
			Y:      write.Position.Y,
		})
	}
	return samples, truncated
}

func sortUtilityPathWrites(writes []utilityPathWrite) {
	sort.SliceStable(writes, func(i, j int) bool {
		if writes[i].TimeMS != writes[j].TimeMS {
			return writes[i].TimeMS < writes[j].TimeMS
		}
		return writes[i].PacketID < writes[j].PacketID
	})
}

func readUtilityReplicatedMovement(
	exportDir string,
	actorGUIDs map[uint32]struct{},
) (map[uint32][]utilityPathWrite, error) {
	paths := make(map[uint32][]utilityPathWrite, len(actorGUIDs))
	if len(actorGUIDs) == 0 {
		return paths, nil
	}
	_, err := readParquetRows[fieldRow](exportDir+"/fields.parquet", func(rows []fieldRow) error {
		for i := range rows {
			row := &rows[i]
			if _, wanted := actorGUIDs[row.ActorNetGUID]; !wanted ||
				row.ObjectNetGUID != nil ||
				row.FieldName == nil || *row.FieldName != "ReplicatedMovement" ||
				row.ValueStr == nil {
				continue
			}
			position, ok := parseReplicatedMovementPosition(*row.ValueStr)
			if !ok {
				continue
			}
			paths[row.ActorNetGUID] = append(paths[row.ActorNetGUID], utilityPathWrite{
				TimeMS: row.TimeMS, PacketID: row.PacketID, Position: position,
			})
		}
		return nil
	})
	return paths, err
}

func parseReplicatedMovementPosition(value string) (Position, bool) {
	var movement struct {
		Location *struct {
			X *float64 `json:"x"`
			Y *float64 `json:"y"`
		} `json:"location"`
	}
	if err := json.Unmarshal([]byte(value), &movement); err != nil {
		return Position{}, false
	}
	if movement.Location == nil || movement.Location.X == nil || movement.Location.Y == nil {
		return Position{}, false
	}
	position := Position{X: *movement.Location.X, Y: *movement.Location.Y}
	return position, validUtilityPosition(position)
}

func readUtilityActors(exportDir string) (map[uint32]*utilityActor, error) {
	actors := make(map[uint32]*utilityActor)
	_, err := readParquetRows[stateActorRow](exportDir+"/actors.parquet", func(rows []stateActorRow) error {
		for i := range rows {
			row := &rows[i]
			actor := actors[row.ActorNetGUID]
			if actor == nil {
				actor = &utilityActor{GUID: row.ActorNetGUID}
				actors[row.ActorNetGUID] = actor
			}
			event := utilityActorEvent{
				TimeMS:   row.TimeMS,
				PacketID: row.PacketID,
				Event:    row.Event,
			}
			if row.ClassPath != nil {
				event.ClassPath = *row.ClassPath
				if event.ClassPath != "" {
					actor.Class = event.ClassPath
				}
			}
			if row.SpawnX != nil && row.SpawnY != nil {
				event.Spawn = &Position{
					X: float64(*row.SpawnX),
					Y: float64(*row.SpawnY),
				}
			}
			if row.SpawnYaw != nil && isFinite32(*row.SpawnYaw) {
				yaw := *row.SpawnYaw
				event.SpawnYaw = &yaw
			}
			actor.Events = append(actor.Events, event)
		}
		return nil
	})
	return actors, err
}

func buildUtilityActorLives(
	actor *utilityActor,
	entry utilityCatalogEntry,
	durationMS uint32,
) ([]utilityActorLife, int, int) {
	events := append([]utilityActorEvent(nil), actor.Events...)
	sort.SliceStable(events, func(i, j int) bool {
		if events[i].TimeMS != events[j].TimeMS {
			return events[i].TimeMS < events[j].TimeMS
		}
		if events[i].PacketID != events[j].PacketID {
			return events[i].PacketID < events[j].PacketID
		}
		if events[i].Event != events[j].Event {
			return events[i].Event == "close"
		}
		return false
	})

	var result []utilityActorLife
	var current *utilityActorLife
	ordinal, invalid, missingClose := 0, 0, 0
	startLife := func(event utilityActorEvent) {
		if current != nil || event.TimeMS >= durationMS {
			invalid++
			return
		}
		ordinal++
		class := event.ClassPath
		if class == "" {
			class = actor.Class
		}
		resolved, ok := utilityCatalog[classBasename(class)]
		if !ok {
			resolved = entry
		}
		current = &utilityActorLife{
			guid:    actor.GUID,
			ordinal: ordinal,
			class:   resolved,
			openMS:  event.TimeMS,
			closeMS: durationMS,
		}
		if event.Spawn != nil {
			current.position = *event.Spawn
		}
		if event.SpawnYaw != nil {
			current.yaw = float64(*event.SpawnYaw)
		}
	}
	closeLife := func(event utilityActorEvent) {
		if current == nil {
			invalid++
			return
		}
		if event.TimeMS <= current.openMS {
			invalid++
			current = nil
			return
		}
		current.closeMS = minUint32(event.TimeMS, durationMS)
		result = append(result, *current)
		current = nil
	}
	for i := 0; i < len(events); {
		j := i + 1
		for j < len(events) && events[j].TimeMS == events[i].TimeMS &&
			events[j].PacketID == events[i].PacketID {
			j++
		}
		var opens, closes []utilityActorEvent
		for _, event := range events[i:j] {
			switch event.Event {
			case "open":
				opens = append(opens, event)
			case "close":
				closes = append(closes, event)
			case "dormant", "wake":
				// These are state transitions inside the same actor life.
			}
		}
		if current != nil {
			for _, event := range closes {
				closeLife(event)
			}
			for _, event := range opens {
				startLife(event)
			}
		} else {
			for _, event := range opens {
				startLife(event)
			}
			for _, event := range closes {
				closeLife(event)
			}
		}
		i = j
	}
	if current != nil {
		missingClose++
		result = append(result, *current)
	}
	return result, invalid, missingClose
}

func utilityOwnerField(name string) string {
	leaf := strings.TrimSpace(name)
	if dot := strings.LastIndex(leaf, "."); dot >= 0 {
		leaf = leaf[dot+1:]
	}
	switch strings.ToLower(leaf) {
	case "owner":
		return "owner"
	case "instigator":
		return "instigator"
	default:
		return ""
	}
}

func sortUtilityOwnerWrites(writes map[uint32][]utilityOwnerWrite) {
	for guid := range writes {
		sort.SliceStable(writes[guid], func(i, j int) bool {
			if writes[guid][i].TimeMS != writes[guid][j].TimeMS {
				return writes[guid][i].TimeMS < writes[guid][j].TimeMS
			}
			return writes[guid][i].PacketID < writes[guid][j].PacketID
		})
	}
}

func resolveUtilityOwner(
	actor uint32,
	at uint32,
	writes map[uint32][]utilityOwnerWrite,
	index *playerIndex,
	outer map[uint32]uint32,
	puuidBySubject map[string]string,
) (string, bool, bool) {
	if index == nil {
		return "", false, false
	}
	type queuedGUID struct {
		guid  uint32
		depth int
	}
	queue := []queuedGUID{{guid: actor}}
	seen := make(map[uint32]struct{})
	owners := make(map[string]struct{})
	hadLink := false
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		if current.guid == 0 || current.depth > 8 {
			continue
		}
		if _, exists := seen[current.guid]; exists {
			continue
		}
		seen[current.guid] = struct{}{}
		if subject, ok := index.subjectForCharacter(current.guid); ok {
			if puuid := puuidBySubject[subject]; puuid != "" {
				owners[puuid] = struct{}{}
			}
		}
		if current.depth == 8 {
			continue
		}
		var owner, instigator *uint32
		for _, write := range writes[current.guid] {
			if write.TimeMS > at {
				break
			}
			if write.Owner != nil {
				target := *write.Owner
				owner = &target
			}
			if write.Instigator != nil {
				target := *write.Instigator
				instigator = &target
			}
		}
		if owner != nil {
			hadLink = true
			if *owner != 0 {
				queue = append(queue, queuedGUID{guid: *owner, depth: current.depth + 1})
			}
		}
		if instigator != nil {
			hadLink = true
			if *instigator != 0 {
				queue = append(queue, queuedGUID{guid: *instigator, depth: current.depth + 1})
			}
		}
		if parent := outer[current.guid]; parent != 0 {
			queue = append(queue, queuedGUID{guid: parent, depth: current.depth + 1})
		}
	}
	if len(owners) != 1 {
		return "", hadLink, false
	}
	for owner := range owners {
		return owner, hadLink, true
	}
	return "", hadLink, false
}

func filterUtilitySegments(segments []utilitySegment) []utilitySegment {
	result := segments[:0]
	for _, segment := range segments {
		if segment.life.class.mobile && len(segment.samples) == 0 {
			continue
		}
		result = append(result, segment)
	}
	return result
}

func sortUtilitySegments(segments []utilitySegment) {
	sort.SliceStable(segments, func(i, j int) bool {
		if segments[i].startMS != segments[j].startMS {
			return segments[i].startMS < segments[j].startMS
		}
		if segments[i].life.guid != segments[j].life.guid {
			return segments[i].life.guid < segments[j].life.guid
		}
		if segments[i].life.ordinal != segments[j].life.ordinal {
			return segments[i].life.ordinal < segments[j].life.ordinal
		}
		return segments[i].roundIndex < segments[j].roundIndex
	})
}

func sampleUtilityMovement(rows []movementRow, roundStart uint32) ([]UtilityPositionSample, bool) {
	if len(rows) == 0 {
		return nil, false
	}
	sort.SliceStable(rows, func(i, j int) bool { return rows[i].TimeMS < rows[j].TimeMS })
	const sampleStepMS = uint32(100)
	sampled := make([]movementRow, 0, len(rows))
	var lastBin uint32
	for i, row := range rows {
		bin := row.TimeMS / sampleStepMS
		if i == 0 || bin != lastBin {
			sampled = append(sampled, row)
			lastBin = bin
		} else {
			sampled[len(sampled)-1] = row
		}
	}
	truncated := len(sampled) > maxUtilitySamples
	if truncated {
		reduced := make([]movementRow, maxUtilitySamples)
		for i := range reduced {
			index := i * (len(sampled) - 1) / (maxUtilitySamples - 1)
			reduced[i] = sampled[index]
		}
		sampled = reduced
	}
	result := make([]UtilityPositionSample, 0, len(sampled))
	for _, row := range sampled {
		result = append(result, UtilityPositionSample{
			TimeMS: int(row.TimeMS - roundStart),
			X:      float64(row.PosX),
			Y:      float64(row.PosY),
		})
	}
	return result, truncated
}

func utilityBuildNumber(build string) (int, bool) {
	parts := strings.Split(strings.TrimSpace(build), ".")
	if len(parts) != 2 {
		return 0, false
	}
	major, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, false
	}
	minor, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, false
	}
	return major*100 + minor, true
}

func classBasename(classPath string) string {
	path := classPath
	if slash := strings.LastIndexAny(path, "/\\"); slash >= 0 {
		path = path[slash+1:]
	}
	if dot := strings.Index(path, "."); dot >= 0 {
		path = path[:dot]
	}
	return path
}

func isUtilityCandidate(classPath string) bool {
	lower := strings.ToLower(classPath)
	for _, token := range []string{
		"smoke", "smok", "molly", "molotov", "flamewall", "wall_segment",
		"trap", "boomba", "wolfhound", "poisonorb",
	} {
		if strings.Contains(lower, token) {
			return true
		}
	}
	return false
}

func validUtilityPosition(position Position) bool {
	return !math.IsNaN(position.X) && !math.IsNaN(position.Y) &&
		!math.IsInf(position.X, 0) && !math.IsInf(position.Y, 0) &&
		math.Abs(position.X) <= 1_000_000 && math.Abs(position.Y) <= 1_000_000
}

func incrementUtilityWarning(counter *int, amounts ...int) {
	amount := 1
	if len(amounts) > 0 {
		amount = amounts[0]
	}
	*counter = minInt(maxUtilityWarnings, *counter+amount)
}

func minUint32(a, b uint32) uint32 {
	if a < b {
		return a
	}
	return b
}

func maxUint32(a, b uint32) uint32 {
	if a > b {
		return a
	}
	return b
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
