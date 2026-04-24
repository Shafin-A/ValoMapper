package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"slices"
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
	ErrMatchNotFound     = errors.New("match not found")
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

var riotRegions = []string{"na", "latam", "br", "eu", "ap", "kr"}

type riotHTTPError struct {
	StatusCode int
	Region     string
	Endpoint   string
}

func (e *riotHTTPError) Error() string {
	return fmt.Sprintf("riot request failed with status %d in region %s", e.StatusCode, e.Region)
}

func isRiotNotFound(err error) bool {
	var riotErr *riotHTTPError
	return errors.As(err, &riotErr) && riotErr.StatusCode == http.StatusNotFound
}

type MatchPreview struct {
	MatchID       string `json:"matchId"`
	PlayedAt      int64  `json:"playedAt"`
	QueueLabel    string `json:"queueLabel"`
	MapID         string `json:"mapId"`
	MapName       string `json:"mapName"`
	AgentID       string `json:"agentId"`
	AgentName     string `json:"agentName"`
	Result        string `json:"result"`
	TeamScore     int    `json:"teamScore"`
	EnemyScore    int    `json:"enemyScore"`
	Kills         int    `json:"kills"`
	Deaths        int    `json:"deaths"`
	Assists       int    `json:"assists"`
	PersonalScore int    `json:"personalScore"`
}

type MatchSummaryResponse struct {
	MatchID     string               `json:"matchId"`
	MapID       string               `json:"mapId"`
	MapName     string               `json:"mapName"`
	QueueLabel  string               `json:"queueLabel"`
	GameStartAt string               `json:"gameStartAt"`
	Viewer      ViewerContext        `json:"viewer"`
	TotalRounds int                  `json:"totalRounds"`
	Players     []MatchPlayerSummary `json:"players"`
	Rounds      []RoundSummaryLite   `json:"rounds"`
}

type ViewerContext struct {
	PUUID           string `json:"puuid"`
	BestRoundNumber int    `json:"bestRoundNumber"`
}

type MatchPlayerSummary struct {
	PUUID         string `json:"puuid"`
	GameName      string `json:"gameName"`
	TagLine       string `json:"tagLine"`
	TeamID        string `json:"teamId"`
	CharacterID   string `json:"characterId"`
	CharacterName string `json:"characterName"`
}

type RoundSummaryLite struct {
	RoundNumber     int                    `json:"roundNumber"`
	WinningTeam     string                 `json:"winningTeam"`
	RoundResultCode string                 `json:"roundResultCode"`
	ScoreAfterRound ScoreAfterRound        `json:"scoreAfterRound"`
	PlayerStats     []RoundPlayerStatsLite `json:"playerStats"`
	EventLog        []RoundEventLogEntry   `json:"eventLog"`
}

type ScoreAfterRound struct {
	Red  int `json:"red"`
	Blue int `json:"blue"`
}

type RoundPlayerStatsLite struct {
	PUUID   string      `json:"puuid"`
	Score   int         `json:"score"`
	Kills   int         `json:"kills"`
	Deaths  int         `json:"deaths"`
	Assists int         `json:"assists"`
	Economy EconomyInfo `json:"economy"`
}

type EconomyInfo struct {
	LoadoutValue int `json:"loadoutValue"`
	Remaining    int `json:"remaining"`
}

