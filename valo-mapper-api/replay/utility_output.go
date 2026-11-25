package replay

import "fmt"

func segmentsToUtilities(
	result [][]Utility,
	segments []utilitySegment,
	windows []roundWindow,
	warnings *UtilityWarnings,
) {
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
}
