package replay

import (
	"fmt"
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

	for _, life := range lives {
		if shape := pitShapes[life.guid]; shape != nil {
			life.groundVolume = shape
		} else if shape := slowOrbShapes[life.guid]; shape != nil {
			life.groundVolume = shape
		}
	}

	for _, life := range lives {
		if owner, hadLink, resolved := resolveUtilityOwner(
			life.guid, life.openMS, ownerWrites, index, outer, puuidBySubject,
		); resolved {
			life.owner = owner
		} else if hadLink {
			incrementUtilityWarning(&warnings.UnresolvedOwners)
		}
	}

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

	fuelByOwner := utilityFuelByOwner(fuelWrites, index, puuidBySubject)
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

	pairCypherTrapwireEndpoints(lives, ownerWrites)
	wallArmsByOwner := utilityWallArmDestinations(pathWrites, ownerWrites)

	segments := make([]utilitySegment, 0)
	for _, life := range lives {
		if life.class.trapwireFarEnd || life.class.pulseChild {
			continue
		}
		intervals := life.activeIntervals
		if life.class.placedUntilActivated {
			intervals = placedActivatedIntervals(
				life.openMS,
				life.closeMS,
				activationWrites[life.guid],
			)
		} else if intervals == nil {
			intervals = []utilityInterval{{startMS: life.openMS, endMS: life.closeMS}}
		}
		for roundIndex, window := range windows {
			if life.openMS >= window.EndMS || life.closeMS <= window.StartMS {
				continue
			}
			for _, interval := range intervals {
				start := maxUint32(interval.startMS, window.StartMS)
				end := minUint32(interval.endMS, window.EndMS)
				if start >= end {
					continue
				}
				segment := utilitySegment{
					life:       life,
					roundIndex: roundIndex,
					startMS:    start,
					endMS:      end,
					position:   life.position,
					yaw:        life.yaw + life.class.wallYawOffset,
				}
				if life.class.placedUntilActivated {
					iconOnly := !interval.activated
					segment.iconOnly = &iconOnly
					if interval.activated {
						kind := UtilityArea
						segment.kind = &kind
					}
				}
				if life.class.wallArms {
					for _, write := range wallArmsByOwner[life.guid] {
						if write.TimeMS < life.openMS || write.TimeMS >= life.closeMS {
							continue
						}
						segment.path = append(segment.path, write)
					}
				}
				if life.class.trajectoryWarnings {
					points := append([]Position(nil), trajectoryByOwner[life.guid]...)
					if len(points) > 0 && points[0] != life.position {
						points = append([]Position{life.position}, points...)
					}
					segment.trajectorySamples = utilityTrajectorySamples(
						points, segment.startMS, segment.endMS, window.StartMS,
					)
				}
				if life.class.forwardMovement > 0 && life.hasYaw {
					yaw := life.yaw * math.Pi / 180
					end := Position{
						X: life.position.X + math.Cos(yaw)*life.class.forwardMovement*100,
						Y: life.position.Y + math.Sin(yaw)*life.class.forwardMovement*100,
					}
					segment.trajectorySamples = utilityTrajectorySamples(
						[]Position{life.position, end},
						segment.startMS,
						segment.endMS,
						window.StartMS,
					)
				}
				if life.class.samplesFromPulses {
					if life.openMS >= start && life.openMS < end {
						segment.path = append(segment.path, utilityPathWrite{
							TimeMS:   life.openMS,
							Position: life.position,
						})
					}
					for _, write := range pulseSamplesByManager[life.guid] {
						if write.TimeMS < start {
							continue
						}
						if write.TimeMS >= end {
							if write.TimeMS != end || end <= start {
								continue
							}
							write.TimeMS = end - 1
						}
						segment.path = append(segment.path, write)
					}
					sortUtilityPathWrites(segment.path)
				}
				segments = append(segments, segment)
			}
			if !life.class.wallActivated {
				continue
			}

			cursor := maxUint32(life.placedMS, window.StartMS)
			roundEnd := minUint32(window.EndMS, life.closeMS)
			for _, interval := range intervals {
				if interval.startMS > cursor {
					if inactive := wallInactiveSegment(life, roundIndex, cursor, minUint32(interval.startMS, roundEnd)); inactive != nil {
						segments = append(segments, *inactive)
					}
				}
				if interval.endMS > cursor {
					cursor = interval.endMS
				}
			}
			if inactive := wallInactiveSegment(life, roundIndex, cursor, roundEnd); inactive != nil {
				segments = append(segments, *inactive)
			}
		}
	}

	sortUtilitySegments(segments)
	if len(segments) > maxUtilityIntervals {
		incrementUtilityWarning(&warnings.TruncatedUtilities, len(segments)-maxUtilityIntervals)
		segments = segments[:maxUtilityIntervals]
	}

	movementGUIDs := make(map[uint32]struct{})
	replicatedMovementGUIDs := make(map[uint32]struct{})
	splineMovementGUIDs := make(map[uint32]struct{})
	for _, segment := range segments {
		if segment.life.class.mobile {
			movementGUIDs[segment.life.guid] = struct{}{}
		}
		if segment.life.class.followsParent && segment.life.attachParent != 0 {
			movementGUIDs[segment.life.attachParent] = struct{}{}
		}
		if segment.life.class.visionCone &&
			hasActiveUtilityControllerWrite(ownerWrites[segment.life.guid]) {
			movementGUIDs[segment.life.guid] = struct{}{}
		}
		if segment.life.class.replicatedMovement {
			replicatedMovementGUIDs[segment.life.guid] = struct{}{}
		}
		if segment.life.class.splineMovement && !segment.life.class.splineChild {
			if segment.life.class.splineFromChildren {
				for _, childGUID := range splineChildrenByParent[segment.life.guid] {
					splineMovementGUIDs[childGUID] = struct{}{}
				}
			} else {
				splineMovementGUIDs[segment.life.guid] = struct{}{}
			}
		}
	}
	movementByGUID := make(map[uint32][]movementRow, len(movementGUIDs))
	if len(movementGUIDs) > 0 {
		_, err = readParquetRows(exportDir+"/movement.parquet", func(rows []movementRow) error {
			for i := range rows {
				row := rows[i]
				if _, wanted := movementGUIDs[row.CharacterNetGUID]; !wanted ||
					!isFinite32(row.PosX) || !isFinite32(row.PosY) ||
					math.Abs(float64(row.PosX)) > 1_000_000 ||
					math.Abs(float64(row.PosY)) > 1_000_000 {
					continue
				}
				movementByGUID[row.CharacterNetGUID] = append(
					movementByGUID[row.CharacterNetGUID], row,
				)
			}
			return nil
		})
		if err != nil {
			return nil, warnings, err
		}
	}
	replicatedMovementByGUID, splineMovementByGUID, err := readUtilityReplicatedMovement(
		exportDir,
		replicatedMovementGUIDs,
		splineMovementGUIDs,
	)
	if err != nil {
		return nil, warnings, err
	}

	for i := range segments {
		segment := &segments[i]
		if segment.life.class.wallPoints {

			fromMS, toMS := segment.startMS, segment.endMS
			if segment.life.class.wallActivated {
				fromMS, toMS = segment.life.openMS, segment.life.closeMS
			}
			wallPoints := make([]utilityPathWrite, 0)
			for _, write := range pathWrites[segment.life.guid] {
				if write.TimeMS >= fromMS && write.TimeMS < toMS &&
					write.TimeMS >= segment.life.openMS && write.TimeMS < segment.life.closeMS {
					wallPoints = append(wallPoints, write)
				}
			}
			if segment.life.class.wallStart {
				if start, end, ok := utilityWallSpan(wallPoints); ok {
					segment.position = start
					segment.yaw = math.Atan2(end.Y-start.Y, end.X-start.X) * 180 / math.Pi
					segment.lengthM = math.Hypot(end.X-start.X, end.Y-start.Y) / 100
					if segment.life.class.ability == "fast_lane" {
						segment.lengthSamples = utilityWallLengthSamples(
							wallPoints,
							windows[segment.roundIndex].StartMS,
						)
					}
				}
			} else if start, end, ok := utilityWallEndpoints(wallPoints); ok {
				segment.position = Position{
					X: (start.X + end.X) / 2,
					Y: (start.Y + end.Y) / 2,
				}
				segment.yaw = math.Atan2(end.Y-start.Y, end.X-start.X)*180/math.Pi - 90
			}
		}
		if segment.life.class.wallPath {
			for _, write := range pathWrites[segment.life.guid] {
				if write.TimeMS >= segment.startMS && write.TimeMS < segment.endMS &&
					write.TimeMS >= segment.life.openMS && write.TimeMS < segment.life.closeMS {
					segment.path = append(segment.path, write)
				}
			}
			sortUtilityPathWrites(segment.path)
		}
		if segment.life.class.replicatedMovement {
			for _, write := range replicatedMovementByGUID[segment.life.guid] {
				if write.TimeMS >= segment.startMS && write.TimeMS < segment.endMS &&
					write.TimeMS >= segment.life.openMS && write.TimeMS < segment.life.closeMS {
					segment.replicatedMovement = append(segment.replicatedMovement, write)
				}
			}
			sortUtilityPathWrites(segment.replicatedMovement)
			if segment.life.class.ability == "curveball" &&
				segment.life.class.curveballSide != 0 &&
				segment.life.hasYaw &&
				!hasDistinctUtilityMovement(segment.replicatedMovement) {
				endMS := minUint32(segment.life.closeMS, segment.endMS)
				if endMS > segment.life.openMS {
					approximated := approximateCurveballMovement(
						segment.life.position,
						segment.life.yaw,
						segment.life.class.curveballSide,
						segment.life.openMS,
						endMS,
					)
					segment.replicatedMovement = make(
						[]utilityPathWrite, 0, len(approximated),
					)
					for _, write := range approximated {
						if write.TimeMS >= segment.startMS &&
							write.TimeMS < segment.endMS {
							segment.replicatedMovement = append(
								segment.replicatedMovement,
								write,
							)
						}
					}
				}
			}
			if len(segment.replicatedMovement) == 0 &&
				len(replicatedMovementByGUID[segment.life.guid]) == 0 {
				incrementUtilityWarning(&warnings.MissingMovement)
			}
		}
		if segment.life.class.splineMovement {
			writes := append([]utilitySplineWrite(nil), splineMovementByGUID[segment.life.guid]...)
			if segment.life.class.splineFromChildren {
				writes = writes[:0]
				for _, childGUID := range splineChildrenByParent[segment.life.guid] {
					writes = append(writes, splineMovementByGUID[childGUID]...)
				}
			}
			sort.SliceStable(writes, func(i, j int) bool {
				if writes[i].TimeMS != writes[j].TimeMS {
					return writes[i].TimeMS < writes[j].TimeMS
				}
				return writes[i].PacketID < writes[j].PacketID
			})
			maxDistance := 0.0
			for _, write := range writes {
				if write.TimeMS < segment.life.openMS ||
					write.TimeMS >= segment.life.closeMS {
					continue
				}
				if write.DistanceM > maxDistance {
					maxDistance = write.DistanceM
				}
				if len(segment.splineWrites) > 0 {
					last := &segment.splineWrites[len(segment.splineWrites)-1]
					if write.TimeMS == last.TimeMS {
						last.DistanceM = maxDistance
						continue
					}
				}
				segment.splineWrites = append(segment.splineWrites, utilitySplineWrite{
					TimeMS:    write.TimeMS,
					PacketID:  write.PacketID,
					DistanceM: maxDistance,
				})
			}
			if segment.life.class.splineFullDistance > 0 &&
				len(segment.splineWrites) > 0 {
				fraction := maxDistance / segment.life.class.splineFullDistance
				fraction = math.Min(1, math.Max(0, fraction))
				segment.stopFraction = &fraction
			}
		}
		if !segment.life.class.mobile && !segment.life.class.followsParent {
			if segment.life.class.visionCone {
				var truncated bool
				segment.visionSamples, truncated = sampleUtilityVision(
					movementByGUID[segment.life.guid],
					ownerWrites[segment.life.guid],
					segment.startMS,
					segment.endMS,
					windows[segment.roundIndex].StartMS,
					segment.life.yaw,
					segment.life.hasYaw,
				)
				if truncated {
					incrementUtilityWarning(&warnings.TruncatedSamples)
				}
			}
			continue
		}
		movementGUID := segment.life.guid
		if segment.life.class.followsParent {
			movementGUID = segment.life.attachParent
		}
		for _, row := range movementByGUID[movementGUID] {
			if row.TimeMS >= segment.startMS && row.TimeMS < segment.endMS &&
				row.TimeMS >= segment.life.openMS && row.TimeMS < segment.life.closeMS {
				segment.samples = append(segment.samples, row)
			}
		}
		if len(segment.samples) == 0 && len(movementByGUID[movementGUID]) == 0 {
			incrementUtilityWarning(&warnings.MissingMovement)
		}
	}

	truncateAstraMarkers(segments)
	segments = filterUtilitySegments(segments)
	nextID := 0
	for _, segment := range segments {
		window := windows[segment.roundIndex]
		id := fmt.Sprintf("utility-%04d", nextID+1)
		if segment.inactive {
			id += "-inactive"
		}
		kind := segment.life.class.kind
		if segment.kind != nil {
			kind = *segment.kind
		}
		iconOnly := segment.life.class.iconOnly
		if segment.iconOnly != nil {
			iconOnly = *segment.iconOnly
		}
		utility := Utility{
			ID:            id,
			Kind:          kind,
			AbilityID:     segment.life.class.ability,
			StartTimeMS:   int(segment.startMS - window.StartMS),
			EndTimeMS:     int(segment.endMS - window.StartMS),
			Position:      segment.position,
			Yaw:           segment.yaw,
			OwnerPuuid:    segment.life.owner,
			IconOnly:      iconOnly,
			Inactive:      segment.inactive,
			Vision:        segment.visionSamples,
			LengthSamples: segment.lengthSamples,
			StopFraction:  segment.stopFraction,
		}
		if segment.lengthM > 0 {
			utility.Length = segment.lengthM
		} else if segment.life.lengthM > 0 {
			utility.Length = segment.life.lengthM
		}
		if segment.life.groundVolume != nil {
			utility.Polygons = segment.life.groundVolume.polygons
			utility.Boundary = segment.life.groundVolume.boundary
		}
		if segment.life.class.wallPath {
			var truncated bool
			utility.Path, truncated = sampleUtilityPath(segment.path, window.StartMS)
			if truncated {
				incrementUtilityWarning(&warnings.TruncatedPaths)
			}
		}
		if segment.life.class.wallArms {
			armTimeMS := int(segment.startMS - window.StartMS)
			for _, write := range segment.path {
				utility.Path = append(utility.Path, UtilityPositionSample{
					TimeMS: armTimeMS,
					X:      write.Position.X,
					Y:      write.Position.Y,
				})
			}
		}
		if segment.life.class.trajectoryWarnings ||
			segment.life.class.forwardMovement > 0 {
			utility.Samples = segment.trajectorySamples
			if len(utility.Samples) == 0 &&
				segment.life.class.trajectoryWarnings {
				continue
			}
		}
		if segment.life.class.samplesFromPulses {
			var truncated bool
			utility.Samples, truncated = sampleUtilityPath(
				segment.path, window.StartMS,
			)
			if truncated {
				incrementUtilityWarning(&warnings.TruncatedSamples)
			}
			if len(utility.Samples) == 0 {
				continue
			}
		}
		if segment.life.class.splineMovement {
			var truncated bool
			utility.Samples, truncated = sampleUtilitySplineMovement(
				segment.position,
				segment.life.yaw,
				segment.life.openMS,
				segment.splineWrites,
				window.StartMS,
			)
			if truncated {
				incrementUtilityWarning(&warnings.TruncatedSamples)
			}
		}
		if segment.life.class.mobile || segment.life.class.followsParent {
			var truncated bool
			utility.Samples, truncated = sampleUtilityMovement(segment.samples, window.StartMS)
			if truncated {
				incrementUtilityWarning(&warnings.TruncatedSamples)
			}
			if len(utility.Samples) == 0 {
				continue
			}
		} else if segment.life.class.replicatedMovement {
			var truncated bool
			utility.Samples, truncated = sampleUtilityPath(segment.replicatedMovement, window.StartMS)
			if truncated {
				incrementUtilityWarning(&warnings.TruncatedSamples)
			}
			if len(utility.Samples) == 0 {
				continue
			}
		}
		nextID++
		result[segment.roundIndex] = append(result[segment.roundIndex], utility)
	}

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