type RoundEventLogEntry struct {
	EventType                 string  `json:"eventType"`
	TimeSinceRoundStartMillis int     `json:"timeSinceRoundStartMillis"`
	KillerPuuid               *string `json:"killerPuuid,omitempty"`
	VictimPuuid               *string `json:"victimPuuid,omitempty"`
	DamageType                *string `json:"damageType,omitempty"`
	DamageItem                *string `json:"damageItem,omitempty"`
	PlanterPuuid              *string `json:"planterPuuid,omitempty"`
	DefuserPuuid              *string `json:"defuserPuuid,omitempty"`
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
	PUUID       string             `json:"puuid"`
	TeamID      string             `json:"teamId"`
	GameName    string             `json:"gameName"`
	TagLine     string             `json:"tagLine"`
	Stats       riotPlayerStatsDTO `json:"stats"`
	CharacterID string             `json:"characterId"`
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

type riotDetailedMatchDTO struct {
	MatchInfo riotMatchInfoDTO `json:"matchInfo"`
	Players   []riotPlayerDTO  `json:"players"`
	Teams     []riotTeamDTO    `json:"teams"`
	Rounds    []riotRoundDTO   `json:"roundResults"`
}

type riotRoundDTO struct {
	RoundNum        int                    `json:"roundNum"`
	RoundResult     string                 `json:"roundResult"`
	RoundCeremony   string                 `json:"roundCeremony"`
	WinningTeam     string                 `json:"winningTeam"`
	BombPlanter     *string                `json:"bombPlanter"`
	BombDefuser     *string                `json:"bombDefuser"`
	PlantRoundTime  int                    `json:"plantRoundTime"`
	DefuseRoundTime int                    `json:"defuseRoundTime"`
	PlayersStats    []riotRoundPlayerStats `json:"playerStats"`
}

type riotRoundPlayerStats struct {
	PUUID        string           `json:"puuid"`
	Kills        []riotKillEvent  `json:"kills"`
	EconomyState riotEconomyState `json:"economy"`
	Score        int              `json:"score"`
}

type riotKillEvent struct {
	TimeSinceGameStartMillis  int                 `json:"timeSinceGameStartMillis"`
	TimeSinceRoundStartMillis int                 `json:"timeSinceRoundStartMillis"`
	Killer                    string              `json:"killer"`
	Victim                    string              `json:"victim"`
	Assistants                []string            `json:"assistants"`
	VictimLocation            map[string]int      `json:"victimLocation"`
	PlayerLocations           []map[string]any    `json:"playerLocations"`
	FinishingDamage           riotFinishingDamage `json:"finishingDamage"`
}

type riotFinishingDamage struct {
	DamageType          string `json:"damageType"`
	DamageItem          string `json:"damageItem"`
	IsSecondaryFireMode bool   `json:"isSecondaryFireMode"`
}

type riotEconomyState struct {
	LoadoutValue int `json:"loadoutValue"`
	Remaining    int `json:"remaining"`
	Spent        int `json:"spent"`
}

type roundCombatCounts struct {
	Kills   int
	Deaths  int
	Assists int
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

		if !isSupportedQueue(match.MatchInfo.QueueID) {
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
	notFoundCount := 0

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
			slog.Warn("riot request transport failure", "region", region, "endpoint", endpointPath, "error", err)
			lastErr = err
			continue
		}

		if resp.StatusCode == http.StatusNotFound {
			notFoundCount++
			_ = resp.Body.Close()
			slog.Info("riot endpoint returned 404", "region", region, "endpoint", endpointPath)
			lastErr = &riotHTTPError{StatusCode: resp.StatusCode, Region: region, Endpoint: endpointPath}
			continue
		}

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			bodyPreview := ""
			if bodyBytes, readErr := io.ReadAll(resp.Body); readErr == nil {
				bodyPreview = string(bodyBytes)
				if len(bodyPreview) > 300 {
					bodyPreview = bodyPreview[:300]
				}
			}
			_ = resp.Body.Close()
			slog.Warn("riot request failed", "region", region, "endpoint", endpointPath, "status_code", resp.StatusCode, "body_preview", bodyPreview)
			lastErr = &riotHTTPError{StatusCode: resp.StatusCode, Region: region, Endpoint: endpointPath}
			continue
		}

		if err := json.NewDecoder(resp.Body).Decode(destination); err != nil {
			_ = resp.Body.Close()
			slog.Warn("riot response decode failure", "region", region, "endpoint", endpointPath, "error", err)
			lastErr = fmt.Errorf("failed to decode riot response from region %s: %w", region, err)
			continue
		}

		_ = resp.Body.Close()

		return nil
	}

	if notFoundCount == len(riotRegions) {
		return fmt.Errorf("riot endpoint returned 404 across all regions for %s: %w", endpointPath, &riotHTTPError{
			StatusCode: http.StatusNotFound,
			Region:     "all",
			Endpoint:   endpointPath,
		})
	}

	if lastErr != nil {
		return fmt.Errorf("riot request failed for %s: %w", endpointPath, lastErr)
	}

	return errors.New("riot request failed")
}

func normalizeQueueID(queueID string) string {
	return strings.ToLower(strings.TrimSpace(queueID))
}

func isCustomQueue(queueID string) bool {
	return normalizeQueueID(queueID) == ""
}

