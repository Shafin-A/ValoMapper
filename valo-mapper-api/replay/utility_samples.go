package replay

import (
	"encoding/binary"
	"encoding/json"
	"math"
	"sort"
)

func sampleUtilityPath(writes []utilityPathWrite, roundStart uint32) ([]UtilityPositionSample, bool) {
	samples := make([]UtilityPositionSample, 0, minInt(len(writes), maxUtilityPathPoints))
	truncated := false
	for _, write := range writes {
		timeMS := int(write.TimeMS - roundStart)
		if len(samples) > 0 {
			last := &samples[len(samples)-1]
			if timeMS == last.TimeMS {
				// Several writes can land on one tick. Keep the latest one so
				// sample times stay strictly increasing for the player.
				last.X = write.Position.X
				last.Y = write.Position.Y
				continue
			}
			if timeMS < last.TimeMS {
				continue
			}
			if last.X == write.Position.X && last.Y == write.Position.Y {
				continue
			}
		}
		if len(samples) == maxUtilityPathPoints {
			truncated = true
			break
		}
		samples = append(samples, UtilityPositionSample{
			TimeMS: timeMS,
			X:      write.Position.X,
			Y:      write.Position.Y,
		})
	}
	return samples, truncated
}

func sortUtilityPathWrites(writes []utilityPathWrite) {
	sort.SliceStable(writes, func(i, j int) bool {
		if writes[i].TimeMS != writes[j].TimeMS {
			return writes[i].TimeMS < writes[j].TimeMS
		}
		return writes[i].PacketID < writes[j].PacketID
	})
}

func hasDistinctUtilityMovement(writes []utilityPathWrite) bool {
	if len(writes) < 2 {
		return false
	}
	first := writes[0].Position
	for _, write := range writes[1:] {
		if write.Position != first {
			return true
		}
	}
	return false
}

func approximateCurveballMovement(
	start Position,
	yawDegrees float64,
	side int,
	startMS, endMS uint32,
) []utilityPathWrite {
	if side == 0 || !isFinite64(yawDegrees) || startMS >= endMS {
		return nil
	}
	const (
		sampleCount = 9
		forwardCM   = 400.0
		sideCM      = 250.0
	)
	duration := endMS - startMS
	count := minInt(sampleCount, int(duration))
	if count < 2 {
		return nil
	}

	yaw := yawDegrees * math.Pi / 180
	forwardX, forwardY := math.Cos(yaw), math.Sin(yaw)
	sideX, sideY := -forwardY*float64(side), forwardX*float64(side)
	p0 := start
	p1 := Position{
		X: start.X + forwardX*forwardCM*0.5,
		Y: start.Y + forwardY*forwardCM*0.5,
	}
	p2 := Position{
		X: start.X + forwardX*forwardCM + sideX*sideCM*0.3,
		Y: start.Y + forwardY*forwardCM + sideY*sideCM*0.3,
	}
	p3 := Position{
		X: start.X + forwardX*forwardCM + sideX*sideCM,
		Y: start.Y + forwardY*forwardCM + sideY*sideCM,
	}

	writes := make([]utilityPathWrite, 0, count)
	for i := 0; i < count; i++ {
		t := float64(i) / float64(count-1)
		u := 1 - t
		position := Position{
			X: u*u*u*p0.X + 3*u*u*t*p1.X + 3*u*t*t*p2.X + t*t*t*p3.X,
			Y: u*u*u*p0.Y + 3*u*u*t*p1.Y + 3*u*t*t*p2.Y + t*t*t*p3.Y,
		}
		offset := uint32(uint64(duration-1) * uint64(i) / uint64(count-1))
		writes = append(writes, utilityPathWrite{
			TimeMS:   startMS + offset,
			Position: position,
		})
	}
	return writes
}

func parseUtilityRawVector(raw []byte, bitCount int32) (Position, bool) {
	if bitCount != 192 || len(raw) != 24 {
		return Position{}, false
	}
	x := math.Float64frombits(binary.LittleEndian.Uint64(raw[0:8]))
	y := math.Float64frombits(binary.LittleEndian.Uint64(raw[8:16]))
	z := math.Float64frombits(binary.LittleEndian.Uint64(raw[16:24]))
	position := Position{X: x, Y: y}
	if !isFinite64(z) || math.Abs(z) > 1_000_000 {
		return Position{}, false
	}
	return position, validUtilityPosition(position)
}

