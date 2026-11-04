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
		if owner, hadLink, resolved := resolveUtilityOwner(
			life.guid, life.openMS, ownerWrites, index, outer, puuidBySubject,
		); resolved {
			life.owner = owner
		} else if hadLink {
			incrementUtilityWarning(&warnings.UnresolvedOwners)
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

	segments := make([]utilitySegment, 0)
	for _, life := range lives {
		if life.class.trapwireFarEnd {
			continue
		}
		intervals := life.activeIntervals
		if intervals == nil {
			intervals = []utilityInterval{{startMS: life.openMS, endMS: life.closeMS}}
		}
		for roundIndex, window := range windows {
			for _, interval := range intervals {
				start := maxUint32(interval.startMS, window.StartMS)
				end := minUint32(interval.endMS, window.EndMS)
				if start >= end {
					continue
				}
				segments = append(segments, utilitySegment{
					life:       life,
					roundIndex: roundIndex,
					startMS:    start,
					endMS:      end,
					position:   life.position,
					yaw:        life.yaw + life.class.wallYawOffset,
				})
			}
			if !life.class.wallActivated {
				continue
			}

			cursor := maxUint32(life.placedMS, window.StartMS)
			roundEnd := window.EndMS
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
	for _, segment := range segments {
		if segment.life.class.mobile {
			movementGUIDs[segment.life.guid] = struct{}{}
		}
		if segment.life.class.visionCone &&
			hasActiveUtilityControllerWrite(ownerWrites[segment.life.guid]) {
			movementGUIDs[segment.life.guid] = struct{}{}
		}
		if segment.life.class.replicatedMovement {
			replicatedMovementGUIDs[segment.life.guid] = struct{}{}
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
	replicatedMovementByGUID, err := readUtilityReplicatedMovement(
		exportDir,
		replicatedMovementGUIDs,
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
				}
			} else if start, end, ok := utilityWallEndpoints(wallPoints); ok {
				segment.position = Position{
					X: (start.X + end.X) / 2,
					Y: (start.Y + end.Y) / 2,
				}
				segment.yaw = math.Atan2(end.Y-start.Y, end.X-start.X)*180/math.Pi - 90
			}
		}
		if segment.life.class.ability == "blaze" {
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
				segment.replicatedMovement = approximateCurveballMovement(
					segment.life.position,
					segment.life.yaw,
					segment.life.class.curveballSide,
					segment.life.openMS,
					segment.life.closeMS,
				)
			}
			if len(segment.replicatedMovement) == 0 &&
				len(replicatedMovementByGUID[segment.life.guid]) == 0 {
				incrementUtilityWarning(&warnings.MissingMovement)
			}
		}
		if !segment.life.class.mobile {
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
		for _, row := range movementByGUID[segment.life.guid] {
			if row.TimeMS >= segment.startMS && row.TimeMS < segment.endMS &&
				row.TimeMS >= segment.life.openMS && row.TimeMS < segment.life.closeMS {
				segment.samples = append(segment.samples, row)
			}
		}
		if len(segment.samples) == 0 && len(movementByGUID[segment.life.guid]) == 0 {
			incrementUtilityWarning(&warnings.MissingMovement)
		}
	}

	segments = filterUtilitySegments(segments)
	nextID := 0
	for _, segment := range segments {
		window := windows[segment.roundIndex]
		id := fmt.Sprintf("utility-%04d", nextID+1)
		if segment.inactive {
			id += "-inactive"
		}
		utility := Utility{
			ID:          id,
			Kind:        segment.life.class.kind,
			AbilityID:   segment.life.class.ability,
			StartTimeMS: int(segment.startMS - window.StartMS),
			EndTimeMS:   int(segment.endMS - window.StartMS),
			Position:    segment.position,
			Yaw:         segment.yaw,
			OwnerPuuid:  segment.life.owner,
			IconOnly:    segment.life.class.iconOnly,
			Inactive:    segment.inactive,
			Vision:      segment.visionSamples,
		}
		if segment.lengthM > 0 {
			utility.Length = segment.lengthM
		} else if segment.life.lengthM > 0 {
			utility.Length = segment.life.lengthM
		}
		if segment.life.class.ability == "blaze" {
			var truncated bool
			utility.Path, truncated = sampleUtilityPath(segment.path, window.StartMS)
			if truncated {
				incrementUtilityWarning(&warnings.TruncatedPaths)
			}
		}
		if segment.life.class.mobile {
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

func filterUtilitySegments(segments []utilitySegment) []utilitySegment {
	result := segments[:0]
	for _, segment := range segments {
		if segment.life.class.mobile && len(segment.samples) == 0 {
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
