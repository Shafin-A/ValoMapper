package replay

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
)

const (
	groundVolumeClassGroup  = "/Script/DynamicVolume.GroundVolumeComponent"
	groundVolumeCNCGroup    = groundVolumeClassGroup + "_ClassNetCache"
	groundVolumeTailField   = "__vrfkit_unparsed_rep_layout_tail__"
	groundVolumeCNCSlots    = 2
	groundVolumeMaxArray    = 4096
	groundVolumeCNCHandle   = 0
	groundVolumeFragmentCNC = 2225407835
)

var groundVolumeDeclaredBuilds = map[string]bool{
	"12.09": true,
	"13.01": true,
	"13.02": true,
	"13.04": true,
	"13.05": true,
}

var groundVolumeTargetClasses = map[string]bool{
	"Patch_Pandemic_X_Circular": true,
}

type groundVolumeIdentity struct {
	Name     string
	Checksum uint32
}

type groundVolumeMemberKind int

const (
	groundVolumeInt32 groundVolumeMemberKind = iota
	groundVolumeUint
	groundVolumeBool
	groundVolumeFloat32
	groundVolumeVector3D
	groundVolumeArray
	groundVolumeUntyped
)

type groundVolumeMemberType struct {
	kind     groundVolumeMemberKind
	width    int
	elements map[groundVolumeIdentity]groundVolumeMemberType
}

type groundVolumeVector3 struct {
	x, y, z float64
}

type groundVolumeSegment struct {
	begin uint8
	end   uint8
}

type groundVolumeCell struct {
	itemID   int32
	active   bool
	status   uint8
	points   []groundVolumeVector3
	exterior []groundVolumeSegment
}

type utilityGroundVolume struct {
	polygons [][]Position
	boundary [][]Position
}

var (
	groundVolumeIDField       = groundVolumeIdentity{Name: "253", Checksum: 1175316786}
	groundVolumeActiveField   = groundVolumeIdentity{Name: "bIsActive", Checksum: 518428974}
	groundVolumeStatusField   = groundVolumeIdentity{Name: "Status", Checksum: 2380676387}
	groundVolumeExteriorField = groundVolumeIdentity{Name: "ExteriorSegments", Checksum: 3326329067}
	groundVolumeBeginField    = groundVolumeIdentity{Name: "Begin", Checksum: 3658211664}
	groundVolumeEndField      = groundVolumeIdentity{Name: "End", Checksum: 1988330146}
	groundVolumePointsField   = groundVolumeIdentity{Name: "ConvexHullPoints", Checksum: 3039966384}
	groundVolumePointField    = groundVolumeIdentity{Name: "ConvexHullPoints", Checksum: 2749781999}
	groundVolumeCeilingsField = groundVolumeIdentity{Name: "ConvexHullCeilings", Checksum: 3975907906}
	groundVolumeCeilingField  = groundVolumeIdentity{Name: "ConvexHullCeilings", Checksum: 1547370894}
	groundVolumeTravelField   = groundVolumeIdentity{Name: "ConvexHullTravelDistances", Checksum: 1031017464}
	groundVolumeTravelElem    = groundVolumeIdentity{Name: "ConvexHullTravelDistances", Checksum: 1566128181}
	groundVolumeXField        = groundVolumeIdentity{Name: "X", Checksum: 2123226522}
	groundVolumeYField        = groundVolumeIdentity{Name: "Y", Checksum: 2134384775}
	groundVolumeTDField       = groundVolumeIdentity{Name: "TravelDistance", Checksum: 956522941}
	groundVolumeCeilField     = groundVolumeIdentity{Name: "Ceiling", Checksum: 1959526051}
	groundVolumeFloorField    = groundVolumeIdentity{Name: "Floor", Checksum: 3454040167}
	groundVolumeTJunctions    = groundVolumeIdentity{Name: "TJunctions", Checksum: 1038854951}
)