func isFinite64(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}

func readUtilityReplicatedMovement(
	exportDir string,
	actorGUIDs map[uint32]struct{},
	splineGUIDs map[uint32]struct{},
) (map[uint32][]utilityPathWrite, map[uint32][]utilitySplineWrite, error) {
	paths := make(map[uint32][]utilityPathWrite, len(actorGUIDs))
	splines := make(map[uint32][]utilitySplineWrite, len(splineGUIDs))
	if len(actorGUIDs) == 0 && len(splineGUIDs) == 0 {
		return paths, splines, nil
	}
	_, err := readParquetRows(exportDir+"/fields.parquet", func(rows []fieldRow) error {
		for i := range rows {
			row := &rows[i]
			if row.FieldName == nil {
				continue
			}
			if _, wanted := actorGUIDs[row.ActorNetGUID]; wanted &&
				row.ObjectNetGUID == nil &&
				*row.FieldName == "ReplicatedMovement" {
				var position Position
				var ok bool
				if row.ValueStr != nil {
					position, ok = parseReplicatedMovementPosition(*row.ValueStr)
				}
				if !ok {
					// A class vrfkit has no type overlay for leaves the payload
					// as raw bits. New abilities hit this before it catches up.
					position, ok = parseRawReplicatedMovementPosition(row.RawBits, row.BitCount)
				}
				if ok {
					paths[row.ActorNetGUID] = append(paths[row.ActorNetGUID], utilityPathWrite{
						TimeMS: row.TimeMS, PacketID: row.PacketID, Position: position,
					})
				}
				continue
			}
			if _, wanted := splineGUIDs[row.ActorNetGUID]; wanted &&
				*row.FieldName == "ServerPosition" &&
				row.BitCount == 32 && len(row.RawBits) >= 4 {
				distanceM := float64(math.Float32frombits(
					binary.LittleEndian.Uint32(row.RawBits[:4]),
				))
				if isFinite64(distanceM) && distanceM >= 0 && distanceM < 1_000_000 {
					splines[row.ActorNetGUID] = append(
						splines[row.ActorNetGUID],
						utilitySplineWrite{
							TimeMS: row.TimeMS, PacketID: row.PacketID, DistanceM: distanceM,
						},
					)
				}
			}
		}
		return nil
	})
	return paths, splines, err
}

func parseReplicatedMovementPosition(value string) (Position, bool) {
	var movement struct {
		Location *struct {
			X *float64 `json:"x"`
			Y *float64 `json:"y"`
		} `json:"location"`
	}
	if err := json.Unmarshal([]byte(value), &movement); err != nil {
		return Position{}, false
	}
	if movement.Location == nil || movement.Location.X == nil || movement.Location.Y == nil {
		return Position{}, false
	}
	position := Position{X: *movement.Location.X, Y: *movement.Location.Y}
	return position, validUtilityPosition(position)
}

type rawBitReader struct {
	data []byte
	bits int
	pos  int
}

func (r *rawBitReader) readBit() (bool, bool) {
	if r.pos >= r.bits {
		return false, false
	}
	value := r.data[r.pos/8]>>(r.pos%8)&1 == 1
	r.pos++
	return value, true
}

func (r *rawBitReader) readBits(count int) (uint64, bool) {
	if count < 0 || count > 64 || r.pos+count > r.bits {
		return 0, false
	}
	var value uint64
	for i := 0; i < count; i++ {
		if r.data[r.pos/8]>>(r.pos%8)&1 == 1 {
			value |= 1 << i
		}
		r.pos++
	}
	return value, true
}

// readSerializedInt mirrors Unreal's FBitReader::SerializeInt: floor(log2(max))
// bits, plus one more only when the value can still reach max.
func (r *rawBitReader) readSerializedInt(max uint64) (uint64, bool) {
	if max == 0 {
		return 0, false
	}
	valueBits := 0
	for uint64(1)<<(valueBits+1) <= max {
		valueBits++
	}
	value, ok := r.readBits(valueBits)
	if !ok {
		return 0, false
	}
	bitMask := uint64(1) << valueBits
	if value+bitMask >= max {
		return value, true
	}
	extra, ok := r.readBit()
	if !ok {
		return 0, false
	}
	if extra {
		value |= bitMask
	}
	return value, true
}

