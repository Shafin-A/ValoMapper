package replay

import (
	"strings"
	"testing"
)

func TestParseCastChild(t *testing.T) {
	tests := []struct {
		name   string
		field  string
		index  int
		member string
		ok     bool
	}{
		{
			name:   "cast time with type suffix",
			field:  "AbilityCastsThisRound[0].CastTime_4_5AE288704801A9B74D6D159DFC2BD147",
			index:  0,
			member: "CastTime",
			ok:     true,
		},
		{
			name:   "slot with multi digit index",
			field:  "AbilityCastsThisRound[12].Slot_7_ABCDEF",
			index:  12,
			member: "Slot",
			ok:     true,
		},
		{
			name:   "player string member",
			field:  "AbilityCastsThisRound[3].Player_11_0963330440D68BDF1A8E34B035420342",
			index:  3,
			member: "Player",
			ok:     true,
		},
		{
			name:  "unrelated field",
			field: "Money",
			ok:    false,
		},
		{
			name:  "array container row",
			field: "AbilityCastsThisRound[0]",
			ok:    false,
		},
		{
			name:  "non numeric index",
			field: "AbilityCastsThisRound[x].Slot_1_ABC",
			ok:    false,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			index, member, ok := parseCastChild(test.field)
			if ok != test.ok {
				t.Fatalf("ok = %v, want %v", ok, test.ok)
			}
			if !test.ok {
				return
			}
			if index != test.index || member != test.member {
				t.Fatalf("got %d/%q, want %d/%q", index, member, test.index, test.member)
			}
		})
	}
}

func TestCollectStateFieldParsesSuffixedCastMembers(t *testing.T) {
	const group = "/Game/Characters/_Core/Comp_AbilityStatisticsReplicator.Comp_AbilityStatisticsReplicator_C"
	const actor = uint32(500)

	scan := &fieldScan{State: newFieldStateRows()}
	rows := []fieldRow{
		{
			TimeMS: 1000, PacketID: 7, ActorNetGUID: actor, GroupPath: group,
			FieldName: ptr("AbilityCastsThisRound[0].Slot_7_ABC"), ValueI64: ptr(int64(3)),
		},
		{
			TimeMS: 1000, PacketID: 7, ActorNetGUID: actor, GroupPath: group,
			FieldName: ptr("AbilityCastsThisRound[0].Round_22_ABC"), ValueI64: ptr(int64(0)),
		},
		{
			TimeMS: 1000, PacketID: 7, ActorNetGUID: actor, GroupPath: group,
			FieldName: ptr("AbilityCastsThisRound[0].CastTime_4_ABC"), ValueF64: ptr(float64(4.5)),
		},
		{
			TimeMS: 1000, PacketID: 7, ActorNetGUID: actor, GroupPath: group,
			FieldName: ptr("AbilityCastsThisRound[0].Player_11_ABC"),
			ValueStr:  ptr("34B9A457-EF16-5856-BD2E-158BE2DBCE3A"),
		},
		{
			TimeMS: 1000, PacketID: 7, ActorNetGUID: actor, GroupPath: group,
			FieldName: ptr("AbilityCastsThisRound[0].Effects[0].AffectedTargetsArray[0].Value_5_ABC"),
			ValueF64:  ptr(float64(12)),
		},
		{
			TimeMS: 2000, PacketID: 8, ActorNetGUID: actor,
			GroupPath: "/Script/ShooterGame.AresInventory",
			FieldName: ptr("AbilityCastsThisRound[1].Slot_7_ABC"), ValueI64: ptr(int64(4)),
		},
	}

	for i := range rows {
		name := *rows[i].FieldName
		if !stateFieldCandidate(name) {
			t.Fatalf("candidate rejected %q", name)
		}
		scan.collectStateField(&rows[i], name)
	}

	if len(scan.State.Casts) != 1 {
		t.Fatalf("elements = %d, want 1", len(scan.State.Casts))
	}
	element := scan.State.Casts[castKey{Actor: actor, TimeMS: 1000, PacketID: 7, Index: 0}]
	if element == nil {
		t.Fatal("element was not collected")
	}
	if !element.HasSlot || element.Slot != 3 {
		t.Errorf("slot = %d/%v", element.Slot, element.HasSlot)
	}
	if !element.HasRound || element.Round != 0 {
		t.Errorf("round = %d/%v", element.Round, element.HasRound)
	}
	if !element.HasCastTime || element.CastTime != 4.5 {
		t.Errorf("cast time = %f/%v", element.CastTime, element.HasCastTime)
	}
	if element.Player != "34b9a457-ef16-5856-bd2e-158be2dbce3a" {
		t.Errorf("player = %q", element.Player)
	}
}

