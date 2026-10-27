package replay

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/parquet-go/parquet-go"
)

type fakeExporter struct {
	build       string
	exportCalls int
	inspectErr  error
	exportErr   error
	export      func(dir string) error
}

func (f *fakeExporter) Inspect(context.Context, string) (InspectResult, error) {
	if f.inspectErr != nil {
		return InspectResult{}, f.inspectErr
	}
	return InspectResult{
		Branch: "++Ares-Core+release-" + f.build,
		Build:  f.build,
	}, nil
}

func (f *fakeExporter) Export(_ context.Context, _, exportDir string) error {
	f.exportCalls++
	if f.exportErr != nil {
		return f.exportErr
	}
	return f.export(exportDir)
}

func newTestService(exporter *fakeExporter) *Service {
	return NewService(Config{
		Exporter:       exporter,
		MaxUploadBytes: 1 << 20,
		CacheTTL:       time.Minute,
	})
}

func testFilePath(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "replay.vrf")
	if err := os.WriteFile(path, []byte("placeholder"), 0o600); err != nil {
		t.Fatalf("write placeholder: %v", err)
	}
	return path
}

func TestServiceParseSyntheticReplay(t *testing.T) {
	exporter := &fakeExporter{
		build: "13.08",
		export: func(dir string) error {
			writeSyntheticExport(t, dir)
			return nil
		},
	}
	service := newTestService(exporter)
	hash := strings.Repeat("a", 64)

	envelope, err := service.Parse(context.Background(), testFilePath(t), hash)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if envelope.ReplayID != hash {
		t.Fatalf("replayId = %q, want %q", envelope.ReplayID, hash)
	}

	match := envelope.Match
	if match == nil {
		t.Fatal("match is nil")
	}
	if match.MatchID != "12345678-9ABC-DEF0-1122-334455667788" {
		t.Errorf("matchId = %q", match.MatchID)
	}
	if match.MapID != "ascent" || match.MapName != "Ascent" {
		t.Errorf("map = %q/%q", match.MapID, match.MapName)
	}
	if match.Build != "13.08" {
		t.Errorf("build = %q", match.Build)
	}
	if match.GameStartAt != "2024-01-01T00:00:00Z" {
		t.Errorf("gameStartAt = %q", match.GameStartAt)
	}
	if match.TotalRounds != 2 || len(match.Rounds) != 2 {
		t.Fatalf("rounds = %d/%d", match.TotalRounds, len(match.Rounds))
	}
	if len(match.Players) != 10 {
		t.Fatalf("players = %d", len(match.Players))
	}

	red, blue := 0, 0
	for _, player := range match.Players {
		switch player.TeamID {
		case "Red":
			red++
		case "Blue":
			blue++
		}
		if !strings.HasPrefix(player.Puuid, "vrf-") {
			t.Errorf("player id %q is not pseudonymous", player.Puuid)
		}
		if player.CharacterName == "Unknown" {
			t.Errorf("player %q has an unknown agent", player.Puuid)
		}
		if player.GameName == "" {
			t.Errorf("player %q has no display name", player.Puuid)
		}
	}
	if red != 5 || blue != 5 {
		t.Errorf("teams = Red %d / Blue %d", red, blue)
	}

	first := match.Rounds[0]
	if first.RoundNumber != 1 || first.WinningTeam != "Red" || first.RoundResultCode != "Elimination" {
		t.Errorf("round 1 = %+v", first)
	}
	if first.ScoreAfterRound != (Score{Red: 1, Blue: 0}) {
		t.Errorf("round 1 score = %+v", first.ScoreAfterRound)
	}
	if first.AttackTeamID != "Red" {
		t.Errorf("round 1 attack team = %q", first.AttackTeamID)
	}
	if first.BuyEndTimeMS == nil || *first.BuyEndTimeMS != 500 {
		t.Errorf("round 1 buyEndTimeMs = %v", first.BuyEndTimeMS)
	}
	if len(first.Frames) != 1 || len(first.Frames[0].Players) != 10 {
		t.Fatalf("round 1 frames = %d/%d", len(first.Frames), len(first.Frames[0].Players))
	}
	if len(first.EventLog) != 2 {
		t.Fatalf("round 1 events = %+v", first.EventLog)
	}
	if first.EventLog[0].EventType != "kill" || first.EventLog[0].KillerPuuid == "" ||
		first.EventLog[0].VictimPuuid == "" {
		t.Errorf("round 1 kill = %+v", first.EventLog[0])
	}
	if first.EventLog[1].EventType != "spike_planted" || first.EventLog[1].PlanterPuuid == "" {
		t.Errorf("round 1 plant = %+v", first.EventLog[1])
	}
	if first.EventLog[1].PlantLocation == nil ||
		first.EventLog[1].PlantLocation.X != 1200.5 ||
		first.EventLog[1].PlantLocation.Y != 2400.5 {
		t.Errorf("round 1 plant location = %+v", first.EventLog[1].PlantLocation)
	}

	second := match.Rounds[1]
	if second.RoundNumber != 2 || second.WinningTeam != "Blue" || second.RoundResultCode != "Detonate" {
		t.Errorf("round 2 = %+v", second)
	}
	if second.ScoreAfterRound != (Score{Red: 1, Blue: 1}) {
		t.Errorf("round 2 score = %+v", second.ScoreAfterRound)
	}
	if second.AttackTeamID != "Red" {
		t.Errorf("round 2 attack team = %q", second.AttackTeamID)
	}
	if len(second.EventLog) != 2 || second.EventLog[1].EventType != "spike_defused" {
		t.Errorf("round 2 events = %+v", second.EventLog)
	}

	if log := first.EventLog; len(log) == 2 && log[0].EventType == "kill" {
		var killerStats *PlayerStats
		for i := range first.PlayerStats {
			if first.PlayerStats[i].Puuid == log[0].KillerPuuid {
				killerStats = &first.PlayerStats[i]
			}
		}
		if killerStats == nil || killerStats.Kills != 1 {
			t.Errorf("killer stats = %+v", killerStats)
		}
	}
}

