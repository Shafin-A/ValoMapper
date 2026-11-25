package replay

func buildCreditTimelineEvents(
	scan *stateScan,
	raw *fieldStateRows,
	index *playerIndex,
	builders map[string]*timelineBuilder,
) {
	// PlayerState Money is one continuous timeline and is never reset at a
	// round boundary.
	for _, write := range raw.Money {
		scan.MoneyWrites++
		subject, ok := index.subjectForActor(write.Actor)
		if !ok {
			continue
		}
		if builder := builders[subject]; builder != nil {
			builder.add(stateEvent{
				TimeMS:   write.TimeMS,
				PacketID: write.PacketID,
				Kind:     eventCredits,
				Credits:  int(write.Value),
			})
		}
	}
}

func buildWeaponTimelineEvents(
	scan *stateScan,
	raw *fieldStateRows,
	paths map[uint32]string,
	actors *stateActorView,
	index *playerIndex,
	builders map[string]*timelineBuilder,
) {
	// Inventory is on the pawn. Zero GUIDs are clears: ignore them so the last
	// equipped item stays on screen. Guns and the knife are shown; every other
	// equippable (abilities, totems, the spike, unarmed) keeps the last gun.
	for _, write := range raw.Inventory {
		if write.Value == 0 {
			scan.WeaponZero++
			continue
		}
		guid := uint32(write.Value)
		path := actors.ClassByActor[guid]
		if path == "" {
			path = paths[guid]
		}
		if path == "" {
			scan.WeaponUnresolved++
			continue
		}
		folder, isGun := weaponFolder(path)
		var weaponID string
		switch {
		case isGun:
			id, ok := weaponUUIDByFolder[folder]
			if !ok {
				scan.WeaponUnresolved++
				continue
			}
			weaponID = id
		case isMeleeEquippable(path):
			weaponID = meleeWeaponID
		default:
			scan.WeaponWrites++
			continue
		}
		scan.WeaponWrites++
		scan.WeaponChanges++

		subject, ok := index.subjectForPawn(write.Actor)
		if !ok {
			continue
		}
		if builder := builders[subject]; builder != nil {
			builder.add(stateEvent{
				TimeMS:   write.TimeMS,
				PacketID: write.PacketID,
				Kind:     eventWeapon,
				WeaponID: weaponID,
			})
		}
	}
}
