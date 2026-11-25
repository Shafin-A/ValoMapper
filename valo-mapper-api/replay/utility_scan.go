package replay

import (
	"math"
	"sort"
)

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
	if !ok || buildNumber < 1300 || buildNumber > 1309 {
		warnings.UnsupportedBuild = 1
		return result, warnings, nil
	}

	actors, err := readUtilityActors(exportDir)
	if err != nil {
		return nil, warnings, err
	}
	pitShapes, slowOrbShapes := readUtilityShapes(exportDir, build, actors)

	lives := buildUtilityLives(actors, buildNumber, durationMS, &warnings)
	applyUtilityGroundVolumes(lives, pitShapes, slowOrbShapes)
	resolveUtilityOwners(lives, ownerWrites, index, outer, puuidBySubject, &warnings)
	applyUtilityLifecycleRules(lives, destroyWrites, ownerWrites)

	trajectoryByOwner, pulseSamplesByManager := buildUtilityPulseSamples(
		lives, pathWrites, ownerWrites,
	)
	splineChildrenByParent := buildUtilitySplineChildren(lives, ownerWrites)
	fuelByOwner := utilityFuelByOwner(fuelWrites, index, puuidBySubject)
	applyUtilityFuelEndTimes(lives, destroyWrites, fuelByOwner)
	applyUtilityWallActivation(lives, activationWrites, fuelByOwner, pathWrites)

	pairCypherTrapwireEndpoints(lives, ownerWrites)
	wallArmsByOwner := utilityWallArmDestinations(pathWrites, ownerWrites)

	segments := buildUtilitySegments(
		lives,
		windows,
		activationWrites,
		pathWrites,
		trajectoryByOwner,
		pulseSamplesByManager,
		wallArmsByOwner,
	)

	sortUtilitySegments(segments)
	if len(segments) > maxUtilityIntervals {
		incrementUtilityWarning(&warnings.TruncatedUtilities, len(segments)-maxUtilityIntervals)
		segments = segments[:maxUtilityIntervals]
	}

	movementByGUID, replicatedMovementByGUID, splineMovementByGUID, err := readUtilityMovementData(
		exportDir, segments, splineChildrenByParent, ownerWrites,
	)
	if err != nil {
		return nil, warnings, err
	}

	enrichUtilitySegments(
		segments,
		windows,
		pathWrites,
		ownerWrites,
		movementByGUID,
		replicatedMovementByGUID,
		splineMovementByGUID,
		splineChildrenByParent,
		&warnings,
	)

	truncateAstraMarkers(segments)
	segments = filterUtilitySegments(segments)
	segmentsToUtilities(result, segments, windows, &warnings)

	addNanoswarmPlacedMarkers(result, windows)
	addPoisonCloudPlacedMarkers(result, windows)
	return result, warnings, nil
}

// truncateAstraMarkers ends a star marker when an ability consumes that star.
// The marker manager can keep a star actor open longer than the star itself, so
// Gravity Well, Nova Pulse and Nebula/Dissipate start times are authoritative.
func truncateAstraMarkers(segments []utilitySegment) {
	const markerMatchDistance = 100.0 // 1 metre
	for i := range segments {
		marker := &segments[i]
		if marker.life == nil || marker.life.class.ability != "astra_passive" {
			continue
		}
		for j := range segments {
			ability := &segments[j]
			if i == j || ability.life == nil ||
				ability.roundIndex != marker.roundIndex ||
				marker.life.owner == "" ||
				ability.life.owner != marker.life.owner {
				continue
			}
			switch ability.life.class.ability {
			case "gravity_well", "nova_pulse", "nebula__dissipate":
			default:
				continue
			}
			if ability.startMS >= marker.endMS {
				continue
			}
			if math.Hypot(
				ability.position.X-marker.position.X,
				ability.position.Y-marker.position.Y,
			) > markerMatchDistance {
				continue
			}
			if ability.startMS <= marker.startMS {
				marker.endMS = marker.startMS
				break
			}
			marker.endMS = ability.startMS
		}
	}
}

func filterUtilitySegments(segments []utilitySegment) []utilitySegment {
	result := segments[:0]
	for _, segment := range segments {
		if segment.endMS <= segment.startMS {
			continue
		}
		if segment.life.class.splineChild {
			continue
		}
		if (segment.life.class.mobile || segment.life.class.followsParent) &&
			len(segment.samples) == 0 {
			continue
		}
		if segment.life.class.trajectoryWarnings &&
			len(segment.trajectorySamples) == 0 {
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
