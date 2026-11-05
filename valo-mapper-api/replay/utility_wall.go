package replay

import (
	"fmt"
	"math"
	"sort"
	"strings"
)

func utilityWallEndpoints(writes []utilityPathWrite) (Position, Position, bool) {
	type endpointPair struct {
		start *Position
		end   *Position
	}
	sortUtilityPathWrites(writes)
	pairIndexes := make(map[string]int)
	pairs := make([]endpointPair, 0)
	for i := range writes {
		write := &writes[i]
		var endpoint string
		var rpc string
		switch write.FieldName {
		case "MulticastInitializeWall.WallStartLocation":
			rpc, endpoint = "MulticastInitializeWall", "start"
		case "MulticastInitializeWall.WallEndLocation":
			rpc, endpoint = "MulticastInitializeWall", "end"
		case "MulticastInitializeTrapAnchors.WallStartPoint":
			rpc, endpoint = "MulticastInitializeTrapAnchors", "start"
		case "MulticastInitializeTrapAnchors.WallEndPoint":
			rpc, endpoint = "MulticastInitializeTrapAnchors", "end"
		default:
			continue
		}
		key := fmt.Sprintf("%d:%s", write.TimeMS, rpc)
		pairIndex, found := pairIndexes[key]
		if !found {
			pairIndex = len(pairs)
			pairIndexes[key] = pairIndex
			pairs = append(pairs, endpointPair{})
		}
		position := write.Position
		if endpoint == "start" {
			pairs[pairIndex].start = &position
		} else {
			pairs[pairIndex].end = &position
		}
	}

	for _, pair := range pairs {
		if pair.start == nil || pair.end == nil ||
			(pair.start.X == pair.end.X && pair.start.Y == pair.end.Y) {
			continue
		}
		return *pair.start, *pair.end, true
	}
	return Position{}, Position{}, false
}

func utilityWallArmDestinations(
	pathWrites map[uint32][]utilityPathWrite,
	ownerWrites map[uint32][]utilityOwnerWrite,
) map[uint32][]utilityPathWrite {
	result := make(map[uint32][]utilityPathWrite)
	for actorGUID, writes := range pathWrites {
		for _, write := range writes {
			if write.FieldName != "MulticastInitialize.Destination" {
				continue
			}
			owner, ok := utilityDirectOwnerAt(actorGUID, write.TimeMS, ownerWrites)
			if !ok {
				continue
			}
			result[owner] = append(result[owner], write)
		}
	}
	for owner := range result {
		sortUtilityPathWrites(result[owner])
	}
	return result
}

type utilityTrajectorySegment struct {
	start    Position
	end      Position
	hasStart bool
	hasEnd   bool
	packetID uint32
	timeMS   uint32
}

