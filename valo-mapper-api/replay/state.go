package replay

import (
	"math"
	"sort"
	"strconv"
	"strings"
)

// Section names are the classification key. It is never the RPC function:
// MulticastNotifyHeal writes HealthDamageSection, so a "damage" function filter
// would drop every heal.
const (
	healthDamageSection   = "HealthDamageSection"
	attachedDamageSection = "AttachedDamageSection"
	shieldDamageSection   = "ShieldDamageSection"
	overhealDamageSection = "OverhealDamageSection"
)

// Armour classes are stable build paths; points are the class maximum the item
// is bought with, and the id is the existing UI id from mock-seed.ts.
const (
	heavyArmorClass  = "/Game/Gear/HeavyArmorItem.HeavyArmorItem_C"
	lightArmorClass  = "/Game/Gear/LightArmorItem.LightArmorItem_C"
	plasmaArmorClass = "/Game/Gear/PlasmaArmor/PlasmaArmorItem.PlasmaArmorItem_C"
)

type armourClass struct {
	ID     string
	Points int
}

var armourClasses = map[string]armourClass{
	heavyArmorClass:  {"822BCAB2-40A2-324E-C137-E09195AD7692", 50},
	lightArmorClass:  {"4DEC83D5-4902-9AB3-BED6-A7A390761157", 25},
	plasmaArmorClass: {"B1B9086D-41BD-A516-5D29-E3B34A6F1644", 25},
}

// stateSample is one subject's complete state at TimeMS. It is an internal
// snapshot, not a wire frame: the wire frame is built by sampling the timeline
// at a movement sample's absolute time.
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

// stateScan is the per-subject state timelines plus the counters the parse log
// reports.
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

	MoneyWrites int

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

// incomingWrite is one damage event against a player, kept in absolute time so
// it can be attributed to the round it landed in.
type incomingWrite struct {
	Subject string
	TimeMS  uint32
	Damage  float64
}

// stateWrite is a field row the state builder consumes later: its actor, time,
// packet and integer value.
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

// damageHitWrite is one damage call while its params are still net GUIDs.
type damageHitWrite struct {
	Damage      float64
	HasDamage   bool
	Shooter     uint32
	PlayerState uint32
	Victim      uint32
	Equippable  uint32
	DamageType  uint32
}

// hitSample is a damage call after both players and its source resolved.
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

	// Ultimate points and the active flag live on the player state actor.
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

// killDataSample is a KillData element after refs have been resolved to
// subjects and class names. The event log uses it to name the kill source.
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

func newFieldStateRows() fieldStateRows {
	return fieldStateRows{
		Damage:       make(map[damageKey]*damageElement),
		Hits:         make(map[damageHitKey]*damageHitWrite),
		Owners:       make(map[uint32]uint32),
		Casts:        make(map[castKey]*castElement),
		ChargeActors: make(map[uint32]struct{}),
	}
}

// stateFieldCandidate is a cheap pre-filter so the 1.9 M-row fields pass only
// parses the handful of names the state builder cares about.
func stateFieldCandidate(name string) bool {
	switch name {
	case "Money", "Owner", "Instigator", "CurrentEquippable", "NewCurrentEquippable", "KillData":
		return true
	}
	return strings.HasSuffix(name, ".PlantedAtSite") ||
		strings.HasPrefix(name, "AuthResourceAmount") ||
		name == "AuthSignatureChargeAmount" ||
		name == "ChargesBoughtThisRound" ||
		name == "CurrentTemporaryCharges" ||
		name == "TotalChargesAllowedToPurchaseThisRound" ||
		name == "NumUltimatePoints" ||
		name == "bUltimateActive" ||
		name == "CooldownSeconds" ||
		name == "CooldownActive" ||
		strings.HasPrefix(name, "MulticastNotifyDamage_Point.") ||
		strings.HasPrefix(name, "MulticastNotifyDamage_Base.") ||
		strings.Contains(name, ".LifeChangeEvents[") ||
		strings.Contains(name, ".LifeChangeBySection[") ||
		strings.Contains(name, "AbilityCastsThisRound[")
}

