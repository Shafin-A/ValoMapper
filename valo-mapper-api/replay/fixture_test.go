package replay

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/parquet-go/parquet-go"
)

// syntheticExport is a tiny but complete VRFKit-shaped export: two rounds, ten
// players, two teams, one plant, one defuse and movement data for every round.
type syntheticExport struct {
	dir      string
	manifest Manifest
	subjects []string
	agents   []string
	pawns    []uint32
	actors   []uint32
}

func writeSyntheticExport(t *testing.T, dir string) *syntheticExport {
	t.Helper()

	export := &syntheticExport{
		dir:      dir,
		subjects: make([]string, 10),
		agents:   make([]string, 10),
		pawns:    make([]uint32, 10),
		actors:   make([]uint32, 10),
	}

	agentIDs := []string{
		"add6443a-41bd-e414-f6ad-e58d267f4e95", // Jett
		"569fdd95-4d10-43ab-ca70-79becc718b46", // Sage
		"320b2a48-4d9b-a075-30f1-1f93a9b638fa", // Sova
		"8e253930-4c05-31dd-1b6c-968525494517", // Omen
		"eb93336a-449b-9c1b-0a54-a891f7921d69", // Phoenix
		"f94c3b30-42be-e959-889c-5aa313dba261", // Raze
		"a3bfb853-43b2-7238-a4f1-ad90e9e46bcc", // Reyna
		"117ed9e3-49f3-6512-3ccf-0cada7e3823b", // Cypher
		"1e58de9c-4950-5125-93e9-a0aee9f98746", // Killjoy
		"9f0d8ba9-4140-b941-57d3-a7ad57c6b417", // Brimstone
	}

	manifestPlayers := make([]ManifestPlayer, 0, 10)
	loadouts := make([]map[string]string, 0, 10)
	for i := 0; i < 10; i++ {
		subject := fmt.Sprintf("00000000-0000-0000-0000-%012d", i+1)
		pawn := uint32(200 + i)
		actor := uint32(100 + i)
		export.subjects[i] = subject
		export.agents[i] = agentIDs[i]
		export.pawns[i] = pawn
		export.actors[i] = actor

		pawnCopy := pawn
		manifestPlayers = append(manifestPlayers, ManifestPlayer{
			ActorNetGUID:      actor,
			Subject:           subject,
			CharacterNetGUID:  &pawnCopy,
			CharacterNetGUIDs: []uint32{pawn},
		})
		loadouts = append(loadouts, map[string]string{
			"subject":     subject,
			"characterId": agentIDs[i],
		})
	}

	loadoutJSON, err := json.Marshal(loadouts)
	if err != nil {
		t.Fatalf("marshal loadouts: %v", err)
	}

	export.manifest = Manifest{
		ReplayBuild:    "++Ares-Core+release-13.08",
		ReplayVersion:  "13.08",
		DurationMS:     120000,
		TimestampTicks: 638396640000000000,
		GUID:           [4]uint32{0x12345678, 0x9ABCDEF0, 0x11223344, 0x55667788},
		LevelNamesAndTimes: []LevelNameAndTime{
			{Name: "/Game/Maps/Ascent/Ascent", TimeMS: 0},
		},
		GameSpecificData: []string{string(loadoutJSON)},
		Players:          manifestPlayers,
		Quality: ManifestQuality{
			ContentBlocksLost:     0,
			MovementRows:          100,
			EventRows:             7,
			EventLayoutMismatches: 0,
			EventPayloadUnknown:   0,
		},
	}

	if err := export.writeManifest(); err != nil {
		t.Fatalf("write manifest: %v", err)
	}
	if err := export.writeFields(); err != nil {
		t.Fatalf("write fields: %v", err)
	}
	if err := export.writeEvents(); err != nil {
		t.Fatalf("write events: %v", err)
	}
	if err := export.writeMovement(); err != nil {
		t.Fatalf("write movement: %v", err)
	}
	if err := export.writeActors(); err != nil {
		t.Fatalf("write actors: %v", err)
	}
	if err := export.writeNetGuids(); err != nil {
		t.Fatalf("write net guids: %v", err)
	}

	return export
}

func (e *syntheticExport) writeManifest() error {
	data, err := json.MarshalIndent(e.manifest, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(e.dir, "manifest.json"), data, 0o600)
}

