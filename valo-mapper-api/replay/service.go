package replay

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"golang.org/x/sync/singleflight"

	"valo-mapper-api/valorant"
)

const (
	defaultParseTimeout  = 3 * time.Minute
	defaultQueueWait     = 30 * time.Second
	defaultMaxUploadSize = 250 << 20
	defaultMaxConcurrent = 1
)

// Config is the replay service's deployment knobs. The zero value uses the
// production defaults; tests override Exporter to avoid VRFKit.
type Config struct {
	VRFKitBin       string
	InspectTimeout  time.Duration
	ExportTimeout   time.Duration
	ParseTimeout    time.Duration
	QueueWait       time.Duration
	MaxUploadBytes  int64
	CacheTTL        time.Duration
	CacheMaxEntries int
	CacheMaxBytes   int64
	MaxConcurrent   int
	FrameHz         int
	Exporter        Exporter
}

// Service orchestrates inspect -> export -> normalise -> gzip cache. It owns no
// HTTP and returns replay.Error values the handler can map directly.
type Service struct {
	exporter Exporter
	cache    *replayCache
	group    singleflight.Group
	sem      chan struct{}
	config   Config
	metrics  *serviceMetrics
}

func NewService(config Config) *Service {
	if config.ParseTimeout <= 0 {
		config.ParseTimeout = defaultParseTimeout
	}
	if config.QueueWait <= 0 {
		config.QueueWait = defaultQueueWait
	}
	if config.MaxUploadBytes <= 0 {
		config.MaxUploadBytes = defaultMaxUploadSize
	}
	if config.MaxConcurrent <= 0 {
		config.MaxConcurrent = defaultMaxConcurrent
	}
	frameHz, valid := NormaliseFrameHz(config.FrameHz)
	if !valid {
		slog.Warn("unsupported replay frame rate; using the default",
			"requested_hz", config.FrameHz,
			"frame_hz", frameHz,
		)
	}
	config.FrameHz = frameHz

	exporter := config.Exporter
	if exporter == nil {
		exporter = NewVRFKit(config.VRFKitBin, config.InspectTimeout, config.ExportTimeout)
	}

	service := &Service{
		exporter: exporter,
		cache:    newReplayCache(config.CacheTTL, config.CacheMaxEntries, config.CacheMaxBytes),
		sem:      make(chan struct{}, config.MaxConcurrent),
		config:   config,
		metrics:  newServiceMetrics(),
	}

	if !service.Available() {
		slog.Warn("vrfkit is not available; replay parsing is disabled", "bin", config.VRFKitBin)
	}
	return service
}

// Available reports whether the configured decoder can be executed.
func (s *Service) Available() bool {
	if s == nil || s.exporter == nil {
		return false
	}
	if vrfkit, ok := s.exporter.(*VRFKit); ok {
		return vrfkit.Available()
	}
	return true
}

func (s *Service) MaxUploadBytes() int64 {
	if s == nil || s.config.MaxUploadBytes <= 0 {
		return defaultMaxUploadSize
	}
	return s.config.MaxUploadBytes
}

// cacheKey binds a cached body to the normaliser version and the frame rate.
// A parser bump or a rate change must never serve a stale timeline.
func (s *Service) cacheKey(hash string) string {
	return fmt.Sprintf("%s:%s:%d", hash, ParserVersion, s.config.FrameHz)
}

// GetCached returns a parsed replay from the short-lived cache. gz is the exact
// gzip body to write for a GET; env is supplied for callers that need a struct.
func (s *Service) GetCached(id string) (*Envelope, []byte, bool) {
	if s == nil {
		return nil, nil, false
	}
	key := s.cacheKey(id)
	gz, ok := s.cache.get(key)
	if !ok {
		return nil, nil, false
	}
	envelope, err := decodeEnvelope(gz)
	if err != nil {
		s.cache.delete(key)
		return nil, nil, false
	}
	return envelope, gz, true
}