// parseRawReplicatedMovementPosition decodes the location prefix of Unreal's
// FRepMovement when vrfkit does not have a type overlay for the class. Utility
// movement classes use whole-unit locations, so the raw components are the
// world position.
func parseRawReplicatedMovementPosition(raw []byte, bitCount int32) (Position, bool) {
	if len(raw) == 0 || bitCount <= 0 || int(bitCount) > len(raw)*8 {
		return Position{}, false
	}
	reader := rawBitReader{data: raw, bits: int(bitCount)}
	// simulated_physics_sleep, rep_physics, rep_server_frame, rep_server_handle
	if _, ok := reader.readBits(4); !ok {
		return Position{}, false
	}
	header, ok := reader.readSerializedInt(128)
	if !ok {
		return Position{}, false
	}
	componentBits := int(header & 63)
	if componentBits == 0 || componentBits > 63 {
		return Position{}, false
	}
	signBit := uint64(1) << (componentBits - 1)
	readComponent := func() (float64, bool) {
		value, ok := reader.readBits(componentBits)
		if !ok {
			return 0, false
		}
		return float64(int64((value ^ signBit) - signBit)), true
	}
	x, ok := readComponent()
	if !ok {
		return Position{}, false
	}
	y, ok := readComponent()
	if !ok {
		return Position{}, false
	}
	if _, ok := readComponent(); !ok {
		return Position{}, false
	}
	position := Position{X: x, Y: y}
	return position, validUtilityPosition(position)
}

func sampleUtilityMovement(rows []movementRow, roundStart uint32) ([]UtilityPositionSample, bool) {
	if len(rows) == 0 {
		return nil, false
	}
	sort.SliceStable(rows, func(i, j int) bool { return rows[i].TimeMS < rows[j].TimeMS })
	const sampleStepMS = uint32(100)
	sampled := make([]movementRow, 0, len(rows))
	var lastBin uint32
	for i, row := range rows {
		bin := row.TimeMS / sampleStepMS
		if i == 0 || bin != lastBin {
			sampled = append(sampled, row)
			lastBin = bin
		} else {
			sampled[len(sampled)-1] = row
		}
	}
	truncated := len(sampled) > maxUtilitySamples
	if truncated {
		reduced := make([]movementRow, maxUtilitySamples)
		for i := range reduced {
			index := i * (len(sampled) - 1) / (maxUtilitySamples - 1)
			reduced[i] = sampled[index]
		}
		sampled = reduced
	}
	result := make([]UtilityPositionSample, 0, len(sampled))
	for _, row := range sampled {
		result = append(result, UtilityPositionSample{
			TimeMS: int(row.TimeMS - roundStart),
			X:      float64(row.PosX),
			Y:      float64(row.PosY),
		})
	}
	return result, truncated
}

// sampleUtilitySplineMovement turns distance-along-spline updates into world
// positions. SplineMovementComponent reports metres, while map coordinates are
// centimetres, so the distance is scaled by 100 along the actor's yaw.
func sampleUtilitySplineMovement(
	start Position,
	yawDegrees float64,
	startMS uint32,
	writes []utilitySplineWrite,
	roundStart uint32,
) ([]UtilityPositionSample, bool) {
	if len(writes) == 0 || !isFinite64(yawDegrees) {
		return nil, false
	}
	sort.SliceStable(writes, func(i, j int) bool {
		if writes[i].TimeMS != writes[j].TimeMS {
			return writes[i].TimeMS < writes[j].TimeMS
		}
		return writes[i].PacketID < writes[j].PacketID
	})

	yaw := yawDegrees * math.Pi / 180
	dirX, dirY := math.Cos(yaw), math.Sin(yaw)
	samples := make([]UtilityPositionSample, 0, minInt(len(writes)+1, maxUtilitySamples))
	samples = append(samples, UtilityPositionSample{
		TimeMS: int(startMS - roundStart),
		X:      start.X,
		Y:      start.Y,
	})
	for _, write := range writes {
		if !isFinite64(write.DistanceM) || write.DistanceM < 0 {
			continue
		}
		timeMS := int(write.TimeMS - roundStart)
		x := start.X + dirX*write.DistanceM*100
		y := start.Y + dirY*write.DistanceM*100
		if !validUtilityPosition(Position{X: x, Y: y}) {
			continue
		}
		if len(samples) > 0 {
			last := &samples[len(samples)-1]
			if timeMS == last.TimeMS {
				last.X = x
				last.Y = y
				continue
			}
			if timeMS < last.TimeMS {
				continue
			}
		}
		samples = append(samples, UtilityPositionSample{
			TimeMS: timeMS,
			X:      x,
			Y:      y,
		})
	}

	truncated := len(samples) > maxUtilitySamples
	if truncated {
		reduced := make([]UtilityPositionSample, maxUtilitySamples)
		for i := range reduced {
			index := i * (len(samples) - 1) / (maxUtilitySamples - 1)
			reduced[i] = samples[index]
		}
		samples = reduced
	}
	return samples, truncated
}

