package replay

import (
	"encoding/binary"
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
	nanoswarmSettledMS   = 251
	poisonCloudSettledMS = 251
	curveballFlightMS    = 600
	wallArmingMS         = 1500
)

type utilityCatalogEntry struct {
	kind               UtilityKind
	mobile             bool
	replicatedMovement bool
	wallPoints         bool
	wallActivated      bool
	wallStart          bool
	trapwireFarEnd     bool
	iconOnly           bool
	visionCone         bool
	wallYawOffset      float64
	curveballSide      int
	minBuild           int
	maxLifetimeMS      uint32
	ability            string
}

var utilityCatalog = map[string]utilityCatalogEntry{
	// Astra
	"GameObject_Rift_4_BlackHole":      {kind: UtilityArea, minBuild: 1300, maxLifetimeMS: 3200, ability: "gravity_well"},
	"GameObject_Rift_Q_FlashBurst":     {kind: UtilityArea, minBuild: 1300, ability: "nova_pulse"},
	"GameObject_Rift_E_SmokeZone":      {kind: UtilitySmoke, minBuild: 1300, ability: "nebula__dissipate"},
	"GameObject_Rift_E_SmokeZone_Fake": {kind: UtilitySmoke, minBuild: 1300, ability: "nebula__dissipate"},
	"GameObject_Rift_X_GlobalWall":     {kind: UtilityWall, minBuild: 1300, ability: "cosmic_divide"},
	"GameObject_Rift_X_Markers":        {kind: UtilityMarker, minBuild: 1300, ability: "astra_passive"},

	// Breach
	"GameObject_Breach_4_FusionBlast":        {kind: UtilityArea, minBuild: 1300, maxLifetimeMS: 2200, ability: "aftershock"},
	"GameObject_Breach_E_SweetSpotFissure":   {kind: UtilityArea, minBuild: 1300, maxLifetimeMS: 1100, ability: "fault_line"},
	"GameObject_Breach_X_Shockwave":          {kind: UtilityArea, minBuild: 1300, maxLifetimeMS: 2004, ability: "rolling_thunder"},
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
	"GameObject_Smonk_Q_DecayExplosion": {kind: UtilityArea, minBuild: 1301, maxLifetimeMS: 750, ability: "meddle"},
	"GameObject_Smonk_NewSmoke":         {kind: UtilitySmoke, minBuild: 1301, ability: "ruse"},
	"GameObject_Smonk_NewSmoke_PDS":     {kind: UtilitySmoke, minBuild: 1301, ability: "ruse"},
	"Projectile_Smonk_DecayNade":        {kind: UtilityMobile, replicatedMovement: true, minBuild: 1301, ability: "meddle"},

	// Cypher
	"GameObject_Gumshoe_E_TripWire":                  {kind: UtilityWall, minBuild: 1300, ability: "trapwire"},
	"GameObject_Gumshoe_4_TripWire":                  {kind: UtilityWall, minBuild: 1300, ability: "trapwire"},
	"GameObject_Gumshoe_4_TripWire_SecondWire":       {kind: UtilityMarker, trapwireFarEnd: true, minBuild: 1300, ability: "trapwire"},
	"GameObject_Gumshoe_Q_CageTrap":                  {kind: UtilityMarker, iconOnly: true, minBuild: 1300, ability: "cyber_cage"},
	"Zone_Gumshoe_4_Cage":                            {kind: UtilitySmoke, minBuild: 1300, ability: "cyber_cage"},
	"Zone_Gumshoe_Q_Cage":                            {kind: UtilitySmoke, minBuild: 1300, ability: "cyber_cage"},
	"Pawn_Gumshoe_Q_PossessableCamera":               {kind: UtilityMarker, visionCone: true, minBuild: 1300, ability: "spycam"},
	"Pawn_Gumshoe_E_PossessableCamera":               {kind: UtilityMarker, visionCone: true, minBuild: 1300, ability: "spycam"},
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
	"GameObject_BountyHunter_X_WaveForm":                      {kind: UtilityArea, minBuild: 1300, maxLifetimeMS: 1000, ability: "nightfall"},
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

	// Harbor
	"GameObject_Mage_4_SplashGrenade": {kind: UtilityArea, minBuild: 1300, ability: "storm_surge"},
	"Projectile_Mage_Q_Wall":          {kind: UtilityMarker, minBuild: 1300, ability: "high_tide"},
	"GameObject_Mage_Q_WallManager":   {kind: UtilityWall, wallPoints: true, minBuild: 1300, ability: "high_tide"},
	"GameObject_Mage_E_WorldSmoke":    {kind: UtilitySmoke, minBuild: 1300, ability: "cove"},
	"GameObject_Mage_X_TidalWave":     {kind: UtilityArea, minBuild: 1300, ability: "reckoning"},

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
	"GameObject_Killjoy_4_BeeSwarm_Damage":          {kind: UtilityMolly, maxLifetimeMS: 4000, minBuild: 1300, ability: "nanoswarm"},
	"Projectile_Killjoy_4_RemoteBees_MultiDetonate": {kind: UtilityMobile, replicatedMovement: true, iconOnly: true, minBuild: 1300, ability: "nanoswarm"},
	"Pawn_Killjoy_Q_StealthAlarmbot":                {kind: UtilityTrap, minBuild: 1300, ability: "alarmbot"},
	"Pawn_Killjoy_E_Turret":                         {kind: UtilityTrap, minBuild: 1300, ability: "turret"},
	"GameObject_Killjoy_X_Bomb":                     {kind: UtilityArea, minBuild: 1300, ability: "lockdown"},

	// Miks
	"GameObject_Thumper_Concuss":  {kind: UtilityArea, minBuild: 1300, ability: "mpulse"},
	"GameObject_Thumper_Heal":     {kind: UtilityArea, minBuild: 1300, ability: "mpulse_concuss"},
	"Projectile_Thumper_Concuss":  {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "mpulse"},
	"Projectile_Thumper_Heal":     {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "mpulse_concuss"},
	"GameObject_Iris_E_Smoke":     {kind: UtilitySmoke, minBuild: 1300, ability: "waveform"},
	"GameObject_Iris_X_SonicWave": {kind: UtilityArea, minBuild: 1300, maxLifetimeMS: 1600, ability: "bassquake"},

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
	"Projectile_Phoenix_E_FlareCurve_Synced":           {kind: UtilityMobile, replicatedMovement: true, curveballSide: -1, maxLifetimeMS: curveballFlightMS, minBuild: 1300, ability: "curveball"},
	"Projectile_Phoenix_E_FlareCurve_Synced_Right":     {kind: UtilityMobile, replicatedMovement: true, curveballSide: 1, maxLifetimeMS: curveballFlightMS, minBuild: 1300, ability: "curveball"},
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

	// Veto
	"GameObject_Pine_4_UsableTeleport":         {kind: UtilityMarker, minBuild: 1300, ability: "crosscut"},
	"GameObject_Pine_Q_SeizeTrap":              {kind: UtilityTrap, iconOnly: true, minBuild: 1300, ability: "chokehold"},
	"GameObject_Pine_Q_Tether_SphereExpansion": {kind: UtilityArea, minBuild: 1300, ability: "chokehold"},
	"Pawn_Pine_E_RadEater":                     {kind: UtilityTrap, minBuild: 1300, ability: "interceptor"},

	// Viper
	"Patch_Pandemic_AcidMolotov_NewMolotov":    {kind: UtilityMolly, minBuild: 1300, maxLifetimeMS: 6500, ability: "snake_bite"},
	"Projectile_Pandemic_Q_AcidGrenade":        {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "snake_bite"},
	"GameObject_Pandemic_4_SmokeZone":          {kind: UtilitySmoke, minBuild: 1300, ability: "poison_cloud"},
	"Projectile_Pandemic_4_SmokeGrenade":       {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "poison_cloud", iconOnly: true},
	"GameObject_Pandemic_E_SmokeScreenManager": {kind: UtilityWall, wallPoints: true, wallActivated: true, wallStart: true, minBuild: 1300, ability: "toxic_screen"},
	"Patch_Pandemic_X_Circular":                {kind: UtilityArea, minBuild: 1300, ability: "vipers_pit"},

	// Vyse
	"GameObject_Nox_Wall":                   {kind: UtilityWall, wallPoints: true, minBuild: 1300, ability: "shear"},
	"GameObject_Nox_WallTrap":               {kind: UtilityWall, wallPoints: true, wallYawOffset: -90, minBuild: 1300, ability: "shear"},
	"GameObject_Nox_BarbedWire":             {kind: UtilityMolly, minBuild: 1300, ability: "razorvine"},
	"Patch_Nox_BarbedWire":                  {kind: UtilityMolly, minBuild: 1300, ability: "razorvine"},
	"Projectile_Nox_BarbedWire":             {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "razorvine"},
	"GameObject_Nox_StealthingTrap_Flash_2": {kind: UtilityTrap, minBuild: 1300, ability: "arc_rose"},
	"Gameobject_Nox_DisarmPulse":            {kind: UtilityArea, minBuild: 1300, ability: "steel_garden"},

	// Waylay
	"GameObject_Terra_C_TimeSlowGrenade_Explosion": {kind: UtilityArea, minBuild: 1300, ability: "saturate"},
	"Projectile_Terra_C_TimeSlowGrenade":           {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "saturate"},
	"GameObject_Terra_E_RewindTime_RewindTarget":   {kind: UtilityMarker, minBuild: 1300, ability: "refract"},
	"GameObject_Terra_X_DelayedBeam_Beam":          {kind: UtilityArea, minBuild: 1300, ability: "convergent_paths"},

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
	guid            uint32
	ordinal         int
	class           utilityCatalogEntry
	openMS          uint32
	closeMS         uint32
	position        Position
	yaw             float64
	lengthM         float64
	hasYaw          bool
	owner           string
	activeIntervals []utilityInterval
	placedMS        uint32
}