func TestResolveCastsUsesBuyEndAndDedupes(t *testing.T) {
	const subject = testSubject
	const actor = uint32(500)

	index := newPlayerIndex(&Manifest{Players: []ManifestPlayer{{
		ActorNetGUID:      100,
		Subject:           subject,
		CharacterNetGUID:  ptr(actor),
		CharacterNetGUIDs: []uint32{actor},
	}}})

	windows := []roundWindow{
		{RoundNumber: 1, StartMS: 1000, EndMS: 100000, BuyEndMS: ptr(uint32(2000))},
		{RoundNumber: 2, StartMS: 100000, EndMS: 200000, BuyEndMS: ptr(uint32(101000))},
		{RoundNumber: 3, StartMS: 200000, EndMS: 300000},
	}

	raw := newFieldStateRows()
	add := func(timeMS, packet uint32, element castElement) {
		raw.Casts[castKey{Actor: actor, TimeMS: timeMS, PacketID: packet, Index: 0}] = &element
	}

	// Explicit round: absolute time is buy end plus the cast offset.
	add(5000, 1, castElement{Slot: 3, HasSlot: true, CastTime: 5, HasCastTime: true, Round: 0, HasRound: true})
	// A repeated send of the same cast must not create a second entry.
	add(7000, 2, castElement{Slot: 3, HasSlot: true, CastTime: 5, HasCastTime: true, Round: 0, HasRound: true})
	// No round: the replication time is 100 ms after the round-2 buy end plus
	// the cast offset, so the cast belongs to round 2.
	add(113100, 3, castElement{Slot: 4, HasSlot: true, CastTime: 12, HasCastTime: true})
	// No round and no buy end explains the replication time.
	add(90000, 4, castElement{Slot: 5, HasSlot: true, CastTime: 50, HasCastTime: true})
	// Unknown slot values are never guessed.
	add(5000, 5, castElement{Slot: 0, HasSlot: true, CastTime: 1, HasCastTime: true, Round: 0, HasRound: true})
	// A cast owned by an actor outside the manifest roster is not attributed.
	raw.Casts[castKey{Actor: 999, TimeMS: 5000, PacketID: 6, Index: 0}] = &castElement{
		Slot: 3, HasSlot: true, CastTime: 1, HasCastTime: true, Round: 0, HasRound: true,
	}
	// A round with no buy phase keeps the replication time.
	add(250000, 7, castElement{Slot: 9, HasSlot: true, CastTime: 30, HasCastTime: true, Round: 2, HasRound: true})
	// A round number outside the played rounds is not kept.
	add(5000, 8, castElement{Slot: 9, HasSlot: true, CastTime: 1, HasCastTime: true, Round: 7, HasRound: true})

	got := resolveCasts(windows, index, &raw)

	if len(got.Casts) != 3 {
		t.Fatalf("casts = %d, want 3: %v", len(got.Casts), got.Casts)
	}
	if got.UnknownSlot != 1 {
		t.Errorf("unknown slot = %d, want 1", got.UnknownSlot)
	}
	if got.Unresolved != 1 {
		t.Errorf("unresolved = %d, want 1", got.Unresolved)
	}
	if got.Skipped != 2 {
		t.Errorf("skipped = %d, want 2", got.Skipped)
	}
	if got.WithoutBuyEnd != 1 {
		t.Errorf("without buy end = %d, want 1", got.WithoutBuyEnd)
	}

	explicit := castIdentity{Subject: subject, Round: 0, Slot: 3, CastMS: 5000}
	if abs := got.Casts[explicit]; abs != 7000 {
		t.Errorf("explicit cast = %d, want 7000", abs)
	}
	recovered := castIdentity{Subject: subject, Round: 1, Slot: 4, CastMS: 12000}
	if abs := got.Casts[recovered]; abs != 113000 {
		t.Errorf("recovered cast = %d, want 113000", abs)
	}
	noBuyEnd := castIdentity{Subject: subject, Round: 2, Slot: 9, CastMS: 30000}
	if abs := got.Casts[noBuyEnd]; abs != 250000 {
		t.Errorf("no-buy-end cast = %d, want 250000", abs)
	}
}

