package replay

import (
	"math"
	"sort"
)

// resolveDamageHits keeps only gun damage with both players resolved. Ability,
// melee, fall and bomb damage never draw a tracer, and a self-hit is skipped.
func resolveDamageHits(
	writes map[damageHitKey]*damageHitWrite,
	paths map[uint32]string,
	classByActor map[uint32]string,
	index *playerIndex,
	outer map[uint32]uint32,
) []hitSample {
	keys := make([]damageHitKey, 0, len(writes))
	for key := range writes {
		keys = append(keys, key)
	}
	sort.Slice(keys, func(i, j int) bool {
		if keys[i].TimeMS != keys[j].TimeMS {
			return keys[i].TimeMS < keys[j].TimeMS
		}
		if keys[i].PacketID != keys[j].PacketID {
			return keys[i].PacketID < keys[j].PacketID
		}
		if keys[i].Actor != keys[j].Actor {
			return keys[i].Actor < keys[j].Actor
		}
		return keys[i].Function < keys[j].Function
	})

	type signature struct {
		TimeMS     uint32
		Shooter    uint32
		Victim     uint32
		DamageType uint32
	}
	seen := make(map[signature]struct{}, len(keys))
	hits := make([]hitSample, 0, len(keys))

	for _, key := range keys {
		write := writes[key]
		if write == nil || !write.HasDamage || write.Damage <= 0 {
			continue
		}

		damageClass := damageClassPath(write.DamageType, paths, classByActor)
		equippableClass := damageClassPath(write.Equippable, paths, classByActor)
		if !isGunHit(equippableClass, damageClass) {
			continue
		}

		shooter, ok := damageSubject(index, outer, write.Shooter, write.PlayerState, 0)
		if !ok {
			continue
		}
		victim, ok := damageSubject(index, outer, write.Victim, 0, key.Actor)
		if !ok || shooter == victim {
			continue
		}

		sig := signature{
			TimeMS:     key.TimeMS,
			Shooter:    write.Shooter,
			Victim:     write.Victim,
			DamageType: write.DamageType,
		}
		if _, duplicate := seen[sig]; duplicate {
			continue
		}
		seen[sig] = struct{}{}

		hits = append(hits, hitSample{
			TimeMS:         key.TimeMS,
			ShooterSubject: shooter,
			VictimSubject:  victim,
		})
	}

	return hits
}

func damageClassPath(
	guid uint32,
	paths map[uint32]string,
	classByActor map[uint32]string,
) string {
	if guid == 0 {
		return ""
	}
	if path := paths[guid]; path != "" {
		return path
	}
	return classByActor[guid]
}

// isGunHit keeps tracers to bullets. Ability and melee equippables look like
// normal objects on the wire, so only the gun tree, Chamber's ability guns and
// an unresolved-equippable fallback may produce a hit.
func isGunHit(equippableClass, damageClass string) bool {
	if _, isGun := weaponFolder(equippableClass); isGun {
		return !isAbilityDamageClass(damageClass) &&
			resolveKillSource(equippableClass, damageClass).DamageType == damageTypeWeapon
	}
	if classContains(equippableClass, "Deadeye_Q_Pistol") ||
		classContains(equippableClass, "Giantslayer") {
		return true
	}
	if equippableClass == "" {
		// EquippableUsed did not resolve. The damage class still names the gun
		// in older exports, but ability damage also arrives this way, so trust
		// only bullet classes.
		return isGunDamageClass(damageClass)
	}
	return false
}

// damageSubject resolves a damage RPC subject. The victim usually arrives in
// Character, but older builds leave it zero and only name the damaged actor, so
// the fallback GUID is tried after the primary one.
func damageSubject(
	index *playerIndex,
	outer map[uint32]uint32,
	pawn uint32,
	playerState uint32,
	fallback uint32,
) (string, bool) {
	for _, guid := range []uint32{pawn, fallback} {
		if guid == 0 {
			continue
		}
		if subject, ok := index.subjectForCharacter(guid); ok {
			return subject, true
		}
		if subject, ok := killDataSubject(index, outer, guid); ok {
			return subject, true
		}
	}
	if playerState != 0 {
		if subject, ok := index.subjectForActor(playerState); ok {
			return subject, true
		}
	}
	return "", false
}

func buildHealthTimelineEvents(
	scan *stateScan,
	raw *fieldStateRows,
	paths map[uint32]string,
	outer map[uint32]uint32,
	actors *stateActorView,
	index *playerIndex,
	builders map[string]*timelineBuilder,
	itemSubjects map[uint32]string,
) {
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
}