var groundVolumeTypes = map[groundVolumeIdentity]groundVolumeMemberType{
	groundVolumeIDField:     {kind: groundVolumeInt32, width: 32},
	groundVolumeActiveField: {kind: groundVolumeBool, width: 1},
	groundVolumeStatusField: {kind: groundVolumeUint, width: 3},
	groundVolumeExteriorField: {kind: groundVolumeArray, elements: map[groundVolumeIdentity]groundVolumeMemberType{
		groundVolumeBeginField: {kind: groundVolumeUint, width: 8},
		groundVolumeEndField:   {kind: groundVolumeUint, width: 8},
	}},
	groundVolumePointsField: {kind: groundVolumeArray, elements: map[groundVolumeIdentity]groundVolumeMemberType{
		groundVolumePointField: {kind: groundVolumeVector3D, width: 192},
	}},
	groundVolumeCeilingsField: {kind: groundVolumeArray, elements: map[groundVolumeIdentity]groundVolumeMemberType{
		groundVolumeCeilingField: {kind: groundVolumeFloat32, width: 32},
	}},
	groundVolumeTravelField: {kind: groundVolumeArray, elements: map[groundVolumeIdentity]groundVolumeMemberType{
		groundVolumeTravelElem: {kind: groundVolumeFloat32, width: 32},
	}},
	groundVolumeXField:     {kind: groundVolumeInt32, width: 32},
	groundVolumeYField:     {kind: groundVolumeInt32, width: 32},
	groundVolumeTDField:    {kind: groundVolumeFloat32, width: 32},
	groundVolumeCeilField:  {kind: groundVolumeFloat32, width: 32},
	groundVolumeFloorField: {kind: groundVolumeFloat32, width: 32},
	groundVolumeTJunctions: {kind: groundVolumeUntyped, width: 16},
}

type groundVolumeBits struct {
	data []byte
	pos  int
	end  int
}

func newGroundVolumeBits(raw []byte, bitCount int32) (*groundVolumeBits, error) {
	if bitCount <= 0 || int(bitCount) > len(raw)*8 || len(raw) != (int(bitCount)+7)/8 {
		return nil, fmt.Errorf("invalid ground-volume window")
	}
	return &groundVolumeBits{data: raw, end: int(bitCount)}, nil
}

func (b *groundVolumeBits) remaining() int {
	return b.end - b.pos
}

func (b *groundVolumeBits) read(width int) (uint64, error) {
	if width < 0 || width > 64 || width > b.remaining() {
		return 0, fmt.Errorf("ground-volume window truncated")
	}
	var value uint64
	for i := 0; i < width; i++ {
		bit := b.pos + i
		if b.data[bit/8]>>(bit%8)&1 == 1 {
			value |= 1 << i
		}
	}
	b.pos += width
	return value, nil
}

func (b *groundVolumeBits) take(width int) (*groundVolumeBits, error) {
	if width < 0 || width > b.remaining() {
		return nil, fmt.Errorf("ground-volume window overrun")
	}
	sub := &groundVolumeBits{data: b.data, pos: b.pos, end: b.pos + width}
	b.pos += width
	return sub, nil
}

func (b *groundVolumeBits) i32() (int32, error) {
	value, err := b.read(32)
	return int32(uint32(value)), err
}

func (b *groundVolumeBits) f32() (float32, error) {
	value, err := b.read(32)
	return math.Float32frombits(uint32(value)), err
}

func (b *groundVolumeBits) f64() (float64, error) {
	value, err := b.read(64)
	return math.Float64frombits(value), err
}

func (b *groundVolumeBits) packed() (uint32, error) {
	var value uint32
	for index := 0; index < 5; index++ {
		raw, err := b.read(8)
		if err != nil {
			return 0, err
		}
		byteValue := uint8(raw)
		if index == 4 && byteValue>>1 > 15 {
			return 0, fmt.Errorf("ground-volume packed overflow")
		}
		value |= uint32(byteValue>>1) << (7 * index)
		if byteValue&1 == 0 {
			return value, nil
		}
	}
	return 0, fmt.Errorf("ground-volume packed unterminated")
}

func (b *groundVolumeBits) serializeInt(max uint32) (uint32, error) {
	if max < 2 {
		return 0, fmt.Errorf("ground-volume serialize-int max")
	}
	var value, mask uint32 = 0, 1
	for value+mask < max {
		bit, err := b.read(1)
		if err != nil {
			return 0, err
		}
		if bit == 1 {
			value |= mask
		}
		mask <<= 1
	}
	return value, nil
}

func decodeGroundVolumeMembers(
	bits *groundVolumeBits,
	schema map[uint32]groundVolumeIdentity,
	allowed map[groundVolumeIdentity]groundVolumeMemberType,
) (map[groundVolumeIdentity]any, error) {
	result := make(map[groundVolumeIdentity]any)
	for {
		encoded, err := bits.packed()
		if err != nil {
			return nil, err
		}
		if encoded == 0 {
			return result, nil
		}
		identity, ok := schema[encoded-1]
		if !ok {
			return nil, fmt.Errorf("ground-volume undeclared member handle %d", encoded-1)
		}
		memberType, ok := allowed[identity]
		if !ok {
			return nil, fmt.Errorf("ground-volume unrecognized member %s", identity.Name)
		}
		if _, exists := result[identity]; exists {
			return nil, fmt.Errorf("ground-volume duplicate member %s", identity.Name)
		}
		width, err := bits.packed()
		if err != nil {
			return nil, err
		}
		payload, err := bits.take(int(width))
		if err != nil {
			return nil, err
		}
		value, err := decodeGroundVolumeMember(payload, schema, identity, memberType)
		if err != nil {
			return nil, err
		}
		if payload.remaining() != 0 {
			return nil, fmt.Errorf("ground-volume unconsumed member %s", identity.Name)
		}
		result[identity] = value
	}
}