// collectStateField folds the state rows into the existing scanFields pass.
func (s *fieldScan) collectStateField(row *fieldRow, name string) {
	isEquipment := strings.Contains(row.GroupPath, "EquipmentChargeComponent")
	isSignature := strings.Contains(row.GroupPath, "SignatureAbilityResourceComponent")
	if (isEquipment || isSignature) && row.ActorNetGUID != 0 {
		s.State.ChargeActors[row.ActorNetGUID] = struct{}{}
	}
	switch {
	case name == "KillData" && strings.Contains(row.GroupPath, "PlayerMatchStatsComponent"):
		if row.RawBits == nil || row.BitCount <= 0 {
			return
		}
		for _, element := range decodeKillDataArray(row.RawBits, row.BitCount) {
			s.State.KillData = append(s.State.KillData, killDataWrite{
				TimeMS:            row.TimeMS,
				KillerActor:       row.ActorNetGUID,
				VictimActor:       element.Victim,
				KillingEquippable: element.KillingEquippable,
				DamageType:        element.DamageType,
			})
		}
	case strings.Contains(name, "AbilityCastsThisRound["):
		s.collectCastField(row, name)
	case strings.Contains(name, ".LifeChangeEvents[") || strings.Contains(name, ".LifeChangeBySection["):
		function, index, member, ok := parseDamageChild(name)
		if !ok || !isStateDamageFunction(function) {
			return
		}
		key := damageKey{
			Function: function,
			Actor:    row.ActorNetGUID,
			TimeMS:   row.TimeMS,
			PacketID: row.PacketID,
			Index:    index,
		}
		element := s.State.Damage[key]
		if element == nil {
			element = &damageElement{}
			s.State.Damage[key] = element
		}
		switch member {
		case "ChangedComponent":
			if row.ValueI64 != nil {
				element.Changed = *row.ValueI64
				element.HasChanged = true
			}
		case "LifeResult":
			if row.ValueF64 != nil {
				element.Result = *row.ValueF64
				element.HasResult = true
			}
		case "DeltaLife":
			if row.ValueF64 != nil {
				element.Delta = *row.ValueF64
				element.HasDelta = true
			}
		case "bAliveAfterChange":
			if row.ValueBool != nil {
				element.Alive = *row.ValueBool
				element.HasAlive = true
			}
		}
	case strings.HasPrefix(name, "MulticastNotifyDamage_Point.") ||
		strings.HasPrefix(name, "MulticastNotifyDamage_Base."):
		s.collectDamageHitField(row, name)
	case name == "Money" && strings.Contains(row.GroupPath, "MoneyManagementComponent"):
		if row.ValueI64 != nil {
			s.State.Money = append(s.State.Money, stateWrite{
				TimeMS: row.TimeMS, PacketID: row.PacketID, Actor: row.ActorNetGUID, Value: *row.ValueI64,
			})
		}
	case (name == "CurrentEquippable" || name == "NewCurrentEquippable") &&
		strings.Contains(row.GroupPath, "AresInventory"):
		if row.ValueI64 != nil {
			s.State.Inventory = append(s.State.Inventory, stateWrite{
				TimeMS: row.TimeMS, PacketID: row.PacketID, Actor: row.ActorNetGUID, Value: *row.ValueI64,
			})
		}
	case name == "Owner":
		if row.ValueI64 != nil && *row.ValueI64 != 0 {
			s.State.OwnerWrites = append(s.State.OwnerWrites, stateWrite{
				TimeMS: row.TimeMS, PacketID: row.PacketID, Actor: row.ActorNetGUID, Value: *row.ValueI64,
			})
			s.State.Owners[row.ActorNetGUID] = uint32(*row.ValueI64)
		}
	case name == "Instigator":
		if row.ValueI64 != nil && *row.ValueI64 != 0 {
			s.State.InstigatorWrites = append(s.State.InstigatorWrites, stateWrite{
				TimeMS: row.TimeMS, PacketID: row.PacketID, Actor: row.ActorNetGUID, Value: *row.ValueI64,
			})
		}
	case name == "PlantedAtSite" || strings.HasSuffix(name, ".PlantedAtSite"):
		if row.ValueI64 != nil {
			s.State.PlantedAtSites = append(s.State.PlantedAtSites, stateWrite{
				TimeMS: row.TimeMS, PacketID: row.PacketID, Actor: row.ActorNetGUID, Value: *row.ValueI64,
			})
		}
	case strings.HasPrefix(name, "AuthResourceAmount") &&
		(isEquipment || isSignature):
		if row.ValueI64 != nil && *row.ValueI64 >= 0 && *row.ValueI64 <= 1_000_000 {
			s.State.AbilityCharges = append(s.State.AbilityCharges, abilityChargeWrite{
				TimeMS: row.TimeMS, PacketID: row.PacketID,
				Actor: row.ActorNetGUID, Charges: int(*row.ValueI64),
				Signature: isSignature,
			})
		}
	case name == "NumUltimatePoints" && strings.Contains(row.GroupPath, "PlayerState"):
		if row.ValueI64 != nil && *row.ValueI64 >= 0 && *row.ValueI64 <= 100 {
			s.State.UltimatePoints = append(s.State.UltimatePoints, ultimatePointWrite{
				TimeMS: row.TimeMS, PacketID: row.PacketID,
				Actor: row.ActorNetGUID, Points: int(*row.ValueI64),
			})
		}
	case name == "bUltimateActive" && strings.Contains(row.GroupPath, "PlayerState"):
		if row.ValueBool != nil {
			s.State.UltimateActive = append(s.State.UltimateActive, ultimateActiveWrite{
				TimeMS: row.TimeMS, PacketID: row.PacketID,
				Actor: row.ActorNetGUID, Active: *row.ValueBool,
			})
		}
	case name == "CooldownSeconds" &&
		strings.Contains(row.GroupPath, "Comp_Ability_CooldownComponent"):
		if row.ValueF64 != nil && *row.ValueF64 > 0 && *row.ValueF64 <= 3600 {
			s.State.Cooldowns = append(s.State.Cooldowns, cooldownWrite{
				TimeMS: row.TimeMS, PacketID: row.PacketID,
				Actor: row.ActorNetGUID, Kind: cooldownKindSeconds, Seconds: *row.ValueF64,
			})
		}
	case name == "CooldownActive" &&
		strings.Contains(row.GroupPath, "Comp_Ability_CooldownComponent"):
		if row.ValueBool != nil {
			s.State.Cooldowns = append(s.State.Cooldowns, cooldownWrite{
				TimeMS: row.TimeMS, PacketID: row.PacketID,
				Actor: row.ActorNetGUID, Kind: cooldownKindActive, Active: *row.ValueBool,
			})
		}
	}
}