type utilityInterval struct {
	startMS uint32
	endMS   uint32
}

type utilityOwnerWrite struct {
	TimeMS     uint32
	PacketID   uint32
	Owner      *uint32
	Instigator *uint32
	Controller *uint32
}

type utilityPathWrite struct {
	TimeMS    uint32
	PacketID  uint32
	FieldName string
	Position  Position
}
type utilityFuelWrite struct {
	TimeMS   uint32
	PacketID uint32
	Fuel     *float64
	Draining *bool
}

type utilityDestroyWrite struct {
	TimeMS   uint32
	PacketID uint32
}

type utilityActivationWrite struct {
	TimeMS   uint32
	PacketID uint32
	Active   *bool
}

type utilitySegment struct {
	life               *utilityActorLife
	roundIndex         int
	startMS            uint32
	endMS              uint32
	position           Position
	yaw                float64
	lengthM            float64
	inactive           bool
	samples            []movementRow
	replicatedMovement []utilityPathWrite
	path               []utilityPathWrite
	visionSamples      []UtilityVisionSample
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
	fuelWrites map[uint32][]utilityFuelWrite,
	destroyWrites map[uint32][]utilityDestroyWrite,
	activationWrites map[uint32][]utilityActivationWrite,
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

	fuelByOwner := utilityFuelByOwner(fuelWrites, index, puuidBySubject)
	for _, life := range lives {
		if life.class.ability != "poison_cloud" {
			continue
		}
		if endMS, ok := poisonCloudActivationEndMS(
			life.openMS,
			life.closeMS,
			destroyWrites[life.guid],
			fuelByOwner[life.owner],
		); ok {
			life.closeMS = endMS
		}
	}

	for _, life := range lives {
		if !life.class.wallActivated {
			continue
		}
		life.activeIntervals = wallActivationIntervals(
			life.openMS,
			life.closeMS,
			activationWrites[life.guid],
			fuelByOwner[life.owner],
		)
		life.placedMS = life.openMS
		for _, write := range pathWrites[life.guid] {
			if write.TimeMS >= life.openMS && write.TimeMS < life.closeMS &&
				write.TimeMS > life.placedMS {
				life.placedMS = write.TimeMS
			}
		}
	}

	pairCypherTrapwireEndpoints(lives, ownerWrites)

	segments := make([]utilitySegment, 0)
	for _, life := range lives {
		if life.class.trapwireFarEnd {
			continue
		}
		intervals := life.activeIntervals
		if intervals == nil {
			intervals = []utilityInterval{{startMS: life.openMS, endMS: life.closeMS}}
		}
		for roundIndex, window := range windows {
			for _, interval := range intervals {
				start := maxUint32(interval.startMS, window.StartMS)
				end := minUint32(interval.endMS, window.EndMS)
				if start >= end {
					continue
				}
				segments = append(segments, utilitySegment{
					life:       life,
					roundIndex: roundIndex,
					startMS:    start,
					endMS:      end,
					position:   life.position,
					yaw:        life.yaw + life.class.wallYawOffset,
				})
			}
			if !life.class.wallActivated {
				continue
			}

			cursor := maxUint32(life.placedMS, window.StartMS)
			roundEnd := window.EndMS
			for _, interval := range intervals {
				if interval.startMS > cursor {
					if inactive := wallInactiveSegment(life, roundIndex, cursor, minUint32(interval.startMS, roundEnd)); inactive != nil {
						segments = append(segments, *inactive)
					}
				}
				if interval.endMS > cursor {
					cursor = interval.endMS
				}
			}
			if inactive := wallInactiveSegment(life, roundIndex, cursor, roundEnd); inactive != nil {
				segments = append(segments, *inactive)
			}
		}
	}

	sortUtilitySegments(segments)
	if len(segments) > maxUtilityIntervals {
		incrementUtilityWarning(&warnings.TruncatedUtilities, len(segments)-maxUtilityIntervals)
		segments = segments[:maxUtilityIntervals]
	}

	movementGUIDs := make(map[uint32]struct{})
	replicatedMovementGUIDs := make(map[uint32]struct{})
	for _, segment := range segments {
		if segment.life.class.mobile {
			movementGUIDs[segment.life.guid] = struct{}{}
		}
		if segment.life.class.visionCone &&
			hasActiveUtilityControllerWrite(ownerWrites[segment.life.guid]) {
			movementGUIDs[segment.life.guid] = struct{}{}
		}
		if segment.life.class.replicatedMovement {
			replicatedMovementGUIDs[segment.life.guid] = struct{}{}
		}
	}
	movementByGUID := make(map[uint32][]movementRow, len(movementGUIDs))
	if len(movementGUIDs) > 0 {
		_, err = readParquetRows[movementRow](exportDir+"/movement.parquet", func(rows []movementRow) error {
			for i := range rows {
				row := rows[i]
				if _, wanted := movementGUIDs[row.CharacterNetGUID]; !wanted ||
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
		if segment.life.class.wallPoints {

			fromMS, toMS := segment.startMS, segment.endMS
			if segment.life.class.wallActivated {
				fromMS, toMS = segment.life.openMS, segment.life.closeMS
			}
			wallPoints := make([]utilityPathWrite, 0)
			for _, write := range pathWrites[segment.life.guid] {
				if write.TimeMS >= fromMS && write.TimeMS < toMS &&
					write.TimeMS >= segment.life.openMS && write.TimeMS < segment.life.closeMS {
					wallPoints = append(wallPoints, write)
				}
			}
			if segment.life.class.wallStart {
				if start, end, ok := utilityWallSpan(wallPoints); ok {
					segment.position = start
					segment.yaw = math.Atan2(end.Y-start.Y, end.X-start.X) * 180 / math.Pi
					segment.lengthM = math.Hypot(end.X-start.X, end.Y-start.Y) / 100
				}
			} else if start, end, ok := utilityWallEndpoints(wallPoints); ok {
				segment.position = Position{
					X: (start.X + end.X) / 2,
					Y: (start.Y + end.Y) / 2,
				}
				segment.yaw = math.Atan2(end.Y-start.Y, end.X-start.X)*180/math.Pi - 90
			}
		}
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
			if segment.life.class.ability == "curveball" &&
				segment.life.class.curveballSide != 0 &&
				segment.life.hasYaw &&
				!hasDistinctUtilityMovement(segment.replicatedMovement) {
				segment.replicatedMovement = approximateCurveballMovement(
					segment.life.position,
					segment.life.yaw,
					segment.life.class.curveballSide,
					segment.life.openMS,
					segment.life.closeMS,
				)
			}
			if len(segment.replicatedMovement) == 0 &&
				len(replicatedMovementByGUID[segment.life.guid]) == 0 {
				incrementUtilityWarning(&warnings.MissingMovement)
			}
		}
		if !segment.life.class.mobile {
			if segment.life.class.visionCone {
				var truncated bool
				segment.visionSamples, truncated = sampleUtilityVision(
					movementByGUID[segment.life.guid],
					ownerWrites[segment.life.guid],
					segment.startMS,
					segment.endMS,
					windows[segment.roundIndex].StartMS,
					segment.life.yaw,
					segment.life.hasYaw,
				)
				if truncated {
					incrementUtilityWarning(&warnings.TruncatedSamples)
				}
			}
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
		id := fmt.Sprintf("utility-%04d", nextID+1)
		if segment.inactive {
			id += "-inactive"
		}
		utility := Utility{
			ID:          id,
			Kind:        segment.life.class.kind,
			AbilityID:   segment.life.class.ability,
			StartTimeMS: int(segment.startMS - window.StartMS),
			EndTimeMS:   int(segment.endMS - window.StartMS),
			Position:    segment.position,
			Yaw:         segment.yaw,
			OwnerPuuid:  segment.life.owner,
			IconOnly:    segment.life.class.iconOnly,
			Inactive:    segment.inactive,
			Vision:      segment.visionSamples,
		}
		if segment.lengthM > 0 {
			utility.Length = segment.lengthM
		} else if segment.life.lengthM > 0 {
			utility.Length = segment.life.lengthM
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

	addNanoswarmPlacedMarkers(result, windows)
	addPoisonCloudPlacedMarkers(result, windows)
	return result, warnings, nil
}

func addNanoswarmPlacedMarkers(utilities [][]Utility, windows []roundWindow) {
	for roundIndex := range utilities {
		if roundIndex >= len(windows) {
			break
		}
		roundEndMS := int(windows[roundIndex].EndMS - windows[roundIndex].StartMS)
		activated := make([]int, 0)
		for i := range utilities[roundIndex] {
			utility := utilities[roundIndex][i]
			if utility.AbilityID == "nanoswarm" && utility.Kind == UtilityMolly {
				activated = append(activated, i)
			}
		}

		usedActivations := make(map[int]struct{})
		var placed []Utility
		for _, flight := range utilities[roundIndex] {
			if flight.AbilityID != "nanoswarm" || flight.Kind != UtilityMobile ||
				len(flight.Samples) == 0 {
				continue
			}
			positionSample := flight.Samples[len(flight.Samples)-1]
			position := Position{X: positionSample.X, Y: positionSample.Y}
			placedStart := flight.EndTimeMS
			settledAt := positionSample.TimeMS + nanoswarmSettledMS
			if placedStart > settledAt {
				placedStart = settledAt
			}
			if placedStart >= roundEndMS {
				continue
			}
			placedEnd := roundEndMS
			if flight.EndTimeMS > settledAt {
				placedEnd = flight.EndTimeMS
			}
			bestDistance := math.Inf(1)
			bestActivation := -1
			for _, activationIndex := range activated {
				activation := utilities[roundIndex][activationIndex]
				if _, used := usedActivations[activationIndex]; used ||
					activation.StartTimeMS < positionSample.TimeMS ||
					activation.StartTimeMS >= placedEnd ||
					(flight.OwnerPuuid != "" && activation.OwnerPuuid != flight.OwnerPuuid) {
					continue
				}
				distance := math.Hypot(
					activation.Position.X-position.X,
					activation.Position.Y-position.Y,
				)
				if distance < bestDistance {
					bestDistance = distance
					bestActivation = activationIndex
				}
			}
			if bestActivation >= 0 && bestDistance <= 500 {
				placedEnd = utilities[roundIndex][bestActivation].StartTimeMS
				usedActivations[bestActivation] = struct{}{}
			}
			if placedStart >= placedEnd {
				continue
			}
			placed = append(placed, Utility{
				ID:          flight.ID + "-placed",
				Kind:        UtilityMarker,
				AbilityID:   "nanoswarm",
				StartTimeMS: placedStart,
				EndTimeMS:   placedEnd,
				Position:    position,
				OwnerPuuid:  flight.OwnerPuuid,
				IconOnly:    true,
			})
		}
		for _, marker := range placed {
			utilities[roundIndex] = append(utilities[roundIndex], marker)
		}
		sort.SliceStable(utilities[roundIndex], func(i, j int) bool {
			if utilities[roundIndex][i].StartTimeMS != utilities[roundIndex][j].StartTimeMS {
				return utilities[roundIndex][i].StartTimeMS < utilities[roundIndex][j].StartTimeMS
			}
			return utilities[roundIndex][i].ID < utilities[roundIndex][j].ID
		})
	}
}

func addPoisonCloudPlacedMarkers(utilities [][]Utility, windows []roundWindow) {
	type poisonCloudEmitter struct {
		flight       Utility
		landing      Position
		landingMS    int
		lastSampleMS int
		activations  []Utility
	}

	for roundIndex := range utilities {
		if roundIndex >= len(windows) {
			break
		}
		roundEndMS := int(windows[roundIndex].EndMS - windows[roundIndex].StartMS)
		emitters := make([]*poisonCloudEmitter, 0)
		activationIndexes := make([]int, 0)
		for i := range utilities[roundIndex] {
			utility := utilities[roundIndex][i]
			if utility.AbilityID != "poison_cloud" {
				continue
			}
			switch utility.Kind {
			case UtilityMobile:
				if len(utility.Samples) == 0 {
					continue
				}
				sample := utility.Samples[len(utility.Samples)-1]
				landingMS := utility.EndTimeMS
				settledMS := sample.TimeMS + poisonCloudSettledMS
				if landingMS > settledMS {
					landingMS = settledMS
				}
				if landingMS >= roundEndMS {
					continue
				}
				emitters = append(emitters, &poisonCloudEmitter{
					flight:       utility,
					landing:      Position{X: sample.X, Y: sample.Y},
					landingMS:    landingMS,
					lastSampleMS: sample.TimeMS,
				})
			case UtilitySmoke:
				activationIndexes = append(activationIndexes, i)
			}
		}

		for _, activationIndex := range activationIndexes {
			activation := utilities[roundIndex][activationIndex]
			bestDistance := math.Inf(1)
			var best *poisonCloudEmitter
			for _, emitter := range emitters {
				if activation.StartTimeMS < emitter.lastSampleMS ||
					(emitter.flight.OwnerPuuid != "" && activation.OwnerPuuid != "" &&
						emitter.flight.OwnerPuuid != activation.OwnerPuuid) {
					continue
				}
				distance := math.Hypot(
					activation.Position.X-emitter.landing.X,
					activation.Position.Y-emitter.landing.Y,
				)
				if distance < bestDistance {
					bestDistance = distance
					best = emitter
				}
			}
			if best != nil && bestDistance <= 500 {
				best.activations = append(best.activations, activation)
			}
		}

		var placed []Utility
		for _, emitter := range emitters {
			sort.SliceStable(emitter.activations, func(i, j int) bool {
				return emitter.activations[i].StartTimeMS < emitter.activations[j].StartTimeMS
			})
			cursor := emitter.landingMS
			ordinal := 0
			appendMarker := func(startMS, endMS int) {
				if startMS < 0 {
					startMS = 0
				}
				if endMS > roundEndMS {
					endMS = roundEndMS
				}
				if startMS >= endMS {
					return
				}
				ordinal++
				placed = append(placed, Utility{
					ID:          fmt.Sprintf("%s-placed-%d", emitter.flight.ID, ordinal),
					Kind:        UtilityMarker,
					AbilityID:   "poison_cloud",
					StartTimeMS: startMS,
					EndTimeMS:   endMS,
					Position:    emitter.landing,
					OwnerPuuid:  emitter.flight.OwnerPuuid,
					IconOnly:    true,
				})
			}
			for _, activation := range emitter.activations {
				if activation.StartTimeMS > cursor {
					appendMarker(cursor, activation.StartTimeMS)
				}
				if activation.EndTimeMS > cursor {
					cursor = activation.EndTimeMS
				}
			}
			appendMarker(cursor, roundEndMS)
		}

		for _, marker := range placed {
			utilities[roundIndex] = append(utilities[roundIndex], marker)
		}
		sort.SliceStable(utilities[roundIndex], func(i, j int) bool {
			if utilities[roundIndex][i].StartTimeMS != utilities[roundIndex][j].StartTimeMS {
				return utilities[roundIndex][i].StartTimeMS < utilities[roundIndex][j].StartTimeMS
			}
			return utilities[roundIndex][i].ID < utilities[roundIndex][j].ID
		})
	}
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

func hasDistinctUtilityMovement(writes []utilityPathWrite) bool {
	if len(writes) < 2 {
		return false
	}
	first := writes[0].Position
	for _, write := range writes[1:] {
		if write.Position != first {
			return true
		}
	}
	return false
}

func approximateCurveballMovement(
	start Position,
	yawDegrees float64,
	side int,
	startMS, endMS uint32,
) []utilityPathWrite {
	if side == 0 || !isFinite64(yawDegrees) || startMS >= endMS {
		return nil
	}
	const (
		sampleCount = 9
		forwardCM   = 400.0
		sideCM      = 250.0
	)
	duration := endMS - startMS
	count := minInt(sampleCount, int(duration))
	if count < 2 {
		return nil
	}

	yaw := yawDegrees * math.Pi / 180
	forwardX, forwardY := math.Cos(yaw), math.Sin(yaw)
	sideX, sideY := -forwardY*float64(side), forwardX*float64(side)
	p0 := start
	p1 := Position{
		X: start.X + forwardX*forwardCM*0.5,
		Y: start.Y + forwardY*forwardCM*0.5,
	}
	p2 := Position{
		X: start.X + forwardX*forwardCM + sideX*sideCM*0.3,
		Y: start.Y + forwardY*forwardCM + sideY*sideCM*0.3,
	}
	p3 := Position{
		X: start.X + forwardX*forwardCM + sideX*sideCM,
		Y: start.Y + forwardY*forwardCM + sideY*sideCM,
	}

	writes := make([]utilityPathWrite, 0, count)
	for i := 0; i < count; i++ {
		t := float64(i) / float64(count-1)
		u := 1 - t
		position := Position{
			X: u*u*u*p0.X + 3*u*u*t*p1.X + 3*u*t*t*p2.X + t*t*t*p3.X,
			Y: u*u*u*p0.Y + 3*u*u*t*p1.Y + 3*u*t*t*p2.Y + t*t*t*p3.Y,
		}
		offset := uint32(uint64(duration-1) * uint64(i) / uint64(count-1))
		writes = append(writes, utilityPathWrite{
			TimeMS:   startMS + offset,
			Position: position,
		})
	}
	return writes
}

func utilityWallEndpoints(writes []utilityPathWrite) (Position, Position, bool) {
	type endpointPair struct {
		start *Position
		end   *Position
	}
	sortUtilityPathWrites(writes)
	pairIndexes := make(map[string]int)
	pairs := make([]endpointPair, 0)
	for i := range writes {
		write := &writes[i]
		var endpoint string
		var rpc string
		switch write.FieldName {
		case "MulticastInitializeWall.WallStartLocation":
			rpc, endpoint = "MulticastInitializeWall", "start"
		case "MulticastInitializeWall.WallEndLocation":
			rpc, endpoint = "MulticastInitializeWall", "end"
		case "MulticastInitializeTrapAnchors.WallStartPoint":
			rpc, endpoint = "MulticastInitializeTrapAnchors", "start"
		case "MulticastInitializeTrapAnchors.WallEndPoint":
			rpc, endpoint = "MulticastInitializeTrapAnchors", "end"
		default:
			continue
		}
		key := fmt.Sprintf("%d:%s", write.TimeMS, rpc)
		pairIndex, found := pairIndexes[key]
		if !found {
			pairIndex = len(pairs)
			pairIndexes[key] = pairIndex
			pairs = append(pairs, endpointPair{})
		}
		position := write.Position
		if endpoint == "start" {
			pairs[pairIndex].start = &position
		} else {
			pairs[pairIndex].end = &position
		}
	}

	for _, pair := range pairs {
		if pair.start == nil || pair.end == nil ||
			(pair.start.X == pair.end.X && pair.start.Y == pair.end.Y) {
			continue
		}
		return *pair.start, *pair.end, true
	}
	return Position{}, Position{}, false
}

func utilityWallSpan(writes []utilityPathWrite) (Position, Position, bool) {
	if len(writes) < 2 {
		return Position{}, Position{}, false
	}
	sortUtilityPathWrites(writes)
	start := writes[0].Position
	end := writes[len(writes)-1].Position
	if !validUtilityPosition(start) || !validUtilityPosition(end) ||
		(start.X == end.X && start.Y == end.Y) {
		return Position{}, Position{}, false
	}
	return start, end, true
}
func wallActivationIntervals(
	openMS, closeMS uint32,
	writes []utilityActivationWrite,
	fuel []utilityFuelWrite,
) []utilityInterval {
	sort.SliceStable(writes, func(i, j int) bool {
		if writes[i].TimeMS != writes[j].TimeMS {
			return writes[i].TimeMS < writes[j].TimeMS
		}
		return writes[i].PacketID < writes[j].PacketID
	})

	intervals := make([]utilityInterval, 0, 2)
	var startMS uint32
	active := false
	for _, write := range writes {
		if write.Active == nil {
			continue
		}
		if *write.Active {
			if !active {
				startMS = write.TimeMS
				active = true
			}
			continue
		}
		if !active {
			continue
		}
		active = false
		if write.TimeMS > startMS {
			intervals = append(intervals, utilityInterval{startMS: startMS, endMS: write.TimeMS})
		}
	}
	if active {
		endMS := closeMS
		if fuelStopMS, ok := wallFuelStopMS(startMS, closeMS, fuel); ok {
			endMS = fuelStopMS
		}
		if endMS > startMS {
			intervals = append(intervals, utilityInterval{startMS: startMS, endMS: endMS})
		}
	}

	filtered := make([]utilityInterval, 0, len(intervals))
	for _, interval := range intervals {
		start := maxUint32(interval.startMS, openMS)
		end := minUint32(interval.endMS, closeMS)
		if start < end {
			filtered = append(filtered, utilityInterval{startMS: start, endMS: end})
		}
	}
	return filtered
}

func wallFuelStopMS(activationMS, closeMS uint32, writes []utilityFuelWrite) (uint32, bool) {
	var drainStart uint32
	draining := false
	for _, write := range writes {
		if write.Draining == nil {
			continue
		}
		if *write.Draining {
			if !draining {
				drainStart = write.TimeMS
				draining = true
			}
			continue
		}
		if !draining {
			continue
		}
		draining = false
		if drainStart < activationMS ||
			drainStart-activationMS > wallArmingMS ||
			write.TimeMS <= drainStart || write.TimeMS > closeMS {
			continue
		}
		return write.TimeMS, true
	}
	return 0, false
}

func wallInactiveSegment(
	life *utilityActorLife,
	roundIndex int,
	startMS, endMS uint32,
) *utilitySegment {
	if startMS >= endMS {
		return nil
	}
	return &utilitySegment{
		life:       life,
		roundIndex: roundIndex,
		startMS:    startMS,
		endMS:      endMS,
		position:   life.position,
		yaw:        life.yaw + life.class.wallYawOffset,
		inactive:   true,
	}
}

func parseUtilityRawVector(raw []byte, bitCount int32) (Position, bool) {
	if bitCount != 192 || len(raw) != 24 {
		return Position{}, false
	}
	x := math.Float64frombits(binary.LittleEndian.Uint64(raw[0:8]))
	y := math.Float64frombits(binary.LittleEndian.Uint64(raw[8:16]))
	z := math.Float64frombits(binary.LittleEndian.Uint64(raw[16:24]))
	position := Position{X: x, Y: y}
	if !isFinite64(z) || math.Abs(z) > 1_000_000 {
		return Position{}, false
	}
	return position, validUtilityPosition(position)
}

func isFinite64(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
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
			current.hasYaw = true
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
	case "controller":
		return "controller"
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

func sortUtilityFuelWrites(writes map[uint32][]utilityFuelWrite) {
	for guid := range writes {
		sort.SliceStable(writes[guid], func(i, j int) bool {
			if writes[guid][i].TimeMS != writes[guid][j].TimeMS {
				return writes[guid][i].TimeMS < writes[guid][j].TimeMS
			}
			return writes[guid][i].PacketID < writes[guid][j].PacketID
		})
	}
}

func sortUtilityDestroyWrites(writes map[uint32][]utilityDestroyWrite) {
	for guid := range writes {
		sort.SliceStable(writes[guid], func(i, j int) bool {
			if writes[guid][i].TimeMS != writes[guid][j].TimeMS {
				return writes[guid][i].TimeMS < writes[guid][j].TimeMS
			}
			return writes[guid][i].PacketID < writes[guid][j].PacketID
		})
	}
}

func sortUtilityActivationWrites(writes map[uint32][]utilityActivationWrite) {
	for guid := range writes {
		sort.SliceStable(writes[guid], func(i, j int) bool {
			if writes[guid][i].TimeMS != writes[guid][j].TimeMS {
				return writes[guid][i].TimeMS < writes[guid][j].TimeMS
			}
			return writes[guid][i].PacketID < writes[guid][j].PacketID
		})
	}
}

func utilityFuelByOwner(
	writes map[uint32][]utilityFuelWrite,
	index *playerIndex,
	puuidBySubject map[string]string,
) map[string][]utilityFuelWrite {
	if index == nil || len(writes) == 0 {
		return nil
	}
	byOwner := make(map[string][]utilityFuelWrite)
	for actor, actorWrites := range writes {
		subject, ok := index.subjectForCharacter(actor)
		if !ok {
			continue
		}
		owner := puuidBySubject[subject]
		if owner == "" {
			continue
		}
		byOwner[owner] = append(byOwner[owner], actorWrites...)
	}
	for owner := range byOwner {
		sort.SliceStable(byOwner[owner], func(i, j int) bool {
			if byOwner[owner][i].TimeMS != byOwner[owner][j].TimeMS {
				return byOwner[owner][i].TimeMS < byOwner[owner][j].TimeMS
			}
			return byOwner[owner][i].PacketID < byOwner[owner][j].PacketID
		})
	}
	return byOwner
}

func poisonCloudActivationEndMS(
	openMS, closeMS uint32,
	destroys []utilityDestroyWrite,
	fuel []utilityFuelWrite,
) (uint32, bool) {
	if endMS, ok := poisonCloudDestroyMS(openMS, closeMS, destroys); ok {
		return endMS, true
	}
	return poisonCloudFuelStopMS(openMS, closeMS, fuel)
}

func poisonCloudDestroyMS(
	openMS, closeMS uint32,
	writes []utilityDestroyWrite,
) (uint32, bool) {
	var earliest uint32
	found := false
	for _, write := range writes {
		if write.TimeMS <= openMS || write.TimeMS > closeMS {
			continue
		}
		if !found || write.TimeMS < earliest {
			earliest = write.TimeMS
			found = true
		}
	}
	return earliest, found
}

func poisonCloudFuelStopMS(
	openMS, closeMS uint32,
	writes []utilityFuelWrite,
) (uint32, bool) {
	draining := false
	sawStart := false
	for _, write := range writes {
		if write.Draining == nil {
			continue
		}
		if write.TimeMS < openMS {
			draining = *write.Draining
			continue
		}
		if write.TimeMS > closeMS {
			break
		}
		next := *write.Draining
		if next && !draining {
			sawStart = true
		}
		if sawStart && draining && !next {
			return write.TimeMS, true
		}
		draining = next
	}
	return 0, false
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

func pairCypherTrapwireEndpoints(
	lives []*utilityActorLife,
	writes map[uint32][]utilityOwnerWrite,
) {
	type ownerSpawn struct {
		timeMS uint32
		owner  uint32
	}
	mainBySpawn := make(map[ownerSpawn][]*utilityActorLife)
	farBySpawn := make(map[ownerSpawn][]*utilityActorLife)
	for _, life := range lives {
		if life.class.ability != "trapwire" {
			continue
		}
		owner, ok := utilityDirectOwnerAt(life.guid, life.openMS, writes)
		if !ok {
			continue
		}
		key := ownerSpawn{timeMS: life.openMS, owner: owner}
		if life.class.trapwireFarEnd {
			farBySpawn[key] = append(farBySpawn[key], life)
		} else {
			mainBySpawn[key] = append(mainBySpawn[key], life)
		}
	}

	for key, mainLives := range mainBySpawn {
		farLives := farBySpawn[key]
		if len(mainLives) != 1 || len(farLives) != 1 {
			continue
		}
		main, far := mainLives[0], farLives[0]
		dx := far.position.X - main.position.X
		dy := far.position.Y - main.position.Y
		lengthM := math.Hypot(dx, dy) / 100
		if lengthM <= 0 || !isFinite64(lengthM) {
			continue
		}
		main.yaw = math.Atan2(dy, dx) * 180 / math.Pi
		main.hasYaw = true
		main.lengthM = lengthM
	}
}

func utilityDirectOwnerAt(
	actor uint32,
	at uint32,
	writes map[uint32][]utilityOwnerWrite,
) (uint32, bool) {
	var owner uint32
	found := false
	for _, write := range writes[actor] {
		if write.TimeMS > at {
			break
		}
		if write.Owner == nil {
			continue
		}
		owner = *write.Owner
		found = owner != 0
	}
	return owner, found
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

func sampleUtilityVision(
	rows []movementRow,
	writes []utilityOwnerWrite,
	startMS, endMS, roundStart uint32,
	initialYaw float64,
	hasInitialYaw bool,
) ([]UtilityVisionSample, bool) {
	if startMS >= endMS {
		return nil, false
	}

	rows = append([]movementRow(nil), rows...)
	sort.SliceStable(rows, func(i, j int) bool { return rows[i].TimeMS < rows[j].TimeMS })

	active, hasController := utilityControllerAt(writes, startMS)
	yaw, hasYaw := initialYaw, hasInitialYaw && isFinite64(initialYaw)
	rowIndex := 0
	for rowIndex < len(rows) && rows[rowIndex].TimeMS <= startMS {
		if isFinite32(rows[rowIndex].Yaw) {
			yaw = float64(rows[rowIndex].Yaw)
			hasYaw = true
		}
		rowIndex++
	}
	if !hasController {
		active = false
	}

	samples := make([]UtilityVisionSample, 0)
	appendSample := func(timeMS uint32, isActive bool) {
		if !hasYaw || !isFinite64(yaw) {
			return
		}
		sample := UtilityVisionSample{
			TimeMS: int(timeMS - roundStart),
			Yaw:    yaw,
			Active: isActive,
		}
		if len(samples) > 0 && samples[len(samples)-1].TimeMS == sample.TimeMS {
			samples[len(samples)-1] = sample
			return
		}
		samples = append(samples, sample)
	}
	if active {
		appendSample(startMS, true)
	}

	writeIndex := sort.Search(len(writes), func(i int) bool {
		return writes[i].TimeMS > startMS
	})
	lastYawSampleMS := startMS
	for rowIndex < len(rows) || writeIndex < len(writes) {
		var nextTime uint32
		switch {
		case rowIndex >= len(rows):
			nextTime = writes[writeIndex].TimeMS
		case writeIndex >= len(writes):
			nextTime = rows[rowIndex].TimeMS
		case writes[writeIndex].TimeMS <= rows[rowIndex].TimeMS:
			nextTime = writes[writeIndex].TimeMS
		default:
			nextTime = rows[rowIndex].TimeMS
		}
		if nextTime >= endMS {
			break
		}

		for writeIndex < len(writes) && writes[writeIndex].TimeMS == nextTime {
			write := writes[writeIndex]
			if write.Controller != nil {
				nextActive := *write.Controller != 0
				if nextActive != active {
					active = nextActive
					appendSample(nextTime, active)
					lastYawSampleMS = nextTime
				}
			}
			writeIndex++
		}
		for rowIndex < len(rows) && rows[rowIndex].TimeMS == nextTime {
			row := rows[rowIndex]
			if isFinite32(row.Yaw) {
				previousYaw := yaw
				yaw = float64(row.Yaw)
				hasYaw = true
				if active && (nextTime-lastYawSampleMS >= 100 ||
					utilityYawDelta(previousYaw, yaw) >= 2) {
					appendSample(nextTime, true)
					lastYawSampleMS = nextTime
				}
			}
			rowIndex++
		}
	}

	truncated := len(samples) > maxUtilitySamples
	if truncated {
		reduced := make([]UtilityVisionSample, maxUtilitySamples)
		for i := range reduced {
			index := i * (len(samples) - 1) / (maxUtilitySamples - 1)
			reduced[i] = samples[index]
		}
		samples = reduced
	}
	return samples, truncated
}

func utilityControllerAt(writes []utilityOwnerWrite, at uint32) (bool, bool) {
	active, found := false, false
	for _, write := range writes {
		if write.TimeMS > at {
			break
		}
		if write.Controller == nil {
			continue
		}
		active = *write.Controller != 0
		found = true
	}
	return active, found
}

func hasActiveUtilityControllerWrite(writes []utilityOwnerWrite) bool {
	for _, write := range writes {
		if write.Controller != nil && *write.Controller != 0 {
			return true
		}
	}
	return false
}

func utilityYawDelta(a, b float64) float64 {
	delta := math.Mod(b-a, 360)
	if delta > 180 {
		delta -= 360
	} else if delta < -180 {
		delta += 360
	}
	return math.Abs(delta)
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
