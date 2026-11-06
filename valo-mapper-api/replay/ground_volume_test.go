package replay

import (
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"testing"

	"github.com/parquet-go/parquet-go"
)

type groundVolumeTestWriter struct {
	bits []byte
	bit  int
}

func (w *groundVolumeTestWriter) write(value uint64, width int) {
	for i := 0; i < width; i++ {
		if value>>i&1 == 1 {
			byteIndex := (w.bit + i) / 8
			for len(w.bits) <= byteIndex {
				w.bits = append(w.bits, 0)
			}
			w.bits[byteIndex] |= 1 << ((w.bit + i) % 8)
		}
	}
	w.bit += width
}

func (w *groundVolumeTestWriter) packed(value uint32) {
	for {
		byteValue := byte(value&0x7f) << 1
		value >>= 7
		if value != 0 {
			byteValue |= 1
		}
		w.write(uint64(byteValue), 8)
		if value == 0 {
			return
		}
	}
}

func (w *groundVolumeTestWriter) serializeInt(value, max uint32) {
	if max < 2 {
		panic("max too small")
	}
	var written, mask uint32 = 0, 1
	for written+mask < max {
		bit := value&mask != 0
		if bit {
			w.write(1, 1)
			written |= mask
		} else {
			w.write(0, 1)
		}
		mask <<= 1
	}
}

func (w *groundVolumeTestWriter) i32(value int32) {
	w.write(uint64(uint32(value)), 32)
}

func (w *groundVolumeTestWriter) f64(value float64) {
	w.write(math.Float64bits(value), 64)
}

func (w *groundVolumeTestWriter) f32(value float32) {
	w.write(uint64(math.Float32bits(value)), 32)
}

func (w *groundVolumeTestWriter) copyFrom(other *groundVolumeTestWriter) {
	for i := 0; i < other.bit; i++ {
		var bit byte
		if i/8 < len(other.bits) {
			bit = other.bits[i/8] >> (i % 8) & 1
		}
		w.write(uint64(bit), 1)
	}
}

func (w *groundVolumeTestWriter) bytes() []byte {
	for len(w.bits) < (w.bit+7)/8 {
		w.bits = append(w.bits, 0)
	}
	return w.bits
}

func (w *groundVolumeTestWriter) memberHeader(handle, width uint32) {
	w.packed(handle + 1)
	w.packed(width)
}

// groundVolumeTestWindow builds one FragmentInfo entry with a triangular cell.
func groundVolumeTestWindow() ([]byte, int32) {
	exterior := &groundVolumeTestWriter{}
	exterior.packed(1)
	exterior.packed(1)
	exterior.memberHeader(27, 8)
	exterior.write(0, 8)
	exterior.memberHeader(28, 8)
	exterior.write(1, 8)
	exterior.packed(0)
	exterior.packed(0)

	points := &groundVolumeTestWriter{}
	points.packed(3)
	coords := [][3]float64{
		{100, 200, 10},
		{300, 200, 10},
		{300, 400, 10},
	}
	for index, point := range coords {
		points.packed(uint32(index + 1))
		points.memberHeader(31, 192)
		points.f64(point[0])
		points.f64(point[1])
		points.f64(point[2])
		points.packed(0)
	}
	points.packed(0)

	body := &groundVolumeTestWriter{}
	body.write(1, 1)
	body.i32(0)
	body.i32(0)
	body.i32(0)
	body.i32(1)
	body.i32(42)
	body.memberHeader(24, 1)
	body.write(1, 1)
	body.memberHeader(25, 3)
	body.write(0, 3)
	body.memberHeader(26, uint32(exterior.bit))
	body.copyFrom(exterior)
	body.memberHeader(30, uint32(points.bit))
	body.copyFrom(points)
	body.packed(0)

	window := &groundVolumeTestWriter{}
	window.serializeInt(0, groundVolumeCNCSlots)
	window.packed(uint32(body.bit))
	window.copyFrom(body)
	return window.bytes(), int32(window.bit)
}