// collectDamageHitField folds one RPC param into its damage call. Only the
// params a tracer needs are kept; the LifeChangeEvents children are consumed by
// collectStateField's earlier branch.
func (s *fieldScan) collectDamageHitField(row *fieldRow, name string) {
	dot := strings.IndexByte(name, '.')
	if dot < 0 || dot == len(name)-1 {
		return
	}
	function, member := name[:dot], name[dot+1:]
	switch member {
	case "DamageTaken", "EventInstigatorPawn", "DamagerPlayerState",
		"Character", "EquippableUsed", "DamageType":
	default:
		return
	}

	key := damageHitKey{
		Function: function,
		Actor:    row.ActorNetGUID,
		TimeMS:   row.TimeMS,
		PacketID: row.PacketID,
	}
	hit := s.State.Hits[key]
	if hit == nil {
		hit = &damageHitWrite{}
		s.State.Hits[key] = hit
	}

	switch member {
	case "DamageTaken":
		if row.ValueF64 != nil {
			hit.Damage = *row.ValueF64
			hit.HasDamage = true
		}
	case "EventInstigatorPawn":
		if row.ValueI64 != nil {
			hit.Shooter = uint32(*row.ValueI64)
		}
	case "DamagerPlayerState":
		if row.ValueI64 != nil {
			hit.PlayerState = uint32(*row.ValueI64)
		}
	case "Character":
		if row.ValueI64 != nil && *row.ValueI64 != 0 {
			hit.Victim = uint32(*row.ValueI64)
		}
	case "EquippableUsed":
		if row.ValueI64 != nil {
			hit.Equippable = uint32(*row.ValueI64)
		}
	case "DamageType":
		if row.ValueI64 != nil {
			hit.DamageType = uint32(*row.ValueI64)
		}
	}
}

// parseDamageChild splits "<function>.LifeChangeEvents[<i>].<member>" (or the
// LifeChangeBySection variant) into its three parts. The array container row
// (which has no index or member) is rejected, as is any unrelated field.
func parseDamageChild(fieldName string) (function string, index int, member string, ok bool) {
	const eventsMarker = ".LifeChangeEvents["
	const sectionMarker = ".LifeChangeBySection["

	marker := eventsMarker
	start := strings.Index(fieldName, eventsMarker)
	if start < 0 {
		marker = sectionMarker
		start = strings.Index(fieldName, sectionMarker)
	}
	if start < 0 {
		return "", 0, "", false
	}

	function = fieldName[:start]
	rest := fieldName[start+len(marker):]
	close := strings.IndexByte(rest, ']')
	if close < 0 || len(rest) <= close+1 || rest[close+1] != '.' {
		return "", 0, "", false
	}
	member = rest[close+2:]
	if member == "" {
		return "", 0, "", false
	}
	index, err := strconv.Atoi(rest[:close])
	if err != nil {
		return "", 0, "", false
	}
	return function, index, member, true
}

func isStateDamageFunction(function string) bool {
	switch function {
	case "MulticastNotifyDamage_Point",
		"MulticastNotifyDamage_Base",
		"MulticastSectionLifeChange",
		"MulticastNotifyHeal",
		"MulticastNotifyOverhealDecay":
		return true
	default:
		return false
	}
}

type sectionKind int

const (
	sectionUnknown sectionKind = iota
	sectionHealth
	sectionArmour
	sectionIgnored
)

// resolveSectionKind classifies a section GUID by its net_guids path. Shield
// is an empty shell and Overheal is bookkeeping, so both are ignored rather
// than treated as health.
func resolveSectionKind(path string) sectionKind {
	switch path {
	case healthDamageSection:
		return sectionHealth
	case attachedDamageSection:
		return sectionArmour
	case shieldDamageSection, overhealDamageSection:
		return sectionIgnored
	default:
		return sectionUnknown
	}
}

type netGuidRow struct {
	NetGUID      uint32  `parquet:"net_guid"`
	Path         string  `parquet:"path"`
	OuterNetGUID *uint32 `parquet:"outer_net_guid,optional"`
}

type stateActorRow struct {
	TimeMS       uint32   `parquet:"time_ms"`
	PacketID     uint32   `parquet:"packet_id"`
	ActorNetGUID uint32   `parquet:"actor_net_guid"`
	Event        string   `parquet:"event"`
	ClassPath    *string  `parquet:"class_path,optional"`
	SpawnX       *float32 `parquet:"spawn_x,optional"`
	SpawnY       *float32 `parquet:"spawn_y,optional"`
	SpawnZ       *float32 `parquet:"spawn_z,optional"`
	SpawnYaw     *float32 `parquet:"spawn_yaw,optional"`
}

type actorMoment struct {
	TimeMS   uint32
	PacketID uint32
}

// pawnInterval is one manifest pawn's open interval. A missing open starts at
// the beginning of the match; a missing close runs to the end.
type pawnInterval struct {
	OpenMS   uint32
	HasOpen  bool
	CloseMS  uint32
	HasClose bool
}

func (i pawnInterval) activeAt(timeMS uint32) bool {
	if i.HasOpen && timeMS < i.OpenMS {
		return false
	}
	if i.HasClose && timeMS >= i.CloseMS {
		return false
	}
	return true
}

type stateActorView struct {
	ClassByActor map[uint32]string
	OpenByActor  map[uint32]actorMoment
	CloseByActor map[uint32]actorMoment
	// SpawnByActor keeps the actor's open position. Pickup actors use it as the
	// spike's ground position while the bomb is loose.
	SpawnByActor map[uint32]Position
	// PawnIntervals bounds every manifest pawn by its actor open and close
	// rows, so a reconnect's old pawn cannot keep writing poses.
	PawnIntervals map[uint32]pawnInterval
}

// activePawn returns the first manifest pawn active at timeMS. ambiguous is
// true when a second pawn is active at the same instant; the caller keeps the
// first pawn's sample.
func (v *stateActorView) activePawn(index *playerIndex, subject string, timeMS uint32) (pawn uint32, ok bool, ambiguous bool) {
	if v == nil || index == nil {
		return 0, false, false
	}
	for _, candidate := range index.pawnsForSubject(subject) {
		interval, known := v.PawnIntervals[candidate]
		if !known || !interval.activeAt(timeMS) {
			continue
		}
		if !ok {
			pawn = candidate
			ok = true
			continue
		}
		ambiguous = true
	}
	return pawn, ok, ambiguous
}

