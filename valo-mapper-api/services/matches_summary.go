package services

import (
	"slices"
	"strings"
)

func buildViewerContext(summary *MatchSummaryResponse, requesterPUUID string) *ViewerContext {
	requesterPUUID = strings.TrimSpace(requesterPUUID)
	if summary == nil || requesterPUUID == "" {
		return nil
	}

	viewerFound := false
	for _, player := range summary.Players {
		if strings.EqualFold(strings.TrimSpace(player.PUUID), requesterPUUID) {
			viewerFound = true
			break
		}
	}
	if !viewerFound {
		return nil
	}

	return &ViewerContext{
		PUUID:           requesterPUUID,
		BestRoundNumber: findBestRound(summary.Rounds, requesterPUUID),
	}
}

func findBestRound(rounds []RoundSummaryLite, viewerPUUID string) int {
	bestScore := -1
	bestRound := 1

	for _, round := range rounds {
		for _, stats := range round.PlayerStats {
			if !strings.EqualFold(strings.TrimSpace(stats.PUUID), viewerPUUID) {
				continue
			}

			if stats.Score > bestScore {
				bestScore = stats.Score
				bestRound = round.RoundNumber
			}
			break
		}
	}

	return bestRound
}

func (s *MatchService) buildPlayerSummaries(match riotDetailedMatchDTO) []MatchPlayerSummary {
	summaries := make([]MatchPlayerSummary, 0, len(match.Players))
	for _, p := range match.Players {
		summaries = append(summaries, MatchPlayerSummary{
			PUUID:         p.PUUID,
			GameName:      p.GameName,
			TagLine:       p.TagLine,
			TeamID:        p.TeamID,
			CharacterID:   p.CharacterID,
			CharacterName: toAgentName(p.CharacterID),
		})
	}
	return summaries
}

func (s *MatchService) buildRoundSummaries(match riotDetailedMatchDTO, includeReplayTelemetry bool) []RoundSummaryLite {
	summaries := make([]RoundSummaryLite, 0, len(match.Rounds))

	scores := map[string]int{"Red": 0, "Blue": 0}

	for _, round := range match.Rounds {
		if round.WinningTeam != "" {
			scores[round.WinningTeam]++
		}

		roundSummary := RoundSummaryLite{
			RoundNumber:     round.RoundNum + 1,
			WinningTeam:     round.WinningTeam,
			RoundResultCode: normalizeRoundResult(round.RoundResult),
			ScoreAfterRound: ScoreAfterRound{
				Red:  scores["Red"],
				Blue: scores["Blue"],
			},
			PlayerStats: s.buildPlayerStats(round, match.Players),
			EventLog:    s.buildEventLog(round, includeReplayTelemetry),
		}

		summaries = append(summaries, roundSummary)
	}

	return summaries
}

func (s *MatchService) buildPlayerStats(round riotRoundDTO, allPlayers []riotPlayerDTO) []RoundPlayerStatsLite {
	stats := make([]RoundPlayerStatsLite, 0, len(round.PlayersStats))
	combatCounts := buildRoundCombatCounts(round)

	// Sort: Blue team first, then Red team
	blueStats := make([]RoundPlayerStatsLite, 0)
	redStats := make([]RoundPlayerStatsLite, 0)

	for _, ps := range round.PlayersStats {
		counts := combatCounts[ps.PUUID]
		stat := RoundPlayerStatsLite{
			PUUID:   ps.PUUID,
			Score:   ps.Score,
			Kills:   counts.Kills,
			Deaths:  counts.Deaths,
			Assists: counts.Assists,
			Economy: EconomyInfo{
				LoadoutValue: ps.EconomyState.LoadoutValue,
				Remaining:    ps.EconomyState.Remaining,
			},
		}

		for _, p := range allPlayers {
			if p.PUUID == ps.PUUID {
				if p.TeamID == "Blue" {
					blueStats = append(blueStats, stat)
				} else {
					redStats = append(redStats, stat)
				}
				break
			}
		}
	}

	stats = append(stats, blueStats...)
	stats = append(stats, redStats...)

	return stats
}

