package replay

import (
	"errors"
	"io/fs"
	"math"
	"sort"

	"github.com/parquet-go/parquet-go"
)

// roundStartSampleWindowMS is how far after a phase-3 start M0 looks for a
// player's pose. The player is normally moving within the first frame; a spawn
// is only used when no movement sample exists in this window.
const roundStartSampleWindowMS = 2000

const (
	positionBucketsLimit  = 32768
	timeBucketsLimit      = 32768
	distinctCharactersCap = 256
)

type movementSample struct {
	TimeMS uint32
	X      float64
	Y      float64
	Z      float64
	Yaw    float64
}

type movementScan struct {
	Rows               int64
	FiniteRows         int64
	DistinctCharacters int
	MaxPositionRows    int64
	MaxTimeRows        int64

	samples  map[int]map[uint32]movementSample
	firstAny map[uint32]movementSample
}

type actorRow struct {
	TimeMS       uint32   `parquet:"time_ms"`
	ActorNetGUID uint32   `parquet:"actor_net_guid"`
	Event        string   `parquet:"event"`
	SpawnX       *float32 `parquet:"spawn_x,optional"`
	SpawnY       *float32 `parquet:"spawn_y,optional"`
	SpawnZ       *float32 `parquet:"spawn_z,optional"`
	SpawnYaw     *float32 `parquet:"spawn_yaw,optional"`
}

type actorSpawn struct {
	TimeMS uint32
	X      float64
	Y      float64
	Z      float64
	Yaw    float64
}