// pawnActiveAt reports whether a pawn's interval is known and covers timeMS.
func (v *stateActorView) pawnActiveAt(pawn uint32, timeMS uint32) (active bool, known bool) {
	if v == nil {
		return false, false
	}
	interval, known := v.PawnIntervals[pawn]
	if !known {
		return false, false
	}
	return interval.activeAt(timeMS), true
}

// scanState builds the state timelines. The 1.9 M-row fields file is not read
// here: its rows were already collected by scanFields. Only the small net_guids
// and actors tables are read.
func scanState(exportDir string, index *playerIndex, raw *fieldStateRows) (*stateScan, error) {
	scan := &stateScan{Timelines: make(map[string][]stateSample)}
	if raw == nil {
		rows := newFieldStateRows()
		raw = &rows
	}

	paths, outer, err := readNetGuids(exportDir)
	if err != nil {
		return nil, err
	}
	actors, err := readStateActors(exportDir, index)
	if err != nil {
		return nil, err
	}
	scan.Actors = actors
	scan.Outer = outer
	scan.Paths = paths

	scan.AbilityCharges, scan.AbilityChargeWrites,
		scan.AbilityChargeUnresolved, scan.AbilityChargeUnknownSlot =
		buildAbilityChargeSamples(raw, index, actors)

	scan.UltimateSamples, scan.UltimateUnresolved = buildUltimateSamples(
		raw.UltimatePoints, raw.UltimateActive, index,
	)
	scan.UltimatePointWrites = len(raw.UltimatePoints)
	scan.UltimateActiveWrites = len(raw.UltimateActive)

	ownersByActor := make(map[uint32][]stateWrite)
	for _, write := range raw.OwnerWrites {
		ownersByActor[write.Actor] = append(ownersByActor[write.Actor], write)
	}
	instigatorsByActor := make(map[uint32][]stateWrite)
	for _, write := range raw.InstigatorWrites {
		instigatorsByActor[write.Actor] = append(instigatorsByActor[write.Actor], write)
	}
	sortStateWrites(ownersByActor)
	sortStateWrites(instigatorsByActor)
	scan.ChargeFolders = collectChargeFolders(
		raw.ChargeActors, actors, index, ownersByActor, instigatorsByActor,
	)
	scan.Cooldowns, scan.CooldownUnresolved, scan.CooldownUnknownSlot =
		buildCooldownWindows(
			raw.Cooldowns, index, actors, ownersByActor, instigatorsByActor,
		)
	scan.CooldownWrites = len(raw.Cooldowns)
	scan.CooldownWindows = len(scan.Cooldowns)

	builders := make(map[string]*timelineBuilder, len(index.bySubject))
	for subject := range index.bySubject {
		builders[subject] = &timelineBuilder{}
	}

	// Item actor -> subject. The item stays registered even when it never
	// becomes visible, so a damage write for its section is attributed rather
	// than counted as a gap.
	itemSubjects := make(map[uint32]string)
	for actor, class := range actors.ClassByActor {
		spec, ok := armourClasses[class]
		if !ok {
			continue
		}
		scan.ArmorItems++

		open, hasOpen := actors.OpenByActor[actor]
		if !hasOpen {
			// Without an open row there is no time to place the item at.
			scan.ArmorUnplaced++
			continue
		}
		subject, ok := resolveArmourOwner(actor, raw.Owners, outer, index)
		if !ok {
			scan.ArmorUnowned++
			continue
		}
		builder := builders[subject]
		if builder == nil {
			scan.ArmorUnowned++
			continue
		}

		itemSubjects[actor] = subject

		close, hasClose := actors.CloseByActor[actor]
		if hasClose && close.TimeMS == open.TimeMS {
			// An item that opens and closes in the same millisecond was never
			// equipped. Emitting both would leave it stuck on screen, because
			// the close is ordered before the open.
			continue
		}

		builder.add(stateEvent{
			TimeMS:      open.TimeMS,
			PacketID:    open.PacketID,
			Kind:        eventArmourOpen,
			ArmorItem:   actor,
			ArmorID:     spec.ID,
			ArmorPoints: spec.Points,
		})

		if hasClose && close.TimeMS > open.TimeMS {
			builder.add(stateEvent{
				TimeMS:    close.TimeMS,
				PacketID:  close.PacketID,
				Kind:      eventArmourClose,
				ArmorItem: actor,
			})
		}
	}

	// Damage/heal elements are applied in (time, packet, index) order.
	elements := make([]damageRow, 0, len(raw.Damage))
	for key, element := range raw.Damage {
		if !element.complete() {
			scan.DamageIncomplete++
			continue
		}
		elements = append(elements, damageRow{Key: key, Element: *element})
	}
	sort.Slice(elements, func(i, j int) bool {
		a, b := &elements[i].Key, &elements[j].Key
		if a.TimeMS != b.TimeMS {
			return a.TimeMS < b.TimeMS
		}
		if a.PacketID != b.PacketID {
			return a.PacketID < b.PacketID
		}
		return a.Index < b.Index
	})

	for i := range elements {
		row := &elements[i]
		kind := resolveSectionKind(paths[uint32(row.Element.Changed)])
		switch kind {
		case sectionUnknown:
			scan.HPUnresolvedSection++
			continue
		case sectionIgnored:
			continue
		case sectionHealth:
			subject, ok := index.subjectForPawn(row.Key.Actor)
			if !ok {
				scan.HPNonPlayer++
				continue
			}
			builder := builders[subject]
			if builder == nil {
				scan.HPNonPlayer++
				continue
			}
			scan.HPWrites++
			if row.Element.Delta < 0 {
				scan.Incoming = append(scan.Incoming, incomingWrite{
					Subject: subject,
					TimeMS:  row.Key.TimeMS,
					Damage:  -row.Element.Delta,
				})
			}
			hp := int(math.Round(row.Element.Result))
			if hp < 0 {
				hp = 0
			}
			if !row.Element.Alive {
				scan.Deaths++
			}
			builder.add(stateEvent{
				TimeMS:   row.Key.TimeMS,
				PacketID: row.Key.PacketID,
				Index:    row.Key.Index,
				Kind:     eventHealth,
				HP:       hp,
				Alive:    row.Element.Alive,
			})
		case sectionArmour:
			item, spec, ok := armourItemForSection(uint32(row.Element.Changed), outer, actors.ClassByActor)
			if !ok {
				scan.ArmorUnattributed++
				continue
			}
			subject, owned := itemSubjects[item]
			builder := builders[subject]
			if !owned || builder == nil {
				scan.ArmorUnattributed++
				continue
			}
			points := int(math.Round(row.Element.Result))
			if points < 0 {
				points = 0
			}
			if points > spec.Points {
				points = spec.Points
			}
			builder.add(stateEvent{
				TimeMS:      row.Key.TimeMS,
				PacketID:    row.Key.PacketID,
				Index:       row.Key.Index,
				Kind:        eventArmourDamage,
				ArmorItem:   item,
				ArmorPoints: points,
			})
		}
	}

	// Credits: PlayerState Money is one continuous timeline and is never reset
	// at a round boundary.
	for _, write := range raw.Money {
		scan.MoneyWrites++
		subject, ok := index.subjectForActor(write.Actor)
		if !ok {
			continue
		}
		if builder := builders[subject]; builder != nil {
			builder.add(stateEvent{
				TimeMS:   write.TimeMS,
				PacketID: write.PacketID,
				Kind:     eventCredits,
				Credits:  int(write.Value),
			})
		}
	}

	// Inventory is on the pawn. Zero GUIDs are clears: ignore them so the last
	// equipped item stays on screen. Guns and the knife are shown; every other
	// equippable (abilities, totems, the spike, unarmed) keeps the last gun.
	for _, write := range raw.Inventory {
		if write.Value == 0 {
			scan.WeaponZero++
			continue
		}
		guid := uint32(write.Value)
		path := actors.ClassByActor[guid]
		if path == "" {
			path = paths[guid]
		}
		if path == "" {
			scan.WeaponUnresolved++
			continue
		}
		folder, isGun := weaponFolder(path)
		var weaponID string
		switch {
		case isGun:
			id, ok := weaponUUIDByFolder[folder]
			if !ok {
				scan.WeaponUnresolved++
				continue
			}
			weaponID = id
		case isMeleeEquippable(path):
			weaponID = meleeWeaponID
		default:
			scan.WeaponWrites++
			continue
		}
		scan.WeaponWrites++
		scan.WeaponChanges++

		subject, ok := index.subjectForPawn(write.Actor)
		if !ok {
			continue
		}
		if builder := builders[subject]; builder != nil {
			builder.add(stateEvent{
				TimeMS:   write.TimeMS,
				PacketID: write.PacketID,
				Kind:     eventWeapon,
				WeaponID: weaponID,
			})
		}
	}

	for subject, builder := range builders {
		scan.Timelines[subject] = builder.build()
	}

	scan.Kills = resolveKillData(raw.KillData, paths, index, outer)
	scan.Hits = resolveDamageHits(raw.Hits, paths, actors.ClassByActor, index, outer)

	scan.Warnings = append(scan.Warnings,
		coverageWarning(scan.HPUnresolvedSection,
			scan.HPWrites+scan.HPNonPlayer+scan.HPUnresolvedSection,
			"Some player health changes could not be attributed and were skipped."))
	scan.Warnings = append(scan.Warnings,
		coverageWarning(scan.WeaponUnresolved,
			scan.WeaponWrites+scan.WeaponUnresolved,
			"Some equipped weapons could not be identified and were omitted."))
	scan.Warnings = append(scan.Warnings,
		coverageWarning(scan.ArmorUnowned, scan.ArmorItems,
			"Some armour items could not be attributed to a player and were skipped."))

	return scan, nil
}