func isSupportedQueue(queueID string) bool {
	switch normalizeQueueID(queueID) {
	case "", "competitive", "unrated":
		return true
	default:
		return false
	}
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

var valorantMapURLToDisplayName = map[string]string{
	"/Game/Maps/Ascent/Ascent":     "Ascent",
	"/Game/Maps/Bonsai/Bonsai":     "Split",
	"/Game/Maps/Canyon/Canyon":     "Fracture",
	"/Game/Maps/Duality/Duality":   "Bind",
	"/Game/Maps/Foxtrot/Foxtrot":   "Breeze",
	"/Game/Maps/Infinity/Infinity": "Abyss",
	"/Game/Maps/Jam/Jam":           "Lotus",
	"/Game/Maps/Juliett/Juliett":   "Sunset",
	"/Game/Maps/Pitt/Pitt":         "Pearl",
	"/Game/Maps/Port/Port":         "Icebox",
	"/Game/Maps/Rook/Rook":         "Corrode",
	"/Game/Maps/Triad/Triad":       "Haven",
}

var valorantAgentIDToDisplayName = map[string]string{
	"e370fa57-4757-3604-3648-499e1f642d3f": "Gekko",
	"dade69b4-4f5a-8528-247b-219e5a1facd6": "Fade",
	"5f8d3a7f-467b-97f3-062c-13acf203c006": "Breach",
	"cc8b64c8-4b25-4ff9-6e7f-37b4da43d235": "Deadlock",
	"b444168c-4e35-8076-db47-ef9bf368f384": "Tejo",
	"f94c3b30-42be-e959-889c-5aa313dba261": "Raze",
	"22697a3d-45bf-8dd7-4fec-84a9e28c69d7": "Chamber",
	"601dbbe7-43ce-be57-2a40-4abd24953621": "KAY/O",
	"6f2a04ca-43e0-be17-7f36-b3908627744d": "Skye",
	"117ed9e3-49f3-6512-3ccf-0cada7e3823b": "Cypher",
	"320b2a48-4d9b-a075-30f1-1f93a9b638fa": "Sova",
	"7c8a4701-4de6-9355-b254-e09bc2a34b72": "Miks",
	"1e58de9c-4950-5125-93e9-a0aee9f98746": "Killjoy",
	"95b78ed7-4637-86d9-7e41-71ba8c293152": "Harbor",
	"efba5359-4016-a1e5-7626-b1ae76895940": "Vyse",
	"707eab51-4836-f488-046a-cda6bf494859": "Viper",
	"eb93336a-449b-9c1b-0a54-a891f7921d69": "Phoenix",
	"92eeef5d-43b5-1d4a-8d03-b3927a09034b": "Veto",
	"41fb69c1-4189-7b37-f117-bcaf1e96f1bf": "Astra",
	"9f0d8ba9-4140-b941-57d3-a7ad57c6b417": "Brimstone",
	"0e38b510-41a8-5780-5e8f-568b2a4f2d6c": "Iso",
	"1dbf2edd-4729-0984-3115-daa5eed44993": "Clove",
	"bb2a4828-46eb-8cd1-e765-15848195d751": "Neon",
	"7f94d92c-4234-0a36-9646-3a87eb8b5c89": "Yoru",
	"df1cb487-4902-002e-5c17-d28e83e78588": "Waylay",
	"569fdd95-4d10-43ab-ca70-79becc718b46": "Sage",
	"a3bfb853-43b2-7238-a4f1-ad90e9e46bcc": "Reyna",
	"8e253930-4c05-31dd-1b6c-968525494517": "Omen",
	"add6443a-41bd-e414-f6ad-e58d267f4e95": "Jett",
}

func toMapName(mapID string) string {
	trimmed := strings.TrimSpace(mapID)
	if trimmed == "" {
		return "Unknown"
	}

	if displayName, ok := valorantMapURLToDisplayName[trimmed]; ok {
		return displayName
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

	if displayName, ok := valorantAgentIDToDisplayName[trimmed]; ok {
		return displayName
	}

	return trimmed
}

// GetMatchSummary returns a match summary with round details and event logs fetched from Riot API.
func (s *MatchService) GetMatchSummary(ctx context.Context, user *models.User, matchID string) (*MatchSummaryResponse, error) {
	if user == nil || user.RSOSubjectID == nil || strings.TrimSpace(*user.RSOSubjectID) == "" {
		return nil, ErrRSOUserRequired
	}

	if user.FirebaseUID == nil {
		return nil, ErrPUUIDUnavailable
	}

	matchID = strings.TrimSpace(matchID)
	if matchID == "" {
		return nil, fmt.Errorf("match id is required")
	}

	if s.riotAPIKey == "" {
		return nil, ErrRiotAPIKeyMissing
	}

	matchPath := fmt.Sprintf("/val/match/v1/matches/%s", url.PathEscape(matchID))
	match := riotDetailedMatchDTO{}
	if err := s.fetchFromAnyRegion(ctx, matchPath, &match); err != nil {
		if isRiotNotFound(err) {
			return nil, ErrMatchNotFound
		}
		return nil, fmt.Errorf("fetch match details: %w", err)
	}

	viewerPUUID := *user.FirebaseUID
	bestRound := s.findBestRound(match, viewerPUUID)

	summary := &MatchSummaryResponse{
		MatchID:     strings.TrimSpace(match.MatchInfo.MatchID),
		MapID:       strings.TrimSpace(match.MatchInfo.MapID),
		MapName:     toMapName(strings.TrimSpace(match.MatchInfo.MapID)),
		QueueLabel:  normalizeQueueLabel(match.MatchInfo.QueueID),
		GameStartAt: time.UnixMilli(match.MatchInfo.GameStartMillis).UTC().Format(time.RFC3339),
		Viewer: ViewerContext{
			PUUID:           viewerPUUID,
			BestRoundNumber: bestRound,
		},
		TotalRounds: len(match.Rounds),
		Players:     s.buildPlayerSummaries(match),
		Rounds:      s.buildRoundSummaries(match),
	}

	return summary, nil
}

func (s *MatchService) findBestRound(match riotDetailedMatchDTO, viewerPUUID string) int {
	bestScore := -1
	bestRound := 1

	for _, round := range match.Rounds {
		for _, stats := range round.PlayersStats {
			if stats.PUUID == viewerPUUID {
				if stats.Score > bestScore {
					bestScore = stats.Score
					bestRound = round.RoundNum + 1
				}
				break
			}
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

func (s *MatchService) buildRoundSummaries(match riotDetailedMatchDTO) []RoundSummaryLite {
	summaries := make([]RoundSummaryLite, 0, len(match.Rounds))

	// Map to track cumulative scores
	scores := map[string]int{"Red": 0, "Blue": 0}

	for _, round := range match.Rounds {
		// Update scores based on round result
		if round.WinningTeam != "" {
			scores[round.WinningTeam]++
		}

		roundSummary := RoundSummaryLite{
			RoundNumber:     round.RoundNum + 1,
			WinningTeam:     round.WinningTeam,
			RoundResultCode: normalizeRoundResult(round.RoundResult, round.RoundCeremony),
			ScoreAfterRound: ScoreAfterRound{
				Red:  scores["Red"],
				Blue: scores["Blue"],
			},
			PlayerStats: s.buildPlayerStats(round, match.Players),
			EventLog:    s.buildEventLog(round),
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

		// Find player's team
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

func (s *MatchService) buildEventLog(round riotRoundDTO) []RoundEventLogEntry {
	events := make([]RoundEventLogEntry, 0)

	// Process kill events
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
			events = append(events, event)
		}
	}

	// Add spike events
	if round.BombPlanter != nil && round.PlantRoundTime > 0 {
		event := RoundEventLogEntry{
			EventType:                 "spike_planted",
			TimeSinceRoundStartMillis: round.PlantRoundTime,
			PlanterPuuid:              round.BombPlanter,
		}
		events = append(events, event)
	}

	if round.BombDefuser != nil && round.DefuseRoundTime > 0 {
		event := RoundEventLogEntry{
			EventType:                 "spike_defused",
			TimeSinceRoundStartMillis: round.DefuseRoundTime,
			DefuserPuuid:              round.BombDefuser,
		}
		events = append(events, event)
	}

	sortEventsByTime(events)

	return events
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

func normalizeRoundResult(roundResult, roundCeremony string) string {
	result := strings.TrimSpace(roundResult)
	ceremony := strings.ToLower(strings.TrimSpace(roundCeremony))

	if strings.EqualFold(result, "Bomb detonated") || ceremony == "detonate" {
		return "Detonate"
	}
	if strings.EqualFold(result, "Defused") || strings.EqualFold(result, "Bomb defused") || ceremony == "defuse" {
		return "Defuse"
	}
	if strings.EqualFold(result, "Eliminated") || ceremony == "elimination" {
		return "Elimination"
	}
	if ceremony == "time_expired" {
		return "TimeExpired"
	}
	if ceremony == "surrender" {
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
