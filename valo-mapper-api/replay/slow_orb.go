package replay

import (
	"fmt"
	"math"
)

const (
	slowOrbPatchClass   = "Patch_Thorne_4_SlowField_Production"
	slowOrbNodeGridName = "NetMulticastUpdateNodeGrid"
	slowOrbCellSizeCM   = 200.0
	slowOrbMaxNodeCount = 4096
	slowOrbNormalMax    = 1 << 16
	slowOrbCellHalfCM   = 100.0
)

type slowOrbNode struct {
	status uint32
}

type slowOrbWindowKey struct {
	actor    uint32
	packetID uint32
	timeMS   uint32
}

type slowOrbWindow struct {
	actor    uint32
	packetID uint32
	timeMS   uint32
	xs       []int32
	ys       []int32
	lineSize int32
	valid    bool
	hasValid bool
	raw      []byte
	bitCount int32
	hasNodes bool
}

// readSlowOrbShapes decodes Sage's cellular patch node grid into the same
// polygon and boundary representation used by Viper's Pit.
func readSlowOrbShapes(
	exportDir string,
	actors map[uint32]*utilityActor,
) map[uint32]*utilityGroundVolume {
	_, shapes := readUtilityShapes(exportDir, "", actors)
	return shapes
}

func fieldRowInt32(row *fieldRow) int32 {
	if row.ValueI64 != nil {
		return int32(*row.ValueI64)
	}
	if len(row.RawBits) < 4 {
		return 0
	}
	value := uint32(row.RawBits[0]) |
		uint32(row.RawBits[1])<<8 |
		uint32(row.RawBits[2])<<16 |
		uint32(row.RawBits[3])<<24
	return int32(value)
}

func fieldRowBool(row *fieldRow) bool {
	if row.ValueBool != nil {
		return *row.ValueBool
	}
	return len(row.RawBits) > 0 && row.RawBits[0]&1 == 1
}

// NodeArray is a RepLayout dynamic array of PatchNode elements. Handles match
// the ShooterGame.PatchNode declaration: 8/9/10 are floor, ceiling and
// distance floats, 11 is a quantized normal, 12 is the edge bit, and 13 is the
// status enum occupying the member's remaining bits. Statuses 2 and 3 are the
// nodes with a valid floor; 0 is unused and 4 means no floor was found.
func decodeSlowOrbNodes(raw []byte, bitCount int32) ([]slowOrbNode, error) {
	bits, err := newGroundVolumeBits(raw, bitCount)
	if err != nil {
		return nil, err
	}
	count, err := bits.packed()
	if err != nil {
		return nil, err
	}
	if count > slowOrbMaxNodeCount {
		return nil, fmt.Errorf("slow-orb node array too large")
	}
	nodes := make([]slowOrbNode, count)
	seen := make([]bool, count)
	for {
		encoded, err := bits.packed()
		if err != nil {
			return nil, err
		}
		if encoded == 0 {
			if bits.remaining() == 8 {
				if _, err := bits.packed(); err != nil {
					return nil, err
				}
			}
			break
		}
		index := encoded - 1
		if index >= count || seen[index] {
			return nil, fmt.Errorf("slow-orb node index")
		}
		seen[index] = true
		node := slowOrbNode{}
		for {
			encodedHandle, err := bits.packed()
			if err != nil {
				return nil, err
			}
			if encodedHandle == 0 {
				break
			}
			width, err := bits.packed()
			if err != nil {
				return nil, err
			}
			if width > slowOrbMaxNodeCount*64 {
				return nil, fmt.Errorf("slow-orb node member too wide")
			}
			payload, err := bits.take(int(width))
			if err != nil {
				return nil, err
			}
			if width == 0 {
				continue
			}
			switch encodedHandle - 1 {
			case 8, 9, 10:
				if payload.remaining() != 32 {
					return nil, fmt.Errorf("slow-orb node float width")
				}
				if _, err := payload.f32(); err != nil {
					return nil, err
				}
			case 11:
				for i := 0; i < 3; i++ {
					if _, err := payload.serializeInt(slowOrbNormalMax); err != nil {
						return nil, err
					}
				}
			case 12:
				if payload.remaining() != 1 {
					return nil, fmt.Errorf("slow-orb node bool width")
				}
				if _, err := payload.read(1); err != nil {
					return nil, err
				}
			case 13:
				if payload.remaining() > 32 {
					return nil, fmt.Errorf("slow-orb node status width")
				}
				if payload.remaining() > 0 {
					value, err := payload.read(payload.remaining())
					if err != nil {
						return nil, err
					}
					node.status = uint32(value)
				}
			default:
				// Unknown member: its payload has already been consumed.
			}
			if payload.remaining() != 0 {
				return nil, fmt.Errorf("slow-orb node residual")
			}
		}
		nodes[index] = node
	}
	if bits.remaining() != 0 {
		return nil, fmt.Errorf("slow-orb node array residual")
	}
	for _, ok := range seen {
		if !ok {
			return nil, fmt.Errorf("slow-orb node array partial")
		}
	}
	return nodes, nil
}