type damageRow struct {
	Key     damageKey
	Element damageElement
}

// resolveArmourOwner prefers the item's Owner write and falls back to walking
// net_guids.outer_net_guid up to the first manifest pawn.
func resolveArmourOwner(item uint32, owners map[uint32]uint32, outer map[uint32]uint32, index *playerIndex) (string, bool) {
	if owner := owners[item]; owner != 0 {
		if subject, ok := index.subjectForPawn(owner); ok {
			return subject, true
		}
	}
	current := item
	for depth := 0; depth < 8; depth++ {
		next, ok := outer[current]
		if !ok || next == 0 || next == current {
			break
		}
		if subject, ok := index.subjectForPawn(next); ok {
			return subject, true
		}
		current = next
	}
	return "", false
}

// armourItemForSection walks a section's outer chain to the item actor that
// owns it. The section GUID is the ChangedComponent value; the element's own
// actor is the pawn, so the chain is the only way to keep damaged armour with
// the item it belongs to.
func armourItemForSection(
	section uint32,
	outer map[uint32]uint32,
	classByActor map[uint32]string,
) (uint32, armourClass, bool) {
	current := section
	for depth := 0; depth < 8; depth++ {
		if spec, ok := armourClasses[classByActor[current]]; ok {
			return current, spec, true
		}
		next, ok := outer[current]
		if !ok || next == 0 || next == current {
			break
		}
		current = next
	}
	return 0, armourClass{}, false
}