func TestApplyRoundStatsFillsScoreboard(t *testing.T) {
	const subject = testSubject
	const puuid = "vrf-test"
	const actor = uint32(500)

	windows := []roundWindow{
		{RoundNumber: 1, StartMS: 1000, EndMS: 90000, BuyEndMS: ptr(uint32(5000))},
	}
	players := []Player{{Puuid: puuid}}
	index := newPlayerIndex(&Manifest{Players: []ManifestPlayer{{
		ActorNetGUID:      100,
		Subject:           subject,
		CharacterNetGUID:  ptr(actor),
		CharacterNetGUIDs: []uint32{actor},
	}}})
	puuidBySubject := map[string]string{subject: puuid}

	raw := newFieldStateRows()
	raw.Casts[castKey{Actor: actor, TimeMS: 20000, PacketID: 1, Index: 0}] = &castElement{
		Slot: 3, HasSlot: true, CastTime: 10, HasCastTime: true, Round: 0, HasRound: true,
	}
	raw.Casts[castKey{Actor: actor, TimeMS: 26000, PacketID: 2, Index: 0}] = &castElement{
		Slot: 3, HasSlot: true, CastTime: 14, HasCastTime: true, Round: 0, HasRound: true,
	}
	raw.Casts[castKey{Actor: actor, TimeMS: 30000, PacketID: 3, Index: 0}] = &castElement{
		Slot: 9, HasSlot: true, CastTime: 31, HasCastTime: true, Round: 0, HasRound: true,
	}
	raw.Casts[castKey{Actor: actor, TimeMS: 40000, PacketID: 4, Index: 0}] = &castElement{
		Slot: 5, HasSlot: true, CastTime: 20, HasCastTime: true, Round: 0, HasRound: true,
	}

	state := &stateScan{
		Timelines: map[string][]stateSample{subject: {
			{
				TimeMS: 5000, HP: 100, Alive: true, Credits: 3900,
				WeaponID: "gun", ArmorID: "armor", HealthTimeMS: 5000,
			},
		}},
		Incoming: []incomingWrite{
			{Subject: subject, TimeMS: 10000, Damage: 60},
			{Subject: subject, TimeMS: 20000, Damage: 75.4},
			{Subject: subject, TimeMS: 95000, Damage: 999},
		},
	}
	logs := map[int]*roundLog{
		1: {Stats: map[string]*PlayerStats{
			puuid: {Puuid: puuid, AbilityCasts: map[string]int{}},
		}},
	}

	applyRoundStats(windows, players, index, puuidBySubject, state, &raw, logs, newWarnings())

	stats := logs[1].Stats[puuid]
	if stats.Economy.Remaining != 3900 {
		t.Errorf("remaining = %d, want 3900", stats.Economy.Remaining)
	}
	if stats.WeaponID != "gun" || stats.ArmorID != "armor" {
		t.Errorf("loadout = %q/%q", stats.WeaponID, stats.ArmorID)
	}
	if stats.IncomingDamage != 135 {
		t.Errorf("incoming damage = %d, want 135", stats.IncomingDamage)
	}
	// The earliest grenade casts at 15000 absolute, which is 14000 into the
	// round; the later grenade and the ultimate are kept as separate slots.
	if stats.AbilityCasts["Grenade"] != 14000 {
		t.Errorf("grenade = %d, want 14000", stats.AbilityCasts["Grenade"])
	}
	if stats.AbilityCasts["Ultimate"] != 35000 {
		t.Errorf("ultimate = %d, want 35000", stats.AbilityCasts["Ultimate"])
	}
	// Slot 5 is Ability2, the second basic ability.
	if stats.AbilityCasts["Ability2"] != 24000 {
		t.Errorf("ability2 = %d, want 24000", stats.AbilityCasts["Ability2"])
	}
	if len(stats.AbilityCasts) != 3 {
		t.Errorf("ability casts = %v, want three entries", stats.AbilityCasts)
	}
	if state.CastsUnique != 4 {
		t.Errorf("cast counter = %d, want 4", state.CastsUnique)
	}
}

