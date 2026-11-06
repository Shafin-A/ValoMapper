package replay

import (
	"context"
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
)

// integrationFrameHz defaults to 8 and lets a measurement run pick 15.
func integrationFrameHz() int {
	value, err := strconv.Atoi(os.Getenv("VRF_FRAME_HZ"))
	if err != nil {
		return 8
	}
	hz, ok := NormaliseFrameHz(value)
	if !ok {
		return 8
	}
	return hz
}

// TestIntegrationRealReplay exercises the whole normaliser against real replay
// data. It is skipped unless one of these is set:
//
//	VRF_TEST_EXPORT            pre-made VRFKit export directory
//	VRF_TEST_FILE + VRFKIT_BIN path to a .vrf and the vrfkit executable
//
// A pre-made export skips the decoder and is the faster way to iterate on
// state, casts or frames. VRF_TEST_BUILD selects the build reported for it
// (default 13.08). Run it when changing movement, events, rounds or state:
//
//	go test ./replay -run TestIntegrationRealReplay -v -timeout 15m
func TestIntegrationRealReplay(t *testing.T) {
	if testing.Short() {
		t.Skip("real-replay integration test is an opt-in acceptance step")
	}

	file := os.Getenv("VRF_TEST_FILE")
	bin := os.Getenv("VRFKIT_BIN")
	exportDir := os.Getenv("VRF_TEST_EXPORT")

	var service *Service
	source := exportDir
	switch {
	case exportDir != "":
		build := os.Getenv("VRF_TEST_BUILD")
		if build == "" {
			build = "13.08"
		}
		service = NewService(Config{
			Exporter: &fakeExporter{
				build: build,
				export: func(dir string) error {
					return copyExportDirectory(exportDir, dir)
				},
			},
			ParseTimeout:   10 * time.Minute,
			MaxUploadBytes: 250 << 20,
			FrameHz:        integrationFrameHz(),
		})
		// The exporter ignores the input file, but the service still needs one
		// beside the temporary export directory.
		file = testFilePath(t)
	case file != "" && bin != "":
		source = file
		service = NewService(Config{
			VRFKitBin:      bin,
			InspectTimeout: 30 * time.Second,
			ExportTimeout:  5 * time.Minute,
			ParseTimeout:   10 * time.Minute,
			MaxUploadBytes: 250 << 20,
			FrameHz:        integrationFrameHz(),
		})
		if !service.Available() {
			t.Fatalf("vrfkit is not available at %s", bin)
		}
	default:
		t.Skip("set VRF_TEST_EXPORT, or VRF_TEST_FILE and VRFKIT_BIN, to run the real-replay integration test")
	}

	const replayID = "integration"
	started := time.Now()
	envelope, err := service.Parse(context.Background(), file, replayID)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	elapsed := time.Since(started)

	match := envelope.Match
	if match == nil {
		t.Fatal("empty match")
	}
	if len(match.Players) != expectedPlayers {
		t.Fatalf("players = %d", len(match.Players))
	}
	if len(match.Rounds) == 0 {
		t.Fatal("no rounds")
	}

	totalFrames := 0
	totalSamples := 0
	deaths := 0
	looseFrames := 0
	knifeFrames := 0
	totalHits := 0
	totalUtilities := 0
	blazeUtilitiesWithPath := 0
	utilityKinds := make(map[UtilityKind]struct{})
	utilityAbilityIDs := make(map[string]struct{})
	plantRounds := 0
	defuseRounds := 0
	explodeRounds := 0
	carriedAfterPlant := 0
	killSources := make(map[string]int)
	knownPlayers := make(map[string]struct{}, len(match.Players))
	for _, player := range match.Players {
		knownPlayers[player.Puuid] = struct{}{}
	}
	utilityIDs := make(map[string]struct{})
	for _, round := range match.Rounds {
		if len(round.Frames) == 0 {
			t.Fatalf("round %d has no frames", round.RoundNumber)
		}
		previous := -1
		roundHasState := false
		planted := false
		postPlantFrames := 0
		hasDetonatedFrame := false
		hasPlantEvent := false
		hasDefuseEvent := false
		hasExplodeEvent := false
		for i, frame := range round.Frames {
			if frame.TimeMS <= previous {
				t.Fatalf("round %d frame %d time %d is not increasing", round.RoundNumber, i, frame.TimeMS)
			}
			previous = frame.TimeMS
			if len(frame.Players) > expectedPlayers {
				t.Fatalf("round %d frame %d has %d players", round.RoundNumber, i, len(frame.Players))
			}
			if frame.TimeMS < 0 || frame.TimeMS > round.DurationMS {
				t.Fatalf("round %d frame %d time %d outside 0..%d",
					round.RoundNumber, i, frame.TimeMS, round.DurationMS)
			}
			if frame.Spike != nil {
				switch frame.Spike.State {
				case "loose":
					if planted {
						t.Errorf("round %d frame %d is loose after the plant", round.RoundNumber, i)
					}
					if frame.Spike.CarrierPuuid != "" {
						t.Errorf("round %d frame %d loose spike has a carrier", round.RoundNumber, i)
					}
					looseFrames++
				case "carried":
					if frame.Spike.CarrierPuuid == "" {
						t.Errorf("round %d frame %d carried spike has no carrier", round.RoundNumber, i)
					}
					if planted {
						carriedAfterPlant++
						t.Errorf("round %d frame %d carries the spike after the plant", round.RoundNumber, i)
					}
				case "planted", "defused", "detonated":
					planted = true
					postPlantFrames++
					if frame.Spike.State == "detonated" {
						hasDetonatedFrame = true
					}
					if frame.Spike.Site == "" {
						t.Errorf("round %d frame %d %s spike has no site", round.RoundNumber, i, frame.Spike.State)
					}
				default:
					t.Errorf("round %d frame %d has unknown spike state %q", round.RoundNumber, i, frame.Spike.State)
				}
			}
			for _, player := range frame.Players {
				if player.WeaponID == meleeWeaponID {
					knifeFrames++
				}
				if player.HP < 0 || player.HP > 200 {
					t.Fatalf("round %d frame %d player %s hp = %d, outside 0..200",
						round.RoundNumber, i, player.Puuid, player.HP)
				}
				if player.Credits < 0 || player.Credits > 9000 {
					t.Fatalf("round %d frame %d player %s credits = %d, outside 0..9000",
						round.RoundNumber, i, player.Puuid, player.Credits)
				}
				if !player.Alive {
					deaths++
				}
				if !placeholderFramePlayer(player) {
					roundHasState = true
				}
			}
			totalSamples += len(frame.Players)
		}
		if !roundHasState {
			t.Errorf("round %d only has placeholder samples", round.RoundNumber)
		}
		totalFrames += len(round.Frames)
		if round.EventLog == nil {
			t.Errorf("round %d has no event log", round.RoundNumber)
		}
		for _, event := range round.EventLog {
			switch event.EventType {
			case "spike_planted":
				hasPlantEvent = true
			case "spike_defused":
				hasDefuseEvent = true
			case "spike_exploded":
				hasExplodeEvent = true
			}
			if event.EventType != "kill" {
				continue
			}
			killSources[event.DamageType]++
			switch event.DamageType {
			case damageTypeAbility, damageTypeMelee:
				if event.DamageItem == "" {
					t.Errorf("round %d kill at %d is %q but has no damageItem",
						round.RoundNumber, event.TimeSinceRoundStartMillis, event.DamageType)
				}
			}
		}
		if hasPlantEvent {
			plantRounds++
			if postPlantFrames == 0 {
				t.Errorf("round %d logs a spike plant but has no planted frame", round.RoundNumber)
			}
		}
		if hasDefuseEvent {
			defuseRounds++
		}
		if hasExplodeEvent {
			explodeRounds++
			if !hasDetonatedFrame {
				t.Errorf("round %d logs a spike explosion but has no detonated frame", round.RoundNumber)
			}
		}
		if !hasExplodeEvent && hasDetonatedFrame {
			t.Errorf("round %d has a detonated frame without an explosion event", round.RoundNumber)
		}
		for _, hit := range round.Hits {
			totalHits++
			if hit.TimeMS < 0 || hit.TimeMS > round.DurationMS {
				t.Errorf("round %d hit time %d outside 0..%d",
					round.RoundNumber, hit.TimeMS, round.DurationMS)
			}
			if hit.ShooterPuuid == hit.VictimPuuid {
				t.Errorf("round %d hit at %d targets its own shooter", round.RoundNumber, hit.TimeMS)
			}
			if _, ok := knownPlayers[hit.ShooterPuuid]; !ok {
				t.Errorf("round %d hit shooter %q is not in the match", round.RoundNumber, hit.ShooterPuuid)
			}
			if _, ok := knownPlayers[hit.VictimPuuid]; !ok {
				t.Errorf("round %d hit victim %q is not in the match", round.RoundNumber, hit.VictimPuuid)
			}
		}
		for _, utility := range round.Utilities {
			totalUtilities++
			utilityKinds[utility.Kind] = struct{}{}
			if utility.AbilityID == "" {
				t.Errorf("round %d utility %q has no corresponding ValoMapper ability id",
					round.RoundNumber, utility.ID)
			} else {
				utilityAbilityIDs[utility.AbilityID] = struct{}{}
			}
			if utility.ID == "" {
				t.Errorf("round %d utility has no replay-local id", round.RoundNumber)
			}
			if _, duplicate := utilityIDs[utility.ID]; duplicate {
				t.Errorf("round %d has duplicate utility id %q", round.RoundNumber, utility.ID)
			}
			utilityIDs[utility.ID] = struct{}{}
			if utility.StartTimeMS < 0 || utility.StartTimeMS >= utility.EndTimeMS ||
				utility.EndTimeMS > round.DurationMS {
				t.Errorf("round %d utility interval %q is outside the round: %d..%d/%d",
					round.RoundNumber, utility.ID, utility.StartTimeMS, utility.EndTimeMS, round.DurationMS)
			}
			if !validUtilityPosition(utility.Position) {
				t.Errorf("round %d utility %q has an invalid spawn position", round.RoundNumber, utility.ID)
			}
			if utility.AbilityID == "blaze" {
				if len(utility.Path) > 1 {
					blazeUtilitiesWithPath++
				}
				for _, point := range utility.Path {
					if point.TimeMS < utility.StartTimeMS || point.TimeMS >= utility.EndTimeMS ||
						!validUtilityPosition(Position{X: point.X, Y: point.Y}) {
						t.Errorf("round %d Blaze utility %q has an invalid path point: %+v",
							round.RoundNumber, utility.ID, point)
					}
				}
			}
			previousSampleMS := -1
			for _, sample := range utility.Samples {
				if sample.TimeMS < utility.StartTimeMS || sample.TimeMS >= utility.EndTimeMS ||
					sample.TimeMS <= previousSampleMS || !validUtilityPosition(Position{X: sample.X, Y: sample.Y}) {
					t.Errorf("round %d utility %q has an invalid movement sample at %d",
						round.RoundNumber, utility.ID, sample.TimeMS)
				}
				previousSampleMS = sample.TimeMS
			}
			if utility.Kind == UtilityMobile && len(utility.Samples) == 0 {
				t.Errorf("round %d mobile utility %q has no observed movement samples",
					round.RoundNumber, utility.ID)
			}
		}

		// The opening pose must never be the pre-respawn sample. A player that
		// jumps more than the teleport threshold inside the start window means
		// a stale pose survived normalisation.
		firstPoses := make(map[string]FramePlayer)
		for _, frame := range round.Frames {
			if frame.TimeMS > roundStartPoseWindowMS {
				break
			}
			for _, player := range frame.Players {
				previous, ok := firstPoses[player.Puuid]
				if ok && math.Hypot(player.X-previous.X, player.Y-previous.Y) > teleportDistanceCM {
					t.Errorf("round %d player %s jumps from (%.0f,%.0f) to (%.0f,%.0f) at the round start",
						round.RoundNumber, player.Puuid, previous.X, previous.Y, player.X, player.Y)
				}
				firstPoses[player.Puuid] = player
			}
		}
	}
	if deaths == 0 {
		t.Error("no sample is dead; the fixture should contain a death")
	}
	if looseFrames == 0 {
		t.Error("no frame rendered a loose spike")
	}
	if knifeFrames == 0 {
		t.Error("no frame rendered the knife; melee equips should be visible")
	}
	if totalHits == 0 {
		t.Error("no gun hits; the player cannot draw a tracer")
	}
	if totalUtilities > maxUtilityIntervals {
		t.Errorf("utility intervals = %d, above the %d interval payload cap",
			totalUtilities, maxUtilityIntervals)
	}
	// The 13.08 fixture is the M3 calibration export. One plant event falls
	// outside every round window, so 19 of the 20 raw plants reach the log.
	if match.Build == "13.08" {
		if plantRounds != 19 || defuseRounds != 4 || explodeRounds != 1 {
			t.Errorf("spike counts = plants %d / defuses %d / explosions %d, want 19/4/1",
				plantRounds, defuseRounds, explodeRounds)
		}
		for _, kind := range []UtilityKind{
			UtilitySmoke, UtilityWall, UtilityMolly, UtilityTrap, UtilityMobile,
		} {
			if _, ok := utilityKinds[kind]; !ok {
				t.Errorf("13.08 replay did not normalize calibrated utility kind %q", kind)
			}
		}
		for _, abilityID := range []string{
			"ruse", "cloudburst", "hot_hands", "blaze", "trademark", "prowler", "boom_bot",
		} {
			if _, ok := utilityAbilityIDs[abilityID]; !ok {
				t.Errorf("13.08 replay did not map calibrated utility to ValoMapper ability %q",
					abilityID)
			}
		}
		if blazeUtilitiesWithPath == 0 {
			t.Error("13.08 replay did not expose any observed Phoenix Blaze wall path points")
		}
	}
	if carriedAfterPlant != 0 {
		t.Errorf("carried spike frames after a plant = %d", carriedAfterPlant)
	}
	if len(match.Warnings) > 64 {
		t.Errorf("warnings = %d; warnings must stay bounded instead of repeating per frame",
			len(match.Warnings))
	}

	encoded, err := json.Marshal(envelope)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if strings.Contains(string(encoded), "GameObject_Smonk") ||
		strings.Contains(string(encoded), "actorNetGuid") {
		t.Error("utility payload exposed raw actor identifiers or class paths")
	}
	_, gz, ok := service.GetCached(replayID)
	if !ok {
		t.Fatal("parsed replay was not cached")
	}

	t.Logf("source=%s build=%s map=%s", source, match.Build, match.MapName)
	t.Logf("elapsed=%s rounds=%d frames=%d samples=%d deaths=%d loose_frames=%d knife_frames=%d hits=%d",
		elapsed, len(match.Rounds), totalFrames, totalSamples, deaths, looseFrames, knifeFrames, totalHits)
	t.Logf("utilities=%d kinds=%v warnings=%+v", totalUtilities, utilityKinds, match.UtilityWarnings)
	t.Logf("json_bytes=%d gzip_bytes=%d teleport_cuts_logged=see parse log", len(encoded), len(gz))
	t.Logf("kill_sources=%v", killSources)

	if totalFrames < len(match.Rounds)*2 {
		t.Errorf("frames = %d for %d rounds; a movement timeline should exceed one frame per round",
			totalFrames, len(match.Rounds))
	}
	if len(gz) > 6<<20 {
		t.Errorf("gzip payload = %d bytes, above the 6 MB payload target", len(gz))
	}
}

// placeholderFramePlayer reports the M1 sample shape: a default bar with no
// state behind it.
func placeholderFramePlayer(player FramePlayer) bool {
	return player.HP == 100 &&
		player.Alive &&
		player.Credits == 0 &&
		player.WeaponID == "" &&
		player.ArmorID == "" &&
		player.ArmorPoints == nil
}

// copyExportDirectory copies the flat VRFKit export files into the service's
// temporary export directory.
func copyExportDirectory(src, dst string) error {
	entries, err := os.ReadDir(src)
	if err != nil {
		return err
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		data, err := os.ReadFile(filepath.Join(src, entry.Name()))
		if err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(dst, entry.Name()), data, 0o600); err != nil {
			return err
		}
	}
	return nil
}
