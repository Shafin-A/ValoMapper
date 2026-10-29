package replay

import (
	"math"
	"sort"
)

const (
	// defaultFrameHz is the wire rate the browser player receives. The payload
	// budget is derived from 8 Hz; 15 Hz is for measurement only.
	defaultFrameHz = 8
	fastFrameHz    = 15

	// teleportDistanceCM and teleportWindowMS define a cut. A player crossing
	// more than this distance inside this window did not walk there, so the
	// timeline duplicates the pre-jump pose 1 ms before the post-jump pose and
	// the client interpolates across a 1 ms span instead of sliding.
	teleportDistanceCM = 1500.0
	teleportWindowMS   = 500

	// maxTimelineSamples is a warning threshold, not a rate switch. Exceeding
	// it means the payload budget is at risk and the rate decision needs data.
	maxTimelineSamples = 400_000

	positionBucketsLimit  = 32768
	timeBucketsLimit      = 32768
	distinctCharactersCap = 256
)

// NormaliseFrameHz accepts only the rates the player supports. A caller that
// passes anything else gets the default and false, so the service can warn
// instead of silently changing fidelity.
func NormaliseFrameHz(hz int) (int, bool) {
	switch hz {
	case 0:
		return defaultFrameHz, true
	case defaultFrameHz, fastFrameHz:
		return hz, true
	default:
		return defaultFrameHz, false
	}
}

func binWidthMS(frameHz int) uint32 {
	if frameHz <= 0 {
		frameHz = defaultFrameHz
	}
	return uint32(math.Round(1000.0 / float64(frameHz)))
}

// movementSample is one decoded pose at its binned round-relative timestamp.
type movementSample struct {
	TimeMS uint32
	X      float64
	Y      float64
	Z      float64
	Yaw    float64
	Pawn   uint32
}

// sampleKey identifies one player's bin inside one round. The subject is used
// rather than a pawn so a reconnect's second pawn merges into the same stream.
type sampleKey struct {
	Round   uint16
	Bin     uint32
	Subject string
}

type movementScan struct {
	Rows               int64
	FiniteRows         int64
	UnmatchedRows      int64
	DistinctCharacters int
	MaxPositionRows    int64
	MaxTimeRows        int64
	// PawnOverlaps counts bins where two reconnect pawns were active together.
	PawnOverlaps int
	// PawnInactiveRows counts poses dropped because their pawn was outside its
	// known open interval.
	PawnInactiveRows int

	BinMS uint32

	bins      map[sampleKey]movementSample
	timelines []map[string][]timelineSample
}

