package replay

import (
	"fmt"
	"sort"
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
