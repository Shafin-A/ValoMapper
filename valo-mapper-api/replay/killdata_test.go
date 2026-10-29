package replay

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type testBitWriter struct {
	bits []byte
}

func (w *testBitWriter) write(value uint64, width int) {
	for i := 0; i < width; i++ {
		w.bits = append(w.bits, byte((value>>i)&1))
	}
}

func (w *testBitWriter) packed(value uint64) {
	for {
		b := byte((value & 0x7f) << 1)
		value >>= 7
		if value != 0 {
			b |= 1
		}
		w.write(uint64(b), 8)
		if value == 0 {
			return
		}
	}
}

func (w *testBitWriter) leaf(handle int, width int, emit func(width int)) {
	w.packed(uint64(handle + 1))
	w.packed(uint64(width))
	emit(width)
}

func (w *testBitWriter) bytes() ([]byte, int32) {
	out := make([]byte, (len(w.bits)+7)/8)
	for i, bit := range w.bits {
		if bit != 0 {
			out[i/8] |= 1 << (i % 8)
		}
	}
	return out, int32(len(w.bits))
}

func writePackedRef(w *testBitWriter, ref uint32) {
	value := uint64(ref)
	width := 0
	for {
		b := byte((value & 0x7f) << 1)
		value >>= 7
		if value != 0 {
			b |= 1
		}
		w.write(uint64(b), 8)
		width += 8
		if value == 0 {
			return
		}
	}
}

func TestDecodeKillDataArray(t *testing.T) {
	w := &testBitWriter{}
	w.packed(1) // capacity
	w.packed(1) // element 0
	w.leaf(3, 16, func(width int) { writePackedRef(w, 250) })
	w.leaf(4, 16, func(width int) { writePackedRef(w, 4693) })
	w.leaf(9, 16, func(width int) { writePackedRef(w, 4623) })
	w.packed(0) // end fields
	w.packed(0) // end elements
	raw, bitCount := w.bytes()

	elements := decodeKillDataArray(raw, bitCount)
	if len(elements) != 1 {
		t.Fatalf("elements = %d, want 1", len(elements))
	}
	if elements[0].Victim != 250 ||
		elements[0].KillingEquippable != 4693 ||
		elements[0].DamageType != 4623 {
		t.Fatalf("element = %+v", elements[0])
	}
}

func TestDecodeKillDataArrayRejectsMalformedWindows(t *testing.T) {
	if got := decodeKillDataArray(nil, 0); got != nil {
		t.Fatalf("empty window = %+v", got)
	}
	if got := decodeKillDataArray([]byte{0x02}, 32); got != nil {
		t.Fatalf("length mismatch = %+v", got)
	}
	if got := decodeKillDataArray([]byte{0x02}, 8); got != nil {
		t.Fatalf("truncated array = %+v", got)
	}
}

