package replay

import (
	"log/slog"
	"time"

	"valo-mapper-api/valorant"
)

type replaySources struct {
	manifest         *Manifest
	quality          ManifestQuality
	warnings         *warningList
	agents           map[string]string
	index            *playerIndex
	fields           *fieldScan
	events           *eventScan
	players          []Player
	puuidBySubject   map[string]string
	state            *stateScan
	windows          []roundWindow
	movement         *movementScan
	mapInfo          valorant.Map
	fieldsDuration   time.Duration
	eventsDuration   time.Duration
	stateDuration    time.Duration
	movementDuration time.Duration
}

func scanReplaySources(exportDir string, frameHz int) (*replaySources, *Error) {
	manifest, err := readManifest(exportDir)
	if err != nil {
		return nil, NewError(CodeCorrupt,
			"The replay's manifest could not be read.", err)
	}

	warnings := newWarnings()
	quality := manifest.Quality

	if quality.ContentBlocksLost > 0 {
		return nil, NewError(CodeCorrupt,
			"The replay is missing decoded content blocks and cannot be trusted.", nil)
	}
	if len(manifest.Players) == 0 {
		return nil, NewError(CodeTransformCheck,
			"The replay did not identify any players.", nil)
	}

	mapInfo, ok := valorant.ResolveMap(manifest.levelPath())
	if !ok {
		return nil, NewError(CodeUnsupportedMap, "", nil)
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
		return nil, NewError(CodeCorrupt,
			"The replay's field data could not be read.", err)
	}
	fieldsDuration := time.Since(fieldsStarted)
	warnings.addAll(fields.TeamWarnings)

	eventsStarted := time.Now()
	events, err := scanEvents(exportDir)
	if err != nil {
		return nil, NewError(CodeCorrupt,
			"The replay's event timeline could not be read.", err)
	}
	eventsDuration := time.Since(eventsStarted)
	if events.Rows == 0 {
		return nil, NewError(CodeTransformCheck,
			"The replay contained no game events.", nil)
	}
	if len(events.Starts) == 0 {
		return nil, NewError(CodeTransformCheck,
			"The replay contained no round starts.", nil)
	}
	if events.KnownGroups == 0 {
		return nil, NewError(CodeTransformCheck,
			"The replay contained no events ValoMapper understands.", nil)
	}

	players, puuidBySubject, playerWarnings, playerErr := resolvePlayers(index, fields.Teams, agents)
	if playerErr != nil {
		return nil, playerErr
	}
	warnings.addAll(playerWarnings)

	stateStarted := time.Now()
	state, err := scanState(exportDir, index, &fields.State)
	if err != nil {
		return nil, NewError(CodeCorrupt,
			"The replay's player state could not be read.", err)
	}
	stateDuration := time.Since(stateStarted)
	warnings.addAll(state.Warnings)

	windows, windowWarnings := buildRoundWindows(fields, events.Starts, manifest.DurationMS)
	warnings.addAll(windowWarnings)
	if len(windows) == 0 {
		return nil, NewError(CodeTransformCheck,
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
		return nil, NewError(CodeTransformCheck,
			"The replay's round results could not be decoded.", nil)
	}

	movementStarted := time.Now()
	movement, err := scanMovement(exportDir, windows, index, frameHz, state.Actors)
	if err != nil {
		return nil, NewError(CodeCorrupt,
			"The replay's movement data could not be read.", err)
	}
	movementDuration := time.Since(movementStarted)
	if transformErr := movement.transformCheckError(); transformErr != nil {
		return nil, transformErr
	}

	return &replaySources{
		manifest:         manifest,
		quality:          quality,
		warnings:         warnings,
		agents:           agents,
		index:            index,
		fields:           fields,
		events:           events,
		players:          players,
		puuidBySubject:   puuidBySubject,
		state:            state,
		windows:          windows,
		movement:         movement,
		mapInfo:          mapInfo,
		fieldsDuration:   fieldsDuration,
		eventsDuration:   eventsDuration,
		stateDuration:    stateDuration,
		movementDuration: movementDuration,
	}, nil
}

func buildReplayRounds(
	windows []roundWindow,
	framesByRound [][]Frame,
	utilities [][]Utility,
	logs map[int]*roundLog,
	players []Player,
) []Round {
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
	return rounds
}

func scanReplayUtilities(
	exportDir string,
	build string,
	manifestDurationMS uint32,
	windows []roundWindow,
	index *playerIndex,
	puuidBySubject map[string]string,
	state *stateScan,
	fields *fieldScan,
	agents map[string]string,
	movement *movementScan,
) ([][]Utility, UtilityWarnings, int, time.Duration, *Error) {
	started := time.Now()
	utilities, utilityWarnings, err := scanUtilities(
		exportDir,
		build,
		manifestDurationMS,
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
		return nil, utilityWarnings, 0, 0, NewError(CodeCorrupt,
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
	duration := time.Since(started)
	return utilities, utilityWarnings, countUtilityIntervals(utilities), duration, nil
}

func buildReplayMatch(
	manifest *Manifest,
	mapInfo valorant.Map,
	build string,
	players []Player,
	rounds []Round,
	warnings *warningList,
	utilityWarnings UtilityWarnings,
) *Match {
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
	return match
}

type parseReport struct {
	hash              string
	inputBytes        int64
	build             string
	frameHz           int
	playerCount       int
	started           time.Time
	inspectDuration   time.Duration
	exportDuration    time.Duration
	fieldsDuration    time.Duration
	eventsDuration    time.Duration
	stateDuration     time.Duration
	movementDuration  time.Duration
	utilitiesDuration time.Duration
	framesDuration    time.Duration
	gzipDuration      time.Duration
	rounds            int
	timeline          timelineStats
	movement          *movementScan
	state             *stateScan
	spike             *spikeTimeline
	utilityCount      int
	utilityWarnings   UtilityWarnings
	encoded           []byte
	gz                []byte
	quality           ManifestQuality
}

func (r parseReport) log() {
	slog.Info("replay parsed",
		"replay_hash_prefix", hashPrefix(r.hash),
		"bytes", r.inputBytes,
		"build", r.build,
		"parser_version", ParserVersion,
		"frame_hz", r.frameHz,
		"cache_hit", false,
		"inspect_ms", r.inspectDuration.Milliseconds(),
		"export_ms", r.exportDuration.Milliseconds(),
		"fields_ms", r.fieldsDuration.Milliseconds(),
		"events_ms", r.eventsDuration.Milliseconds(),
		"state_ms", r.stateDuration.Milliseconds(),
		"movement_ms", r.movementDuration.Milliseconds(),
		"utilities_ms", r.utilitiesDuration.Milliseconds(),
		"frames_ms", r.framesDuration.Milliseconds(),
		"gzip_ms", r.gzipDuration.Milliseconds(),
		"total_ms", time.Since(r.started).Milliseconds(),
		"rounds", r.rounds,
		"frames", r.timeline.Frames,
		"players", r.playerCount,
		"samples", r.timeline.Samples,
		"teleport_cuts", r.timeline.TeleportCuts,
		"movement_rows", r.movement.Rows,
		"unmatched_pawns", r.movement.UnmatchedRows,
		"pawn_overlaps", r.movement.PawnOverlaps,
		"pawn_inactive_rows", r.movement.PawnInactiveRows,
		"missing_player_rounds", r.timeline.Missing,
		"hp_writes", r.state.HPWrites,
		"hp_unresolved_section", r.state.HPUnresolvedSection,
		"hp_non_player", r.state.HPNonPlayer,
		"deaths", r.state.Deaths,
		"money_writes", r.state.MoneyWrites,
		"plant_credit_bonuses", r.state.PlantCreditBonuses,
		"weapon_changes", r.state.WeaponChanges,
		"weapon_unresolved", r.state.WeaponUnresolved,
		"weapon_zero", r.state.WeaponZero,
		"armor_items", r.state.ArmorItems,
		"armor_unowned", r.state.ArmorUnowned,
		"armor_unplaced", r.state.ArmorUnplaced,
		"armor_unattributed", r.state.ArmorUnattributed,
		"state_elements_incomplete", r.state.DamageIncomplete,
		"casts_unique", r.state.CastsUnique,
		"casts_skipped", r.state.CastsSkipped,
		"casts_unknown_slot", r.state.CastsUnknownSlot,
		"casts_unresolved", r.state.CastsUnresolved,
		"casts_without_buy_end", r.state.CastsWithoutBuyEnd,
		"casts_before_buy_end", r.state.CastsBeforeBuyEnd,
		"ability_charge_writes", r.state.AbilityChargeWrites,
		"ability_charge_unresolved", r.state.AbilityChargeUnresolved,
		"ability_charge_unknown_slot", r.state.AbilityChargeUnknownSlot,
		"ability_charge_unmapped", r.state.AbilityChargeUnmapped,
		"signature_charge_writes", r.state.SignatureChargeWrites,
		"ultimate_point_writes", r.state.UltimatePointWrites,
		"ultimate_active_writes", r.state.UltimateActiveWrites,
		"ultimate_unresolved", r.state.UltimateUnresolved,
		"cooldown_writes", r.state.CooldownWrites,
		"cooldown_windows", r.state.CooldownWindows,
		"cooldown_unresolved", r.state.CooldownUnresolved,
		"cooldown_unknown_slot", r.state.CooldownUnknownSlot,
		"cooldown_unmapped", r.state.CooldownUnmapped,
		"recharge_windows", r.state.RechargeWindows,
		"spike_actors", r.spike.Actors,
		"spike_owner_writes", r.spike.OwnerWrites,
		"spike_loose_spans", r.spike.LooseSpans,
		"spike_loose_unplaced", r.spike.LooseUnplaced,
		"spike_ties", r.spike.Ties,
		"spike_unresolved", r.spike.Unresolved,
		"spike_plants", r.spike.Plants,
		"spike_site_warnings", r.spike.SiteWarnings,
		"spike_missing_positions", r.spike.MissingSpots,
		"spike_out_of_round", r.spike.OutOfRound,
		"utility_intervals", r.utilityCount,
		"utility_unknown_actors", r.utilityWarnings.UnknownActors,
		"utility_invalid_actors", r.utilityWarnings.InvalidActors,
		"utility_missing_positions", r.utilityWarnings.MissingPositions,
		"utility_missing_closes", r.utilityWarnings.MissingCloses,
		"utility_unresolved_owners", r.utilityWarnings.UnresolvedOwners,
		"utility_missing_movement", r.utilityWarnings.MissingMovement,
		"utility_truncated_utilities", r.utilityWarnings.TruncatedUtilities,
		"utility_truncated_samples", r.utilityWarnings.TruncatedSamples,
		"utility_truncated_paths", r.utilityWarnings.TruncatedPaths,
		"utility_unsupported_build", r.utilityWarnings.UnsupportedBuild,
		"response_bytes", len(r.encoded),
		"gzip_bytes", len(r.gz),
		"content_blocks_lost", r.quality.ContentBlocksLost,
		"event_layout_mismatches", r.quality.EventLayoutMismatches,
		"event_payload_unknown_groups", r.quality.EventPayloadUnknown,
	)
}
