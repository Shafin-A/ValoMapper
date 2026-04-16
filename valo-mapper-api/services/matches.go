package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
	"valo-mapper-api/models"
)

const (
	defaultMatchPreviewLimit = 10
	maxMatchPreviewLimit     = 50
	riotHTTPTimeout          = 10 * time.Second
)

var (
	ErrRSOUserRequired   = errors.New("rso user required")
	ErrPUUIDUnavailable  = errors.New("puuid unavailable")
	ErrRiotAPIKeyMissing = errors.New("riot api key unavailable")
)

func sanitizeRiotIdentifier(value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", errors.New("empty value")
	}
	if strings.ContainsAny(trimmed, "\r\n") {
		return "", errors.New("invalid control characters")
	}
	return trimmed, nil
}

var riotRegions = []string{"americas", "europe", "asia"}

type MatchPreview struct {
	MatchID       string `json:"matchId"`
	PlayedAt      int64  `json:"playedAt"`
	QueueLabel    string `json:"queueLabel"`
	MapID         string `json:"mapId"`
	MapName       string `json:"mapName"`
	Result        string `json:"result"`
	TeamScore     int    `json:"teamScore"`
	EnemyScore    int    `json:"enemyScore"`
	Kills         int    `json:"kills"`
	Deaths        int    `json:"deaths"`
	Assists       int    `json:"assists"`
	PersonalScore int    `json:"personalScore"`
}

// MatchService fetches match data from Riot and builds preview DTOs.
type MatchService struct {
	httpClient *http.Client
	riotAPIKey string
}

// NewMatchService creates a MatchService with a default HTTP client.
func NewMatchService() *MatchService {
	return &MatchService{
		httpClient: &http.Client{Timeout: riotHTTPTimeout},
		riotAPIKey: strings.TrimSpace(os.Getenv("RIOT_API_KEY")),
	}
}

type riotMatchlistResponse struct {
	PUUID   string                  `json:"puuid"`
	History []riotMatchlistEntryDTO `json:"history"`
}

type riotMatchlistEntryDTO struct {
	MatchID             string `json:"matchId"`
	GameStartTimeMillis int64  `json:"gameStartTimeMillis"`
	QueueID             string `json:"queueId"`
}

type riotMatchDTO struct {
	MatchInfo riotMatchInfoDTO `json:"matchInfo"`
	Players   []riotPlayerDTO  `json:"players"`
	Teams     []riotTeamDTO    `json:"teams"`
}

type riotMatchInfoDTO struct {
	MatchID         string `json:"matchId"`
	MapID           string `json:"mapId"`
	GameStartMillis int64  `json:"gameStartMillis"`
	QueueID         string `json:"queueId"`
	GameMode        string `json:"gameMode"`
}

type riotPlayerDTO struct {
	PUUID  string             `json:"puuid"`
	TeamID string             `json:"teamId"`
	Stats  riotPlayerStatsDTO `json:"stats"`
}

type riotPlayerStatsDTO struct {
	Score   int `json:"score"`
	Kills   int `json:"kills"`
	Deaths  int `json:"deaths"`
	Assists int `json:"assists"`
}

type riotTeamDTO struct {
	TeamID    string `json:"teamId"`
	Won       bool   `json:"won"`
	RoundsWon int    `json:"roundsWon"`
}