func TestResolveKillSource(t *testing.T) {
	tests := []struct {
		name       string
		equippable string
		damage     string
		wantType   string
		wantItem   string
	}{
		{
			name:       "rifle",
			equippable: "AssaultRifle_AK_C",
			damage:     "DmgType_AK_C",
			wantType:   damageTypeWeapon,
		},
		{
			name:       "sidearm",
			equippable: "BasePistol_C",
			damage:     "DmgType_AutomaticPistol_C",
			wantType:   damageTypeWeapon,
		},
		{
			name:       "raze ultimate",
			equippable: "Ability_Clay_X_RocketLauncher_C",
			damage:     "DmgType_Clay_X_Rocket_C",
			wantType:   damageTypeAbility,
			wantItem:   "9438BE81-46B8-D8B0-8A66-F9A0251FB728",
		},
		{
			name:       "raze paint shells",
			equippable: "",
			damage:     "DmgType_Clay_4_Projectile_Secondary_Explosion_C",
			wantType:   damageTypeAbility,
			wantItem:   "6BD46791-4F27-AA65-7D67-3F8D9D8B8B90",
		},
		{
			name:       "raze boom bot",
			equippable: "Ability_Clay_E_Boomba_C",
			damage:     "DmgType_Clay_E_Boomba_C",
			wantType:   damageTypeAbility,
			wantItem:   "2E20A5AF-4726-95F6-7D9C-9DB9A18DADA9",
		},
		{
			name:       "jett blade storm",
			equippable: "Ability_Wushu_X_Dagger_Production_C",
			damage:     "DmgType_Wushu_X_Dagger_C",
			wantType:   damageTypeAbility,
			wantItem:   "129B0CFB-4C77-45E5-BA86-5694B231B242",
		},
		{
			name:       "chamber headhunter",
			equippable: "Gun_Deadeye_Q_Pistol_C",
			damage:     "DmgType_Deadeye_Q_Pistol_C",
			wantType:   damageTypeWeapon,
			wantItem:   "856D9A7E-4B06-DC37-15DC-9D809C37CB90",
		},
		{
			name:       "chamber tour de force",
			equippable: "Gun_Deadeye_X_Giantslayer_Prototype_FireRatePrototype_C",
			damage:     "DmgType_Deadeye_Giantslayer_C",
			wantType:   damageTypeWeapon,
			wantItem:   "39099FB5-4293-DEF4-1E09-2E9080CE7456",
		},
		{"fall", "", "DmgType_Fall_C", damageTypeFall, ""},
		{"spike", "", "DmgType_SpikeExplosion_C", damageTypeBomb, ""},
		{"missing", "", "", "", ""},
		{
			name:       "melee class",
			equippable: "Melee_Knife_C",
			damage:     "DmgType_Knife_C",
			wantType:   damageTypeMelee,
			wantItem:   "2F59173C-4BED-B6C3-2191-DEA9B58BE9C7",
		},
		{
			name:       "unmapped ability keeps the fallback",
			equippable: "Ability_Mage_X_Teleport_C",
			damage:     "DmgType_Mage_X_Teleport_C",
			wantType:   "",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := resolveKillSource(test.equippable, test.damage)
			if got.DamageType != test.wantType || got.DamageItem != test.wantItem {
				t.Fatalf("resolveKillSource(%q, %q) = %+v, want type %q item %q",
					test.equippable, test.damage, got, test.wantType, test.wantItem)
			}
		})
	}
}

func TestKillstreamAssetsExist(t *testing.T) {
	assetDir := filepath.Join("..", "..", "valo-mapper", "public", "weapons")
	if _, err := os.Stat(assetDir); err != nil {
		t.Fatalf("weapon asset directory %s: %v", assetDir, err)
	}

	for _, source := range killstreamSources {
		if source.DamageType != damageTypeAbility &&
			source.DamageType != damageTypeMelee &&
			source.DamageType != damageTypeWeapon {
			t.Errorf("%s has an unexpected damage type %q", source.Fragment, source.DamageType)
		}
		if source.UUID != strings.ToUpper(source.UUID) {
			t.Errorf("%s: UUID %s is not uppercase", source.Fragment, source.UUID)
		}
		path := filepath.Join(assetDir, source.UUID+"_killstream.png")
		info, err := os.Stat(path)
		if err != nil {
			t.Errorf("%s: missing killstream asset %s: %v", source.Fragment, path, err)
			continue
		}
		if info.Size() == 0 {
			t.Errorf("%s: killstream asset %s is empty", source.Fragment, path)
		}
	}
}

func TestMatchKillData(t *testing.T) {
	state := &stateScan{Kills: []killDataSample{
		{
			TimeMS:        1_008,
			KillerSubject: "killer",
			VictimSubject: "victim",
			DamageType:    "Weapon",
			DamageItem:    "weapon-uuid",
		},
		{
			TimeMS:        2_500,
			KillerSubject: "other",
			VictimSubject: "victim",
			DamageType:    "Weapon",
		},
	}}

	match, ok := matchKillData(state, "killer", "victim", 1_000)
	if !ok || match.TimeMS != 1_008 || match.DamageType != "Weapon" ||
		match.DamageItem != "weapon-uuid" {
		t.Fatalf("match = %+v, ok = %v", match, ok)
	}

	if _, ok := matchKillData(state, "killer", "victim", 1_000-500); ok {
		t.Fatal("matched a snapshot outside the window")
	}
	if _, ok := matchKillData(state, "killer", "someone", 1_000); ok {
		t.Fatal("matched a different victim")
	}
	if _, ok := matchKillData(state, "someone", "victim", 1_000); ok {
		t.Fatal("matched a different killer")
	}
	if _, ok := matchKillData(nil, "killer", "victim", 1_000); ok {
		t.Fatal("matched without state")
	}
}
