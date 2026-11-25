package replay

import (
	"math"
	"sort"
)

// scanState builds the state timelines. The 1.9 M-row fields file is not read
// here: its rows were already collected by scanFields. Only the small net_guids
// and actors tables are read.
func scanState(exportDir string, index *playerIndex, raw *fieldStateRows) (*stateScan, error) {
	scan := &stateScan{Timelines: make(map[string][]stateSample)}
	if raw == nil {
		rows := newFieldStateRows()
		raw = &rows
	}

	paths, outer, err := readNetGuids(exportDir)
	if err != nil {
		return nil, err
	}
	actors, err := readStateActors(exportDir, index)
	if err != nil {
		return nil, err
	}
	scan.Actors = actors
	scan.Outer = outer
	scan.Paths = paths

	scan.AbilityCharges, scan.AbilityChargeWrites,
		scan.AbilityChargeUnresolved, scan.AbilityChargeUnknownSlot =
		buildAbilityChargeSamples(raw, index, actors)

	scan.UltimateSamples, scan.UltimateUnresolved = buildUltimateSamples(
		raw.UltimatePoints, raw.UltimateActive, index,
	)
	scan.UltimatePointWrites = len(raw.UltimatePoints)
	scan.UltimateActiveWrites = len(raw.UltimateActive)

	ownersByActor := make(map[uint32][]stateWrite)
	for _, write := range raw.OwnerWrites {
		ownersByActor[write.Actor] = append(ownersByActor[write.Actor], write)
	}
	instigatorsByActor := make(map[uint32][]stateWrite)
	for _, write := range raw.InstigatorWrites {
		instigatorsByActor[write.Actor] = append(instigatorsByActor[write.Actor], write)
	}
	sortStateWrites(ownersByActor)
	sortStateWrites(instigatorsByActor)
	scan.ChargeFolders = collectChargeFolders(
		raw.ChargeActors, actors, index, ownersByActor, instigatorsByActor,
	)
	scan.Cooldowns, scan.CooldownUnresolved, scan.CooldownUnknownSlot =
		buildCooldownWindows(
			raw.Cooldowns, index, actors, ownersByActor, instigatorsByActor,
		)
	scan.CooldownWrites = len(raw.Cooldowns)
	scan.CooldownWindows = len(scan.Cooldowns)

	builders := make(map[string]*timelineBuilder, len(index.bySubject))
	for subject := range index.bySubject {
		builders[subject] = &timelineBuilder{}
	}

	// Item actor -> subject. The item stays registered even when it never
	// becomes visible, so a damage write for its section is attributed rather
	// than counted as a gap.
	itemSubjects := make(map[uint32]string)
	for actor, class := range actors.ClassByActor {
		spec, ok := armourClasses[class]
		if !ok {
			continue
		}
		scan.ArmorItems++

		open, hasOpen := actors.OpenByActor[actor]
		if !hasOpen {
			// Without an open row there is no time to place the item at.
			scan.ArmorUnplaced++
			continue
		}
		subject, ok := resolveArmourOwner(actor, raw.Owners, outer, index)
		if !ok {
			scan.ArmorUnowned++
			continue
		}
		builder := builders[subject]
		if builder == nil {
			scan.ArmorUnowned++
			continue
		}

		itemSubjects[actor] = subject

		close, hasClose := actors.CloseByActor[actor]
		if hasClose && close.TimeMS == open.TimeMS {
			// An item that opens and closes in the same millisecond was never
			// equipped. Emitting both would leave it stuck on screen, because
			// the close is ordered before the open.
			continue
		}

		builder.add(stateEvent{
			TimeMS:      open.TimeMS,
			PacketID:    open.PacketID,
			Kind:        eventArmourOpen,
			ArmorItem:   actor,
			ArmorID:     spec.ID,
			ArmorPoints: spec.Points,
		})

		if hasClose && close.TimeMS > open.TimeMS {
			builder.add(stateEvent{
				TimeMS:    close.TimeMS,
				PacketID:  close.PacketID,
				Kind:      eventArmourClose,
				ArmorItem: actor,
			})
		}
	}

	// Damage/heal elements are applied in (time, packet, index) order.
	elements := make([]damageRow, 0, len(raw.Damage))
	for key, element := range raw.Damage {
		if !element.complete() {
			scan.DamageIncomplete++
			continue
		}
		elements = append(elements, damageRow{Key: key, Element: *element})
	}
	sort.Slice(elements, func(i, j int) bool {
		a, b := &elements[i].Key, &elements[j].Key
		if a.TimeMS != b.TimeMS {
			return a.TimeMS < b.TimeMS
		}
		if a.PacketID != b.PacketID {
			return a.PacketID < b.PacketID
		}
		return a.Index < b.Index
	})

	for i := range elements {
		row := &elements[i]
		kind := resolveSectionKind(paths[uint32(row.Element.Changed)])
		switch kind {
		case sectionUnknown:
			scan.HPUnresolvedSection++
			continue
		case sectionIgnored:
			continue
		case sectionHealth:
			subject, ok := index.subjectForPawn(row.Key.Actor)
			if !ok {
				scan.HPNonPlayer++
				continue
			}
			builder := builders[subject]
			if builder == nil {
				scan.HPNonPlayer++
				continue
			}
			scan.HPWrites++
			if row.Element.Delta < 0 {
				scan.Incoming = append(scan.Incoming, incomingWrite{
					Subject: subject,
					TimeMS:  row.Key.TimeMS,
					Damage:  -row.Element.Delta,
				})
			}
			hp := int(math.Round(row.Element.Result))
			if hp < 0 {
				hp = 0
			}
			if !row.Element.Alive {
				scan.Deaths++
			}
			builder.add(stateEvent{
				TimeMS:   row.Key.TimeMS,
				PacketID: row.Key.PacketID,
				Index:    row.Key.Index,
				Kind:     eventHealth,
				HP:       hp,
				Alive:    row.Element.Alive,
			})
		case sectionArmour:
			item, spec, ok := armourItemForSection(uint32(row.Element.Changed), outer, actors.ClassByActor)
			if !ok {
				scan.ArmorUnattributed++
				continue
			}
			subject, owned := itemSubjects[item]
			builder := builders[subject]
			if !owned || builder == nil {
				scan.ArmorUnattributed++
				continue
			}
			points := int(math.Round(row.Element.Result))
			if points < 0 {
				points = 0
			}
			if points > spec.Points {
				points = spec.Points
			}
			builder.add(stateEvent{
				TimeMS:      row.Key.TimeMS,
				PacketID:    row.Key.PacketID,
				Index:       row.Key.Index,
				Kind:        eventArmourDamage,
				ArmorItem:   item,
				ArmorPoints: points,
			})
		}
	}

	// Credits: PlayerState Money is one continuous timeline and is never reset
	// at a round boundary.
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

	for subject, builder := range builders {
		scan.Timelines[subject] = builder.build()
	}

	scan.Kills = resolveKillData(raw.KillData, paths, index, outer)
	scan.Hits = resolveDamageHits(raw.Hits, paths, actors.ClassByActor, index, outer)

	scan.Warnings = append(scan.Warnings,
		coverageWarning(scan.HPUnresolvedSection,
			scan.HPWrites+scan.HPNonPlayer+scan.HPUnresolvedSection,
			"Some player health changes could not be attributed and were skipped."))
	scan.Warnings = append(scan.Warnings,
		coverageWarning(scan.WeaponUnresolved,
			scan.WeaponWrites+scan.WeaponUnresolved,
			"Some equipped weapons could not be identified and were omitted."))
	scan.Warnings = append(scan.Warnings,
		coverageWarning(scan.ArmorUnowned, scan.ArmorItems,
			"Some armour items could not be attributed to a player and were skipped."))

	return scan, nil
}
