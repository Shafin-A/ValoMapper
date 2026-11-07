package replay

import (
	"strconv"
	"strings"
)

type utilityCatalogEntry struct {
	kind                 UtilityKind
	mobile               bool
	replicatedMovement   bool
	wallPoints           bool
	wallActivated        bool
	wallStart            bool
	wallPath             bool
	splineMovement       bool
	splineChild          bool
	splineFromChildren   bool
	splineFullDistance   float64
	trapwireFarEnd       bool
	iconOnly             bool
	placedUntilActivated bool
	visionCone           bool
	wallArms             bool
	followsParent        bool
	releaseOnEvent       bool
	trajectoryWarnings   bool
	forwardMovement      float64
	pulseChild           bool
	samplesFromPulses    bool
	wallYawOffset        float64
	curveballSide        int
	minBuild             int
	maxLifetimeMS        uint32
	ability              string
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
	"GameObject_Breach_X_Shockwave":          {kind: UtilityArea, forwardMovement: 32, minBuild: 1300, maxLifetimeMS: 2004, ability: "rolling_thunder"},
	"Projectile_Breach_4_FusionBlast":        {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "aftershock"},
	"Projectile_Breach_Q_ThroughWalls_Flash": {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "flashpoint"},

	// Brimstone
	"GameObject_Sarge_E_SpeedStim":                {kind: UtilityArea, minBuild: 1300, ability: "stim_beacon"},
	"Patch_Sarge_Q_Molotov_Production":            {kind: UtilityMolly, minBuild: 1300, ability: "incendiary"},
	"GameObject_Sarge_4_Smoke_ProductionNEW":      {kind: UtilitySmoke, minBuild: 1300, ability: "sky_smoke"},
	"GameObject_Sarge_X_OrbitalStrike_Production": {kind: UtilityArea, minBuild: 1300, maxLifetimeMS: 4000, ability: "orbital_strike"},
	"Projectile_Sarge_E_SpeedStim":                {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, iconOnly: true, ability: "stim_beacon"},
	"Projectile_Sarge_Q_Molotov_Production":       {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, iconOnly: true, ability: "incendiary"},

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
	"Actor_FishingHook":                       {kind: UtilityMobile, trajectoryWarnings: true, iconOnly: true, minBuild: 1300, ability: "annihilation"},
	"GameObject_FishingHook_CageSphere":       {kind: UtilityMobile, followsParent: true, releaseOnEvent: true, minBuild: 1300, ability: "annihilation"},
	"Patch_NetToss":                           {kind: UtilityArea, minBuild: 1300, ability: "gravnet"},
	"Patch_Cable_4_NetToss":                   {kind: UtilityArea, minBuild: 1300, ability: "gravnet"},
	"Projectile_NetToss":                      {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "gravnet", iconOnly: true},
	"Projectile_Cable_4_NetToss":              {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "gravnet", iconOnly: true},
	"Projectile_CableJam_InAir":               {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "barrier_mesh", iconOnly: true},
	"GameObject_StealthingTrap_SoundSensor":   {kind: UtilityTrap, minBuild: 1300, ability: "sonic_sensor"},
	"GameObject_SoundSensor_SweetSpotFissure": {kind: UtilityTrap, minBuild: 1300, ability: "sonic_sensor"},
	"GameObject_CableJamRoot":                 {kind: UtilityWall, wallArms: true, minBuild: 1300, ability: "barrier_mesh"},

	// Fade
	"GameObject_BountyHunter_E_LoSReveal_Source_Reactivate":   {kind: UtilityMarker, minBuild: 1300, ability: "haunt"},
	"GameObject_BountyHunter_X_WaveForm":                      {kind: UtilityArea, forwardMovement: 40, minBuild: 1300, maxLifetimeMS: 1000, ability: "nightfall"},
	"Pawn_BountyHunter_4_WolfHound":                           {kind: UtilityMobile, mobile: true, minBuild: 1301, ability: "prowler"},
	"GameObject_Q_BountyHunter_Tether_SphereExpansion":        {kind: UtilityArea, minBuild: 1300, ability: "seize"},
	"Projectile_E_BountyHunter_Divebomb":                      {kind: UtilityMobile, replicatedMovement: true, iconOnly: true, minBuild: 1300, ability: "haunt"},
	"Projectile_Q_BountyHunter_TetherGrenade_SphereExpansion": {kind: UtilityMobile, replicatedMovement: true, iconOnly: true, minBuild: 1300, ability: "seize"},

	// Gekko
	"Patch_Aggrobot_C_ExplodeyPatch":             {kind: UtilityMolly, minBuild: 1300, ability: "mosh_pit"},
	"Projectile_Aggrobot_C_ExplodeyPatch":        {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "mosh_pit", iconOnly: true},
	"Projectile_E_Aggrobot_DiscTurret_PowerWave": {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "dizzy"},
	"Pawn_Aggrobot_SeekerNade":                   {kind: UtilityMobile, mobile: true, minBuild: 1300, ability: "wingman"},
	"Pawn_Aggrobot_RollyPolly":                   {kind: UtilityMobile, mobile: true, minBuild: 1300, ability: "thrash"},

	// Harbor
	"GameObject_Mage_4_SplashGrenade":   {kind: UtilityArea, minBuild: 1300, ability: "storm_surge"},
	"Projectile_Mage_4_SplashGrenade":   {kind: UtilityMobile, replicatedMovement: true, iconOnly: true, minBuild: 1300, ability: "storm_surge"},
	"Projectile_Mage_Q_Wall":            {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "high_tide"},
	"GameObject_Mage_Q_WallManager":     {kind: UtilityWall, wallPath: true, minBuild: 1300, ability: "high_tide"},
	"GameObject_Mage_E_WorldSmoke":      {kind: UtilitySmoke, minBuild: 1300, ability: "cove"},
	"GameObject_Mage_X_TidalWave":       {kind: UtilityArea, splineMovement: true, splineFromChildren: true, splineFullDistance: 21, minBuild: 1300, ability: "reckoning"},
	"GameObject_Mage_X_TidalWave_Chunk": {kind: UtilityArea, splineMovement: true, splineChild: true, minBuild: 1300, ability: "reckoning"},

	// Hush
	"GameObject_Paprika_4_PullBlast":               {kind: UtilityMarker, minBuild: 1300, ability: "flow"},
	"Projectile_Paprika_Q_RedirectFlash":           {kind: UtilityMobile, replicatedMovement: true, iconOnly: true, minBuild: 1300, ability: "flashbulb"},
	"Projectile_Paprika_Q_RedirectFlash_Underhand": {kind: UtilityMobile, replicatedMovement: true, iconOnly: true, minBuild: 1300, ability: "flashbulb"},
	"Projectile_Paprika_E_RedirectPull":            {kind: UtilityMobile, replicatedMovement: true, iconOnly: true, minBuild: 1300, ability: "displacement"},
	"GameObject_Paprika_E_RedirectPullArea":        {kind: UtilityArea, minBuild: 1300, ability: "displacement"},
	"Projectile_Paprika_X_FullBendPop":             {kind: UtilityMobile, replicatedMovement: true, iconOnly: true, minBuild: 1300, ability: "suspension"},
	"GameObject_Paprika_X_LevitateZone":            {kind: UtilityArea, minBuild: 1300, ability: "suspension"},

	// Iso
	"GameObject_Sequoia_4_MovingCover":    {kind: UtilityWall, splineMovement: true, minBuild: 1300, ability: "contingency"},
	"GameObject_Sequoia_E_Orb":            {kind: UtilityMarker, minBuild: 1300, ability: "double_tap"},
	"GameObject_Sequoia_X_LineCapture":    {kind: UtilityArea, minBuild: 1300, maxLifetimeMS: 1000, ability: "kill_contract"},
	"Projectile_Sequoia_Q_FragileMissile": {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "undercut"},

	// Jett
	"GameObject_Wushu_4_SmokeZone": {kind: UtilitySmoke, minBuild: 1302, ability: "cloudburst"},
	"Projectile_Wushu_4_Smoke":     {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "cloudburst"},

	// KAY/O
	"Gameobject_Grenadier_E_SuppressionPulse": {kind: UtilityArea, maxLifetimeMS: 1000, minBuild: 1300, ability: "zeropoint"},
	"Gameobject_Grenadier_X_UltPulseManager":  {kind: UtilityArea, samplesFromPulses: true, minBuild: 1300, ability: "nullcmd"},
	"Gameobject_Grenadier_X_UltPulse":         {kind: UtilityArea, pulseChild: true, minBuild: 1300, ability: "nullcmd"},
	"Projectile_C_Grenadier_Flash":            {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "flashdrive"},
	"Projectile_C_Grenadier_Flash_Underhand":  {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "flashdrive"},
	"Projectile_Grenadier_E_SuppressionBlade": {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "zeropoint", iconOnly: true},

	// Killjoy
	"GameObject_Killjoy_4_BeeSwarm_Damage":          {kind: UtilityMolly, maxLifetimeMS: 4000, minBuild: 1300, ability: "nanoswarm"},
	"Projectile_Killjoy_4_RemoteBees_MultiDetonate": {kind: UtilityMobile, replicatedMovement: true, iconOnly: true, minBuild: 1300, ability: "nanoswarm"},
	"Pawn_Killjoy_Q_StealthAlarmbot":                {kind: UtilityTrap, minBuild: 1300, ability: "alarmbot"},
	"Pawn_Killjoy_E_Turret":                         {kind: UtilityTrap, minBuild: 1300, ability: "turret"},
	"GameObject_Killjoy_X_Bomb":                     {kind: UtilityArea, minBuild: 1300, ability: "lockdown"},

	// Miks
	"GameObject_Thumper_Concuss":  {kind: UtilityArea, minBuild: 1300, ability: "mpulse"},
	"GameObject_Thumper_Heal":     {kind: UtilityArea, minBuild: 1300, ability: "mpulse_concuss"},
	"Projectile_Thumper_Concuss":  {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "mpulse", iconOnly: true},
	"Projectile_Thumper_Heal":     {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "mpulse_concuss", iconOnly: true},
	"GameObject_Iris_E_Smoke":     {kind: UtilitySmoke, minBuild: 1300, ability: "waveform"},
	"GameObject_Iris_X_SonicWave": {kind: UtilityArea, minBuild: 1300, maxLifetimeMS: 1600, ability: "bassquake"},

	// Neon
	"GameObject_Sprinter_4_Tunnel":         {kind: UtilityWall, wallPoints: true, wallStart: true, minBuild: 1300, ability: "fast_lane"},
	"GameObject_Sprinter_Q_ElectricSphere": {kind: UtilityArea, minBuild: 1300, ability: "relay_bolt"},
	"Projectile_Sprinter_4_GroundStrike":   {kind: UtilityMobile, replicatedMovement: true, iconOnly: true, minBuild: 1300, ability: "relay_bolt"},

	// Omen
	"Zone_Wraith_4_Smoke":                  {kind: UtilitySmoke, minBuild: 1300, ability: "dark_cover"},
	"Projectile_Wraith_Q_NearsightMissile": {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "paranoia"},
	"Projectile_Wraith_4_Smoke":            {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "dark_cover", iconOnly: true},

	// Phoenix
	"Patch_Phoenix_MolotovFire":                        {kind: UtilityMolly, minBuild: 1300, ability: "hot_hands"},
	"GameObject_Phoenix_Q_FlameWallManager_Production": {kind: UtilityWall, wallPath: true, minBuild: 1300, ability: "blaze"},
	"GameObject_Phoenix_X_ResTarget_Production":        {kind: UtilityMarker, minBuild: 1300, ability: "run_it_back"},
	"Projectile_Phoenix_4_Molotov_Production":          {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "hot_hands"},
	"Projectile_Phoenix_E_FlareCurve_Synced":           {kind: UtilityMobile, replicatedMovement: true, curveballSide: -1, maxLifetimeMS: curveballFlightMS, minBuild: 1300, ability: "curveball"},
	"Projectile_Phoenix_E_FlareCurve_Synced_Right":     {kind: UtilityMobile, replicatedMovement: true, curveballSide: 1, maxLifetimeMS: curveballFlightMS, minBuild: 1300, ability: "curveball"},
	"Projectile_Phoenix_Q_FlameWall_ThroughWall":       {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "blaze"},

	// Raze
	"Pawn_Clay_E_Boomba":                   {kind: UtilityMobile, mobile: true, minBuild: 1301, ability: "boom_bot"},
	"Projectile_Clay_4_Projectile_Primary": {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "paint_shells"},
	"Projectile_Clay_Q_Satchel_Arming":     {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "blast_pack"},
	"GameObject_Clay_Q_Explosion":          {kind: UtilityArea, minBuild: 1300, maxLifetimeMS: 500, ability: "blast_pack"},
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
	"Projectile_Hunter_4_ExplosiveBolt":           {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "shock_bolt", iconOnly: true},
	"Pawn_Hunter_E_Drone":                         {kind: UtilityMobile, mobile: true, minBuild: 1300, ability: "owl_drone"},
	"GameObject_Hunter_E_Drone_RevealDart":        {kind: UtilityMarker, minBuild: 1300, ability: "owl_drone"},
	"GameObject_Hunter_Q_SonarBolt":               {kind: UtilityArea, minBuild: 1300, ability: "recon_bolt"},
	"Projectile_Hunter_Q_RevealBolt":              {kind: UtilityMobile, replicatedMovement: true, iconOnly: true, minBuild: 1300, ability: "recon_bolt"},

	// Tejo
	"Projectile_Cashew_Q_ShellShockGrenade":             {kind: UtilityMobile, replicatedMovement: true, iconOnly: true, minBuild: 1300, ability: "special_delivery"},
	"Projectile_Cashew_Q_ShellShockGrenade_Bounce":      {kind: UtilityMobile, replicatedMovement: true, iconOnly: true, minBuild: 1300, ability: "special_delivery"},
	"GameObject_Cashew_Q_ShellShockGrenade":             {kind: UtilityArea, minBuild: 1300, ability: "special_delivery"},
	"Pawn_Cashew_4_Spider_LockOn":                       {kind: UtilityMobile, mobile: true, minBuild: 1300, ability: "stealth_drone", iconOnly: true},
	"GameObject_Cashew_4_SonarPing":                     {kind: UtilityArea, minBuild: 1300, ability: "stealth_drone", maxLifetimeMS: 700},
	"GameObject_Cashew_E_MapMissileMarker":              {kind: UtilityArea, minBuild: 1300, ability: "guided_salvo"},
	"GameObject_Cashew_E_MapMissileMarker_SecondRocket": {kind: UtilityArea, minBuild: 1300, ability: "guided_salvo"},
	"AIPawn_Cashew_E_SeekingTargetMissile":              {kind: UtilityMobile, mobile: true, iconOnly: true, minBuild: 1300, ability: "guided_salvo"},
	"GameObject_Cashew_E_AirStrikeMortar":               {kind: UtilityArea, minBuild: 1300, ability: "guided_salvo"},
	"GameObject_Cashew_X_SegmentManager":                {kind: UtilityArea, forwardMovement: 32, maxLifetimeMS: 5000, minBuild: 1300, ability: "armageddon"},

	// Veto
	"GameObject_Pine_4_UsableTeleport":         {kind: UtilityMarker, minBuild: 1300, ability: "crosscut"},
	"Projectile_Pine_Q_TrapGrenade":            {kind: UtilityMobile, replicatedMovement: true, iconOnly: true, minBuild: 1300, ability: "chokehold"},
	"GameObject_Pine_Q_SeizeTrap":              {kind: UtilityTrap, iconOnly: true, minBuild: 1300, ability: "chokehold"},
	"GameObject_Pine_Q_Tether_SphereExpansion": {kind: UtilityArea, minBuild: 1300, ability: "chokehold"},
	"Projectile_Pine_E_RadEaterSpawner":        {kind: UtilityMobile, replicatedMovement: true, iconOnly: true, minBuild: 1300, ability: "interceptor"},
	"Pawn_Pine_E_RadEater":                     {kind: UtilityTrap, iconOnly: true, placedUntilActivated: true, minBuild: 1300, ability: "interceptor"},

	// Viper
	"Patch_Pandemic_AcidMolotov_NewMolotov":    {kind: UtilityMolly, minBuild: 1300, maxLifetimeMS: 6500, ability: "snake_bite"},
	"Projectile_Pandemic_Q_AcidGrenade":        {kind: UtilityMobile, replicatedMovement: true, iconOnly: true, minBuild: 1300, ability: "snake_bite"},
	"GameObject_Pandemic_4_SmokeZone":          {kind: UtilitySmoke, minBuild: 1300, ability: "poison_cloud"},
	"Projectile_Pandemic_4_SmokeGrenade":       {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "poison_cloud", iconOnly: true},
	"GameObject_Pandemic_E_SmokeScreenManager": {kind: UtilityWall, wallPoints: true, wallActivated: true, wallStart: true, minBuild: 1300, ability: "toxic_screen"},
	"Patch_Pandemic_X_Circular":                {kind: UtilityArea, minBuild: 1300, ability: "vipers_pit"},

	// Vyse
	"GameObject_Nox_Wall":                   {kind: UtilityWall, wallPoints: true, minBuild: 1300, ability: "shear"},
	"GameObject_Nox_WallTrap":               {kind: UtilityWall, wallPoints: true, wallYawOffset: -90, minBuild: 1300, ability: "shear"},
	"GameObject_Nox_BarbedWire":             {kind: UtilityMarker, iconOnly: true, minBuild: 1300, ability: "razorvine"},
	"Patch_Nox_BarbedWire":                  {kind: UtilityMolly, maxLifetimeMS: 6000, minBuild: 1300, ability: "razorvine"},
	"Projectile_Nox_BarbedWire":             {kind: UtilityMobile, replicatedMovement: true, iconOnly: true, minBuild: 1300, ability: "razorvine"},
	"GameObject_Nox_StealthingTrap_Flash_2": {kind: UtilityTrap, minBuild: 1300, ability: "arc_rose"},
	"Gameobject_Nox_DisarmPulse":            {kind: UtilityArea, minBuild: 1300, ability: "steel_garden"},

	// Waylay
	"GameObject_Terra_C_TimeSlowGrenade_Explosion": {kind: UtilityArea, minBuild: 1300, maxLifetimeMS: 600, ability: "saturate"},
	"Projectile_Terra_C_TimeSlowGrenade":           {kind: UtilityMobile, replicatedMovement: true, iconOnly: true, minBuild: 1300, ability: "saturate"},
	"GameObject_Terra_E_RewindTime_RewindTarget":   {kind: UtilityMarker, minBuild: 1300, ability: "refract"},
	"GameObject_Terra_X_DelayedBeam_Beam":          {kind: UtilityArea, minBuild: 1300, ability: "convergent_paths"},

	// Yoru
	"Projectile_Stealth_Q_BounceFlash":           {kind: UtilityMobile, replicatedMovement: true, minBuild: 1300, ability: "blindside"},
	"Pawn_Stealth_4_Decoy_V2":                    {kind: UtilityMobile, mobile: true, minBuild: 1300, ability: "fakeout"},
	"Pawn_Stealth_E_TeleporterMoving_FakeTP":     {kind: UtilityMobile, mobile: true, minBuild: 1300, ability: "gatecrash"},
	"Pawn_Stealth_E_TeleporterStationary_FakeTP": {kind: UtilityMarker, minBuild: 1300, ability: "gatecrash"},
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