func TestDecodeGroundVolumeWindow(t *testing.T) {
	schema := map[uint32]groundVolumeIdentity{
		24: groundVolumeActiveField,
		25: groundVolumeStatusField,
		26: groundVolumeExteriorField,
		27: groundVolumeBeginField,
		28: groundVolumeEndField,
		30: groundVolumePointsField,
		31: groundVolumePointField,
	}
	raw, bitCount := groundVolumeTestWindow()
	cells, err := decodeGroundVolumeWindow(raw, bitCount, schema)
	if err != nil {
		t.Fatal(err)
	}
	if len(cells) != 1 {
		t.Fatalf("cells = %#v, want one", cells)
	}
	cell := cells[0]
	if cell.itemID != 42 || !cell.active || cell.status != 0 {
		t.Fatalf("cell identity/state = %#v", cell)
	}
	if len(cell.points) != 3 || len(cell.exterior) != 1 {
		t.Fatalf("cell geometry = %#v", cell)
	}
	if cell.points[0] != (groundVolumeVector3{x: 100, y: 200, z: 10}) {
		t.Errorf("first point = %#v", cell.points[0])
	}
	if cell.exterior[0] != (groundVolumeSegment{begin: 0, end: 1}) {
		t.Errorf("exterior segment = %#v", cell.exterior[0])
	}
}

func TestDecodeGroundVolumeWindowRejectsTruncatedPayload(t *testing.T) {
	window := &groundVolumeTestWriter{}
	window.serializeInt(0, groundVolumeCNCSlots)
	window.packed(40)
	window.write(1, 1)

	if _, err := decodeGroundVolumeWindow(window.bytes(), int32(window.bit), nil); err == nil {
		t.Fatal("truncated window decoded successfully")
	}
}

func TestReadGroundVolumeShapes(t *testing.T) {
	dir := t.TempDir()
	manifest := map[string]any{
		"net_field_export_groups": []any{
			map[string]any{
				"path": groundVolumeClassGroup,
				"fields": []any{
					map[string]any{"handle": 24, "name": "bIsActive", "compatible_checksum": 518428974},
					map[string]any{"handle": 25, "name": "Status", "compatible_checksum": 2380676387},
					map[string]any{"handle": 26, "name": "ExteriorSegments", "compatible_checksum": 3326329067},
					map[string]any{"handle": 27, "name": "Begin", "compatible_checksum": 3658211664},
					map[string]any{"handle": 28, "name": "End", "compatible_checksum": 1988330146},
					map[string]any{"handle": 30, "name": "ConvexHullPoints", "compatible_checksum": 3039966384},
					map[string]any{"handle": 31, "name": "ConvexHullPoints", "compatible_checksum": 2749781999},
				},
			},
			map[string]any{
				"path": groundVolumeCNCGroup,
				"fields": []any{
					map[string]any{"handle": 0, "name": "FragmentInfo", "compatible_checksum": 2225407835},
				},
			},
		},
	}
	data, err := json.Marshal(manifest)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "manifest.json"), data, 0o644); err != nil {
		t.Fatal(err)
	}

	class := "/Game/Characters/Pandemic/S0/Ability_X/Patch_Pandemic_X_Circular.Patch_Pandemic_X_Circular_C"
	actors := []stateActorRow{{
		TimeMS: 1000, PacketID: 1, ActorNetGUID: 900, Event: "open",
		ClassPath: &class, SpawnX: float32Ptr(100), SpawnY: float32Ptr(200),
	}}
	if err := parquet.WriteFile(filepath.Join(dir, "actors.parquet"), actors); err != nil {
		t.Fatal(err)
	}
	raw, bitCount := groundVolumeTestWindow()
	fieldName := groundVolumeTailField
	fields := []fieldRow{{
		TimeMS: 1100, PacketID: 2, ActorNetGUID: 900, ObjectNetGUID: uint32Ptr(901),
		GroupPath: groundVolumeClassGroup, Handle: 0, FieldName: &fieldName,
		BitCount: bitCount, RawBits: raw,
	}}
	if err := parquet.WriteFile(filepath.Join(dir, "fields.parquet"), fields); err != nil {
		t.Fatal(err)
	}

	shapes := readGroundVolumeShapes(dir, "13.02", map[uint32]*utilityActor{
		900: {GUID: 900, Class: class},
	})
	shape := shapes[900]
	if shape == nil {
		t.Fatal("Viper's Pit shape was not decoded")
	}
	if len(shape.polygons) != 1 || len(shape.boundary) != 1 {
		t.Fatalf("shape = %#v", shape)
	}
	if shape.polygons[0][0] != (Position{X: 100, Y: 200}) {
		t.Errorf("first polygon point = %v", shape.polygons[0][0])
	}
	if shape.boundary[0][0] != (Position{X: 100, Y: 200}) ||
		shape.boundary[0][1] != (Position{X: 300, Y: 200}) {
		t.Errorf("boundary = %v", shape.boundary[0])
	}
}