func decodeGroundVolumeMember(
	bits *groundVolumeBits,
	schema map[uint32]groundVolumeIdentity,
	identity groundVolumeIdentity,
	memberType groundVolumeMemberType,
) (any, error) {
	switch memberType.kind {
	case groundVolumeInt32:
		if bits.remaining() != 32 {
			return nil, fmt.Errorf("ground-volume int width")
		}
		return bits.i32()
	case groundVolumeUint:
		if bits.remaining() != memberType.width {
			return nil, fmt.Errorf("ground-volume uint width")
		}
		value, err := bits.read(memberType.width)
		return uint8(value), err
	case groundVolumeBool:
		if bits.remaining() != 1 {
			return nil, fmt.Errorf("ground-volume bool width")
		}
		value, err := bits.read(1)
		return value == 1, err
	case groundVolumeFloat32:
		if bits.remaining() != 32 {
			return nil, fmt.Errorf("ground-volume float width")
		}
		return bits.f32()
	case groundVolumeVector3D:
		if bits.remaining() != 192 {
			return nil, fmt.Errorf("ground-volume vector width")
		}
		x, err := bits.f64()
		if err != nil {
			return nil, err
		}
		y, err := bits.f64()
		if err != nil {
			return nil, err
		}
		z, err := bits.f64()
		if err != nil {
			return nil, err
		}
		if !isFinite64(x) || !isFinite64(y) || !isFinite64(z) {
			return nil, fmt.Errorf("ground-volume nonfinite vector")
		}
		return groundVolumeVector3{x: x, y: y, z: z}, nil
	case groundVolumeUntyped:
		if bits.remaining() != memberType.width {
			return nil, fmt.Errorf("ground-volume untyped width")
		}
		_, err := bits.read(memberType.width)
		return nil, err
	case groundVolumeArray:
		return decodeGroundVolumeArray(bits, schema, identity, memberType)
	default:
		return nil, fmt.Errorf("ground-volume unknown member type")
	}
}

func decodeGroundVolumeArray(
	bits *groundVolumeBits,
	schema map[uint32]groundVolumeIdentity,
	identity groundVolumeIdentity,
	memberType groundVolumeMemberType,
) (any, error) {
	count, err := bits.packed()
	if err != nil {
		return nil, err
	}
	if count > groundVolumeMaxArray {
		return nil, fmt.Errorf("ground-volume array too large")
	}
	elements := make([]any, 0, count)
	for {
		encoded, err := bits.packed()
		if err != nil {
			return nil, err
		}
		if encoded == 0 {
			break
		}
		index := encoded - 1
		if index >= count || int(index) != len(elements) {
			return nil, fmt.Errorf("ground-volume array index")
		}
		members, err := decodeGroundVolumeMembers(bits, schema, memberType.elements)
		if err != nil {
			return nil, err
		}
		if len(members) != len(memberType.elements) {
			return nil, fmt.Errorf("ground-volume partial array element")
		}
		if len(memberType.elements) == 1 {
			only, ok := members[groundVolumePointField]
			if ok && identity == groundVolumePointsField {
				elements = append(elements, only)
				continue
			}
			only, ok = members[groundVolumeCeilingField]
			if ok && identity == groundVolumeCeilingsField {
				elements = append(elements, only)
				continue
			}
			only, ok = members[groundVolumeTravelElem]
			if ok && identity == groundVolumeTravelField {
				elements = append(elements, only)
				continue
			}
			return nil, fmt.Errorf("ground-volume unrecognized array element")
		}
		elements = append(elements, members)
	}
	if int(count) != len(elements) {
		return nil, fmt.Errorf("ground-volume partial array")
	}
	if bits.remaining() != 0 {
		return nil, fmt.Errorf("ground-volume array residual")
	}
	return elements, nil
}

