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

	// Incoming records every damage write that landed on a manifest pawn. The
	// per-round total is summed once the round windows exist.
	Incoming []incomingWrite

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

	Warnings []string

	// Actors and Outer are retained from scanState so the spike builder can
	// classify owners without reading actors.parquet a second time.
	Actors *stateActorView
	Outer  map[uint32]uint32
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
	Money     []stateWrite
	Inventory []stateWrite
	Owners    map[uint32]uint32
	Casts     map[castKey]*castElement

	// Ownership history is kept in addition to the last-wins Owners map:
	// armour only needs the final owner, while spike custody needs every write.
	OwnerWrites      []stateWrite
	InstigatorWrites []stateWrite
	PlantedAtSites   []stateWrite
}

func newFieldStateRows() fieldStateRows {
	return fieldStateRows{
		Damage: make(map[damageKey]*damageElement),
		Owners: make(map[uint32]uint32),
		Casts:  make(map[castKey]*castElement),
	}
}

// stateFieldCandidate is a cheap pre-filter so the 1.9 M-row fields pass only
// parses the handful of names the state builder cares about.
func stateFieldCandidate(name string) bool {
	switch name {
	case "Money", "Owner", "Instigator", "CurrentEquippable", "NewCurrentEquippable":
		return true
	}
	return strings.HasSuffix(name, ".PlantedAtSite") ||
		strings.Contains(name, ".LifeChangeEvents[") ||
		strings.Contains(name, ".LifeChangeBySection[") ||
		strings.Contains(name, "AbilityCastsThisRound[")
}

// collectStateField folds the state rows into the existing scanFields pass.
func (s *fieldScan) collectStateField(row *fieldRow, name string) {
	switch {
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
}

type actorMoment struct {
	TimeMS   uint32
	PacketID uint32
}

type stateActorView struct {
	ClassByActor map[uint32]string
	OpenByActor  map[uint32]actorMoment
	CloseByActor map[uint32]actorMoment
	// SpawnByActor keeps the actor's open position. Pickup actors use it as the
	// spike's ground position while the bomb is loose.
	SpawnByActor map[uint32]Position
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
	actors, err := readStateActors(exportDir)
	if err != nil {
		return nil, err
	}
	scan.Actors = actors
	scan.Outer = outer

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
	// real gun stays on screen, and ignore every non-gun equippable.
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
		if !isGun {
			scan.WeaponWrites++
			continue
		}
		weaponID, ok := weaponUUIDByFolder[folder]
		if !ok {
			scan.WeaponUnresolved++
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
	_, err := readParquetRows[netGuidRow](exportDir+"/net_guids.parquet", func(rows []netGuidRow) error {
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

func readStateActors(exportDir string) (*stateActorView, error) {
	view := &stateActorView{
		ClassByActor: make(map[uint32]string),
		OpenByActor:  make(map[uint32]actorMoment),
		CloseByActor: make(map[uint32]actorMoment),
		SpawnByActor: make(map[uint32]Position),
	}
	_, err := readParquetRows[stateActorRow](exportDir+"/actors.parquet", func(rows []stateActorRow) error {
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
	return view, nil
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
