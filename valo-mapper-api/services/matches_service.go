package services

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
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

	matchPreviewCacheMaxEntries = 500
	matchSummaryCacheMaxEntries = 100
)

var (
	ErrRSOUserRequired   = errors.New("rso user required")
	ErrPUUIDUnavailable  = errors.New("puuid unavailable")
	ErrRiotAPIKeyMissing = errors.New("riot api key unavailable")
	ErrMatchNotFound     = errors.New("match not found")
)

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

func NewMatchService() *MatchService {
	return &MatchService{
		httpClient:        &http.Client{Timeout: riotHTTPTimeout},
		riotAPIKey:        strings.TrimSpace(os.Getenv("RIOT_API_KEY")),
		matchPreviewCache: make(map[string]matchPreviewCacheEntry),
		matchSummaryCache: make(map[string]matchSummaryCacheEntry),
		now:               time.Now,
	}
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
