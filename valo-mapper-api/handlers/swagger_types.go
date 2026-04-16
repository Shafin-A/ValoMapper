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
	Matches []services.MatchPreview `json:"matches"`
}
