package services

import (
	"strings"
	"valo-mapper-api/valorant"
)

func buildMatchPreview(match riotMatchDTO, puuid string) (MatchPreview, bool) {
	player, found := findPlayer(match.Players, puuid)
	if !found {
		return MatchPreview{}, false
	}

	myTeam, enemyTeam, ok := findTeams(match.Teams, player.TeamID)
	if !ok {
		return MatchPreview{}, false
	}

	result := "Loss"
	if myTeam.Won {
		result = "Win"
	}

	queueLabel := normalizeQueueLabel(match.MatchInfo.QueueID)
	mapID := strings.TrimSpace(match.MatchInfo.MapID)
	agentID := strings.TrimSpace(player.CharacterID)

	return MatchPreview{
		MatchID:       strings.TrimSpace(match.MatchInfo.MatchID),
		PlayedAt:      match.MatchInfo.GameStartMillis,
		QueueLabel:    queueLabel,
		MapID:         mapID,
		MapName:       toMapName(mapID),
		AgentID:       agentID,
		AgentName:     toAgentName(agentID),
		Result:        result,
		TeamScore:     myTeam.RoundsWon,
		EnemyScore:    enemyTeam.RoundsWon,
		Kills:         player.Stats.Kills,
		Deaths:        player.Stats.Deaths,
		Assists:       player.Stats.Assists,
		PersonalScore: player.Stats.Score,
	}, true
}

func findPlayer(players []riotPlayerDTO, puuid string) (riotPlayerDTO, bool) {
	for _, player := range players {
		if strings.EqualFold(strings.TrimSpace(player.PUUID), puuid) {
			return player, true
		}
	}
	return riotPlayerDTO{}, false
}

func findTeams(teams []riotTeamDTO, playerTeamID string) (riotTeamDTO, riotTeamDTO, bool) {
	trimmedTeamID := strings.TrimSpace(playerTeamID)
	if trimmedTeamID == "" {
		return riotTeamDTO{}, riotTeamDTO{}, false
	}

	var myTeam *riotTeamDTO
	var enemyTeam *riotTeamDTO

	for i := range teams {
		if strings.EqualFold(strings.TrimSpace(teams[i].TeamID), trimmedTeamID) {
			myTeam = &teams[i]
			continue
		}
		if enemyTeam == nil {
			enemyTeam = &teams[i]
		}
	}

	if myTeam == nil || enemyTeam == nil {
		return riotTeamDTO{}, riotTeamDTO{}, false
	}

	return *myTeam, *enemyTeam, true
}

func normalizeQueueLabel(queueID string) string {
	switch normalizeQueueID(queueID) {
	case "":
		return "Custom"
	case "competitive":
		return "Competitive"
	case "unrated":
		return "Unrated"
	}

	if trimmedQueue := strings.TrimSpace(queueID); trimmedQueue != "" {
		return trimmedQueue
	}
	return "Unknown"
}

func toMapName(mapID string) string {
	trimmed := strings.TrimSpace(mapID)
	if trimmed == "" {
		return "Unknown"
	}

	if m, ok := valorant.ResolveMap(trimmed); ok {
		return m.Name
	}

	parts := strings.Split(trimmed, "/")
	last := strings.TrimSpace(parts[len(parts)-1])
	if last == "" {
		return trimmed
	}

	return strings.ReplaceAll(last, "_", " ")
}

func toAgentName(agentID string) string {
	trimmed := strings.TrimSpace(agentID)
	if trimmed == "" {
		return "Unknown"
	}

	if name, ok := valorant.AgentName(trimmed); ok {
		return name
	}

	return trimmed
}