func (s *MatchService) buildEventLog(round riotRoundDTO, includeReplayTelemetry bool) []RoundEventLogEntry {
	events := make([]RoundEventLogEntry, 0)

	for _, ps := range round.PlayersStats {
		for _, kill := range ps.Kills {
			damageType := strings.TrimSpace(kill.FinishingDamage.DamageType)
			damageItem := strings.TrimSpace(kill.FinishingDamage.DamageItem)

			event := RoundEventLogEntry{
				EventType:                 "kill",
				TimeSinceRoundStartMillis: kill.TimeSinceRoundStartMillis,
				KillerPuuid:               ptrStr(kill.Killer),
				VictimPuuid:               ptrStr(kill.Victim),
				DamageType:                ptrStrOrNil(damageType),
				DamageItem:                ptrStrOrNil(damageItem),
			}
			if includeReplayTelemetry {
				event.VictimLocation = toMatchWorldPositionPointer(kill.VictimLocation)
				event.PlayerLocations = toMatchPlayerLocations(kill.PlayerLocations)
			}
			events = append(events, event)
		}
	}

	if round.BombPlanter != nil && round.PlantRoundTime > 0 {
		event := RoundEventLogEntry{
			EventType:                 "spike_planted",
			TimeSinceRoundStartMillis: round.PlantRoundTime,
			PlanterPuuid:              round.BombPlanter,
		}
		if includeReplayTelemetry {
			event.PlantLocation = toMatchWorldPositionPointer(round.PlantLocation)
			event.PlantPlayerLocations = toMatchPlayerLocations(round.PlantPlayerLocations)
		}
		events = append(events, event)
	}

	if round.BombDefuser != nil && round.DefuseRoundTime > 0 {
		event := RoundEventLogEntry{
			EventType:                 "spike_defused",
			TimeSinceRoundStartMillis: round.DefuseRoundTime,
			DefuserPuuid:              round.BombDefuser,
		}
		if includeReplayTelemetry {
			event.DefuseLocation = toMatchWorldPositionPointer(round.DefuseLocation)
			event.DefusePlayerLocations = toMatchPlayerLocations(round.DefusePlayerLocations)
		}
		events = append(events, event)
	}

	sortEventsByTime(events)

	return events
}

func toMatchWorldPositionPointer(position *riotWorldPosition) *MatchWorldPosition {
	if position == nil {
		return nil
	}

	return &MatchWorldPosition{X: position.X, Y: position.Y}
}

func toMatchPlayerLocations(locations []riotPlayerLocation) []MatchPlayerLocation {
	if len(locations) == 0 {
		return nil
	}

	snapshots := make([]MatchPlayerLocation, 0, len(locations))
	for _, location := range locations {
		snapshots = append(snapshots, MatchPlayerLocation{
			PUUID:       strings.TrimSpace(location.PUUID),
			ViewRadians: location.ViewRadians,
			Location: MatchWorldPosition{
				X: location.Location.X,
				Y: location.Location.Y,
			},
		})
	}

	return snapshots
}

func buildRoundCombatCounts(round riotRoundDTO) map[string]roundCombatCounts {
	counts := make(map[string]roundCombatCounts, len(round.PlayersStats))

	for _, ps := range round.PlayersStats {
		entry := counts[ps.PUUID]
		entry.Kills = len(ps.Kills)
		counts[ps.PUUID] = entry

		for _, kill := range ps.Kills {
			victimEntry := counts[kill.Victim]
			victimEntry.Deaths++
			counts[kill.Victim] = victimEntry

			for _, assistant := range kill.Assistants {
				assistantEntry := counts[assistant]
				assistantEntry.Assists++
				counts[assistant] = assistantEntry
			}
		}
	}

	return counts
}

func normalizeRoundResult(roundResult string) string {
	result := strings.TrimSpace(roundResult)

	if strings.EqualFold(result, "Bomb detonated") {
		return "Detonate"
	}
	if strings.EqualFold(result, "Defused") || strings.EqualFold(result, "Bomb defused") {
		return "Defuse"
	}
	if strings.EqualFold(result, "Eliminated") {
		return "Elimination"
	}
	if strings.EqualFold(result, "Round timer expired") {
		return "TimeExpired"
	}
	if strings.EqualFold(result, "Surrendered") {
		return "Surrendered"
	}

	if result != "" {
		return result
	}

	return "Elimination"
}

func sortEventsByTime(events []RoundEventLogEntry) {
	slices.SortFunc(events, func(a, b RoundEventLogEntry) int {
		return a.TimeSinceRoundStartMillis - b.TimeSinceRoundStartMillis
	})
}

func ptrStr(s string) *string {
	return &s
}

func ptrStrOrNil(s string) *string {
	if s == "" {
		return nil
	}

	return &s
}