func (s *MatchService) GetRecentMatchPreviews(ctx context.Context, user *models.User, limit int) ([]MatchPreview, error) {
	if user == nil || user.RSOSubjectID == nil || strings.TrimSpace(*user.RSOSubjectID) == "" {
		return nil, ErrRSOUserRequired
	}

	if user.FirebaseUID == nil {
		return nil, ErrPUUIDUnavailable
	}
	puuid, err := sanitizeRiotIdentifier(*user.FirebaseUID)
	if err != nil {
		return nil, ErrPUUIDUnavailable
	}

	if s.riotAPIKey == "" {
		return nil, ErrRiotAPIKeyMissing
	}

	if limit <= 0 {
		limit = defaultMatchPreviewLimit
	} else if limit > maxMatchPreviewLimit {
		limit = maxMatchPreviewLimit
	}

	matchlistPath := fmt.Sprintf("/val/match/v1/matchlists/by-puuid/%s", url.PathEscape(puuid))
	matchlist := riotMatchlistResponse{}
	if err := s.fetchFromAnyRegion(ctx, matchlistPath, &matchlist); err != nil {
		return nil, fmt.Errorf("fetch matchlist: %w", err)
	}

	previews := make([]MatchPreview, 0)
	for _, entry := range matchlist.History {
		if len(previews) >= limit {
			break
		}

		matchID := strings.TrimSpace(entry.MatchID)
		if matchID == "" {
			continue
		}

		matchPath := fmt.Sprintf("/val/match/v1/matches/%s", url.PathEscape(matchID))
		match := riotMatchDTO{}
		if err := s.fetchFromAnyRegion(ctx, matchPath, &match); err != nil {
			continue
		}

		if !isSupportedQueue(match.MatchInfo.QueueID, match.MatchInfo.GameMode) {
			continue
		}

		preview, ok := buildMatchPreview(match, puuid)
		if !ok {
			continue
		}
		previews = append(previews, preview)
	}

	return previews, nil
}

func (s *MatchService) fetchFromAnyRegion(ctx context.Context, endpointPath string, destination any) error {
	var lastErr error

	for _, region := range riotRegions {
		apiURL := fmt.Sprintf("https://%s.api.riotgames.com%s", region, endpointPath)
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
		if err != nil {
			lastErr = err
			continue
		}

		req.Header.Set("X-Riot-Token", s.riotAPIKey)
		req.Header.Set("Accept", "application/json")

		resp, err := s.httpClient.Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		if resp.StatusCode == http.StatusNotFound {
			_ = resp.Body.Close()
			lastErr = fmt.Errorf("riot endpoint not found in region %s", region)
			continue
		}

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			_ = resp.Body.Close()
			lastErr = fmt.Errorf("riot request failed with status %d in region %s", resp.StatusCode, region)
			continue
		}

		if err := json.NewDecoder(resp.Body).Decode(destination); err != nil {
			_ = resp.Body.Close()
			lastErr = fmt.Errorf("failed to decode riot response from region %s: %w", region, err)
			continue
		}

		_ = resp.Body.Close()

		return nil
	}

	if lastErr != nil {
		return fmt.Errorf("riot request failed for %s: %w", endpointPath, lastErr)
	}

	return errors.New("riot request failed")
}

func isSupportedQueue(queueID, gameMode string) bool {
	combined := strings.ToLower(strings.TrimSpace(queueID) + " " + strings.TrimSpace(gameMode))
	return strings.Contains(combined, "competitive") || strings.Contains(combined, "unrated")
}

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

	queueLabel := normalizeQueueLabel(match.MatchInfo.QueueID, match.MatchInfo.GameMode)
	mapID := strings.TrimSpace(match.MatchInfo.MapID)

	return MatchPreview{
		MatchID:       strings.TrimSpace(match.MatchInfo.MatchID),
		PlayedAt:      match.MatchInfo.GameStartMillis,
		QueueLabel:    queueLabel,
		MapID:         mapID,
		MapName:       toMapName(mapID),
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

func normalizeQueueLabel(queueID, gameMode string) string {
	combined := strings.ToLower(strings.TrimSpace(queueID) + " " + strings.TrimSpace(gameMode))
	if strings.Contains(combined, "competitive") {
		return "Competitive"
	}
	if strings.Contains(combined, "unrated") {
		return "Unrated"
	}
	if trimmedMode := strings.TrimSpace(gameMode); trimmedMode != "" {
		return trimmedMode
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

	parts := strings.Split(trimmed, "/")
	last := strings.TrimSpace(parts[len(parts)-1])
	if last == "" {
		return trimmed
	}

	return strings.ReplaceAll(last, "_", " ")
}