func minMaxInt32(values []int32) (int32, int32) {
	minimum, maximum := values[0], values[0]
	for _, value := range values[1:] {
		if value < minimum {
			minimum = value
		}
		if value > maximum {
			maximum = value
		}
	}
	return minimum, maximum
}

func buildSlowOrbShape(actor *utilityActor, window *slowOrbWindow) *utilityGroundVolume {
	if actor == nil || window == nil || !window.hasNodes || !window.hasValid || !window.valid {
		return nil
	}
	if len(window.xs) < 2 || len(window.ys) < 2 {
		return nil
	}
	minX, maxX := minMaxInt32(window.xs)
	minY, maxY := minMaxInt32(window.ys)
	if window.lineSize <= 0 || maxX < minX || maxY < minY {
		return nil
	}
	if maxX-minX+1 != window.lineSize {
		return nil
	}
	width := int(maxX - minX + 1)
	height := int(maxY - minY + 1)
	nodes, err := decodeSlowOrbNodes(window.raw, window.bitCount)
	if err != nil || len(nodes) != width*height {
		return nil
	}

	spawn, yaw, ok := slowOrbActorSpawn(actor)
	if !ok {
		return nil
	}
	radians := math.Round(float64(yaw)/90) * math.Pi / 2
	cos, sin := math.Cos(radians), math.Sin(radians)
	toWorld := func(localX, localY float64) Position {
		return Position{
			X: spawn.X + localX*cos - localY*sin,
			Y: spawn.Y + localX*sin + localY*cos,
		}
	}

	active := func(col, row int) bool {
		if col < 0 || row < 0 || col >= width || row >= height {
			return false
		}
		status := nodes[row*width+col].status
		return status == 2 || status == 3
	}

	shape := &utilityGroundVolume{}
	for row := 0; row < height; row++ {
		for col := 0; col < width; col++ {
			if !active(col, row) {
				continue
			}
			centerX := float64(minX+int32(col)) * slowOrbCellSizeCM
			centerY := float64(minY+int32(row)) * slowOrbCellSizeCM
			corners := [4]Position{
				toWorld(centerX-slowOrbCellHalfCM, centerY-slowOrbCellHalfCM),
				toWorld(centerX+slowOrbCellHalfCM, centerY-slowOrbCellHalfCM),
				toWorld(centerX+slowOrbCellHalfCM, centerY+slowOrbCellHalfCM),
				toWorld(centerX-slowOrbCellHalfCM, centerY+slowOrbCellHalfCM),
			}
			shape.polygons = append(shape.polygons, corners[:])

			for _, side := range [][3]int{
				{0, -1, 0}, // south: 0-1
				{1, 0, 1},  // east: 1-2
				{0, 1, 2},  // north: 2-3
				{-1, 0, 3}, // west: 3-0
			} {
				if active(col+side[0], row+side[1]) {
					continue
				}
				shape.boundary = append(shape.boundary, []Position{
					corners[side[2]],
					corners[(side[2]+1)%4],
				})
			}
		}
	}
	if len(shape.polygons) == 0 {
		return nil
	}
	return shape
}

func slowOrbActorSpawn(actor *utilityActor) (Position, float32, bool) {
	for i := len(actor.Events) - 1; i >= 0; i-- {
		event := actor.Events[i]
		if event.Event != "open" || event.Spawn == nil {
			continue
		}
		var yaw float32
		if event.SpawnYaw != nil {
			yaw = *event.SpawnYaw
		}
		return *event.Spawn, yaw, true
	}
	return Position{}, 0, false
}
