package services

import (
	"fmt"
	"time"
)

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
	now := s.timeNow()
	s.matchPreviewCache[cacheKey] = matchPreviewCacheEntry{
		page:      cloneMatchPreviewPage(page),
		expiresAt: now.Add(matchPreviewCacheTTL),
	}
	s.pruneMatchPreviewCacheLocked(now)
	s.matchPreviewCacheMu.Unlock()
}

func (s *MatchService) pruneMatchPreviewCacheLocked(now time.Time) {
	for key, entry := range s.matchPreviewCache {
		if !entry.expiresAt.After(now) {
			delete(s.matchPreviewCache, key)
		}
	}

	for len(s.matchPreviewCache) > matchPreviewCacheMaxEntries {
		var oldestKey string
		var oldestExpiry time.Time
		for key, entry := range s.matchPreviewCache {
			if oldestKey == "" || entry.expiresAt.Before(oldestExpiry) {
				oldestKey = key
				oldestExpiry = entry.expiresAt
			}
		}
		delete(s.matchPreviewCache, oldestKey)
	}
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

	now := s.timeNow()
	s.matchSummaryCache[cacheKey] = matchSummaryCacheEntry{
		summary:   cloneMatchSummary(summary),
		expiresAt: now.Add(matchSummaryCacheTTL),
	}
	s.pruneMatchSummaryCacheLocked(now)
	s.matchSummaryCacheMu.Unlock()
}

func (s *MatchService) pruneMatchSummaryCacheLocked(now time.Time) {
	for key, entry := range s.matchSummaryCache {
		if !entry.expiresAt.After(now) {
			delete(s.matchSummaryCache, key)
		}
	}

	for len(s.matchSummaryCache) > matchSummaryCacheMaxEntries {
		var oldestKey string
		var oldestExpiry time.Time
		for key, entry := range s.matchSummaryCache {
			if oldestKey == "" || entry.expiresAt.Before(oldestExpiry) {
				oldestKey = key
				oldestExpiry = entry.expiresAt
			}
		}
		delete(s.matchSummaryCache, oldestKey)
	}
}
