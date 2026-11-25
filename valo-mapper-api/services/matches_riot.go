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
	"strings"
	"sync"
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