func readNetGuids(exportDir string) (map[uint32]string, map[uint32]uint32, error) {
	paths := make(map[uint32]string)
	outer := make(map[uint32]uint32)
	_, err := readParquetRows(exportDir+"/net_guids.parquet", func(rows []netGuidRow) error {
		for i := range rows {
			row := &rows[i]
			paths[row.NetGUID] = row.Path
			if row.OuterNetGUID != nil {
				outer[row.NetGUID] = *row.OuterNetGUID
			}
		}
		return nil
	})
	if err != nil {
		return nil, nil, err
	}
	return paths, outer, nil
}

func readStateActors(exportDir string, index *playerIndex) (*stateActorView, error) {
	view := &stateActorView{
		ClassByActor:  make(map[uint32]string),
		OpenByActor:   make(map[uint32]actorMoment),
		CloseByActor:  make(map[uint32]actorMoment),
		SpawnByActor:  make(map[uint32]Position),
		PawnIntervals: make(map[uint32]pawnInterval),
	}
	_, err := readParquetRows(exportDir+"/actors.parquet", func(rows []stateActorRow) error {
		for i := range rows {
			row := &rows[i]
			if row.ClassPath != nil && *row.ClassPath != "" {
				view.ClassByActor[row.ActorNetGUID] = *row.ClassPath
			}
			if row.SpawnX != nil && row.SpawnY != nil &&
				isFinite32(*row.SpawnX) && isFinite32(*row.SpawnY) {
				if _, exists := view.SpawnByActor[row.ActorNetGUID]; !exists {
					view.SpawnByActor[row.ActorNetGUID] = Position{
						X: float64(*row.SpawnX),
						Y: float64(*row.SpawnY),
					}
				}
			}
			switch row.Event {
			case "open":
				if _, exists := view.OpenByActor[row.ActorNetGUID]; !exists {
					view.OpenByActor[row.ActorNetGUID] = actorMoment{TimeMS: row.TimeMS, PacketID: row.PacketID}
				}
			case "close":
				view.CloseByActor[row.ActorNetGUID] = actorMoment{TimeMS: row.TimeMS, PacketID: row.PacketID}
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	buildPawnIntervals(view, index)
	return view, nil
}

// buildPawnIntervals fills one interval per manifest pawn from the actor rows
// already read. Pawns with neither an open nor a close row stay unbounded and
// do not narrow the single-pawn path.
func buildPawnIntervals(view *stateActorView, index *playerIndex) {
	if view == nil || index == nil {
		return
	}
	if view.PawnIntervals == nil {
		view.PawnIntervals = make(map[uint32]pawnInterval)
	}
	for _, pawns := range index.pawnsBySubject {
		for _, pawn := range pawns {
			interval := pawnInterval{}
			if open, ok := view.OpenByActor[pawn]; ok {
				interval.OpenMS = open.TimeMS
				interval.HasOpen = true
			}
			if closeMoment, ok := view.CloseByActor[pawn]; ok {
				interval.CloseMS = closeMoment.TimeMS
				interval.HasClose = true
			}
			view.PawnIntervals[pawn] = interval
		}
	}
}

// Event ordering at one timestamp. A replacement closes the old item before
// the new one opens, so the new item is not immediately cleared, and an open
// precedes damage so a hit in the same millisecond lands on the new item.
// Death is last so it clears anything equipped in that millisecond.
const (
	orderArmourClose uint8 = iota
	orderArmourOpen
	orderArmourDamage
	orderHealth
	orderCredits
	orderWeapon
	orderDeath
)

type stateEventKind int

const (
	eventHealth stateEventKind = iota
	eventCredits
	eventWeapon
	eventArmourOpen
	eventArmourClose
	eventArmourDamage
)

type stateEvent struct {
	TimeMS      uint32
	PacketID    uint32
	Index       int
	Seq         uint32
	Kind        stateEventKind
	HP          int
	Alive       bool
	Credits     int
	WeaponID    string
	ArmorItem   uint32
	ArmorID     string
	ArmorPoints int
}

func (e *stateEvent) order() uint8 {
	switch e.Kind {
	case eventArmourDamage:
		return orderArmourDamage
	case eventArmourClose:
		return orderArmourClose
	case eventHealth:
		if !e.Alive {
			return orderDeath
		}
		return orderHealth
	case eventCredits:
		return orderCredits
	case eventWeapon:
		return orderWeapon
	case eventArmourOpen:
		return orderArmourOpen
	default:
		return orderHealth
	}
}

type timelineBuilder struct {
	events []stateEvent
	seq    uint32
}

func (b *timelineBuilder) add(event stateEvent) {
	b.seq++
	event.Seq = b.seq
	b.events = append(b.events, event)
}

// build applies the events in absolute time order and records a snapshot only
// when the state changes. HealthTimeMS is part of the comparison because it is
// what makes the round-start rule independent of an unrelated credits or
// weapon write later in the round.
func (b *timelineBuilder) build() []stateSample {
	if len(b.events) == 0 {
		return nil
	}
	events := b.events
	sort.SliceStable(events, func(i, j int) bool {
		a, b := &events[i], &events[j]
		if a.TimeMS != b.TimeMS {
			return a.TimeMS < b.TimeMS
		}
		if a.order() != b.order() {
			return a.order() < b.order()
		}
		if a.PacketID != b.PacketID {
			return a.PacketID < b.PacketID
		}
		if a.Index != b.Index {
			return a.Index < b.Index
		}
		return a.Seq < b.Seq
	})

	current := defaultStateSample()
	currentArmorItem := uint32(0)
	timeline := make([]stateSample, 0, len(events))

	for i := range events {
		event := &events[i]
		switch event.Kind {
		case eventHealth:
			current.HP = event.HP
			current.Alive = event.Alive
			current.HealthTimeMS = event.TimeMS
			if !event.Alive {
				current.WeaponID = ""
				current.ArmorID = ""
				current.ArmorPoints = 0
				currentArmorItem = 0
			}
		case eventCredits:
			current.Credits = event.Credits
		case eventWeapon:
			current.WeaponID = event.WeaponID
		case eventArmourOpen:
			currentArmorItem = event.ArmorItem
			current.ArmorID = event.ArmorID
			current.ArmorPoints = event.ArmorPoints
		case eventArmourDamage:
			if event.ArmorItem == currentArmorItem {
				current.ArmorPoints = event.ArmorPoints
			}
		case eventArmourClose:
			if event.ArmorItem == currentArmorItem {
				currentArmorItem = 0
				current.ArmorID = ""
				current.ArmorPoints = 0
			}
		}

		if len(timeline) > 0 && sameState(timeline[len(timeline)-1], current) {
			continue
		}
		snapshot := current
		snapshot.TimeMS = event.TimeMS
		timeline = append(timeline, snapshot)
	}
	return timeline
}

func sameState(a, b stateSample) bool {
	return a.HP == b.HP &&
		a.Alive == b.Alive &&
		a.Credits == b.Credits &&
		a.WeaponID == b.WeaponID &&
		a.ArmorID == b.ArmorID &&
		a.ArmorPoints == b.ArmorPoints &&
		a.HealthTimeMS == b.HealthTimeMS
}

type killDataElement struct {
	Victim            uint32
	KillingEquippable uint32
	DamageType        uint32
}

// decodeKillDataArray reads the members the event log needs from a replicated
// KillData array. The export emits the array's typed children only on newer
// VRFKit builds, so the parent's raw window is the only portable source.
func decodeKillDataArray(raw []byte, bitCount int32) []killDataElement {
	if bitCount <= 0 || len(raw) != (int(bitCount)+7)/8 {
		return nil
	}

	bits := &bitWindow{raw: raw, end: int(bitCount)}
	capacity, ok := bits.packed()
	if !ok || capacity > 4096 {
		return nil
	}

	var elements []killDataElement
	for {
		encoded, ok := bits.packed()
		if !ok {
			return nil
		}
		if encoded == 0 {
			return elements
		}
		if encoded-1 >= capacity {
			return nil
		}

		var element killDataElement
		for {
			handle, ok := bits.packed()
			if !ok {
				return nil
			}
			if handle == 0 {
				break
			}
			width, ok := bits.packed()
			if !ok || width == 0 || width > 64*1024 {
				return nil
			}
			payload, ok := bits.take(int(width))
			if !ok {
				return nil
			}
			switch handle - 1 {
			case 3:
				element.Victim = decodePackedRef(payload, int(width))
			case 4:
				element.KillingEquippable = decodePackedRef(payload, int(width))
			case 9:
				element.DamageType = decodePackedRef(payload, int(width))
			}
		}
		elements = append(elements, element)
	}
}

type bitWindow struct {
	raw []byte
	pos int
	end int
}

func (b *bitWindow) take(width int) ([]byte, bool) {
	if width < 0 || width > b.end-b.pos {
		return nil, false
	}
	out := make([]byte, (width+7)/8)
	for i := 0; i < width; i++ {
		bit, ok := b.read(1)
		if !ok {
			return nil, false
		}
		if bit != 0 {
			out[i/8] |= 1 << (i % 8)
		}
	}
	return out, true
}

func (b *bitWindow) read(width int) (uint64, bool) {
	if width < 0 || width > 64 || width > b.end-b.pos {
		return 0, false
	}
	start := b.pos / 8
	shift := b.pos % 8
	span := (b.pos + width + 7) / 8
	var value uint64
	for i := start; i < span && i < len(b.raw); i++ {
		value |= uint64(b.raw[i]) << (8 * (i - start))
	}
	b.pos += width
	if width == 64 {
		return value >> shift, true
	}
	return (value >> shift) & ((1 << width) - 1), true
}

// packed reads Unreal's SerializeIntPacked: seven value bits and a continuation
// bit per byte.
func (b *bitWindow) packed() (uint64, bool) {
	var value uint64
	for i := 0; i < 5; i++ {
		byteValue, ok := b.read(8)
		if !ok {
			return 0, false
		}
		value |= (byteValue >> 1) << (7 * i)
		if byteValue&1 == 0 {
			return value, true
		}
	}
	return 0, false
}

func decodePackedRef(raw []byte, width int) uint32 {
	bits := &bitWindow{raw: raw, end: width}
	value, ok := bits.packed()
	if !ok || bits.pos != bits.end {
		return 0
	}
	return uint32(value)
}

func resolveKillData(
	writes []killDataWrite,
	paths map[uint32]string,
	index *playerIndex,
	outer map[uint32]uint32,
) []killDataSample {
	samples := make([]killDataSample, 0, len(writes))
	for _, write := range writes {
		killer, ok := killDataSubject(index, outer, write.KillerActor)
		if !ok {
			continue
		}
		victim, ok := killDataSubject(index, outer, write.VictimActor)
		if !ok {
			continue
		}

		source := resolveKillSource(paths[write.KillingEquippable], paths[write.DamageType])

		samples = append(samples, killDataSample{
			TimeMS:        write.TimeMS,
			KillerSubject: killer,
			VictimSubject: victim,
			DamageType:    source.DamageType,
			DamageItem:    source.DamageItem,
		})
	}
	return samples
}

func killDataSubject(
	index *playerIndex,
	outer map[uint32]uint32,
	actor uint32,
) (string, bool) {
	if subject, ok := index.subjectForActor(actor); ok {
		return subject, true
	}
	if outerActor, ok := outer[actor]; ok {
		return index.subjectForActor(outerActor)
	}
	return "", false
}

// resolveDamageHits keeps only gun damage with both players resolved. Ability,
// melee, fall and bomb damage never draw a tracer, and a self-hit is skipped.
func resolveDamageHits(
	writes map[damageHitKey]*damageHitWrite,
	paths map[uint32]string,
	classByActor map[uint32]string,
	index *playerIndex,
	outer map[uint32]uint32,
) []hitSample {
	keys := make([]damageHitKey, 0, len(writes))
	for key := range writes {
		keys = append(keys, key)
	}
	sort.Slice(keys, func(i, j int) bool {
		if keys[i].TimeMS != keys[j].TimeMS {
			return keys[i].TimeMS < keys[j].TimeMS
		}
		if keys[i].PacketID != keys[j].PacketID {
			return keys[i].PacketID < keys[j].PacketID
		}
		if keys[i].Actor != keys[j].Actor {
			return keys[i].Actor < keys[j].Actor
		}
		return keys[i].Function < keys[j].Function
	})

	type signature struct {
		TimeMS     uint32
		Shooter    uint32
		Victim     uint32
		DamageType uint32
	}
	seen := make(map[signature]struct{}, len(keys))
	hits := make([]hitSample, 0, len(keys))

	for _, key := range keys {
		write := writes[key]
		if write == nil || !write.HasDamage || write.Damage <= 0 {
			continue
		}

		damageClass := damageClassPath(write.DamageType, paths, classByActor)
		equippableClass := damageClassPath(write.Equippable, paths, classByActor)
		if !isGunHit(equippableClass, damageClass) {
			continue
		}

		shooter, ok := damageSubject(index, outer, write.Shooter, write.PlayerState, 0)
		if !ok {
			continue
		}
		victim, ok := damageSubject(index, outer, write.Victim, 0, key.Actor)
		if !ok || shooter == victim {
			continue
		}

		sig := signature{
			TimeMS:     key.TimeMS,
			Shooter:    write.Shooter,
			Victim:     write.Victim,
			DamageType: write.DamageType,
		}
		if _, duplicate := seen[sig]; duplicate {
			continue
		}
		seen[sig] = struct{}{}

		hits = append(hits, hitSample{
			TimeMS:         key.TimeMS,
			ShooterSubject: shooter,
			VictimSubject:  victim,
		})
	}

	return hits
}

func damageClassPath(
	guid uint32,
	paths map[uint32]string,
	classByActor map[uint32]string,
) string {
	if guid == 0 {
		return ""
	}
	if path := paths[guid]; path != "" {
		return path
	}
	return classByActor[guid]
}

// isGunHit keeps tracers to bullets. Ability and melee equippables look like
// normal objects on the wire, so only the gun tree, Chamber's ability guns and
// an unresolved-equippable fallback may produce a hit.
func isGunHit(equippableClass, damageClass string) bool {
	if _, isGun := weaponFolder(equippableClass); isGun {
		return !isAbilityDamageClass(damageClass) &&
			resolveKillSource(equippableClass, damageClass).DamageType == damageTypeWeapon
	}
	if classContains(equippableClass, "Deadeye_Q_Pistol") ||
		classContains(equippableClass, "Giantslayer") {
		return true
	}
	if equippableClass == "" {
		// EquippableUsed did not resolve. The damage class still names the gun
		// in older exports, but ability damage also arrives this way, so trust
		// only bullet classes.
		return isGunDamageClass(damageClass)
	}
	return false
}

// damageSubject resolves a damage RPC subject. The victim usually arrives in
// Character, but older builds leave it zero and only name the damaged actor, so
// the fallback GUID is tried after the primary one.
func damageSubject(
	index *playerIndex,
	outer map[uint32]uint32,
	pawn uint32,
	playerState uint32,
	fallback uint32,
) (string, bool) {
	for _, guid := range []uint32{pawn, fallback} {
		if guid == 0 {
			continue
		}
		if subject, ok := index.subjectForCharacter(guid); ok {
			return subject, true
		}
		if subject, ok := killDataSubject(index, outer, guid); ok {
			return subject, true
		}
	}
	if playerState != 0 {
		if subject, ok := index.subjectForActor(playerState); ok {
			return subject, true
		}
	}
	return "", false
}

func defaultStateSample() stateSample {
	return stateSample{HP: 100, Alive: true}
}

// sampleAt returns the last state sample at or before absTimeMS, applying the
// round-start rule: a health value written before the round started is shown as
// a full bar and alive, regardless of how the previous round ended.
func sampleAt(timeline []stateSample, absTimeMS, roundStartMS uint32) stateSample {
	if len(timeline) == 0 {
		return defaultStateSample()
	}
	index := sort.Search(len(timeline), func(i int) bool {
		return timeline[i].TimeMS > absTimeMS
	}) - 1
	if index < 0 {
		return defaultStateSample()
	}
	sample := timeline[index]
	if sample.HealthTimeMS < roundStartMS {
		sample.HP = 100
		sample.Alive = true
	}
	return sample
}

func (s *stateScan) stateFor(subject string, absTimeMS, roundStartMS uint32) stateSample {
	if s == nil {
		return defaultStateSample()
	}
	return sampleAt(s.Timelines[subject], absTimeMS, roundStartMS)
}

// coverageWarning turns an unresolved count above 1 % of its stream into one
// user-facing warning. Smaller gaps stay in the parse log only.
func coverageWarning(unresolved, total int, message string) string {
	if unresolved <= 0 || total <= 0 || unresolved*100 <= total {
		return ""
	}
	return message
}