func utilityTrajectoryPoints(
	pathWrites map[uint32][]utilityPathWrite,
	ownerWrites map[uint32][]utilityOwnerWrite,
) map[uint32][]Position {
	segments := make(map[uint32]*utilityTrajectorySegment)
	endWarnings := make(map[uint32]utilityPathWrite)
	for actorGUID, writes := range pathWrites {
		for _, write := range writes {
			segment := segments[actorGUID]
			if segment == nil {
				segment = &utilityTrajectorySegment{}
				segments[actorGUID] = segment
			}
			switch {
			case strings.HasPrefix(write.FieldName, "Multicast Initialize Segment.SegmentLocation_"):
				segment.start = write.Position
				segment.hasStart = validUtilityPosition(write.Position)
				segment.packetID = write.PacketID
				segment.timeMS = write.TimeMS
			case strings.HasPrefix(write.FieldName, "Multicast Initialize Segment.SegmentEndLocation_"):
				segment.end = write.Position
				segment.hasEnd = validUtilityPosition(write.Position)
				if segment.packetID == 0 {
					segment.packetID = write.PacketID
				}
				if segment.timeMS == 0 {
					segment.timeMS = write.TimeMS
				}
			case write.FieldName == "Multicast Initialize End Segment.248":
				endWarnings[actorGUID] = write
			}
		}
	}

	byOwner := make(map[uint32][]*utilityTrajectorySegment)
	for actorGUID, segment := range segments {
		if !segment.hasStart || !segment.hasEnd {
			continue
		}
		owner, ok := utilityDirectOwnerAt(actorGUID, segment.timeMS, ownerWrites)
		if !ok {
			continue
		}
		byOwner[owner] = append(byOwner[owner], segment)
	}

	result := make(map[uint32][]Position, len(byOwner))
	for owner, ownerSegments := range byOwner {
		sort.SliceStable(ownerSegments, func(i, j int) bool {
			return ownerSegments[i].packetID < ownerSegments[j].packetID
		})
		points := make([]Position, 0, len(ownerSegments)*2)
		appendUnique := func(position Position) {
			if !validUtilityPosition(position) {
				return
			}
			if len(points) > 0 && points[len(points)-1] == position {
				return
			}
			points = append(points, position)
		}
		for _, segment := range ownerSegments {
			appendUnique(segment.start)
			appendUnique(segment.end)
		}
		result[owner] = points
	}

	for actorGUID, write := range endWarnings {
		owner, ok := utilityDirectOwnerAt(actorGUID, write.TimeMS, ownerWrites)
		if !ok || len(result[owner]) >= 2 {
			continue
		}
		result[owner] = []Position{write.Position}
	}
	return result
}

func utilityTrajectorySamples(
	points []Position,
	startMS, endMS, roundStart uint32,
) []UtilityPositionSample {
	if len(points) < 2 || startMS >= endMS {
		return nil
	}
	distances := make([]float64, len(points))
	total := 0.0
	for i := 1; i < len(points); i++ {
		total += math.Hypot(
			points[i].X-points[i-1].X,
			points[i].Y-points[i-1].Y,
		)
		distances[i] = total
	}
	if total <= 0 || !isFinite64(total) {
		return nil
	}

	const sampleStepMS = 50
	duration := int(endMS - startMS)
	count := duration/sampleStepMS + 1
	if count < 2 {
		count = 2
	}
	if count > maxUtilitySamples {
		count = maxUtilitySamples
	}
	samples := make([]UtilityPositionSample, 0, count)
	for i := 0; i < count; i++ {
		progress := float64(i) / float64(count-1)
		target := total * progress
		segment := 1
		for segment < len(points) && distances[segment] < target {
			segment++
		}
		if segment >= len(points) {
			segment = len(points) - 1
		}
		previousDistance := distances[segment-1]
		span := distances[segment] - previousDistance
		fraction := 0.0
		if span > 0 {
			fraction = (target - previousDistance) / span
		}
		position := Position{
			X: points[segment-1].X + (points[segment].X-points[segment-1].X)*fraction,
			Y: points[segment-1].Y + (points[segment].Y-points[segment-1].Y)*fraction,
		}
		samples = append(samples, UtilityPositionSample{
			TimeMS: int(startMS+uint32(duration-1)*uint32(i)/uint32(count-1)) - int(roundStart),
			X:      position.X,
			Y:      position.Y,
		})
	}
	return samples
}

