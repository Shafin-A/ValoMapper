package replay

import "strings"

// weaponUUIDByFolder maps the VRF class-path folder for a gun to the Riot
// weapon UUID the browser player uses for its killstream image. The folder is
// the wire truth: display names in the game's equippable table have drifted
// between builds (13.06 calls Garland "Bandit"), so never key on them.
//
// Every folder below was observed in real exports and every UUID has a
// valo-mapper/public/weapons/<UUID>_killstream.png asset.
var weaponUUIDByFolder = map[string]string{
	"Guns/Sidearms/BasePistol":       "29A0CFAB-485B-F5D5-779A-B59F85E204A8", // Classic
	"Guns/Rifles/AK":                 "9C82E19D-4575-0200-1A81-3EACF00CF872", // Vandal
	"Guns/Rifles/Carbine":            "EE8E8D15-496B-07AC-E5F6-8FAE5D4C7B1A", // Phantom
	"Guns/SubMachineGuns/MP5":        "462080D1-4035-2937-7C09-27AA2A5C27A7", // Spectre
	"Guns/Sidearms/Revolver":         "E336C6B8-418D-9340-D77F-7A9E4CFE0702", // Sheriff
	"Guns/Sidearms/Slim":             "42DA8CCC-40D5-AFFC-BEEC-15AA47B42EDA", // Shorty
	"Guns/Sidearms/Luger":            "1BAA85B4-4C70-1284-64BB-6481DFC3BB4E", // Ghost
	"Guns/SniperRifles/Boltsniper":   "A03B24D3-4319-996D-0F8C-94BBFBA1DFC7", // Operator
	"Guns/SniperRifles/Doublesniper": "5F0AAF7A-4289-3998-D5FF-EB9A5CF7EF5C", // Outlaw
	"Guns/SubMachineGuns/Vector":     "F7E1B454-4AD4-1063-EC0A-159E56B58941", // Stinger
	"Guns/Sidearms/AutoPistol":       "44D4E95C-4157-0037-81B2-17841BF2E8E3", // Frenzy
	"Guns/Sidearms/Compact":          "410B2E0B-4CEB-1321-1727-20858F7F3477", // Bandit
	"Guns/SniperRifles/DMR":          "4ADE7FAA-4CF1-8376-95EF-39884480959B", // Guardian
	"Guns/SniperRifles/Leversniper":  "C4883E50-4494-202C-3EC3-6B8A9284F00B", // Marshal
	"Guns/Rifles/BattleRifle":        "8DB0A1BF-4A50-832A-4566-FAAAA6D250CA", // Warden
	"Guns/Rifles/Burst":              "AE3DE142-4D85-2547-DD26-4E90BED35CF7", // Bulldog
	"Guns/Shotguns/PumpShotgun":      "910BE174-449B-C412-AB22-D0873436B21B", // Bucky
	"Guns/HvyMachineGuns/HMG":        "63E6C2B6-4A8E-869C-3D4C-E38355226584", // Odin
	"Guns/HvyMachineGuns/LMG":        "55D8A0F4-4274-CA67-FE2C-06AB45EFDF58", // Ares
	"Guns/Shotguns/AutoShotgun":      "EC845BF4-4F79-DDDA-A3DA-0DB3774B2794", // Judge
}

const gunClassPrefix = "/Game/Equippables/Guns/"

// meleeClassPrefix is the folder every melee equippable lives in. Real exports
// only carry Ability_Melee_Base there, which is the knife.
const meleeClassPrefix = "/Game/Equippables/Melee/"

// meleeWeaponID is the knife killstream UUID. The lobby has a matching "knife"
// tool icon, so the replay can attach it exactly like a gun.
const meleeWeaponID = "2F59173C-4BED-B6C3-2191-DEA9B58BE9C7"

// isMeleeEquippable reports whether a class path is the knife. Ability
// equippables, totems, the spike and unarmed look similar on the wire but must
// keep the last gun on screen.
func isMeleeEquippable(classPath string) bool {
	return strings.Contains(classPath, meleeClassPrefix)
}

// weaponFolder returns the "Guns/<category>/<folder>" key for a gun class path.
// The second result is false for anything outside the Guns tree, which this
// parser deliberately ignores (melee, spike, ability equippables and totems).
func weaponFolder(classPath string) (string, bool) {
	index := strings.Index(classPath, gunClassPrefix)
	if index < 0 {
		return "", false
	}
	rest := classPath[index+len("/Game/Equippables/"):]
	parts := strings.SplitN(rest, "/", 4)
	if len(parts) < 4 || parts[0] != "Guns" || parts[1] == "" || parts[2] == "" || parts[3] == "" {
		return "", false
	}
	return strings.Join(parts[:3], "/"), true
}