func decodeGroundVolumeWindow(
	raw []byte,
	bitCount int32,
	schema map[uint32]groundVolumeIdentity,
) ([]groundVolumeCell, error) {
	bits, err := newGroundVolumeBits(raw, bitCount)
	if err != nil {
		return nil, err
	}
	cells := make([]groundVolumeCell, 0, 128)
	for bits.remaining() > 0 {
		handle, err := bits.serializeInt(groundVolumeCNCSlots)
		if err != nil {
			return nil, err
		}
		if handle != groundVolumeCNCHandle {
			return nil, fmt.Errorf("ground-volume unexpected class-net-cache handle")
		}
		width, err := bits.packed()
		if err != nil {
			return nil, err
		}
		body, err := bits.take(int(width))
		if err != nil {
			return nil, err
		}
		support, err := body.read(1)
		if err != nil || support != 1 {
			return nil, fmt.Errorf("ground-volume unsupported fast-array support bit")
		}
		if _, err := body.i32(); err != nil { // array key
			return nil, err
		}
		if _, err := body.i32(); err != nil { // base key
			return nil, err
		}
		deleted, err := body.i32()
		if err != nil {
			return nil, err
		}
		changed, err := body.i32()
		if err != nil {
			return nil, err
		}
		if deleted < 0 || changed < 0 ||
			int64(deleted)*32+int64(changed)*40 > int64(body.remaining()) {
			return nil, fmt.Errorf("ground-volume fast-array count")
		}
		for i := int32(0); i < deleted; i++ {
			if _, err := body.i32(); err != nil {
				return nil, err
			}
		}
		for i := int32(0); i < changed; i++ {
			itemID, err := body.i32()
			if err != nil {
				return nil, err
			}
			members, err := decodeGroundVolumeMembers(body, schema, groundVolumeTypes)
			if err != nil {
				return nil, err
			}
			cell := groundVolumeCell{itemID: itemID}
			if value, ok := members[groundVolumeIDField]; ok {
				_ = value
			}
			if value, ok := members[groundVolumeActiveField]; ok {
				if active, ok := value.(bool); ok {
					cell.active = active
				}
			}
			if value, ok := members[groundVolumeStatusField]; ok {
				if status, ok := value.(uint8); ok {
					cell.status = status
				}
			}
			if value, ok := members[groundVolumePointsField]; ok {
				points, ok := value.([]any)
				if !ok {
					return nil, fmt.Errorf("ground-volume invalid point array")
				}
				cell.points = make([]groundVolumeVector3, 0, len(points))
				for _, point := range points {
					vector, ok := point.(groundVolumeVector3)
					if !ok {
						return nil, fmt.Errorf("ground-volume invalid point")
					}
					cell.points = append(cell.points, vector)
				}
			}
			if value, ok := members[groundVolumeExteriorField]; ok {
				segments, ok := value.([]any)
				if !ok {
					return nil, fmt.Errorf("ground-volume invalid exterior array")
				}
				cell.exterior = make([]groundVolumeSegment, 0, len(segments))
				for _, segment := range segments {
					fields, ok := segment.(map[groundVolumeIdentity]any)
					if !ok {
						return nil, fmt.Errorf("ground-volume invalid exterior segment")
					}
					begin, beginOK := fields[groundVolumeBeginField].(uint8)
					end, endOK := fields[groundVolumeEndField].(uint8)
					if !beginOK || !endOK {
						return nil, fmt.Errorf("ground-volume invalid exterior segment members")
					}
					cell.exterior = append(cell.exterior, groundVolumeSegment{begin: begin, end: end})
				}
			}
			cells = append(cells, cell)
		}
		if body.remaining() != 0 {
			return nil, fmt.Errorf("ground-volume unconsumed fast-array body")
		}
	}
	return cells, nil
}

func readGroundVolumeMembers(exportDir string) (map[uint32]groundVolumeIdentity, bool) {
	data, err := os.ReadFile(filepath.Join(exportDir, "manifest.json"))
	if err != nil {
		return nil, false
	}
	var manifest struct {
		Groups []struct {
			Path   string `json:"path"`
			Fields []struct {
				Handle             uint32 `json:"handle"`
				Name               string `json:"name"`
				CompatibleChecksum uint32 `json:"compatible_checksum"`
			} `json:"fields"`
		} `json:"net_field_export_groups"`
	}
	if err := json.Unmarshal(data, &manifest); err != nil {
		return nil, false
	}
	var members map[uint32]groundVolumeIdentity
	cncOK := false
	for _, group := range manifest.Groups {
		switch group.Path {
		case groundVolumeClassGroup:
			members = make(map[uint32]groundVolumeIdentity, len(group.Fields))
			for _, field := range group.Fields {
				members[field.Handle] = groundVolumeIdentity{
					Name:     field.Name,
					Checksum: field.CompatibleChecksum,
				}
			}
		case groundVolumeCNCGroup:
			for _, field := range group.Fields {
				if field.Handle == groundVolumeCNCHandle &&
					field.Name == "FragmentInfo" &&
					field.CompatibleChecksum == groundVolumeFragmentCNC {
					cncOK = true
				}
			}
		}
	}
	if members == nil || !cncOK {
		return nil, false
	}
	return members, true
}

func readGroundVolumeShapes(
	exportDir, build string,
	actors map[uint32]*utilityActor,
) map[uint32]*utilityGroundVolume {
	shapes, _ := readUtilityShapes(exportDir, build, actors)
	return shapes
}
