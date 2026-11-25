package replay

import (
	"math"
	"sort"
)

func buildUtilitySegments(
	lives []*utilityActorLife,
	windows []roundWindow,
	activationWrites map[uint32][]utilityActivationWrite,
	pathWrites map[uint32][]utilityPathWrite,
	trajectoryByOwner map[uint32][]Position,
	pulseSamplesByManager map[uint32][]utilityPathWrite,
	wallArmsByOwner map[uint32][]utilityPathWrite,
) []utilitySegment {
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
	return segments
}

func enrichUtilitySegments(
	segments []utilitySegment,
	windows []roundWindow,
	pathWrites map[uint32][]utilityPathWrite,
	ownerWrites map[uint32][]utilityOwnerWrite,
	movementByGUID map[uint32][]movementRow,
	replicatedMovementByGUID map[uint32][]utilityPathWrite,
	splineMovementByGUID map[uint32][]utilitySplineWrite,
	splineChildrenByParent map[uint32][]uint32,
	warnings *UtilityWarnings,
) {
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
}
