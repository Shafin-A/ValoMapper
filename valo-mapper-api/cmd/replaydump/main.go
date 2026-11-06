// Command replaydump writes the normalised replay envelope JSON for a local .vrf.
package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"valo-mapper-api/replay"
)

func main() {
	if len(os.Args) < 3 {
		fmt.Fprintln(os.Stderr, "usage: replaydump <input.vrf> <output.json> [frame-hz]")
		os.Exit(2)
	}

	input := os.Args[1]
	output := os.Args[2]
	frameHz := 8
	if len(os.Args) > 3 {
		parsed, err := strconv.Atoi(os.Args[3])
		if err != nil {
			fmt.Fprintf(os.Stderr, "invalid frame hz: %v\n", err)
			os.Exit(2)
		}
		frameHz = parsed
	}

	hash, err := fileHash(input)
	if err != nil {
		fmt.Fprintf(os.Stderr, "hash %s: %v\n", input, err)
		os.Exit(1)
	}

	bin := os.Getenv("VRFKIT_BIN")
	if bin == "" {
		bin = "vrfkit"
	}

	svc := replay.NewService(replay.Config{
		VRFKitBin:      bin,
		InspectTimeout: 30 * time.Second,
		ExportTimeout:  10 * time.Minute,
		ParseTimeout:   15 * time.Minute,
		FrameHz:        frameHz,
	})

	started := time.Now()
	envelope, err := svc.Parse(context.Background(), input, hash)
	if err != nil {
		fmt.Fprintf(os.Stderr, "parse: %v\n", err)
		os.Exit(1)
	}

	encoded, err := json.Marshal(envelope)
	if err != nil {
		fmt.Fprintf(os.Stderr, "marshal: %v\n", err)
		os.Exit(1)
	}

	if err := os.MkdirAll(filepath.Dir(output), 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "mkdir: %v\n", err)
		os.Exit(1)
	}
	if err := os.WriteFile(output, encoded, 0o644); err != nil {
		fmt.Fprintf(os.Stderr, "write: %v\n", err)
		os.Exit(1)
	}

	totalFrames := 0
	totalUtilities := 0
	for _, round := range envelope.Match.Rounds {
		totalFrames += len(round.Frames)
		totalUtilities += len(round.Utilities)
	}

	fmt.Printf("wrote %s (%.1f MB) in %s\n", output, float64(len(encoded))/(1<<20), time.Since(started).Round(time.Millisecond))
	fmt.Printf("map=%s rounds=%d duration=%ds frames=%d utilities=%d players=%d\n",
		envelope.Match.MapName,
		envelope.Match.TotalRounds,
		envelope.Match.DurationMS/1000,
		totalFrames,
		totalUtilities,
		len(envelope.Match.Players),
	)
}

func fileHash(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer func() { _ = file.Close() }()

	digest := sha256.New()
	if _, err := io.Copy(digest, file); err != nil {
		return "", err
	}
	return hex.EncodeToString(digest.Sum(nil)), nil
}