// Parse normalises the uploaded file at filePath. hash is the SHA-256 of the
// file and doubles as replayId. Concurrent uploads of the same hash share one
// parse.
func (s *Service) Parse(ctx context.Context, filePath, hash string) (*Envelope, error) {
	if s == nil || !s.Available() {
		return nil, NewError(CodeParserUnavailable, "", nil)
	}
	if hash == "" {
		return nil, NewError(CodeInternal, "The replay id could not be computed.", nil)
	}

	if envelope, _, ok := s.GetCached(hash); ok {
		slog.Info("replay cache hit",
			"replay_hash_prefix", hashPrefix(hash),
			"parser_version", ParserVersion,
		)
		return envelope, nil
	}

	result, err, _ := s.group.Do(s.cacheKey(hash), func() (any, error) {
		if envelope, _, ok := s.GetCached(hash); ok {
			slog.Info("replay cache hit",
				"replay_hash_prefix", hashPrefix(hash),
				"parser_version", ParserVersion,
			)
			return envelope, nil
		}

		if err := s.acquire(ctx); err != nil {
			return nil, err
		}
		defer func() { <-s.sem }()

		parseCtx, cancel := context.WithTimeout(ctx, s.config.ParseTimeout)
		defer cancel()

		envelope, gz, _, err := s.parseOnce(parseCtx, filePath, hash)
		if err != nil {
			return nil, err
		}
		s.cache.put(s.cacheKey(hash), gz)
		return envelope, nil
	})
	if err != nil {
		return nil, err
	}
	envelope, ok := result.(*Envelope)
	if !ok || envelope == nil {
		return nil, NewError(CodeInternal, "", nil)
	}
	return envelope, nil
}