// timelineSample is a decimated pose, round-relative, on the binned grid. The
// state fields are resolved from the subject's absolute timeline after
// keyframes and teleport cuts have fixed the final sample times.
type timelineSample struct {
	TimeMS      uint32
	X           float64
	Y           float64
	Yaw         float64
	HP          int
	Credits     int
	Alive       bool
	WeaponID    string
	ArmorID     string
	ArmorPoints int
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

// scanMovement reads movement.parquet once, bins every usable pose to the
// configured frame rate and keeps the latest row per (round, subject, bin).
// It also feeds the transform plausibility gate.
func scanMovement(
	exportDir string,
	windows []roundWindow,
	index *playerIndex,
	frameHz int,
	actors *stateActorView,
) (*movementScan, error) {
	scan := &movementScan{
		BinMS:     binWidthMS(frameHz),
		bins:      make(map[sampleKey]movementSample),
		timelines: make([]map[string][]timelineSample, len(windows)),
	}
	overlapBins := make(map[sampleKey]struct{})
	markOverlap := func(key sampleKey) {
		if _, seen := overlapBins[key]; seen {
			return
		}
		overlapBins[key] = struct{}{}
		scan.PawnOverlaps++
	}
	reconnectSubjects := make(map[string]struct{})
	for subject, pawns := range index.pawnsBySubject {
		if len(pawns) > 1 {
			reconnectSubjects[subject] = struct{}{}
		}
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

			subject, ok := index.subjectForPawn(row.CharacterNetGUID)
			if !ok {
				scan.UnmatchedRows++
				continue
			}

			roundIndex, ok := roundIndexAt(windows, row.TimeMS)
			if !ok {
				continue
			}
			window := &windows[roundIndex]
			relative := row.TimeMS - window.StartMS
			bin := relative / scan.BinMS
			key := sampleKey{Round: uint16(roundIndex), Bin: bin, Subject: subject}
			_, reconnect := reconnectSubjects[subject]
			reconnect = reconnect && actors != nil

			if reconnect {
				// A pawn that has already closed (or has not opened yet) is
				// the old or next life; its late poses must not land in this
				// life's bin.
				if active, known := actors.pawnActiveAt(row.CharacterNetGUID, row.TimeMS); known && !active {
					scan.PawnInactiveRows++
					continue
				}
			}

			sample := movementSample{
				// The bin start is the frame timestamp, so every player in a
				// bin shares one frame instead of creating a per-row union.
				TimeMS: bin * scan.BinMS,
				X:      float64(row.PosX),
				Y:      float64(row.PosY),
				Z:      float64(row.PosZ),
				Yaw:    float64(row.Yaw),
				Pawn:   row.CharacterNetGUID,
			}

			if previous, exists := scan.bins[key]; exists && reconnect && previous.Pawn != sample.Pawn {
				binTime := window.StartMS + bin*scan.BinMS
				activePawn, hasActive, ambiguous := actors.activePawn(index, subject, binTime)
				if hasActive && activePawn != sample.Pawn {
					if ambiguous {
						markOverlap(key)
					}
					continue
				}
				if ambiguous {
					markOverlap(key)
				}
			}

			scan.bins[key] = sample
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	scan.buildTimelines()
	return scan, nil
}

// buildTimelines converts the bin map into sorted per-round, per-subject
// slices and releases the map. Memory stays bounded by the decimated sample
// count, not the raw row count.
func (s *movementScan) buildTimelines() {
	for key, sample := range s.bins {
		round := s.timelines[key.Round]
		if round == nil {
			round = make(map[string][]timelineSample)
			s.timelines[key.Round] = round
		}
		round[key.Subject] = append(round[key.Subject], timelineSample{
			TimeMS: sample.TimeMS,
			X:      sample.X,
			Y:      sample.Y,
			Yaw:    sample.Yaw,
		})
	}
	s.bins = nil

	for _, round := range s.timelines {
		for subject := range round {
			samples := round[subject]
			sort.Slice(samples, func(i, j int) bool {
				return samples[i].TimeMS < samples[j].TimeMS
			})
			round[subject] = samples
		}
	}
}

func (s *movementScan) samplesFor(roundIndex int, subject string) []timelineSample {
	if roundIndex < 0 || roundIndex >= len(s.timelines) {
		return nil
	}
	return s.timelines[roundIndex][subject]
}

func isFinite32(value float32) bool {
	return !float32IsNaN(value) && !float32IsInf(value)
}

func float32IsNaN(value float32) bool { return value != value }

func float32IsInf(value float32) bool {
	return value > math.MaxFloat32 || value < -math.MaxFloat32
}

// transformCheckError applies the cheap pose invariants. A decode that
// produced noise must fail here rather than become a match.
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

// timelineStats is logged with the parse and is what the payload budget is
// checked against.
type timelineStats struct {
	Samples      int
	Frames       int
	TeleportCuts int
	Missing      int
}

// buildTimelineFrames turns the decimated movement stream into one frame slice
// per round. Every sample carries the full state: HP, credits, alive, the last
// real gun and the armour item with its points.
func buildTimelineFrames(
	players []Player,
	puuidBySubject map[string]string,
	windows []roundWindow,
	movement *movementScan,
	state *stateScan,
	logs map[int]*roundLog,
	spike *spikeTimeline,
	warnings *warningList,
) ([][]Frame, timelineStats) {
	stats := timelineStats{}
	roundFrames := make([][]Frame, len(windows))

	subjectByPuuid := make(map[string]string, len(puuidBySubject))
	for subject, puuid := range puuidBySubject {
		subjectByPuuid[puuid] = subject
	}

	for roundIndex := range windows {
		window := &windows[roundIndex]
		duration := uint32(0)
		if window.EndMS > window.StartMS {
			duration = window.EndMS - window.StartMS
		}
		keyframes := roundKeyframes(window, logs[window.RoundNumber], duration)

		perPlayer := make(map[string][]timelineSample, len(players))
		for _, player := range players {
			subject := subjectByPuuid[player.Puuid]
			samples := movement.samplesFor(roundIndex, subject)
			if len(samples) == 0 {
				stats.Missing++
				continue
			}

			samples = insertKeyframes(samples, keyframes)
			samples, cuts := insertTeleportCuts(samples)
			stats.TeleportCuts += cuts
			stats.Samples += len(samples)
			for i := range samples {
				sample := &samples[i]
				sampled := state.stateFor(subject, window.StartMS+sample.TimeMS, window.StartMS)
				sample.HP = sampled.HP
				sample.Credits = sampled.Credits
				sample.Alive = sampled.Alive
				sample.WeaponID = sampled.WeaponID
				sample.ArmorID = sampled.ArmorID
				sample.ArmorPoints = sampled.ArmorPoints
			}
			perPlayer[player.Puuid] = samples
		}

		frames := assembleFrames(players, perPlayer)
		poseAt := func(subject string, timeMS uint32) (Position, bool) {
			return spikeCarrierPose(movement.samplesFor(roundIndex, subject), timeMS)
		}
		for i := range frames {
			frames[i].Spike = spike.frameAt(roundIndex, uint32(frames[i].TimeMS), poseAt, puuidBySubject)
		}
		stats.Frames += len(frames)
		roundFrames[roundIndex] = frames
	}

	if stats.Missing > 0 {
		warnings.add("Some players had no movement data in a round.")
	}
	if movement != nil && movement.PawnOverlaps > 0 {
		warnings.add("Some reconnect pawns were active together; the first pawn's pose was kept.")
	}
	if movement != nil && movement.PawnInactiveRows > 0 {
		warnings.add("Some movement poses came from an inactive reconnect pawn and were dropped.")
	}
	if stats.Samples > maxTimelineSamples {
		warnings.add("This replay exceeded the movement sample budget; the frame rate may need lowering.")
	}

	return roundFrames, stats
}

// roundKeyframes lists the round-relative times the timeline must pin exactly:
// the round start, the barrier drop, every logged event and the round end.
func roundKeyframes(window *roundWindow, log *roundLog, duration uint32) []uint32 {
	times := make([]uint32, 0, 8)
	times = append(times, 0, duration)

	if window.BuyEndMS != nil && *window.BuyEndMS >= window.StartMS {
		if relative := *window.BuyEndMS - window.StartMS; relative <= duration {
			times = append(times, relative)
		}
	}
	if log != nil {
		for _, event := range log.Events {
			if event.TimeSinceRoundStartMillis < 0 {
				continue
			}
			relative := uint32(event.TimeSinceRoundStartMillis)
			if relative <= duration {
				times = append(times, relative)
			}
		}
	}

	sort.Slice(times, func(i, j int) bool { return times[i] < times[j] })

	unique := times[:0]
	for _, value := range times {
		if len(unique) > 0 && unique[len(unique)-1] == value {
			continue
		}
		unique = append(unique, value)
	}
	return unique
}

// insertKeyframes pins each keyframe to the last real pose at or before it. A
// keyframe never invents a position: with no earlier sample the frame is left
// to the first real sample instead.
func insertKeyframes(samples []timelineSample, keyframes []uint32) []timelineSample {
	if len(samples) == 0 || len(keyframes) == 0 {
		return samples
	}

	out := make([]timelineSample, 0, len(samples)+len(keyframes))
	index := 0

	for _, keyframe := range keyframes {
		for index < len(samples) && samples[index].TimeMS < keyframe {
			out = append(out, samples[index])
			index++
		}

		if index < len(samples) && samples[index].TimeMS == keyframe {
			out = append(out, samples[index])
			index++
			continue
		}

		if len(out) == 0 {
			continue
		}
		previous := out[len(out)-1]
		if previous.TimeMS >= keyframe {
			// A duplicate keyframe (or one equal to an existing pose).
			continue
		}
		previous.TimeMS = keyframe
		out = append(out, previous)
	}

	out = append(out, samples[index:]...)
	return out
}

// insertTeleportCuts duplicates the pre-jump pose 1 ms before a jump so client
// interpolation crosses a 1 ms span instead of sliding across the map.
func insertTeleportCuts(samples []timelineSample) ([]timelineSample, int) {
	if len(samples) < 2 {
		return samples, 0
	}

	out := make([]timelineSample, 0, len(samples)+4)
	out = append(out, samples[0])
	cuts := 0

	for i := 1; i < len(samples); i++ {
		previous := out[len(out)-1]
		current := samples[i]
		span := current.TimeMS - previous.TimeMS

		if span > 0 && span <= teleportWindowMS &&
			distance2D(previous, current) > teleportDistanceCM &&
			current.TimeMS > previous.TimeMS+1 {
			cut := previous
			cut.TimeMS = current.TimeMS - 1
			out = append(out, cut)
			cuts++
		}

		out = append(out, current)
	}

	return out, cuts
}

func distance2D(a, b timelineSample) float64 {
	dx := b.X - a.X
	dy := b.Y - a.Y
	return math.Sqrt(dx*dx + dy*dy)
}

// assembleFrames unions every player's sample times and emits a frame at each
// one. A player missing from a frame is deliberate: the client decides whether
// to hold or hide, never the server.
func assembleFrames(players []Player, timelines map[string][]timelineSample) []Frame {
	byTime := make(map[uint32][]FramePlayer)

	for _, player := range players {
		for _, sample := range timelines[player.Puuid] {
			framePlayer := FramePlayer{
				Puuid:       player.Puuid,
				X:           sample.X,
				Y:           sample.Y,
				ViewRadians: yawRadians(sample.Yaw),
				HP:          sample.HP,
				Credits:     sample.Credits,
				WeaponID:    sample.WeaponID,
				ArmorID:     sample.ArmorID,
				Alive:       sample.Alive,
			}
			if sample.ArmorID != "" {
				// A broken item is still equipped and 0 points is a known value,
				// so keep the pointer to distinguish it from "no armour".
				points := sample.ArmorPoints
				framePlayer.ArmorPoints = &points
			}
			byTime[sample.TimeMS] = append(byTime[sample.TimeMS], framePlayer)
		}
	}

	times := make([]uint32, 0, len(byTime))
	for timeMS := range byTime {
		times = append(times, timeMS)
	}
	sort.Slice(times, func(i, j int) bool { return times[i] < times[j] })

	frames := make([]Frame, 0, len(times))
	for _, timeMS := range times {
		frames = append(frames, Frame{
			TimeMS:  int(timeMS),
			Players: byTime[timeMS],
		})
	}
	return frames
}

// spikeCarrierPose finds the last decimated pose at or before timeMS. A pose
// older than the client's interpolation limit is not used, so the spike is
// hidden instead of snapping across a gap.
func spikeCarrierPose(samples []timelineSample, timeMS uint32) (Position, bool) {
	if len(samples) == 0 {
		return Position{}, false
	}
	index := sort.Search(len(samples), func(i int) bool {
		return samples[i].TimeMS > timeMS
	}) - 1
	if index < 0 {
		return Position{}, false
	}
	sample := samples[index]
	if timeMS-sample.TimeMS > spikePoseGapMS {
		return Position{}, false
	}
	return Position{X: sample.X, Y: sample.Y}, true
}

func yawRadians(yaw float64) float64 {
	degrees := math.Mod(yaw, 360)
	if degrees < 0 {
		degrees += 360
	}
	return degrees * math.Pi / 180
}