func sampleUtilityVision(
	rows []movementRow,
	writes []utilityOwnerWrite,
	startMS, endMS, roundStart uint32,
	initialYaw float64,
	hasInitialYaw bool,
) ([]UtilityVisionSample, bool) {
	if startMS >= endMS {
		return nil, false
	}

	rows = append([]movementRow(nil), rows...)
	sort.SliceStable(rows, func(i, j int) bool { return rows[i].TimeMS < rows[j].TimeMS })

	active, hasController := utilityControllerAt(writes, startMS)
	yaw, hasYaw := initialYaw, hasInitialYaw && isFinite64(initialYaw)
	rowIndex := 0
	for rowIndex < len(rows) && rows[rowIndex].TimeMS <= startMS {
		if isFinite32(rows[rowIndex].Yaw) {
			yaw = float64(rows[rowIndex].Yaw)
			hasYaw = true
		}
		rowIndex++
	}
	if !hasController {
		active = false
	}

	samples := make([]UtilityVisionSample, 0)
	appendSample := func(timeMS uint32, isActive bool) {
		if !hasYaw || !isFinite64(yaw) {
			return
		}
		sample := UtilityVisionSample{
			TimeMS: int(timeMS - roundStart),
			Yaw:    yaw,
			Active: isActive,
		}
		if len(samples) > 0 && samples[len(samples)-1].TimeMS == sample.TimeMS {
			samples[len(samples)-1] = sample
			return
		}
		samples = append(samples, sample)
	}
	if active {
		appendSample(startMS, true)
	}

	writeIndex := sort.Search(len(writes), func(i int) bool {
		return writes[i].TimeMS > startMS
	})
	lastYawSampleMS := startMS
	for rowIndex < len(rows) || writeIndex < len(writes) {
		var nextTime uint32
		switch {
		case rowIndex >= len(rows):
			nextTime = writes[writeIndex].TimeMS
		case writeIndex >= len(writes):
			nextTime = rows[rowIndex].TimeMS
		case writes[writeIndex].TimeMS <= rows[rowIndex].TimeMS:
			nextTime = writes[writeIndex].TimeMS
		default:
			nextTime = rows[rowIndex].TimeMS
		}
		if nextTime >= endMS {
			break
		}

		for writeIndex < len(writes) && writes[writeIndex].TimeMS == nextTime {
			write := writes[writeIndex]
			if write.Controller != nil {
				nextActive := *write.Controller != 0
				if nextActive != active {
					active = nextActive
					appendSample(nextTime, active)
					lastYawSampleMS = nextTime
				}
			}
			writeIndex++
		}
		for rowIndex < len(rows) && rows[rowIndex].TimeMS == nextTime {
			row := rows[rowIndex]
			if isFinite32(row.Yaw) {
				previousYaw := yaw
				yaw = float64(row.Yaw)
				hasYaw = true
				if active && (nextTime-lastYawSampleMS >= 100 ||
					utilityYawDelta(previousYaw, yaw) >= 2) {
					appendSample(nextTime, true)
					lastYawSampleMS = nextTime
				}
			}
			rowIndex++
		}
	}

	truncated := len(samples) > maxUtilitySamples
	if truncated {
		reduced := make([]UtilityVisionSample, maxUtilitySamples)
		for i := range reduced {
			index := i * (len(samples) - 1) / (maxUtilitySamples - 1)
			reduced[i] = samples[index]
		}
		samples = reduced
	}
	return samples, truncated
}

func utilityYawDelta(a, b float64) float64 {
	delta := math.Mod(b-a, 360)
	if delta > 180 {
		delta -= 360
	} else if delta < -180 {
		delta += 360
	}
	return math.Abs(delta)
}
