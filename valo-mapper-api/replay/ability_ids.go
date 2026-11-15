package replay

import "strings"

// An unrecognised damage source stays empty so the log falls back to the
// killer's agent icon.
const (
	damageTypeWeapon  = "Weapon"
	damageTypeAbility = "Ability"
	damageTypeMelee   = "Melee"
	damageTypeFall    = "Fall"
	damageTypeBomb    = "Bomb"
)

// killstreamSources maps VRF server-class fragments to the Riot asset UUID the
// player renders. Replays carry only the server class, so this is a curated
// best-effort table; the first matching fragment wins, so keep specific ones first.
var killstreamSources = []struct {
	Fragment   string
	DamageType string
	UUID       string
}{
	// Chamber's ability guns report as Weapon kills but must not use the
	// inventory weapon: Headhunter and Tour de Force have their own art.
	{"Giantslayer", damageTypeWeapon, "39099FB5-4293-DEF4-1E09-2E9080CE7456"},
	{"Deadeye_Q_Pistol", damageTypeWeapon, "856D9A7E-4B06-DC37-15DC-9D809C37CB90"},

	// Raze: Boom Bot, Paint Shells and Showstopper. Paint Shells arrives as the
	// cluster grenade equippable and explodes as a secondary projectile.
	{"Boomba", damageTypeAbility, "2E20A5AF-4726-95F6-7D9C-9DB9A18DADA9"},
	{"ClusterGrenade", damageTypeAbility, "6BD46791-4F27-AA65-7D67-3F8D9D8B8B90"},
	{"Clay_4_Projectile_Secondary_Explosion", damageTypeAbility, "6BD46791-4F27-AA65-7D67-3F8D9D8B8B90"},
	{"Clay_X_Rocket", damageTypeAbility, "9438BE81-46B8-D8B0-8A66-F9A0251FB728"},

	// Neon Overdrive and Jett Blade Storm.
	{"Overdrive", damageTypeAbility, "95336AE4-45D4-1032-CFAF-6BAD01910607"},
	{"Wushu_X_Dagger", damageTypeAbility, "129B0CFB-4C77-45E5-BA86-5694B231B242"},

	// Melee kills reuse the knife killstream asset.
	{"Melee", damageTypeMelee, "2F59173C-4BED-B6C3-2191-DEA9B58BE9C7"},
	{"Knife", damageTypeMelee, "2F59173C-4BED-B6C3-2191-DEA9B58BE9C7"},
}

// killSource is a rendering hint: DamageItem is a Riot UUID when known, and for
// ordinary guns the caller fills it from the killer's sampled inventory.
type killSource struct {
	DamageType string
	DamageItem string
}

// resolveKillSource classifies a KillData weapon/damage class pair; fall and
// spike damage are keyed on the damage class, and gun-like classes default to Weapon.
func resolveKillSource(weaponClass, damageClass string) killSource {
	lowerDamage := strings.ToLower(damageClass)
	switch {
	case strings.Contains(lowerDamage, "fall"):
		return killSource{DamageType: damageTypeFall}
	case strings.Contains(lowerDamage, "bomb"), strings.Contains(lowerDamage, "spike"):
		return killSource{DamageType: damageTypeBomb}
	}

	for _, source := range killstreamSources {
		if classContains(weaponClass, source.Fragment) || classContains(damageClass, source.Fragment) {
			return killSource{DamageType: source.DamageType, DamageItem: source.UUID}
		}
	}

	upper := strings.ToUpper(weaponClass)
	if upper == "" || strings.Contains(upper, "ABILITY") || strings.Contains(upper, "MELEE") {
		return killSource{}
	}
	return killSource{DamageType: damageTypeWeapon}
}

func classContains(class, fragment string) bool {
	return strings.Contains(strings.ToLower(class), strings.ToLower(fragment))
}