func TestApplyRoundStatsFallsBackToRoundStart(t *testing.T) {
	const subject = testSubject
	const puuid = "vrf-test"
	const actor = uint32(500)

	windows := []roundWindow{
		{RoundNumber: 1, StartMS: 1000, EndMS: 90000},
	}
	players := []Player{{Puuid: puuid}}
	index := newPlayerIndex(&Manifest{Players: []ManifestPlayer{{
		ActorNetGUID:      100,
		Subject:           subject,
		CharacterNetGUID:  ptr(actor),
		CharacterNetGUIDs: []uint32{actor},
	}}})
	puuidBySubject := map[string]string{subject: puuid}

	state := &stateScan{
		Timelines: map[string][]stateSample{subject: {
			{TimeMS: 900, HP: 100, Alive: true, Credits: 800, WeaponID: "gun", HealthTimeMS: 900},
		}},
	}
	logs := map[int]*roundLog{
		1: {Stats: map[string]*PlayerStats{
			puuid: {Puuid: puuid, AbilityCasts: map[string]int{}},
		}},
	}
	empty := newFieldStateRows()

	applyRoundStats(windows, players, index, puuidBySubject, state, &empty, logs, newWarnings())

	stats := logs[1].Stats[puuid]
	if stats.Economy.Remaining != 800 || stats.WeaponID != "gun" {
		t.Errorf("stats = %+v", stats)
	}
	if len(stats.AbilityCasts) != 0 {
		t.Errorf("ability casts = %v, want none", stats.AbilityCasts)
	}
}

// TestApplyRoundStatsWarnsOnceWhenBuyEndMissing covers a round with no
// resolvable buy phase: every cast falls back to its replication time, but the
// user sees one warning rather than one per cast.
func TestApplyRoundStatsWarnsOnceWhenBuyEndMissing(t *testing.T) {
	const subject = testSubject
	const puuid = "vrf-test"
	const actor = uint32(500)

	windows := []roundWindow{
		{RoundNumber: 1, StartMS: 1000, EndMS: 90000},
	}
	players := []Player{{Puuid: puuid}}
	index := newPlayerIndex(&Manifest{Players: []ManifestPlayer{{
		ActorNetGUID:      100,
		Subject:           subject,
		CharacterNetGUID:  ptr(actor),
		CharacterNetGUIDs: []uint32{actor},
	}}})
	puuidBySubject := map[string]string{subject: puuid}

	raw := newFieldStateRows()
	raw.Casts[castKey{Actor: actor, TimeMS: 20000, PacketID: 1, Index: 0}] = &castElement{
		Slot: 3, HasSlot: true, CastTime: 5, HasCastTime: true, Round: 0, HasRound: true,
	}
	raw.Casts[castKey{Actor: actor, TimeMS: 26000, PacketID: 2, Index: 0}] = &castElement{
		Slot: 9, HasSlot: true, CastTime: 6, HasCastTime: true, Round: 0, HasRound: true,
	}

	state := &stateScan{
		Timelines: map[string][]stateSample{subject: {
			{TimeMS: 1000, HP: 100, Alive: true, HealthTimeMS: 1000},
		}},
	}
	logs := map[int]*roundLog{
		1: {Stats: map[string]*PlayerStats{
			puuid: {Puuid: puuid, AbilityCasts: map[string]int{}},
		}},
	}
	warnings := newWarnings()

	applyRoundStats(windows, players, index, puuidBySubject, state, &raw, logs, warnings)

	if state.CastsWithoutBuyEnd != 2 {
		t.Errorf("casts without a buy end = %d, want 2", state.CastsWithoutBuyEnd)
	}
	got := warnings.all()
	if len(got) != 1 {
		t.Fatalf("warnings = %v, want one", got)
	}
	if !strings.Contains(got[0], "buy phase") {
		t.Errorf("warning = %q, want the missing-buy-phase message", got[0])
	}
}