func TestServiceParseCachesDuplicateUploads(t *testing.T) {
	exporter := &fakeExporter{
		build: "13.08",
		export: func(dir string) error {
			writeSyntheticExport(t, dir)
			return nil
		},
	}
	service := newTestService(exporter)
	hash := strings.Repeat("b", 64)

	if _, err := service.Parse(context.Background(), testFilePath(t), hash); err != nil {
		t.Fatalf("first Parse: %v", err)
	}
	if _, err := service.Parse(context.Background(), testFilePath(t), hash); err != nil {
		t.Fatalf("second Parse: %v", err)
	}
	if exporter.exportCalls != 1 {
		t.Fatalf("export calls = %d, want 1", exporter.exportCalls)
	}

	cached, gz, ok := service.GetCached(hash)
	if !ok || cached == nil || len(gz) == 0 {
		t.Fatalf("GetCached = %v/%d/%v", cached != nil, len(gz), ok)
	}
}

func TestServiceRejectsUnsupportedInputs(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(t *testing.T, dir string)
		build  string
		code   Code
	}{
		{
			name:  "unsupported build",
			build: "13.99",
			code:  CodeUnsupportedBuild,
		},
		{
			name:  "unknown map",
			build: "13.08",
			mutate: func(t *testing.T, dir string) {
				editManifest(t, dir, func(m *Manifest) {
					m.LevelNamesAndTimes[0].Name = "/Game/Maps/Unknown/Unknown"
				})
			},
			code: CodeUnsupportedMap,
		},
		{
			name:  "lost content blocks",
			build: "13.08",
			mutate: func(t *testing.T, dir string) {
				editManifest(t, dir, func(m *Manifest) {
					m.Quality.ContentBlocksLost = 1
				})
			},
			code: CodeCorrupt,
		},
		{
			name:  "missing player",
			build: "13.08",
			mutate: func(t *testing.T, dir string) {
				editManifest(t, dir, func(m *Manifest) {
					m.Players = m.Players[:9]
				})
			},
			code: CodeMissingTeamData,
		},
		{
			name:  "implausible movement",
			build: "13.08",
			mutate: func(t *testing.T, dir string) {
				rows := make([]movementRow, 0, 100)
				for player := 0; player < 10; player++ {
					for sample := 0; sample < 10; sample++ {
						rows = append(rows, movementRow{
							TimeMS:           uint32(10000 + sample),
							CharacterNetGUID: uint32(200 + player),
							PosX:             1000,
							PosY:             1000,
						})
					}
				}
				if err := parquet.WriteFile(filepath.Join(dir, "movement.parquet"), rows); err != nil {
					t.Fatalf("rewrite movement: %v", err)
				}
			},
			code: CodeTransformCheck,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			exporter := &fakeExporter{
				build: test.build,
				export: func(dir string) error {
					writeSyntheticExport(t, dir)
					if test.mutate != nil {
						test.mutate(t, dir)
					}
					return nil
				},
			}
			service := newTestService(exporter)

			_, err := service.Parse(context.Background(), testFilePath(t), strings.Repeat("c", 64))
			if err == nil {
				t.Fatal("Parse succeeded, want an error")
			}
			if code := CodeOf(err); code != test.code {
				t.Fatalf("code = %s, want %s (err: %v)", code, test.code, err)
			}
			if strings.Contains(err.Error(), "vrfkit") {
				t.Fatalf("error leaked decoder output: %v", err)
			}
		})
	}
}

func TestServiceRejectsUnavailableParser(t *testing.T) {
	service := NewService(Config{Exporter: &fakeExporter{
		build:  "13.08",
		export: func(string) error { return nil },
	}})
	service.exporter = nil

	_, err := service.Parse(context.Background(), testFilePath(t), strings.Repeat("d", 64))
	if err == nil || CodeOf(err) != CodeParserUnavailable {
		t.Fatalf("err = %v", err)
	}
}

func editManifest(t *testing.T, dir string, edit func(*Manifest)) {
	t.Helper()
	path := filepath.Join(dir, "manifest.json")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read manifest: %v", err)
	}
	var manifest Manifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		t.Fatalf("decode manifest: %v", err)
	}
	edit(&manifest)
	data, err = json.Marshal(manifest)
	if err != nil {
		t.Fatalf("encode manifest: %v", err)
	}
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatalf("write manifest: %v", err)
	}
}