func (e *syntheticExport) writeFields() error {
	rows := make([]fieldRow, 0, 64)

	// Combat report: one interaction per player, Red for 0-4 and Blue for 5-9.
	for i, subject := range e.subjects {
		team := "Red"
		if i >= 5 {
			team = "Blue"
		}
		prefix := fmt.Sprintf("Rounds[0].Reports[0].Interactions[%d]", i)
		subjectName := prefix + ".ParticipantSubject"
		teamName := prefix + ".ParticipantTeamName"
		subjectValue := subject
		teamValue := team
		rows = append(rows,
			fieldRow{
				TimeMS:    1000,
				PacketID:  uint32(100 + i),
				GroupPath: "Bomb_CombatReportComponent",
				FieldName: &subjectName,
				ValueStr:  &subjectValue,
			},
			fieldRow{
				TimeMS:    1000,
				PacketID:  uint32(200 + i),
				GroupPath: "Bomb_CombatReportComponent",
				FieldName: &teamName,
				ValueStr:  &teamValue,
			},
		)
	}

	// Phases: reset, round start, buy end, post-round, twice.
	phaseRows := []struct {
		timeMS uint32
		phase  int64
	}{
		{0, phaseReset},
		{10000, phaseRoundStart},
		{10500, phaseBuyEnd},
		{50000, phasePostRound},
		{52000, phaseReset},
		{55000, phaseRoundStart},
		{55500, phaseBuyEnd},
		{100000, phasePostRound},
	}
	for i, phase := range phaseRows {
		name := "MulticastSetPhase.NewPhase"
		value := phase.phase
		rows = append(rows, fieldRow{
			TimeMS:    phase.timeMS,
			PacketID:  uint32(300 + i),
			FieldName: &name,
			ValueI64:  &value,
		})
	}

	// RoundResults[0] -> Red elimination on attack; [1] -> Blue detonation on defend.
	resultRows := []struct {
		name  string
		value string
	}{
		{"RoundResults[0].RoundNumber", ""},
		{"RoundResults[0].WinningTeam", "Red"},
		{"RoundResults[0].WinningTeamRole", "attacker"},
		{"RoundResults[0].RoundResult", "elimination"},
		{"RoundResults[1].RoundNumber", ""},
		{"RoundResults[1].WinningTeam", "Blue"},
		{"RoundResults[1].WinningTeamRole", "defender"},
		{"RoundResults[1].RoundResult", "detonate"},
	}
	for i, result := range resultRows {
		name := result.name
		if result.value == "" {
			number := int64(0)
			if i >= 4 {
				number = 1
			}
			rows = append(rows, fieldRow{
				TimeMS:    110000,
				PacketID:  uint32(400 + i),
				FieldName: &name,
				ValueI64:  &number,
			})
			continue
		}
		value := result.value
		rows = append(rows, fieldRow{
			TimeMS:    110000,
			PacketID:  uint32(400 + i),
			FieldName: &name,
			ValueStr:  &value,
		})
	}

	// Plant RPC: player 2 (pawn 201) at a known position.
	planterName := "BombPlantedRPC.BombPlanter"
	planter := int64(e.pawns[1])
	locationName := "BombPlantedRPC.PlantLocation"
	location := "(1200.5,2400.5,0.0)"
	rows = append(rows,
		fieldRow{TimeMS: 20000, PacketID: 500, FieldName: &planterName, ValueI64: &planter},
		fieldRow{TimeMS: 20000, PacketID: 501, FieldName: &locationName, ValueStr: &location},
	)

	// Defuse RPC: player 6 (pawn 205).
	defuserIdName := "BombDefusedRPC.DefusingCharacter"
	defuser := int64(e.pawns[5])
	rows = append(rows, fieldRow{TimeMS: 70000, PacketID: 600, FieldName: &defuserIdName, ValueI64: &defuser})

	return parquet.WriteFile(filepath.Join(e.dir, "fields.parquet"), rows)
}

func (e *syntheticExport) writeEvents() error {
	round1 := uint32(0)
	round2 := uint32(1)
	killer1 := e.actors[0]
	victim1 := e.pawns[1]
	killer2 := e.actors[2]
	victim2 := e.pawns[3]

	rows := []eventRow{
		{Group: "roundStarted", Time1: 10000, Word0: &round1},
		{Group: "characterDeath", Time1: 15000, Word0: &killer1, Word1: &victim1},
		{Group: "spikePlanted", Time1: 20000},
		{Group: "roundStarted", Time1: 55000, Word0: &round2},
		{Group: "characterDeath", Time1: 60000, Word0: &killer2, Word1: &victim2},
		{Group: "spikeDefused", Time1: 70000},
	}
	return parquet.WriteFile(filepath.Join(e.dir, "events.parquet"), rows)
}

func (e *syntheticExport) writeMovement() error {
	roundStarts := []uint32{10000, 55000}
	rows := make([]movementRow, 0, 100)
	for _, start := range roundStarts {
		for player := 0; player < 10; player++ {
			for sample := 0; sample < 5; sample++ {
				rows = append(rows, movementRow{
					TimeMS:           start + uint32(100+sample*100),
					CharacterNetGUID: e.pawns[player],
					PosX:             float32(1000 + player*100 + sample*10),
					PosY:             float32(2000 + player*100 + sample*10),
					PosZ:             0,
					Yaw:              float32(player * 36),
					Pitch:            0,
				})
			}
		}
	}
	return parquet.WriteFile(filepath.Join(e.dir, "movement.parquet"), rows)
}

func (e *syntheticExport) writeActors() error {
	rows := make([]actorRow, 0, 20)
	for i := 0; i < 10; i++ {
		spawnX := float32(500 + i*100)
		spawnY := float32(600 + i*100)
		spawnZ := float32(0)
		yaw := float32(i * 36)
		rows = append(rows,
			actorRow{
				TimeMS:       9000,
				ActorNetGUID: e.actors[i],
				Event:        "open",
				SpawnX:       &spawnX,
				SpawnY:       &spawnY,
				SpawnZ:       &spawnZ,
				SpawnYaw:     &yaw,
			},
			actorRow{
				TimeMS:       54000,
				ActorNetGUID: e.actors[i],
				Event:        "open",
				SpawnX:       &spawnX,
				SpawnY:       &spawnY,
				SpawnZ:       &spawnZ,
				SpawnYaw:     &yaw,
			},
		)
	}
	return parquet.WriteFile(filepath.Join(e.dir, "actors.parquet"), rows)
}

// writeNetGuids writes the small object-path table scanState reads. The
// synthetic fixture has no damage or inventory rows, so the table only needs
// to exist and be readable.
func (e *syntheticExport) writeNetGuids() error {
	rows := []netGuidRow{{NetGUID: 1, Path: "PersistentLevel"}}
	return parquet.WriteFile(filepath.Join(e.dir, "net_guids.parquet"), rows)
}

func ptr[T any](value T) *T {
	return &value
}
