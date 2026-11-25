package replay

import (
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

// collectDamageHitField folds one RPC param into its damage call; only the params
// a tracer needs are kept.
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
