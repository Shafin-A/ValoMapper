package replay

import (
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
)

const (
	phaseReset      = 2
	phaseRoundStart = 3
	phaseBuyEnd     = 4
	phasePostRound  = 5
	phaseSideSwitch = 6
)

type phaseWrite struct {
	TimeMS   uint32
	PacketID uint32
	Phase    int
}

type roundPhase struct {
	StartMS     *uint32
	BuyEndMS    *uint32
	BuyEnd2MS   *uint32
	PostRoundMS *uint32
	SideSwitch  *uint32
}

type resultWrite struct {
	Number      int
	HasNumber   bool
	WinningTeam string
	WinningRole string
	RoundResult string
}

type rpcWrite struct {
	TimeMS uint32
	Value  string
}

type fieldScan struct {
	Phases            []phaseWrite
	Results           map[int]*resultWrite
	Teams             map[string]string
	TeamWarnings      []string
	Planters          []rpcWrite
	PlantSitesRPC     []rpcWrite
	PlantLocations    []rpcWrite
	Defusers          []rpcWrite
	UtilityOwners     map[uint32][]utilityOwnerWrite
	UtilityPaths      map[uint32][]utilityPathWrite
	UtilityFuel       map[uint32][]utilityFuelWrite
	UtilityDestroy    map[uint32][]utilityDestroyWrite
	UtilityActivation map[uint32][]utilityActivationWrite
	AbilityStates     map[uint32][]abilityStateWrite

	// State holds the HP/credits/weapon/armour rows collected by the same pass.
	// scanState turns them into timelines after this scan.
	State fieldStateRows
}

type teamPairKey struct {
	Actor  uint32
	Prefix string
}

type teamPair struct {
	Subject string
	Team    string
}