func (s *Service) acquire(ctx context.Context) error {
	timer := time.NewTimer(s.config.QueueWait)
	defer timer.Stop()

	select {
	case s.sem <- struct{}{}:
		return nil
	case <-timer.C:
		s.metrics.recordParserBusy()
		return &Error{
			Code:       CodeParserBusy,
			Message:    DefaultMessage(CodeParserBusy),
			RetryAfter: 5 * time.Second,
		}
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (s *Service) parseOnce(ctx context.Context, filePath, hash string) (envelope *Envelope, gz []byte, jsonBytes int, parseErr *Error) {
	started := time.Now()
	s.metrics.startParse()
	defer func() {
		if parseErr != nil {
			s.metrics.failParse(parseErr.Code)
		}
	}()

	var inputBytes int64
	if fileInfo, statErr := os.Stat(filePath); statErr == nil {
		inputBytes = fileInfo.Size()
	}

	exportDir, err := os.MkdirTemp(filepath.Dir(filePath), "export-*")
	if err != nil {
		return nil, nil, 0, NewError(CodeInternal, "", err)
	}
	defer func() { _ = os.RemoveAll(exportDir) }()

	inspectStarted := time.Now()
	inspect, err := s.exporter.Inspect(ctx, filePath)
	if err != nil {
		return nil, nil, 0, asReplayError(err, CodeParseFailed)
	}
	inspectDuration := time.Since(inspectStarted)

	build := inspect.Build
	if build == "" {
		return nil, nil, 0, NewError(CodeParseFailed,
			"The replay's game build could not be determined.", nil)
	}
	if !valorant.IsSupportedBuild(build) {
		return nil, nil, 0, NewError(CodeUnsupportedBuild,
			fmt.Sprintf("This replay was recorded on game build %s, which is not supported yet.", build), nil)
	}

	exportStarted := time.Now()
	if err := s.exporter.Export(ctx, filePath, exportDir); err != nil {
		return nil, nil, 0, asReplayError(err, CodeParseFailed)
	}
	exportDuration := time.Since(exportStarted)

	manifest, err := readManifest(exportDir)
	if err != nil {
		return nil, nil, 0, NewError(CodeCorrupt,
			"The replay's manifest could not be read.", err)
	}

	warnings := newWarnings()
	quality := manifest.Quality

	if quality.ContentBlocksLost > 0 {
		return nil, nil, 0, NewError(CodeCorrupt,
			"The replay is missing decoded content blocks and cannot be trusted.", nil)
	}
	if len(manifest.Players) == 0 {
		return nil, nil, 0, NewError(CodeTransformCheck,
			"The replay did not identify any players.", nil)
	}

	mapInfo, ok := valorant.ResolveMap(manifest.levelPath())
	if !ok {
		return nil, nil, 0, NewError(CodeUnsupportedMap, "", nil)
	}

	if quality.EventLayoutMismatches > 0 {
		warnings.add("Some game events had an unexpected layout and were skipped.")
	}
	if quality.EventPayloadUnknown > 0 {
		warnings.add("Some game events used an unknown payload and were skipped.")
	}

	agents, agentWarnings := loadoutAgents(manifest.GameSpecificData)
	warnings.addAll(agentWarnings)

	index := newPlayerIndex(manifest)

	fieldsStarted := time.Now()
	fields, err := scanFields(exportDir)
	if err != nil {
		return nil, nil, 0, NewError(CodeCorrupt,
			"The replay's field data could not be read.", err)
	}
	fieldsDuration := time.Since(fieldsStarted)
	warnings.addAll(fields.TeamWarnings)

	eventsStarted := time.Now()
	events, err := scanEvents(exportDir)
	if err != nil {
		return nil, nil, 0, NewError(CodeCorrupt,
			"The replay's event timeline could not be read.", err)
	}
	eventsDuration := time.Since(eventsStarted)
	if events.Rows == 0 {
		return nil, nil, 0, NewError(CodeTransformCheck,
			"The replay contained no game events.", nil)
	}
	if len(events.Starts) == 0 {
		return nil, nil, 0, NewError(CodeTransformCheck,
			"The replay contained no round starts.", nil)
	}
	if events.KnownGroups == 0 {
		return nil, nil, 0, NewError(CodeTransformCheck,
			"The replay contained no events ValoMapper understands.", nil)
	}

	players, puuidBySubject, playerWarnings, playerErr := resolvePlayers(index, fields.Teams, agents)
	if playerErr != nil {
		return nil, nil, 0, playerErr
	}
	warnings.addAll(playerWarnings)

	stateStarted := time.Now()
	state, err := scanState(exportDir, index, &fields.State)
	if err != nil {
		return nil, nil, 0, NewError(CodeCorrupt,
			"The replay's player state could not be read.", err)
	}
	stateDuration := time.Since(stateStarted)
	warnings.addAll(state.Warnings)

	windows, windowWarnings := buildRoundWindows(fields, events.Starts, manifest.DurationMS)
	warnings.addAll(windowWarnings)
	if len(windows) == 0 {
		return nil, nil, 0, NewError(CodeTransformCheck,
			"The replay contained no played rounds.", nil)
	}
	hasResult := false
	for i := range windows {
		if windows[i].HasResult {
			hasResult = true
			break
		}
	}
	if !hasResult {
		return nil, nil, 0, NewError(CodeTransformCheck,
			"The replay's round results could not be decoded.", nil)
	}

	movementStarted := time.Now()
	movement, err := scanMovement(exportDir, windows, index, s.config.FrameHz, state.Actors)
	if err != nil {
		return nil, nil, 0, NewError(CodeCorrupt,
			"The replay's movement data could not be read.", err)
	}
	movementDuration := time.Since(movementStarted)
	if transformErr := movement.transformCheckError(); transformErr != nil {
		return nil, nil, 0, transformErr
	}

	logs := buildRoundLogs(windows, players, index, events, fields, state, warnings)
	applyRoundStats(windows, players, index, puuidBySubject, state, &fields.State, logs, warnings)
	spike := buildSpikeTimeline(fields, state, index, windows, events, warnings)
	utilitiesStarted := time.Now()
	utilities, utilityWarnings, err := scanUtilities(
		exportDir,
		build,
		manifest.DurationMS,
		windows,
		index,
		puuidBySubject,
		state.Outer,
		fields.UtilityOwners,
		fields.UtilityPaths,
		fields.UtilityFuel,
		fields.UtilityDestroy,
		fields.UtilityActivation,
	)
	if err != nil {
		return nil, nil, 0, NewError(CodeCorrupt,
			"The replay's utility actor data could not be read.", err)
	}
	addSyntheticSovaUltimates(
		utilities,
		windows,
		index,
		puuidBySubject,
		agents,
		movement,
		fields,
		state.Paths,
	)
	utilitiesDuration := time.Since(utilitiesStarted)
	utilityCount := countUtilityIntervals(utilities)

	framesStarted := time.Now()
	framesByRound, timeline := buildTimelineFrames(
		players, puuidBySubject, windows, movement, state, logs, spike, warnings,
	)

	rounds := make([]Round, 0, len(windows))
	for i := range windows {
		window := &windows[i]
		round := Round{
			RoundNumber:     window.RoundNumber,
			WinningTeam:     window.WinningTeam,
			RoundResultCode: window.RoundResultCode,
			ScoreAfterRound: window.Score,
			AttackTeamID:    window.AttackTeamID,
			DurationMS:      int(window.EndMS - window.StartMS),
			Frames:          framesByRound[i],
			Utilities:       utilities[i],
		}

		if window.BuyEndMS != nil && *window.BuyEndMS >= window.StartMS {
			relative := int(*window.BuyEndMS - window.StartMS)
			round.BuyEndTimeMS = &relative
		}

		if log := logs[window.RoundNumber]; log != nil {
			round.EventLog = log.Events
			round.Hits = log.Hits
			round.PlayerStats = make([]PlayerStats, 0, len(players))
			for _, player := range players {
				stats := log.Stats[player.Puuid]
				if stats == nil {
					stats = &PlayerStats{Puuid: player.Puuid, AbilityCasts: map[string]int{}}
				}
				round.PlayerStats = append(round.PlayerStats, *stats)
			}
		} else {
			round.PlayerStats = make([]PlayerStats, 0, len(players))
			for _, player := range players {
				round.PlayerStats = append(round.PlayerStats, PlayerStats{
					Puuid:        player.Puuid,
					AbilityCasts: map[string]int{},
				})
			}
		}

		rounds = append(rounds, round)
	}
	framesDuration := time.Since(framesStarted)

	match := &Match{
		MatchID:     matchID(manifest.GUID),
		MapID:       mapInfo.ID,
		MapName:     mapInfo.Name,
		QueueLabel:  "Replay",
		GameStartAt: gameStartAt(manifest.TimestampTicks),
		Viewer:      nil,
		TotalRounds: len(rounds),
		Players:     players,
		Rounds:      rounds,
		Build:       build,
		DurationMS:  manifest.DurationMS,
		Warnings:    warnings.all(),
	}
	if utilityWarnings != (UtilityWarnings{}) {
		match.UtilityWarnings = &utilityWarnings
	}

	envelope = &Envelope{
		ReplayID: hash,
		Match:    match,
		Warnings: match.Warnings,
	}

	gzipStarted := time.Now()
	encoded, err := json.Marshal(envelope)
	if err != nil {
		return nil, nil, 0, NewError(CodeInternal, "", err)
	}
	gz, err = gzipBytes(encoded)
	if err != nil {
		return nil, nil, 0, NewError(CodeInternal, "", err)
	}
	gzipDuration := time.Since(gzipStarted)

	slog.Info("replay parsed",
		"replay_hash_prefix", hashPrefix(hash),
		"bytes", inputBytes,
		"build", build,
		"parser_version", ParserVersion,
		"frame_hz", s.config.FrameHz,
		"cache_hit", false,
		"inspect_ms", inspectDuration.Milliseconds(),
		"export_ms", exportDuration.Milliseconds(),
		"fields_ms", fieldsDuration.Milliseconds(),
		"events_ms", eventsDuration.Milliseconds(),
		"state_ms", stateDuration.Milliseconds(),
		"movement_ms", movementDuration.Milliseconds(),
		"utilities_ms", utilitiesDuration.Milliseconds(),
		"frames_ms", framesDuration.Milliseconds(),
		"gzip_ms", gzipDuration.Milliseconds(),
		"total_ms", time.Since(started).Milliseconds(),
		"rounds", len(rounds),
		"frames", timeline.Frames,
		"players", len(players),
		"samples", timeline.Samples,
		"teleport_cuts", timeline.TeleportCuts,
		"movement_rows", movement.Rows,
		"unmatched_pawns", movement.UnmatchedRows,
		"pawn_overlaps", movement.PawnOverlaps,
		"pawn_inactive_rows", movement.PawnInactiveRows,
		"missing_player_rounds", timeline.Missing,
		"hp_writes", state.HPWrites,
		"hp_unresolved_section", state.HPUnresolvedSection,
		"hp_non_player", state.HPNonPlayer,
		"deaths", state.Deaths,
		"money_writes", state.MoneyWrites,
		"plant_credit_bonuses", state.PlantCreditBonuses,
		"weapon_changes", state.WeaponChanges,
		"weapon_unresolved", state.WeaponUnresolved,
		"weapon_zero", state.WeaponZero,
		"armor_items", state.ArmorItems,
		"armor_unowned", state.ArmorUnowned,
		"armor_unplaced", state.ArmorUnplaced,
		"armor_unattributed", state.ArmorUnattributed,
		"state_elements_incomplete", state.DamageIncomplete,
		"casts_unique", state.CastsUnique,
		"casts_skipped", state.CastsSkipped,
		"casts_unknown_slot", state.CastsUnknownSlot,
		"casts_unresolved", state.CastsUnresolved,
		"casts_without_buy_end", state.CastsWithoutBuyEnd,
		"casts_before_buy_end", state.CastsBeforeBuyEnd,
		"ability_charge_writes", state.AbilityChargeWrites,
		"ability_charge_unresolved", state.AbilityChargeUnresolved,
		"ability_charge_unknown_slot", state.AbilityChargeUnknownSlot,
		"ability_charge_unmapped", state.AbilityChargeUnmapped,
		"signature_charge_writes", state.SignatureChargeWrites,
		"ultimate_point_writes", state.UltimatePointWrites,
		"ultimate_active_writes", state.UltimateActiveWrites,
		"ultimate_unresolved", state.UltimateUnresolved,
		"cooldown_writes", state.CooldownWrites,
		"cooldown_windows", state.CooldownWindows,
		"cooldown_unresolved", state.CooldownUnresolved,
		"cooldown_unknown_slot", state.CooldownUnknownSlot,
		"cooldown_unmapped", state.CooldownUnmapped,
		"recharge_windows", state.RechargeWindows,
		"spike_actors", spike.Actors,
		"spike_owner_writes", spike.OwnerWrites,
		"spike_loose_spans", spike.LooseSpans,
		"spike_loose_unplaced", spike.LooseUnplaced,
		"spike_ties", spike.Ties,
		"spike_unresolved", spike.Unresolved,
		"spike_plants", spike.Plants,
		"spike_site_warnings", spike.SiteWarnings,
		"spike_missing_positions", spike.MissingSpots,
		"spike_out_of_round", spike.OutOfRound,
		"utility_intervals", utilityCount,
		"utility_unknown_actors", utilityWarnings.UnknownActors,
		"utility_invalid_actors", utilityWarnings.InvalidActors,
		"utility_missing_positions", utilityWarnings.MissingPositions,
		"utility_missing_closes", utilityWarnings.MissingCloses,
		"utility_unresolved_owners", utilityWarnings.UnresolvedOwners,
		"utility_missing_movement", utilityWarnings.MissingMovement,
		"utility_truncated_utilities", utilityWarnings.TruncatedUtilities,
		"utility_truncated_samples", utilityWarnings.TruncatedSamples,
		"utility_truncated_paths", utilityWarnings.TruncatedPaths,
		"utility_unsupported_build", utilityWarnings.UnsupportedBuild,
		"response_bytes", len(encoded),
		"gzip_bytes", len(gz),
		"content_blocks_lost", quality.ContentBlocksLost,
		"event_layout_mismatches", quality.EventLayoutMismatches,
		"event_payload_unknown_groups", quality.EventPayloadUnknown,
	)

	s.metrics.finishParse(len(encoded), len(gz), time.Since(started))
	return envelope, gz, len(encoded), nil
}

func asReplayError(err error, fallback Code) *Error {
	if replayErr, ok := AsError(err); ok {
		return replayErr
	}
	return NewError(fallback, "", err)
}

func decodeEnvelope(gz []byte) (*Envelope, error) {
	reader, err := gzip.NewReader(bytes.NewReader(gz))
	if err != nil {
		return nil, err
	}
	defer func() { _ = reader.Close() }()

	var envelope Envelope
	if err := json.NewDecoder(reader).Decode(&envelope); err != nil {
		return nil, err
	}
	return &envelope, nil
}

func gzipBytes(data []byte) ([]byte, error) {
	var buffer bytes.Buffer
	writer := gzip.NewWriter(&buffer)
	if _, err := writer.Write(data); err != nil {
		_ = writer.Close()
		return nil, err
	}
	if err := writer.Close(); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}

func matchID(guid [4]uint32) string {
	return fmt.Sprintf("%08X-%04X-%04X-%04X-%04X%08X",
		guid[0], guid[1]>>16, guid[1]&0xffff, guid[2]>>16, guid[2]&0xffff, guid[3])
}

func gameStartAt(ticks uint64) string {
	const epochTicks = uint64(621355968000000000)
	if ticks <= epochTicks {
		return ""
	}
	delta := ticks - epochTicks
	seconds := int64(delta / 10_000_000)
	nanos := int64(delta%10_000_000) * 100
	return time.Unix(seconds, nanos).UTC().Format(time.RFC3339Nano)
}

func hashPrefix(hash string) string {
	if len(hash) > 12 {
		return hash[:12]
	}
	return hash
}

// CleanStaleTempDirs removes upload/export directories left by a crash. Called
// once at startup; an active request is never old enough to match.
func CleanStaleTempDirs(maxAge time.Duration) {
	if maxAge <= 0 {
		maxAge = time.Hour
	}
	entries, err := filepath.Glob(filepath.Join(os.TempDir(), "valomapper-replay-*"))
	if err != nil {
		return
	}
	cutoff := time.Now().Add(-maxAge)
	for _, entry := range entries {
		info, err := os.Stat(entry)
		if err != nil || !info.IsDir() {
			continue
		}
		if info.ModTime().Before(cutoff) {
			_ = os.RemoveAll(entry)
		}
	}
}
