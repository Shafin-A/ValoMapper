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
	"sync"
	"time"
	"valo-mapper-api/models"
)

const (
	defaultMatchPreviewLimit = 10
	maxMatchPreviewLimit     = 50
	matchPreviewConcurrency  = 4
	matchPreviewCacheTTL     = 30 * time.Second
	matchSummaryCacheTTL     = 5 * time.Minute
	riotHTTPTimeout          = 10 * time.Second
)

var (
	ErrRSOUserRequired   = errors.New("rso user required")
	ErrPUUIDUnavailable  = errors.New("puuid unavailable")
	ErrRiotAPIKeyMissing = errors.New("riot api key unavailable")
	ErrMatchNotFound     = errors.New("match not found")
)

type matchSummaryCacheEntry struct {
	summary   *MatchSummaryResponse
	expiresAt time.Time
}

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

type MatchPreviewPage struct {
	Matches    []MatchPreview         `json:"matches"`
	Pagination MatchPreviewPagination `json:"pagination"`
}

type MatchPreviewPagination struct {
	Start     int  `json:"start"`
	Limit     int  `json:"limit"`
	Total     int  `json:"total"`
	HasMore   bool `json:"hasMore"`
	NextStart *int `json:"nextStart,omitempty"`
}

type MatchSummaryResponse struct {
	MatchID     string               `json:"matchId"`
	MapID       string               `json:"mapId"`
	MapName     string               `json:"mapName"`
	QueueLabel  string               `json:"queueLabel"`
	GameStartAt string               `json:"gameStartAt"`
	Viewer      *ViewerContext       `json:"viewer"`
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

type MatchWorldPosition struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type MatchPlayerLocation struct {
	PUUID       string             `json:"puuid"`
	ViewRadians float64            `json:"viewRadians"`
	Location    MatchWorldPosition `json:"location"`
}

type RoundEventLogEntry struct {
	EventType                 string                `json:"eventType"`
	TimeSinceRoundStartMillis int                   `json:"timeSinceRoundStartMillis"`
	KillerPuuid               *string               `json:"killerPuuid,omitempty"`
	VictimPuuid               *string               `json:"victimPuuid,omitempty"`
	DamageType                *string               `json:"damageType,omitempty"`
	DamageItem                *string               `json:"damageItem,omitempty"`
	PlanterPuuid              *string               `json:"planterPuuid,omitempty"`
	DefuserPuuid              *string               `json:"defuserPuuid,omitempty"`
	VictimLocation            *MatchWorldPosition   `json:"victimLocation,omitempty"`
	PlayerLocations           []MatchPlayerLocation `json:"playerLocations,omitempty"`
	PlantLocation             *MatchWorldPosition   `json:"plantLocation,omitempty"`
	PlantPlayerLocations      []MatchPlayerLocation `json:"plantPlayerLocations,omitempty"`
	DefuseLocation            *MatchWorldPosition   `json:"defuseLocation,omitempty"`
	DefusePlayerLocations     []MatchPlayerLocation `json:"defusePlayerLocations,omitempty"`
}

// MatchService fetches match data from Riot and builds preview DTOs.
type MatchService struct {
	httpClient          *http.Client
	riotAPIKey          string
	matchPreviewCache   map[string]matchPreviewCacheEntry
	matchPreviewCacheMu sync.RWMutex
	matchSummaryCache   map[string]matchSummaryCacheEntry
	matchSummaryCacheMu sync.RWMutex
	now                 func() time.Time
}

// NewMatchService creates a MatchService with a default HTTP client.
func NewMatchService() *MatchService {
	return &MatchService{
		httpClient:        &http.Client{Timeout: riotHTTPTimeout},
		riotAPIKey:        strings.TrimSpace(os.Getenv("RIOT_API_KEY")),
		matchPreviewCache: make(map[string]matchPreviewCacheEntry),
		matchSummaryCache: make(map[string]matchSummaryCacheEntry),
		now:               time.Now,
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
	RoundNum              int                    `json:"roundNum"`
	RoundResult           string                 `json:"roundResult"`
	WinningTeam           string                 `json:"winningTeam"`
	BombPlanter           *string                `json:"bombPlanter"`
	BombDefuser           *string                `json:"bombDefuser"`
	PlantRoundTime        int                    `json:"plantRoundTime"`
	PlantPlayerLocations  []riotPlayerLocation   `json:"plantPlayerLocations"`
	PlantLocation         *riotWorldPosition     `json:"plantLocation"`
	DefuseRoundTime       int                    `json:"defuseRoundTime"`
	DefusePlayerLocations []riotPlayerLocation   `json:"defusePlayerLocations"`
	DefuseLocation        *riotWorldPosition     `json:"defuseLocation"`
	PlayersStats          []riotRoundPlayerStats `json:"playerStats"`
}

type riotRoundPlayerStats struct {
	PUUID        string           `json:"puuid"`
	Kills        []riotKillEvent  `json:"kills"`
	EconomyState riotEconomyState `json:"economy"`
	Score        int              `json:"score"`
}

type riotKillEvent struct {
	TimeSinceGameStartMillis  int                  `json:"timeSinceGameStartMillis"`
	TimeSinceRoundStartMillis int                  `json:"timeSinceRoundStartMillis"`
	Killer                    string               `json:"killer"`
	Victim                    string               `json:"victim"`
	Assistants                []string             `json:"assistants"`
	VictimLocation            *riotWorldPosition   `json:"victimLocation"`
	PlayerLocations           []riotPlayerLocation `json:"playerLocations"`
	FinishingDamage           riotFinishingDamage  `json:"finishingDamage"`
}

type riotWorldPosition struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type riotPlayerLocation struct {
	PUUID       string            `json:"puuid"`
	ViewRadians float64           `json:"viewRadians"`
	Location    riotWorldPosition `json:"location"`
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

type matchPreviewFetchResult struct {
	preview MatchPreview
	ok      bool
}

type matchPreviewCacheEntry struct {
	page      *MatchPreviewPage
	expiresAt time.Time
}

func (s *MatchService) GetRecentMatchPreviews(ctx context.Context, user *models.User, limit int) ([]MatchPreview, error) {
	page, err := s.GetRecentMatchPreviewPage(ctx, user, 0, limit)
	if err != nil {
		return nil, err
	}

	return page.Matches, nil
}

func (s *MatchService) GetRecentMatchPreviewPage(ctx context.Context, user *models.User, start, limit int) (*MatchPreviewPage, error) {
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

	if start < 0 {
		start = 0
	}

	if cachedPage, ok := s.getCachedMatchPreviewPage(puuid, start, limit); ok {
		return cachedPage, nil
	}

	matchlistPath := fmt.Sprintf("/val/match/v1/matchlists/by-puuid/%s", url.PathEscape(puuid))
	matchlist := riotMatchlistResponse{}
	preferredRegion, err := s.fetchFromAnyRegion(ctx, matchlistPath, &matchlist)
	if err != nil {
		return nil, fmt.Errorf("fetch matchlist: %w", err)
	}

	supportedEntries := filterSupportedMatchlistEntries(matchlist.History)
	page := &MatchPreviewPage{
		Matches: nil,
		Pagination: MatchPreviewPagination{
			Start: start,
			Limit: limit,
			Total: len(supportedEntries),
		},
	}

	if start >= len(supportedEntries) {
		s.setCachedMatchPreviewPage(puuid, start, limit, page)
		return page, nil
	}

	end := start + limit
	if end > len(supportedEntries) {
		end = len(supportedEntries)
	}

	page.Matches = s.fetchMatchPreviewsForEntries(ctx, preferredRegion, puuid, supportedEntries[start:end])
	if end < len(supportedEntries) {
		page.Pagination.HasMore = true
		nextStart := end
		page.Pagination.NextStart = &nextStart
	}

	s.setCachedMatchPreviewPage(puuid, start, limit, page)

	return page, nil
}

func filterSupportedMatchlistEntries(history []riotMatchlistEntryDTO) []riotMatchlistEntryDTO {
	supportedEntries := make([]riotMatchlistEntryDTO, 0, len(history))
	for _, entry := range history {
		if !isSupportedQueue(entry.QueueID) {
			continue
		}

		if strings.TrimSpace(entry.MatchID) == "" {
			continue
		}

		supportedEntries = append(supportedEntries, entry)
	}

	return supportedEntries
}

func (s *MatchService) fetchMatchPreviewsForEntries(ctx context.Context, preferredRegion, puuid string, entries []riotMatchlistEntryDTO) []MatchPreview {
	previews := make([]MatchPreview, 0, len(entries))

	for entryIndex := 0; entryIndex < len(entries); {
		batchEnd := entryIndex + matchPreviewConcurrency
		if batchEnd > len(entries) {
			batchEnd = len(entries)
		}

		batchEntries := entries[entryIndex:batchEnd]
		entryIndex = batchEnd

		batchResults := make([]matchPreviewFetchResult, len(batchEntries))
		var waitGroup sync.WaitGroup
		waitGroup.Add(len(batchEntries))

		for batchIndex, entry := range batchEntries {
			go func(batchIndex int, entry riotMatchlistEntryDTO) {
				defer waitGroup.Done()

				matchPath := fmt.Sprintf("/val/match/v1/matches/%s", url.PathEscape(strings.TrimSpace(entry.MatchID)))
				match := riotMatchDTO{}
				if _, err := s.fetchFromPreferredRegion(ctx, preferredRegion, matchPath, &match); err != nil {
					return
				}

				preview, ok := buildMatchPreview(match, puuid)
				if !ok {
					return
				}

				batchResults[batchIndex] = matchPreviewFetchResult{preview: preview, ok: true}
			}(batchIndex, entry)
		}

		waitGroup.Wait()

		for _, result := range batchResults {
			if !result.ok {
				continue
			}

			previews = append(previews, result.preview)
		}
	}

	return previews
}

func cloneMatchPreviews(previews []MatchPreview) []MatchPreview {
	cloned := make([]MatchPreview, len(previews))
	copy(cloned, previews)
	return cloned
}

func cloneMatchPreviewPage(page *MatchPreviewPage) *MatchPreviewPage {
	if page == nil {
		return nil
	}

	cloned := *page
	cloned.Matches = cloneMatchPreviews(page.Matches)
	if page.Pagination.NextStart != nil {
		nextStart := *page.Pagination.NextStart
		cloned.Pagination.NextStart = &nextStart
	}

	return &cloned
}

func (s *MatchService) timeNow() time.Time {
	if s != nil && s.now != nil {
		return s.now()
	}

	return time.Now()
}

func buildMatchPreviewCacheKey(puuid string, start, limit int) string {
	return fmt.Sprintf("%s:%d:%d", puuid, start, limit)
}

func (s *MatchService) getCachedMatchPreviewPage(puuid string, start, limit int) (*MatchPreviewPage, bool) {
	cacheKey := buildMatchPreviewCacheKey(puuid, start, limit)
	now := s.timeNow()

	s.matchPreviewCacheMu.RLock()
	entry, ok := s.matchPreviewCache[cacheKey]
	s.matchPreviewCacheMu.RUnlock()
	if !ok {
		return nil, false
	}

	if !entry.expiresAt.After(now) {
		s.matchPreviewCacheMu.Lock()
		if currentEntry, currentOK := s.matchPreviewCache[cacheKey]; currentOK && !currentEntry.expiresAt.After(now) {
			delete(s.matchPreviewCache, cacheKey)
		}
		s.matchPreviewCacheMu.Unlock()
		return nil, false
	}

	return cloneMatchPreviewPage(entry.page), true
}

func (s *MatchService) setCachedMatchPreviewPage(puuid string, start, limit int, page *MatchPreviewPage) {
	cacheKey := buildMatchPreviewCacheKey(puuid, start, limit)

	s.matchPreviewCacheMu.Lock()
	if s.matchPreviewCache == nil {
		s.matchPreviewCache = make(map[string]matchPreviewCacheEntry)
	}
	if page == nil {
		delete(s.matchPreviewCache, cacheKey)
		s.matchPreviewCacheMu.Unlock()
		return
	}
	s.matchPreviewCache[cacheKey] = matchPreviewCacheEntry{
		page:      cloneMatchPreviewPage(page),
		expiresAt: s.timeNow().Add(matchPreviewCacheTTL),
	}
	s.matchPreviewCacheMu.Unlock()
}

func cloneMatchSummary(summary *MatchSummaryResponse) *MatchSummaryResponse {
	if summary == nil {
		return nil
	}

	cloned := *summary
	if summary.Viewer != nil {
		viewer := *summary.Viewer
		cloned.Viewer = &viewer
	}
	cloned.Players = append([]MatchPlayerSummary(nil), summary.Players...)
	cloned.Rounds = make([]RoundSummaryLite, len(summary.Rounds))

	for roundIndex, round := range summary.Rounds {
		clonedRound := round
		clonedRound.PlayerStats = append([]RoundPlayerStatsLite(nil), round.PlayerStats...)
		clonedRound.EventLog = make([]RoundEventLogEntry, len(round.EventLog))

		for eventIndex, event := range round.EventLog {
			clonedRound.EventLog[eventIndex] = RoundEventLogEntry{
				EventType:                 event.EventType,
				TimeSinceRoundStartMillis: event.TimeSinceRoundStartMillis,
				KillerPuuid:               cloneStringPointer(event.KillerPuuid),
				VictimPuuid:               cloneStringPointer(event.VictimPuuid),
				DamageType:                cloneStringPointer(event.DamageType),
				DamageItem:                cloneStringPointer(event.DamageItem),
				PlanterPuuid:              cloneStringPointer(event.PlanterPuuid),
				DefuserPuuid:              cloneStringPointer(event.DefuserPuuid),
				VictimLocation:            cloneMatchWorldPositionPointer(event.VictimLocation),
				PlayerLocations:           cloneMatchPlayerLocations(event.PlayerLocations),
				PlantLocation:             cloneMatchWorldPositionPointer(event.PlantLocation),
				PlantPlayerLocations:      cloneMatchPlayerLocations(event.PlantPlayerLocations),
				DefuseLocation:            cloneMatchWorldPositionPointer(event.DefuseLocation),
				DefusePlayerLocations:     cloneMatchPlayerLocations(event.DefusePlayerLocations),
			}
		}

		cloned.Rounds[roundIndex] = clonedRound
	}

	return &cloned
}

func cloneStringPointer(value *string) *string {
	if value == nil {
		return nil
	}

	cloned := *value
	return &cloned
}

func cloneMatchWorldPositionPointer(value *MatchWorldPosition) *MatchWorldPosition {
	if value == nil {
		return nil
	}

	cloned := *value
	return &cloned
}

func cloneMatchPlayerLocations(locations []MatchPlayerLocation) []MatchPlayerLocation {
	if len(locations) == 0 {
		return nil
	}

	return append([]MatchPlayerLocation(nil), locations...)
}

func buildMatchSummaryCacheKey(matchID string, includeReplayTelemetry bool) string {
	mode := "base"
	if includeReplayTelemetry {
		mode = "replay"
	}

	return fmt.Sprintf("%s:%s", matchID, mode)
}

func (s *MatchService) getCachedMatchSummary(matchID string, includeReplayTelemetry bool) (*MatchSummaryResponse, bool) {
	cacheKey := buildMatchSummaryCacheKey(matchID, includeReplayTelemetry)
	now := s.timeNow()

	s.matchSummaryCacheMu.RLock()
	entry, ok := s.matchSummaryCache[cacheKey]
	s.matchSummaryCacheMu.RUnlock()
	if !ok {
		return nil, false
	}

	if !entry.expiresAt.After(now) {
		s.matchSummaryCacheMu.Lock()
		if currentEntry, currentOK := s.matchSummaryCache[cacheKey]; currentOK && !currentEntry.expiresAt.After(now) {
			delete(s.matchSummaryCache, cacheKey)
		}
		s.matchSummaryCacheMu.Unlock()
		return nil, false
	}

	return cloneMatchSummary(entry.summary), true
}

func (s *MatchService) setCachedMatchSummary(matchID string, includeReplayTelemetry bool, summary *MatchSummaryResponse) {
	cacheKey := buildMatchSummaryCacheKey(matchID, includeReplayTelemetry)

	s.matchSummaryCacheMu.Lock()
	if s.matchSummaryCache == nil {
		s.matchSummaryCache = make(map[string]matchSummaryCacheEntry)
	}
	if summary == nil {
		delete(s.matchSummaryCache, cacheKey)
		s.matchSummaryCacheMu.Unlock()
		return
	}

	s.matchSummaryCache[cacheKey] = matchSummaryCacheEntry{
		summary:   cloneMatchSummary(summary),
		expiresAt: s.timeNow().Add(matchSummaryCacheTTL),
	}
	s.matchSummaryCacheMu.Unlock()
}

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

func buildRiotRegionOrder(preferredRegion string) []string {
	normalizedPreferredRegion := strings.ToLower(strings.TrimSpace(preferredRegion))
	if normalizedPreferredRegion == "" {
		return riotRegions
	}

	orderedRegions := make([]string, 0, len(riotRegions))
	for _, region := range riotRegions {
		if region == normalizedPreferredRegion {
			orderedRegions = append(orderedRegions, region)
			break
		}
	}

	for _, region := range riotRegions {
		if region != normalizedPreferredRegion {
			orderedRegions = append(orderedRegions, region)
		}
	}

	if len(orderedRegions) == 0 {
		return riotRegions
	}

	return orderedRegions
}

func (s *MatchService) fetchFromAnyRegion(ctx context.Context, endpointPath string, destination any) (string, error) {
	return s.fetchFromRegions(ctx, riotRegions, endpointPath, destination)
}

func (s *MatchService) fetchFromPreferredRegion(ctx context.Context, preferredRegion, endpointPath string, destination any) (string, error) {
	return s.fetchFromRegions(ctx, buildRiotRegionOrder(preferredRegion), endpointPath, destination)
}

func (s *MatchService) fetchFromRegions(ctx context.Context, regions []string, endpointPath string, destination any) (string, error) {
	var lastErr error
	notFoundCount := 0

	for _, region := range regions {
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

		return region, nil
	}

	if notFoundCount == len(regions) {
		return "", fmt.Errorf("riot endpoint returned 404 across all regions for %s: %w", endpointPath, &riotHTTPError{
			StatusCode: http.StatusNotFound,
			Region:     "all",
			Endpoint:   endpointPath,
		})
	}

	if lastErr != nil {
		return "", fmt.Errorf("riot request failed for %s: %w", endpointPath, lastErr)
	}

	return "", errors.New("riot request failed")
}

func normalizeQueueID(queueID string) string {
	return strings.ToLower(strings.TrimSpace(queueID))
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
func (s *MatchService) GetMatchSummary(ctx context.Context, user *models.User, matchID string, includeReplayTelemetry bool) (*MatchSummaryResponse, error) {
	matchID = strings.TrimSpace(matchID)
	if matchID == "" {
		return nil, fmt.Errorf("match id is required")
	}

	if s.riotAPIKey == "" {
		return nil, ErrRiotAPIKeyMissing
	}

	requesterPUUID := ""
	if user != nil && user.FirebaseUID != nil {
		if sanitizedRequesterPUUID, err := sanitizeRiotIdentifier(*user.FirebaseUID); err == nil {
			requesterPUUID = sanitizedRequesterPUUID
		}
	}

	if cachedSummary, ok := s.getCachedMatchSummary(matchID, includeReplayTelemetry); ok {
		cachedSummary.Viewer = buildViewerContext(cachedSummary, requesterPUUID)
		return cachedSummary, nil
	}

	matchPath := fmt.Sprintf("/val/match/v1/matches/%s", url.PathEscape(matchID))
	match := riotDetailedMatchDTO{}
	if _, err := s.fetchFromAnyRegion(ctx, matchPath, &match); err != nil {
		if isRiotNotFound(err) {
			return nil, ErrMatchNotFound
		}
		return nil, fmt.Errorf("fetch match details: %w", err)
	}

	summary := &MatchSummaryResponse{
		MatchID:     strings.TrimSpace(match.MatchInfo.MatchID),
		MapID:       strings.TrimSpace(match.MatchInfo.MapID),
		MapName:     toMapName(strings.TrimSpace(match.MatchInfo.MapID)),
		QueueLabel:  normalizeQueueLabel(match.MatchInfo.QueueID),
		GameStartAt: time.UnixMilli(match.MatchInfo.GameStartMillis).UTC().Format(time.RFC3339),
		Viewer:      nil,
		TotalRounds: len(match.Rounds),
		Players:     s.buildPlayerSummaries(match),
		Rounds:      s.buildRoundSummaries(match, includeReplayTelemetry),
	}

	s.setCachedMatchSummary(matchID, includeReplayTelemetry, summary)
	summary.Viewer = buildViewerContext(summary, requesterPUUID)

	return summary, nil
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

func (s *MatchService) buildEventLog(round riotRoundDTO, includeReplayTelemetry bool) []RoundEventLogEntry {
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
			if includeReplayTelemetry {
				event.VictimLocation = toMatchWorldPositionPointer(kill.VictimLocation)
				event.PlayerLocations = toMatchPlayerLocations(kill.PlayerLocations)
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