func utilityWallSpan(writes []utilityPathWrite) (Position, Position, bool) {
	if len(writes) < 2 {
		return Position{}, Position{}, false
	}
	sortUtilityPathWrites(writes)
	start := writes[0].Position
	end := writes[len(writes)-1].Position
	if !validUtilityPosition(start) || !validUtilityPosition(end) ||
		(start.X == end.X && start.Y == end.Y) {
		return Position{}, Position{}, false
	}
	return start, end, true
}
func utilityWallLengthSamples(writes []utilityPathWrite, roundStart uint32) []UtilityLengthSample {
	if len(writes) < 2 {
		return nil
	}
	sortUtilityPathWrites(writes)
	start := writes[0].Position
	if !validUtilityPosition(start) {
		return nil
	}

	samples := make([]UtilityLengthSample, 0, minInt(len(writes), maxUtilitySamples))
	samples = append(samples, UtilityLengthSample{
		TimeMS: int(writes[0].TimeMS - roundStart),
		Length: 0,
	})
	for _, write := range writes[1:] {
		if !validUtilityPosition(write.Position) {
			continue
		}
		timeMS := int(write.TimeMS - roundStart)
		if timeMS < 0 || timeMS < samples[len(samples)-1].TimeMS {
			continue
		}
		lengthM := math.Hypot(
			write.Position.X-start.X,
			write.Position.Y-start.Y,
		) / 100
		if timeMS == samples[len(samples)-1].TimeMS {
			samples[len(samples)-1].Length = lengthM
			continue
		}
		samples = append(samples, UtilityLengthSample{
			TimeMS: timeMS,
			Length: lengthM,
		})
	}
	if len(samples) > maxUtilitySamples {
		reduced := make([]UtilityLengthSample, maxUtilitySamples)
		for i := range reduced {
			index := i * (len(samples) - 1) / (maxUtilitySamples - 1)
			reduced[i] = samples[index]
		}
		return reduced
	}
	return samples
}

func wallActivationIntervals(
	openMS, closeMS uint32,
	writes []utilityActivationWrite,
	fuel []utilityFuelWrite,
) []utilityInterval {
	sort.SliceStable(writes, func(i, j int) bool {
		if writes[i].TimeMS != writes[j].TimeMS {
			return writes[i].TimeMS < writes[j].TimeMS
		}
		return writes[i].PacketID < writes[j].PacketID
	})

	intervals := make([]utilityInterval, 0, 2)
	var startMS uint32
	active := false
	for _, write := range writes {
		if write.Active == nil {
			continue
		}
		if *write.Active {
			if !active {
				startMS = write.TimeMS
				active = true
			}
			continue
		}
		if !active {
			continue
		}
		active = false
		if write.TimeMS > startMS {
			intervals = append(intervals, utilityInterval{startMS: startMS, endMS: write.TimeMS})
		}
	}
	if active {
		endMS := closeMS
		if fuelStopMS, ok := wallFuelStopMS(startMS, closeMS, fuel); ok {
			endMS = fuelStopMS
		}
		if endMS > startMS {
			intervals = append(intervals, utilityInterval{startMS: startMS, endMS: endMS})
		}
	}

	filtered := make([]utilityInterval, 0, len(intervals))
	for _, interval := range intervals {
		start := maxUint32(interval.startMS, openMS)
		end := minUint32(interval.endMS, closeMS)
		if start < end {
			filtered = append(filtered, utilityInterval{startMS: start, endMS: end})
		}
	}
	return filtered
}

func wallFuelStopMS(activationMS, closeMS uint32, writes []utilityFuelWrite) (uint32, bool) {
	var drainStart uint32
	draining := false
	for _, write := range writes {
		if write.Draining == nil {
			continue
		}
		if *write.Draining {
			if !draining {
				drainStart = write.TimeMS
				draining = true
			}
			continue
		}
		if !draining {
			continue
		}
		draining = false
		if drainStart < activationMS ||
			drainStart-activationMS > wallArmingMS ||
			write.TimeMS <= drainStart || write.TimeMS > closeMS {
			continue
		}
		return write.TimeMS, true
	}
	return 0, false
}

func wallInactiveSegment(
	life *utilityActorLife,
	roundIndex int,
	startMS, endMS uint32,
) *utilitySegment {
	if startMS >= endMS {
		return nil
	}
	return &utilitySegment{
		life:       life,
		roundIndex: roundIndex,
		startMS:    startMS,
		endMS:      endMS,
		position:   life.position,
		yaw:        life.yaw + life.class.wallYawOffset,
		inactive:   true,
	}
}
