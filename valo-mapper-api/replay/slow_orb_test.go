package replay

import (
	"encoding/binary"
	"path/filepath"
	"testing"

	"github.com/parquet-go/parquet-go"
)

func slowOrbTestNodeArray(statuses []uint32) ([]byte, int32) {
	writer := &groundVolumeTestWriter{}
	writer.packed(uint32(len(statuses)))
	for index, status := range statuses {
		writer.packed(uint32(index + 1))
		writer.memberHeader(8, 32)
		writer.f32(600)
		writer.memberHeader(9, 32)
		writer.f32(660)
		writer.memberHeader(10, 32)
		writer.f32(1)
		writer.memberHeader(11, 48)
		writer.serializeInt(32768, slowOrbNormalMax)
		writer.serializeInt(32768, slowOrbNormalMax)
		writer.serializeInt(65535, slowOrbNormalMax)
		writer.memberHeader(12, 1)
		writer.write(0, 1)
		writer.memberHeader(13, 3)
		writer.write(uint64(status), 3)
		writer.packed(0)
	}
	writer.packed(0)
	return writer.bytes(), int32(writer.bit)
}

func slowOrbTestInt32(value int32) []byte {
	raw := make([]byte, 4)
	binary.LittleEndian.PutUint32(raw, uint32(value))
	return raw
}

func TestDecodeSlowOrbNodes(t *testing.T) {
	raw, bits := slowOrbTestNodeArray([]uint32{3, 4, 0})
	nodes, err := decodeSlowOrbNodes(raw, bits)
	if err != nil {
		t.Fatal(err)
	}
	if len(nodes) != 3 {
		t.Fatalf("nodes = %#v", nodes)
	}
	if nodes[0].status != 3 || nodes[1].status != 4 || nodes[2].status != 0 {
		t.Fatalf("statuses = %#v", nodes)
	}
}

func TestDecodeSlowOrbNodesRejectsTruncatedArray(t *testing.T) {
	raw, bits := slowOrbTestNodeArray([]uint32{3})
	if _, err := decodeSlowOrbNodes(raw, bits-8); err == nil {
		t.Fatal("truncated node array decoded successfully")
	}
}

func TestReadSlowOrbShapes(t *testing.T) {
	dir := t.TempDir()
	statuses := []uint32{
		0, 3, 0,
		3, 3, 3,
		0, 3, 0,
	}
	nodeRaw, nodeBits := slowOrbTestNodeArray(statuses)
	validRaw := []byte{1}
	group := "/Game/Characters/Thorne/S0/Ability_4/" +
		"Patch_Thorne_4_SlowField_Production.Patch_Thorne_4_SlowField_Production_C_ClassNetCache"
	field := func(name string, raw []byte, bits int32) fieldRow {
		return fieldRow{
			TimeMS: 1000, PacketID: 7, ActorNetGUID: 900,
			GroupPath: group, FieldName: stringPtr("NetMulticastUpdateNodeGrid." + name),
			BitCount: bits, RawBits: raw,
		}
	}
	fields := []fieldRow{
		field("X", slowOrbTestInt32(-1), 32),
		field("Y", slowOrbTestInt32(-1), 32),
		field("X", slowOrbTestInt32(1), 32),
		field("Y", slowOrbTestInt32(1), 32),
		field("LineSize", slowOrbTestInt32(3), 32),
		field("bPatchIsValid", validRaw, 1),
		field("NodeArray", nodeRaw, nodeBits),
	}
	if err := parquet.WriteFile(filepath.Join(dir, "fields.parquet"), fields); err != nil {
		t.Fatal(err)
	}

	yaw := float32(0)
	actors := map[uint32]*utilityActor{
		900: {
			GUID: 900,
			Class: "/Game/Characters/Thorne/S0/Ability_4/" +
				"Patch_Thorne_4_SlowField_Production.Patch_Thorne_4_SlowField_Production_C",
			Events: []utilityActorEvent{{
				TimeMS: 900, Event: "open",
				Spawn:    &Position{X: 1000, Y: 2000},
				SpawnYaw: &yaw,
			}},
		},
	}

	shapes := readSlowOrbShapes(dir, actors)
	shape := shapes[900]
	if shape == nil {
		t.Fatal("slow-orb shape was not decoded")
	}
	if len(shape.polygons) != 5 {
		t.Fatalf("polygons = %d, want 5", len(shape.polygons))
	}
	if len(shape.boundary) != 12 {
		t.Fatalf("boundary = %d, want 12", len(shape.boundary))
	}
	want := []Position{
		{X: 900, Y: 1700},
		{X: 1100, Y: 1700},
		{X: 1100, Y: 1900},
		{X: 900, Y: 1900},
	}
	for index, position := range shape.polygons[0] {
		if position != want[index] {
			t.Fatalf("first polygon = %#v, want %#v", shape.polygons[0], want)
		}
	}
}

func TestReadSlowOrbShapesRoundsYawToQuarterTurn(t *testing.T) {
	dir := t.TempDir()
	nodeRaw, nodeBits := slowOrbTestNodeArray([]uint32{
		3, 3, 3,
		3, 0, 3,
		3, 3, 3,
	})
	group := "/Game/Characters/Thorne/S0/Ability_4/" +
		"Patch_Thorne_4_SlowField_Production.Patch_Thorne_4_SlowField_Production_C_ClassNetCache"
	field := func(name string, raw []byte, bits int32) fieldRow {
		return fieldRow{
			TimeMS: 1000, PacketID: 7, ActorNetGUID: 900,
			GroupPath: group, FieldName: stringPtr("NetMulticastUpdateNodeGrid." + name),
			BitCount: bits, RawBits: raw,
		}
	}
	fields := []fieldRow{
		field("X", slowOrbTestInt32(-1), 32),
		field("Y", slowOrbTestInt32(-1), 32),
		field("X", slowOrbTestInt32(1), 32),
		field("Y", slowOrbTestInt32(1), 32),
		field("LineSize", slowOrbTestInt32(3), 32),
		field("bPatchIsValid", []byte{1}, 1),
		field("NodeArray", nodeRaw, nodeBits),
	}
	if err := parquet.WriteFile(filepath.Join(dir, "fields.parquet"), fields); err != nil {
		t.Fatal(err)
	}
	yaw := float32(87)
	actors := map[uint32]*utilityActor{
		900: {
			GUID: 900,
			Class: "/Game/Characters/Thorne/S0/Ability_4/" +
				"Patch_Thorne_4_SlowField_Production.Patch_Thorne_4_SlowField_Production_C",
			Events: []utilityActorEvent{{
				TimeMS: 900, Event: "open",
				Spawn:    &Position{X: 1000, Y: 2000},
				SpawnYaw: &yaw,
			}},
		},
	}

	shape := readSlowOrbShapes(dir, actors)[900]
	if shape == nil {
		t.Fatal("slow-orb shape was not decoded")
	}
	// yaw 87 rounds to 90 degrees: local +X becomes world +Y.
	first := shape.polygons[0]
	if first[0] != (Position{X: 1300, Y: 1700}) ||
		first[1] != (Position{X: 1300, Y: 1900}) {
		t.Fatalf("rotated polygon = %#v", first)
	}
}