// scanMovement reads movement.parquet once. It feeds both the transform
// plausibility gate and the single static frame M0 emits for each round.
func scanMovement(exportDir string, windows []roundWindow) (*movementScan, error) {
	scan := &movementScan{
		samples:  make(map[int]map[uint32]movementSample, len(windows)),
		firstAny: make(map[uint32]movementSample),
	}

	starts := make([]uint32, len(windows))
	for i := range windows {
		starts[i] = windows[i].StartMS
	}

	seenCharacters := make(map[uint32]struct{})
	positionCounts := make(map[[3]float32]int64)
	timeCounts := make(map[uint32]int64)
	positionsSaturated := false
	timesSaturated := false

	_, err := readParquetRows[movementRow](exportDir+"/movement.parquet", func(rows []movementRow) error {
		for i := range rows {
			row := &rows[i]
			scan.Rows++

			if len(seenCharacters) < distinctCharactersCap {
				if _, exists := seenCharacters[row.CharacterNetGUID]; !exists {
					seenCharacters[row.CharacterNetGUID] = struct{}{}
					if len(seenCharacters) > scan.DistinctCharacters {
						scan.DistinctCharacters = len(seenCharacters)
					}
				}
			}

			if isFinite32(row.PosX) && isFinite32(row.PosY) && isFinite32(row.PosZ) {
				scan.FiniteRows++
				key := [3]float32{row.PosX, row.PosY, row.PosZ}
				if count, exists := positionCounts[key]; exists {
					count++
					positionCounts[key] = count
					if count > scan.MaxPositionRows {
						scan.MaxPositionRows = count
					}
				} else if !positionsSaturated && len(positionCounts) < positionBucketsLimit {
					positionCounts[key] = 1
					if scan.MaxPositionRows == 0 {
						scan.MaxPositionRows = 1
					}
				} else {
					positionsSaturated = true
				}
			}

			if count, exists := timeCounts[row.TimeMS]; exists {
				count++
				timeCounts[row.TimeMS] = count
				if count > scan.MaxTimeRows {
					scan.MaxTimeRows = count
				}
			} else if !timesSaturated && len(timeCounts) < timeBucketsLimit {
				timeCounts[row.TimeMS] = 1
				if scan.MaxTimeRows == 0 {
					scan.MaxTimeRows = 1
				}
			} else {
				timesSaturated = true
			}

			if !isFinite32(row.PosX) || !isFinite32(row.PosY) || !isFinite32(row.PosZ) || !isFinite32(row.Yaw) {
				continue
			}

			sample := movementSample{
				TimeMS: row.TimeMS,
				X:      float64(row.PosX),
				Y:      float64(row.PosY),
				Z:      float64(row.PosZ),
				Yaw:    float64(row.Yaw),
			}
			if _, exists := scan.firstAny[row.CharacterNetGUID]; !exists {
				scan.firstAny[row.CharacterNetGUID] = sample
			}

			index := sort.Search(len(starts), func(i int) bool { return starts[i] > row.TimeMS }) - 1
			if index < 0 || row.TimeMS < starts[index] {
				continue
			}
			if row.TimeMS-starts[index] > roundStartSampleWindowMS {
				continue
			}
			roundSamples := scan.samples[index]
			if roundSamples == nil {
				roundSamples = make(map[uint32]movementSample)
				scan.samples[index] = roundSamples
			}
			if _, exists := roundSamples[row.CharacterNetGUID]; !exists {
				roundSamples[row.CharacterNetGUID] = sample
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return scan, nil
}

func isFinite32(value float32) bool {
	return !float32IsNaN(value) && !float32IsInf(value)
}

func float32IsNaN(value float32) bool { return value != value }

func float32IsInf(value float32) bool {
	return value > math.MaxFloat32 || value < -math.MaxFloat32
}

// transformCheckError applies the cheap invariants from the plan. A decode
// that produced noise must fail here rather than become a match.
func (s *movementScan) transformCheckError() *Error {
	if s.Rows == 0 || s.FiniteRows == 0 {
		return NewError(CodeTransformCheck, "The replay contained no usable movement data.", nil)
	}
	if s.FiniteRows*2 < s.Rows {
		return NewError(CodeTransformCheck,
			"The replay's movement data contained too many unusable samples.", nil)
	}
	if s.DistinctCharacters < expectedPlayers {
		return NewError(CodeTransformCheck,
			"The replay's movement data did not identify all ten players.", nil)
	}
	if s.MaxPositionRows*100 > s.Rows*99 {
		return NewError(CodeTransformCheck,
			"The replay's movement data collapsed onto a single position.", nil)
	}
	if s.MaxTimeRows*100 > s.Rows*99 {
		return NewError(CodeTransformCheck,
			"The replay's movement data collapsed onto a single timestamp.", nil)
	}
	return nil
}

// scanActorSpawns reads channel-open rows for player pawns. It is a fallback
// for a round where movement has not started yet, so a missing or broken
// actors table is not fatal. Rows are keyed by subject, not pawn, because the
// actors table names the actor NetGUID rather than the character NetGUID.
func scanActorSpawns(exportDir string, index *playerIndex) (map[string][]actorSpawn, error) {
	spawns := make(map[string][]actorSpawn)

	_, err := readParquetRows[actorRow](exportDir+"/actors.parquet", func(rows []actorRow) error {
		for i := range rows {
			row := &rows[i]
			if row.Event != "open" {
				continue
			}
			subject, ok := index.subjectForActor(row.ActorNetGUID)
			if !ok {
				continue
			}
			if row.SpawnX == nil || row.SpawnY == nil || row.SpawnZ == nil {
				continue
			}
			if !isFinite32(*row.SpawnX) || !isFinite32(*row.SpawnY) || !isFinite32(*row.SpawnZ) {
				continue
			}
			yaw := float64(0)
			if row.SpawnYaw != nil && isFinite32(*row.SpawnYaw) {
				yaw = float64(*row.SpawnYaw)
			}
			spawns[subject] = append(spawns[subject], actorSpawn{
				TimeMS: row.TimeMS,
				X:      float64(*row.SpawnX),
				Y:      float64(*row.SpawnY),
				Z:      float64(*row.SpawnZ),
				Yaw:    yaw,
			})
		}
		return nil
	})
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return spawns, nil
		}
		return nil, err
	}

	for subject := range spawns {
		sort.SliceStable(spawns[subject], func(i, j int) bool {
			return spawns[subject][i].TimeMS < spawns[subject][j].TimeMS
		})
	}
	return spawns, nil
}

// buildStaticFrames emits one frame per round at the round's start. M0 is
// deliberately static: no decimation, interpolation or live state yet.
func buildStaticFrames(
	players []Player,
	subjectByPuuid map[string]string,
	index *playerIndex,
	windows []roundWindow,
	movement *movementScan,
	spawns map[string][]actorSpawn,
	warnings *warningList,
) []Frame {
	frames := make([]Frame, 0, len(windows))

	for roundIndex, window := range windows {
		frame := Frame{
			TimeMS:  0,
			Players: make([]FramePlayer, 0, len(players)),
			Spike:   nil,
		}

		for _, player := range players {
			subject := subjectByPuuid[player.Puuid]
			playerPosition, hasManifest := index.bySubject[subject]
			var manifestPlayer ManifestPlayer
			if hasManifest {
				manifestPlayer = index.players[playerPosition]
			}

			x, y, yaw, found := movement.sampleForRound(roundIndex, manifestPlayer, hasManifest)
			if !found {
				x, y, yaw, found = spawnForRound(spawns, subject, window.StartMS)
			}
			if !found {
				x, y, yaw, found = movement.firstAnyForPlayer(manifestPlayer, hasManifest)
			}
			if !found {
				warnings.add("Some players had no position at the start of a round.")
			}

			frame.Players = append(frame.Players, FramePlayer{
				Puuid:       player.Puuid,
				X:           x,
				Y:           y,
				ViewRadians: yawRadians(yaw),
				HP:          100,
				Credits:     0,
				Alive:       true,
			})
		}

		frames = append(frames, frame)
	}

	return frames
}

func (s *movementScan) sampleForRound(roundIndex int, player ManifestPlayer, hasPlayer bool) (float64, float64, float64, bool) {
	if !hasPlayer {
		return 0, 0, 0, false
	}
	roundSamples := s.samples[roundIndex]
	if roundSamples == nil {
		return 0, 0, 0, false
	}
	for _, pawn := range pawnGUIDs(player) {
		if sample, ok := roundSamples[pawn]; ok {
			return sample.X, sample.Y, sample.Yaw, true
		}
	}
	return 0, 0, 0, false
}

func (s *movementScan) firstAnyForPlayer(player ManifestPlayer, hasPlayer bool) (float64, float64, float64, bool) {
	if !hasPlayer {
		return 0, 0, 0, false
	}
	for _, pawn := range pawnGUIDs(player) {
		if sample, ok := s.firstAny[pawn]; ok {
			return sample.X, sample.Y, sample.Yaw, true
		}
	}
	return 0, 0, 0, false
}

func spawnForRound(spawns map[string][]actorSpawn, subject string, roundStart uint32) (float64, float64, float64, bool) {
	candidates := spawns[subject]
	if len(candidates) == 0 {
		return 0, 0, 0, false
	}

	// Latest open at or before the round start. A later open belongs to a later
	// round; the caller falls back to the first movement sample instead.
	position := sort.Search(len(candidates), func(i int) bool {
		return candidates[i].TimeMS > roundStart
	}) - 1
	if position < 0 {
		return 0, 0, 0, false
	}
	chosen := candidates[position]
	return chosen.X, chosen.Y, chosen.Yaw, true
}

func pawnGUIDs(player ManifestPlayer) []uint32 {
	pawns := make([]uint32, 0, len(player.CharacterNetGUIDs)+1)
	seen := make(map[uint32]struct{}, len(player.CharacterNetGUIDs)+1)
	add := func(guid uint32) {
		if guid == 0 {
			return
		}
		if _, exists := seen[guid]; exists {
			return
		}
		seen[guid] = struct{}{}
		pawns = append(pawns, guid)
	}
	if player.CharacterNetGUID != nil {
		add(*player.CharacterNetGUID)
	}
	for _, pawn := range player.CharacterNetGUIDs {
		add(pawn)
	}
	return pawns
}

func yawRadians(yaw float64) float64 {
	degrees := math.Mod(yaw, 360)
	if degrees < 0 {
		degrees += 360
	}
	return degrees * math.Pi / 180
}

// Ensure the generic reader type is instantiated for actorRow during tests and
// production alike.
var _ = parquet.NewGenericReader[actorRow]
