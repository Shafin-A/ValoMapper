package handlers

import "sync/atomic"

var (
	canvasPatchTotal  atomic.Int64
	canvasPatchErrors atomic.Int64
)

var lobbyCreationsTotal atomic.Int64

var (
	stripeWebhookProcessed  atomic.Int64
	stripeWebhookFailed     atomic.Int64
	stripeWebhookDuplicates atomic.Int64
)
