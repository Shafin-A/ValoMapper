package replay

import (
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
