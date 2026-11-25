package replay

// Armour classes are stable build paths; points is the class maximum and id is
// the existing UI id.
const (
	heavyArmorClass  = "/Game/Gear/HeavyArmorItem.HeavyArmorItem_C"
	lightArmorClass  = "/Game/Gear/LightArmorItem.LightArmorItem_C"
	plasmaArmorClass = "/Game/Gear/PlasmaArmor/PlasmaArmorItem.PlasmaArmorItem_C"
)

type armourClass struct {
	ID     string
	Points int
}

var armourClasses = map[string]armourClass{
	heavyArmorClass:  {"822BCAB2-40A2-324E-C137-E09195AD7692", 50},
	lightArmorClass:  {"4DEC83D5-4902-9AB3-BED6-A7A390761157", 25},
	plasmaArmorClass: {"B1B9086D-41BD-A516-5D29-E3B34A6F1644", 25},
}

type damageRow struct {
	Key     damageKey
	Element damageElement
}

// resolveArmourOwner prefers the item's Owner write and falls back to walking
// net_guids.outer_net_guid up to the first manifest pawn.
func resolveArmourOwner(item uint32, owners map[uint32]uint32, outer map[uint32]uint32, index *playerIndex) (string, bool) {
	if owner := owners[item]; owner != 0 {
		if subject, ok := index.subjectForPawn(owner); ok {
			return subject, true
		}
	}
	current := item
	for depth := 0; depth < 8; depth++ {
		next, ok := outer[current]
		if !ok || next == 0 || next == current {
			break
		}
		if subject, ok := index.subjectForPawn(next); ok {
			return subject, true
		}
		current = next
	}
	return "", false
}

// armourItemForSection walks a section's outer chain to the item actor that
// owns it. The section GUID is the ChangedComponent value; the element's own
// actor is the pawn, so the chain is the only way to keep damaged armour with
// the item it belongs to.
func armourItemForSection(
	section uint32,
	outer map[uint32]uint32,
	classByActor map[uint32]string,
) (uint32, armourClass, bool) {
	current := section
	for depth := 0; depth < 8; depth++ {
		if spec, ok := armourClasses[classByActor[current]]; ok {
			return current, spec, true
		}
		next, ok := outer[current]
		if !ok || next == 0 || next == current {
			break
		}
		current = next
	}
	return 0, armourClass{}, false
}