// scanFields reads fields.parquet once and collects the small set of values
// the normaliser needs: phase writes, RoundResults, combat-report teams and the
// plant/defuse RPC details.
func scanFields(exportDir string) (*fieldScan, error) {
	scan := &fieldScan{
		Results:           make(map[int]*resultWrite),
		Teams:             make(map[string]string),
		Planters:          nil,
		PlantSitesRPC:     nil,
		PlantLocations:    nil,
		Defusers:          nil,
		State:             newFieldStateRows(),
		UtilityOwners:     make(map[uint32][]utilityOwnerWrite),
		UtilityPaths:      make(map[uint32][]utilityPathWrite),
		UtilityFuel:       make(map[uint32][]utilityFuelWrite),
		UtilityDestroy:    make(map[uint32][]utilityDestroyWrite),
		UtilityActivation: make(map[uint32][]utilityActivationWrite),
		AbilityStates:     make(map[uint32][]abilityStateWrite),
	}

	// The combat report writes ParticipantSubject and ParticipantTeamName as
	// separate rows in the same interaction. Pair them by the interaction field
	// prefix (for example "Rounds[3].Reports[1].Interactions[0]") *and* the
	// actor that wrote it: the same prefix is reused by every participant's own
	// combat-report actor, so prefix alone would join one player's subject to a
	// different player's team. Never assume the two rows are adjacent.
	pairs := make(map[teamPairKey]*teamPair)

	_, err := readParquetRows(exportDir+"/fields.parquet", func(rows []fieldRow) error {
		for i := range rows {
			row := &rows[i]
			if row.FieldName == nil {
				continue
			}
			name := *row.FieldName
			group := row.GroupPath
			timeMS := row.TimeMS
			if name == "MulticastAddSmokeScreenPoint.Translation" && row.ValueStr != nil {
				if position, ok := parseWorldPosition(*row.ValueStr); ok &&
					validUtilityPosition(position) {
					scan.UtilityPaths[row.ActorNetGUID] = append(
						scan.UtilityPaths[row.ActorNetGUID],
						utilityPathWrite{
							TimeMS: row.TimeMS, PacketID: row.PacketID,
							FieldName: name, Position: position,
						},
					)
				}
			}
			if row.ObjectNetGUID == nil &&
				(name == "MulticastInitializeWall.WallStartLocation" ||
					name == "MulticastInitializeWall.WallEndLocation" ||
					name == "MulticastInitializeTrapAnchors.WallStartPoint" ||
					name == "MulticastInitializeTrapAnchors.WallEndPoint" ||
					name == "MulticastInitialize.RootLocation" ||
					name == "MulticastInitialize.Destination" ||
					name == "MulticastAddTunnelPoint.Translation" ||
					name == "MulticastAddAnchor.Translation" ||
					strings.HasPrefix(name, "Multicast Initialize Segment.SegmentLocation_") ||
					strings.HasPrefix(name, "Multicast Initialize Segment.SegmentEndLocation_") ||
					name == "Multicast Initialize End Segment.248") {
				var position Position
				var ok bool
				if name == "Multicast Initialize End Segment.248" && row.ValueStr != nil {
					position, ok = parseWorldPosition(*row.ValueStr)
				} else {
					position, ok = parseUtilityRawVector(row.RawBits, row.BitCount)
				}
				if ok {
					scan.UtilityPaths[row.ActorNetGUID] = append(
						scan.UtilityPaths[row.ActorNetGUID],
						utilityPathWrite{
							TimeMS: row.TimeMS, PacketID: row.PacketID,
							FieldName: name, Position: position,
						},
					)
				}
			}
			if row.ValueI64 != nil && *row.ValueI64 >= 0 &&
				uint64(*row.ValueI64) <= math.MaxUint32 {
				target := uint32(*row.ValueI64)
				switch utilityOwnerField(name) {
				case "owner":
					scan.UtilityOwners[row.ActorNetGUID] = append(
						scan.UtilityOwners[row.ActorNetGUID],
						utilityOwnerWrite{TimeMS: row.TimeMS, PacketID: row.PacketID, Owner: &target},
					)
				case "instigator":
					scan.UtilityOwners[row.ActorNetGUID] = append(
						scan.UtilityOwners[row.ActorNetGUID],
						utilityOwnerWrite{TimeMS: row.TimeMS, PacketID: row.PacketID, Instigator: &target},
					)
				case "controller":
					scan.UtilityOwners[row.ActorNetGUID] = append(
						scan.UtilityOwners[row.ActorNetGUID],
						utilityOwnerWrite{TimeMS: row.TimeMS, PacketID: row.PacketID, Controller: &target},
					)
				case "attachparent":
					scan.UtilityOwners[row.ActorNetGUID] = append(
						scan.UtilityOwners[row.ActorNetGUID],
						utilityOwnerWrite{TimeMS: row.TimeMS, PacketID: row.PacketID, AttachParent: &target},
					)
				}
			}

			switch {
			case name == "MulticastSetPhase.NewPhase":
				if row.ValueI64 != nil {
					scan.Phases = append(scan.Phases, phaseWrite{
						TimeMS:   timeMS,
						PacketID: row.PacketID,
						Phase:    int(*row.ValueI64),
					})
				}
			case strings.HasPrefix(name, "RoundResults["):
				scan.collectRoundResult(name, row)
			case isCombatReportTeamField(name, group):
				prefix, member, ok := splitParticipantName(name)
				if !ok {
					continue
				}
				key := teamPairKey{Actor: row.ActorNetGUID, Prefix: prefix}
				pair := pairs[key]
				if pair == nil {
					pair = &teamPair{}
					pairs[key] = pair
				}
				if row.ValueStr == nil {
					continue
				}
				switch member {
				case "subject":
					pair.Subject = normaliseUUID(*row.ValueStr)
				case "team":
					pair.Team = normaliseTeam(*row.ValueStr)
				}
				if pair.Subject != "" && pair.Team != "" {
					scan.collectTeamPair(pair.Subject, pair.Team)
				}
			case strings.HasSuffix(name, "BombPlantedRPC.BombPlanter"):
				if row.ValueI64 != nil {
					scan.Planters = append(scan.Planters, rpcWrite{timeMS, strconv.FormatInt(*row.ValueI64, 10)})
				}
			case strings.HasSuffix(name, "BombPlantedRPC.PlantSite"):
				if row.ValueI64 != nil {
					scan.PlantSitesRPC = append(scan.PlantSitesRPC, rpcWrite{timeMS, strconv.FormatInt(*row.ValueI64, 10)})
				}
			case strings.HasSuffix(name, "BombPlantedRPC.PlantLocation"):
				if row.ValueStr != nil {
					scan.PlantLocations = append(scan.PlantLocations, rpcWrite{timeMS, *row.ValueStr})
				}
			case strings.HasSuffix(name, "BombDefusedRPC.DefusingCharacter"):
				if row.ValueI64 != nil {
					scan.Defusers = append(scan.Defusers, rpcWrite{timeMS, strconv.FormatInt(*row.ValueI64, 10)})
				}
			case name == "Multicast Destroy Smoke" ||
				name == "Multicast Try Release Cage" ||
				name == "Multicast Stop Collider" ||
				name == "Multicast Stop Collider.Is Pulling":
				scan.UtilityDestroy[row.ActorNetGUID] = append(
					scan.UtilityDestroy[row.ActorNetGUID],
					utilityDestroyWrite{TimeMS: timeMS, PacketID: row.PacketID, Name: name},
				)
			case (name == "WallActivated" || name == "IsActivated") && row.ValueBool != nil:
				value := *row.ValueBool
				scan.UtilityActivation[row.ActorNetGUID] = append(
					scan.UtilityActivation[row.ActorNetGUID],
					utilityActivationWrite{TimeMS: timeMS, PacketID: row.PacketID, Active: &value},
				)
			case strings.Contains(group, "Comp_AbilityFuelSystem") &&
				(name == "CurrentFuel" || name == "IsFuelDraining"):
				write := utilityFuelWrite{TimeMS: timeMS, PacketID: row.PacketID}
				if name == "CurrentFuel" && row.ValueF64 != nil {
					value := *row.ValueF64
					write.Fuel = &value
				}
				if name == "IsFuelDraining" && row.ValueBool != nil {
					value := *row.ValueBool
					write.Draining = &value
				}
				if write.Fuel != nil || write.Draining != nil {
					scan.UtilityFuel[row.ActorNetGUID] = append(
						scan.UtilityFuel[row.ActorNetGUID], write,
					)
				}
			case name == "CurrentState" && row.ValueI64 != nil &&
				row.ObjectNetGUID != nil && *row.ValueI64 >= 0 &&
				uint64(*row.ValueI64) <= math.MaxUint32:
				object := *row.ObjectNetGUID
				scan.AbilityStates[row.ActorNetGUID] = append(
					scan.AbilityStates[row.ActorNetGUID],
					abilityStateWrite{
						TimeMS:        row.TimeMS,
						PacketID:      row.PacketID,
						ObjectNetGUID: &object,
						StateGUID:     uint32(*row.ValueI64),
					},
				)
			case stateFieldCandidate(name):
				scan.collectStateField(row, name)
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	sortUtilityOwnerWrites(scan.UtilityOwners)
	sortUtilityFuelWrites(scan.UtilityFuel)
	sortUtilityDestroyWrites(scan.UtilityDestroy)
	sortUtilityActivationWrites(scan.UtilityActivation)
	sortAbilityStateWrites(scan.AbilityStates)

	return scan, nil
}

func (s *fieldScan) collectRoundResult(name string, row *fieldRow) {
	index, member, ok := parseResultName(name)
	if !ok {
		return
	}
	entry := s.Results[index]
	if entry == nil {
		entry = &resultWrite{}
		s.Results[index] = entry
	}

	switch member {
	case "RoundNumber":
		if value, ok := rowInt(row); ok {
			entry.Number = value
			entry.HasNumber = true
		}
	case "WinningTeam":
		if row.ValueStr != nil {
			entry.WinningTeam = normaliseTeam(*row.ValueStr)
		}
	case "WinningTeamRole":
		if row.ValueStr != nil {
			entry.WinningRole = strings.ToLower(strings.TrimSpace(*row.ValueStr))
		}
	case "RoundResult":
		if row.ValueStr != nil {
			entry.RoundResult = strings.ToLower(strings.TrimSpace(*row.ValueStr))
		}
	}
}

// splitParticipantName returns the interaction prefix and which member a
// combat-report field names. The prefix is the part shared by the
// ParticipantSubject and ParticipantTeamName rows of one interaction.
func splitParticipantName(name string) (string, string, bool) {
	switch {
	case strings.HasSuffix(name, ".ParticipantSubject"):
		return strings.TrimSuffix(name, ".ParticipantSubject"), "subject", true
	case strings.HasSuffix(name, ".ParticipantTeamName"):
		return strings.TrimSuffix(name, ".ParticipantTeamName"), "team", true
	default:
		return "", "", false
	}
}

// collectTeamPair handles the actual ParticipantSubject/ParticipantTeamName
// pairing. It is kept separate from collectTeam so the call site can match both
// fields by interaction index.
func (s *fieldScan) collectTeamPair(subject, team string) {
	subject = normaliseUUID(subject)
	team = normaliseTeam(team)
	if subject == "" || team == "" {
		return
	}
	if previous, exists := s.Teams[subject]; exists && previous != "" && previous != team {
		s.TeamWarnings = append(s.TeamWarnings,
			"A player's team changed inside the combat report; the first team was kept.")
		return
	}
	s.Teams[subject] = team
}

func parseResultName(name string) (int, string, bool) {
	const prefix = "RoundResults["
	if !strings.HasPrefix(name, prefix) {
		return 0, "", false
	}
	rest := name[len(prefix):]
	close := strings.Index(rest, "].")
	if close < 0 {
		return 0, "", false
	}
	index, err := strconv.Atoi(rest[:close])
	if err != nil {
		return 0, "", false
	}
	return index, rest[close+2:], true
}

func isCombatReportTeamField(name, group string) bool {
	if group != "" && !strings.Contains(group, "CombatReportComponent") {
		return false
	}
	return strings.HasSuffix(name, ".ParticipantSubject") ||
		strings.HasSuffix(name, ".ParticipantTeamName")
}

func rowInt(row *fieldRow) (int, bool) {
	if row.ValueI64 != nil {
		return int(*row.ValueI64), true
	}
	if row.ValueF64 != nil {
		return int(*row.ValueF64), true
	}
	return 0, false
}

func normaliseTeam(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "red":
		return "Red"
	case "blue":
		return "Blue"
	default:
		return ""
	}
}

// roundWindow is a played round before event logs and frames are attached.
type roundWindow struct {
	RoundNumber     int
	StartMS         uint32
	EndMS           uint32
	BuyEndMS        *uint32
	Score           Score
	WinningTeam     string
	RoundResultCode string
	AttackTeamID    string
	HasResult       bool
}

type roundStartEvent struct {
	TimeMS uint32
	Number *uint32
}

// buildRoundWindows derives one window per phase-3 start, joins RoundResults
// and accumulates the score. It intentionally never creates a round from a
// surrender's awarded RoundResults entry.
func buildRoundWindows(scan *fieldScan, starts []roundStartEvent, manifestDuration uint32) ([]roundWindow, []string) {
	var warnings []string

	phases := append([]phaseWrite(nil), scan.Phases...)
	sort.SliceStable(phases, func(i, j int) bool {
		if phases[i].TimeMS == phases[j].TimeMS {
			return phases[i].PacketID < phases[j].PacketID
		}
		return phases[i].TimeMS < phases[j].TimeMS
	})

	var raw []roundPhase
	for _, write := range phases {
		timeMS := write.TimeMS
		switch write.Phase {
		case phaseReset:
			if len(raw) == 0 || raw[len(raw)-1].StartMS != nil ||
				raw[len(raw)-1].BuyEndMS != nil || raw[len(raw)-1].PostRoundMS != nil {
				raw = append(raw, roundPhase{})
			}
		case phaseRoundStart:
			if len(raw) == 0 {
				raw = append(raw, roundPhase{})
			}
			last := &raw[len(raw)-1]
			if last.StartMS != nil {
				// A second phase 3 inside one round is an observed replay
				// glitch (11.08, 12.03). Rounds are bounded by phase 2, so keep
				// the first start instead of inventing a round.
				warnings = append(warnings, "A repeated round-start phase was ignored.")
				continue
			}
			value := timeMS
			last.StartMS = &value
		case phaseBuyEnd:
			if len(raw) == 0 {
				continue
			}
			last := &raw[len(raw)-1]
			if last.BuyEndMS == nil {
				value := timeMS
				last.BuyEndMS = &value
			} else if last.BuyEnd2MS == nil {
				value := timeMS
				last.BuyEnd2MS = &value
				if difference := absDiff(*last.BuyEndMS, value); difference > 1000 {
					warnings = append(warnings, "A round's buy phase ended more than once with different times; the first was kept.")
				}
			}
		case phasePostRound:
			if len(raw) == 0 {
				continue
			}
			last := &raw[len(raw)-1]
			if last.PostRoundMS == nil {
				value := timeMS
				last.PostRoundMS = &value
			}
		case phaseSideSwitch:
			if len(raw) == 0 {
				continue
			}
			last := &raw[len(raw)-1]
			if last.SideSwitch == nil {
				value := timeMS
				last.SideSwitch = &value
			}
		}
	}

	// Drop a trailing reset that never produced a phase-3 start.
	for len(raw) > 0 && raw[len(raw)-1].StartMS == nil {
		raw = raw[:len(raw)-1]
	}
	if len(raw) == 0 {
		return nil, append(warnings, "No played rounds were found.")
	}

	resultsByNumber := make(map[int]*resultWrite)
	for _, entry := range scan.Results {
		if !entry.HasNumber {
			continue
		}
		if _, exists := resultsByNumber[entry.Number]; exists {
			warnings = append(warnings, "RoundResults repeated a round number; the last entry was kept.")
		}
		resultsByNumber[entry.Number] = entry
	}

	usedNumbers := make(map[int]bool)
	windows := make([]roundWindow, 0, len(raw))
	var redScore, blueScore int

	for index := range raw {
		phase := &raw[index]
		if phase.StartMS == nil {
			continue
		}
		start := *phase.StartMS
		end := manifestDuration
		if phase.PostRoundMS != nil && *phase.PostRoundMS > start {
			end = *phase.PostRoundMS
		} else if index+1 < len(raw) && raw[index+1].StartMS != nil && *raw[index+1].StartMS > start {
			end = *raw[index+1].StartMS
		}
		if end <= start {
			end = start + 1000
			warnings = append(warnings, "A round had no usable end phase; a one-second window was used.")
		}

		// roundStarted.word0 and RoundResults.RoundNumber are both zero-based;
		// the wire ReplayMatch round number is one-based.
		number := nearestRoundNumber(starts, start)
		if number < 0 || usedNumbers[number] {
			number = index
			if usedNumbers[number] {
				for usedNumbers[number] {
					number++
				}
			}
			warnings = append(warnings, "A round number was missing or repeated; roster order was used.")
		}
		usedNumbers[number] = true

		window := roundWindow{
			RoundNumber: number + 1,
			StartMS:     start,
			EndMS:       end,
		}
		if phase.BuyEndMS != nil && *phase.BuyEndMS >= start && *phase.BuyEndMS <= end {
			value := *phase.BuyEndMS
			window.BuyEndMS = &value
		}

		if result := resultsByNumber[number]; result != nil {
			window.HasResult = true
			window.WinningTeam = normaliseTeam(result.WinningTeam)
			window.RoundResultCode = resultCode(result.RoundResult, &warnings)
			window.AttackTeamID = attackTeam(window.WinningTeam, result.WinningRole)
			if window.WinningTeam == "" {
				warnings = append(warnings, "A played round had no winning team in RoundResults.")
			}
		} else {
			window.RoundResultCode = "Unknown"
			warnings = append(warnings, "A played round had no RoundResults entry; its result is unknown.")
		}

		switch window.WinningTeam {
		case "Red":
			redScore++
		case "Blue":
			blueScore++
		}
		window.Score = Score{Red: redScore, Blue: blueScore}
		windows = append(windows, window)
	}

	if len(resultsByNumber) > 0 {
		joined := 0
		for _, window := range windows {
			if resultsByNumber[window.RoundNumber-1] != nil {
				joined++
			}
		}
		if joined == 0 {
			warnings = append(warnings, "No RoundResults entry joined to a played round.")
		}
	}

	return windows, warnings
}

func nearestRoundNumber(starts []roundStartEvent, startMS uint32) int {
	best := -1
	bestDelta := uint32(2000)
	for _, event := range starts {
		if event.Number == nil {
			continue
		}
		delta := absDiff(event.TimeMS, startMS)
		if delta <= bestDelta {
			bestDelta = delta
			best = int(*event.Number)
		}
	}
	if best < 0 {
		return -1
	}
	return best
}

func absDiff(a, b uint32) uint32 {
	if a > b {
		return a - b
	}
	return b - a
}

func resultCode(raw string, warnings *[]string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "elimination", "eliminated":
		return "Elimination"
	case "defuse", "defused":
		return "Defuse"
	case "detonate", "detonated", "detonation":
		return "Detonate"
	case "surrendered", "surrender":
		return "Surrendered"
	case "time", "timeout", "time_expired", "expired", "timer":
		return "TimeExpired"
	case "":
		*warnings = append(*warnings, "A round had no result code.")
		return "Unknown"
	default:
		*warnings = append(*warnings, fmt.Sprintf("Unrecognised round result %q was kept as Unknown.", raw))
		return "Unknown"
	}
}

func attackTeam(winningTeam, role string) string {
	role = strings.ToLower(strings.TrimSpace(role))
	switch {
	case strings.Contains(role, "attack"):
		return winningTeam
	case strings.Contains(role, "defend"):
		switch winningTeam {
		case "Red":
			return "Blue"
		case "Blue":
			return "Red"
		}
	}
	return ""
}
