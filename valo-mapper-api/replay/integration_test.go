package replay

import (
	"context"
	"encoding/json"
	"os"
	"strconv"
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

// TestIntegrationRealReplay exercises the whole normaliser against a real
// export. It is skipped unless both variables are set:
//
//	VRF_TEST_FILE  path to a .vrf
//	VRFKIT_BIN     path to the vrfkit executable
//
// Run it when changing movement, events or rounds:
//
//	go test ./replay -run TestIntegrationRealReplay -v -timeout 15m
func TestIntegrationRealReplay(t *testing.T) {
	file := os.Getenv("VRF_TEST_FILE")
	bin := os.Getenv("VRFKIT_BIN")
	if file == "" || bin == "" {
		t.Skip("set VRF_TEST_FILE and VRFKIT_BIN to run the real-replay integration test")
	}

	service := NewService(Config{
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
	for _, round := range match.Rounds {
		if len(round.Frames) == 0 {
			t.Fatalf("round %d has no frames", round.RoundNumber)
		}
		previous := -1
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
			totalSamples += len(frame.Players)
		}
		totalFrames += len(round.Frames)
		if round.EventLog == nil {
			t.Errorf("round %d has no event log", round.RoundNumber)
		}
	}

	encoded, err := json.Marshal(envelope)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	_, gz, ok := service.GetCached(replayID)
	if !ok {
		t.Fatal("parsed replay was not cached")
	}

	t.Logf("file=%s build=%s map=%s", file, match.Build, match.MapName)
	t.Logf("elapsed=%s rounds=%d frames=%d samples=%d", elapsed, len(match.Rounds), totalFrames, totalSamples)
	t.Logf("json_bytes=%d gzip_bytes=%d teleport_cuts_logged=see parse log", len(encoded), len(gz))

	if totalFrames < len(match.Rounds)*2 {
		t.Errorf("frames = %d for %d rounds; a movement timeline should exceed one frame per round",
			totalFrames, len(match.Rounds))
	}
	if len(gz) > 6<<20 {
		t.Errorf("gzip payload = %d bytes, above the 6 MB payload target", len(gz))
	}
}
