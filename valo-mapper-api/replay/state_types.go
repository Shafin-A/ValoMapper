package replay

import (
	"sort"
)

// stateSample is one subject's complete state at TimeMS. It is an internal
// snapshot, not a wire frame.
type stateSample struct {
	TimeMS       uint32
	HP           int
	Alive        bool
	Credits      int
	WeaponID     string
	ArmorID      string
	ArmorPoints  int
	HealthTimeMS uint32
}

type stateScan struct {
	Timelines map[string][]stateSample
	Paths     map[uint32]string

	// Incoming records every damage write that landed on a manifest pawn. The
	// per-round total is summed once the round windows exist.
	Incoming []incomingWrite

	// Hits records gun damage events with both subjects resolved, ready to
	// attach to a round window.
	Hits []hitSample

	HPWrites            int
	HPUnresolvedSection int
	HPNonPlayer         int
	Deaths              int

	MoneyWrites        int
	PlantCreditBonuses int

	WeaponChanges    int
	WeaponWrites     int
	WeaponZero       int
	WeaponUnresolved int

	ArmorItems        int
	ArmorUnowned      int
	ArmorUnplaced     int
	ArmorUnattributed int
	DamageIncomplete  int

	CastsUnique        int
	CastsSkipped       int
	CastsUnknownSlot   int
	CastsUnresolved    int
	CastsWithoutBuyEnd int
	CastsBeforeBuyEnd  int

	AbilityCharges           []abilityChargeSample
	AbilityChargeWrites      int
	AbilityChargeUnresolved  int
	AbilityChargeUnknownSlot int
	AbilityChargeUnmapped    int
	SignatureChargeWrites    int
	ChargeFolders            map[string]map[string]string

	UltimateSamples      []ultimateSample
	UltimatePointWrites  int
	UltimateActiveWrites int
	UltimateUnresolved   int

	Cooldowns           []cooldownWindow
	CooldownWrites      int
	CooldownWindows     int
	CooldownUnresolved  int
	CooldownUnknownSlot int
	CooldownUnmapped    int
	RechargeWindows     int

	Warnings []string

	// Actors and Outer are retained from scanState so the spike builder can
	// classify owners without reading actors.parquet a second time.
	Actors *stateActorView
	Outer  map[uint32]uint32
	Kills  []killDataSample
}

type incomingWrite struct {
	Subject string
	TimeMS  uint32
	Damage  float64
}

type stateWrite struct {
	TimeMS   uint32
	PacketID uint32
	Actor    uint32
	Value    int64
}

type damageKey struct {
	Function string
	Actor    uint32
	TimeMS   uint32
	PacketID uint32
	Index    int
}

// damageHitKey groups the scalar RPC params of one MulticastNotifyDamage_*
// call. The lifecycle array is handled separately, so the key has no index.
type damageHitKey struct {
	Function string
	Actor    uint32
	TimeMS   uint32
	PacketID uint32
}

type damageHitWrite struct {
	Damage      float64
	HasDamage   bool
	Shooter     uint32
	PlayerState uint32
	Victim      uint32
	Equippable  uint32
	DamageType  uint32
}

type hitSample struct {
	TimeMS         uint32
	ShooterSubject string
	VictimSubject  string
}

// damageElement is one LifeChangeEvents[i] / LifeChangeBySection[i] element.
// The four members arrive as separate rows, so the booleans distinguish a real
// zero from a missing member.
type damageElement struct {
	Changed    int64
	HasChanged bool
	Result     float64
	HasResult  bool
	Delta      float64
	HasDelta   bool
	Alive      bool
	HasAlive   bool
}

func (e *damageElement) complete() bool {
	return e.HasChanged && e.HasResult && e.HasDelta && e.HasAlive
}

// fieldStateRows is the state projection collected by the single scanFields
// pass. A second pass over the 1.9 M-row fields file costs 3.7–4.6 s, so the
// rows are collected while that file is already open.
type fieldStateRows struct {
	Damage    map[damageKey]*damageElement
	Hits      map[damageHitKey]*damageHitWrite
	Money     []stateWrite
	Inventory []stateWrite
	Owners    map[uint32]uint32
	Casts     map[castKey]*castElement
	KillData  []killDataWrite

	// Ownership history is kept in addition to the last-wins Owners map:
	// armour only needs the final owner, while spike custody needs every write.
	OwnerWrites      []stateWrite
	InstigatorWrites []stateWrite
	PlantedAtSites   []stateWrite

	// AbilityCharges keeps current-charge writes from ability item actors.
	AbilityCharges []abilityChargeWrite

	// ChargeActors marks every actor that carries an EquipmentChargeComponent,
	// including abilities that are never bought in the match.
	ChargeActors map[uint32]struct{}

	UltimatePoints []ultimatePointWrite
	UltimateActive []ultimateActiveWrite

	// Cooldowns live on ability item actors such as signature deployables.
	Cooldowns []cooldownWrite
}

// killDataWrite is one serialized PlayerMatchStatsComponent.KillData element.
// The export does not decode its children into columns, so the refs are read
// from the parent array's raw bits.
type killDataWrite struct {
	TimeMS            uint32
	KillerActor       uint32
	VictimActor       uint32
	KillingEquippable uint32
	DamageType        uint32
}

type killDataSample struct {
	TimeMS        uint32
	KillerSubject string
	VictimSubject string
	DamageType    string
	DamageItem    string
}

type abilityStateWrite struct {
	TimeMS        uint32
	PacketID      uint32
	ObjectNetGUID *uint32
	StateGUID     uint32
}

func sortAbilityStateWrites(writes map[uint32][]abilityStateWrite) {
	for guid := range writes {
		sort.SliceStable(writes[guid], func(i, j int) bool {
			if writes[guid][i].TimeMS != writes[guid][j].TimeMS {
				return writes[guid][i].TimeMS < writes[guid][j].TimeMS
			}
			return writes[guid][i].PacketID < writes[guid][j].PacketID
		})
	}
}
