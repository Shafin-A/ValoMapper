package replay

import "sort"

func buildUtilityLives(
	actors map[uint32]*utilityActor,
	buildNumber int,
	durationMS uint32,
	warnings *UtilityWarnings,
) []*utilityActorLife {
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
	return lives
}

func applyUtilityGroundVolumes(
	lives []*utilityActorLife,
	pitShapes map[uint32]*utilityGroundVolume,
	slowOrbShapes map[uint32]*utilityGroundVolume,
) {
	for _, life := range lives {
		if shape := pitShapes[life.guid]; shape != nil {
			life.groundVolume = shape
		} else if shape := slowOrbShapes[life.guid]; shape != nil {
			life.groundVolume = shape
		}
	}
}

func resolveUtilityOwners(
	lives []*utilityActorLife,
	ownerWrites map[uint32][]utilityOwnerWrite,
	index *playerIndex,
	outer map[uint32]uint32,
	puuidBySubject map[string]string,
	warnings *UtilityWarnings,
) {
	for _, life := range lives {
		if owner, hadLink, resolved := resolveUtilityOwner(
			life.guid, life.openMS, ownerWrites, index, outer, puuidBySubject,
		); resolved {
			life.owner = owner
		} else if hadLink {
			incrementUtilityWarning(&warnings.UnresolvedOwners)
		}
	}
}

func applyUtilityLifecycleRules(
	lives []*utilityActorLife,
	destroyWrites map[uint32][]utilityDestroyWrite,
	ownerWrites map[uint32][]utilityOwnerWrite,
) {
	for _, life := range lives {
		if life.class.trajectoryWarnings {
			if endMS, ok := utilityEventTime(
				destroyWrites[life.guid],
				life.openMS,
				life.closeMS,
				"Multicast Stop Collider",
				"Multicast Stop Collider.Is Pulling",
			); ok {
				life.closeMS = endMS
			}
		}
		if life.class.releaseOnEvent {
			if endMS, ok := utilityEventTime(
				destroyWrites[life.guid],
				life.openMS,
				life.closeMS,
				"Multicast Try Release Cage",
			); ok {
				life.closeMS = endMS
			}
		}
		if life.class.followsParent {
			if parent, ok := utilityAttachParentAt(
				life.guid, life.openMS, ownerWrites,
			); ok {
				life.attachParent = parent
			}
		}
	}
}

func buildUtilityPulseSamples(
	lives []*utilityActorLife,
	pathWrites map[uint32][]utilityPathWrite,
	ownerWrites map[uint32][]utilityOwnerWrite,
) (map[uint32][]Position, map[uint32][]utilityPathWrite) {
	trajectoryByOwner := utilityTrajectoryPoints(pathWrites, ownerWrites)
	const nullcmdPulseWindowMS = 1500
	pulseSamplesByManager := make(map[uint32][]utilityPathWrite)
	for _, manager := range lives {
		if !manager.class.samplesFromPulses {
			continue
		}
		for _, pulse := range lives {
			if !pulse.class.pulseChild ||
				pulse.openMS < manager.openMS ||
				pulse.openMS > manager.closeMS+nullcmdPulseWindowMS {
				continue
			}
			matches := false
			if owner, ok := utilityDirectOwnerAt(
				pulse.guid, pulse.openMS, ownerWrites,
			); ok && owner == manager.guid {
				matches = true
			}
			if !matches && manager.owner != "" && pulse.owner == manager.owner {
				matches = true
			}
			if !matches {
				continue
			}
			pulseSamplesByManager[manager.guid] = append(
				pulseSamplesByManager[manager.guid],
				utilityPathWrite{TimeMS: pulse.openMS, Position: pulse.position},
			)
			if pulse.closeMS > manager.closeMS {
				manager.closeMS = pulse.closeMS
			}
		}
		sortUtilityPathWrites(pulseSamplesByManager[manager.guid])
	}
	return trajectoryByOwner, pulseSamplesByManager
}

func buildUtilitySplineChildren(
	lives []*utilityActorLife,
	ownerWrites map[uint32][]utilityOwnerWrite,
) map[uint32][]uint32 {
	splineChildrenByParent := make(map[uint32][]uint32)
	for _, life := range lives {
		if !life.class.splineChild {
			continue
		}
		if owner, ok := utilityOwnerGUIDAt(life.guid, life.openMS, ownerWrites); ok &&
			owner != 0 {
			splineChildrenByParent[owner] = append(
				splineChildrenByParent[owner], life.guid,
			)
		}
	}
	return splineChildrenByParent
}

func applyUtilityFuelEndTimes(
	lives []*utilityActorLife,
	destroyWrites map[uint32][]utilityDestroyWrite,
	fuelByOwner map[string][]utilityFuelWrite,
) {
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
}

func applyUtilityWallActivation(
	lives []*utilityActorLife,
	activationWrites map[uint32][]utilityActivationWrite,
	fuelByOwner map[string][]utilityFuelWrite,
	pathWrites map[uint32][]utilityPathWrite,
) {
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
}
