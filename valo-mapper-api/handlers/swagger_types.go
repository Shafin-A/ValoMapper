package handlers

import (
	"valo-mapper-api/models"
	"valo-mapper-api/services"
)

type ErrorResponse struct {
	Error     string `json:"error"`
	RequestID string `json:"requestId,omitempty"`
}

type RSOCallbackResponse struct {
	CustomToken string       `json:"customToken"`
	User        *models.User `json:"user"`
}

type StripeWebhookResponse struct {
	Status    string `json:"status"`
	Reason    string `json:"reason,omitempty"`
	EventType string `json:"eventType,omitempty"`
	EventID   string `json:"eventId,omitempty"`
}

type MatchPreviewsResponse struct {
	Matches    []services.MatchPreview         `json:"matches"`
	Pagination services.MatchPreviewPagination `json:"pagination"`
}

type MatchPreviewPagination = services.MatchPreviewPagination
type MatchSummaryResponse = services.MatchSummaryResponse
type ViewerContext = services.ViewerContext
type MatchPlayerSummary = services.MatchPlayerSummary
type RoundSummaryLite = services.RoundSummaryLite
type ScoreAfterRound = services.ScoreAfterRound
type RoundPlayerStatsLite = services.RoundPlayerStatsLite
type EconomyInfo = services.EconomyInfo
type RoundEventLogEntry = services.RoundEventLogEntry
