package handlers

import (
	"crypto/subtle"
	"encoding/json"
	"net/http"
	"os"
	"runtime"
	"time"
	"valo-mapper-api/db"
	"valo-mapper-api/middleware"
	"valo-mapper-api/models"
	"valo-mapper-api/utils"
	"valo-mapper-api/websocket"
)

var metricsStartTime = time.Now()

type metricsResponse struct {
	UptimeSeconds float64              `json:"uptime_seconds"`
	Goroutines    int                  `json:"goroutines"`
	Memory        memoryMetrics        `json:"memory"`
	DB            dbMetrics            `json:"db"`
	WebSocket     websocket.HubStats   `json:"websocket"`
	CanvasPatch   canvasPatchMetrics   `json:"canvas_patch"`
	Lobbies       lobbyMetrics         `json:"lobbies"`
	StripeWebhook stripeWebhookMetrics `json:"stripe_webhook"`
	RateLimiter   rateLimiterMetrics   `json:"rate_limiter"`
}

type memoryMetrics struct {
	AllocBytes uint64 `json:"alloc_bytes"`
	SysBytes   uint64 `json:"sys_bytes"`
	NumGC      uint32 `json:"num_gc"`
}

type dbMetrics struct {
	TotalConns    int32 `json:"total_conns"`
	IdleConns     int32 `json:"idle_conns"`
	AcquiredConns int32 `json:"acquired_conns"`
}

type canvasPatchMetrics struct {
	Total  int64 `json:"total"`
	Errors int64 `json:"errors"`
}

type lobbyMetrics struct {
	CreationsTotal int64 `json:"creations_total"`
	ActiveCount    int64 `json:"active_count"`
}

type stripeWebhookMetrics struct {
	Processed  int64 `json:"processed"`
	Failed     int64 `json:"failed"`
	Duplicates int64 `json:"duplicates"`
}

type rateLimiterMetrics struct {
	Rejections int64 `json:"rejections"`
}

// HandleMetrics godoc
// @Summary Observability metrics
// @Description Returns basic runtime, memory, database pool, and WebSocket metrics.
// @Tags health
// @Produce json
// @Success 200 {object} metricsResponse
// @Failure 403 {object} ErrorResponse
// @Security InternalAPIKey
// @Router /metrics [get]
func HandleMetrics(hub *websocket.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		configuredKey := os.Getenv("INTERNAL_API_KEY")
		if configuredKey == "" {
			utils.SendJSONError(w, utils.NewInternal("Internal API key is not configured", nil), middleware.GetRequestID(r))
			return
		}

		providedKey := r.Header.Get("X-Internal-API-Key")
		if subtle.ConstantTimeCompare([]byte(providedKey), []byte(configuredKey)) != 1 {
			utils.SendJSONError(w, utils.NewForbidden("Forbidden"), middleware.GetRequestID(r))
			return
		}

		var ms runtime.MemStats
		runtime.ReadMemStats(&ms)

		var dbm dbMetrics
		if pool := db.DB; pool != nil {
			s := pool.Stat()
			dbm = dbMetrics{
				TotalConns:    s.TotalConns(),
				IdleConns:     s.IdleConns(),
				AcquiredConns: s.AcquiredConns(),
			}
		}

		lobbyActiveCount, _ := models.CountLobbies()

		resp := metricsResponse{
			UptimeSeconds: time.Since(metricsStartTime).Seconds(),
			Goroutines:    runtime.NumGoroutine(),
			Memory: memoryMetrics{
				AllocBytes: ms.Alloc,
				SysBytes:   ms.Sys,
				NumGC:      ms.NumGC,
			},
			DB:        dbm,
			WebSocket: hub.Stats(),
			CanvasPatch: canvasPatchMetrics{
				Total:  canvasPatchTotal.Load(),
				Errors: canvasPatchErrors.Load(),
			},
			Lobbies: lobbyMetrics{
				CreationsTotal: lobbyCreationsTotal.Load(),
				ActiveCount:    lobbyActiveCount,
			},
			StripeWebhook: stripeWebhookMetrics{
				Processed:  stripeWebhookProcessed.Load(),
				Failed:     stripeWebhookFailed.Load(),
				Duplicates: stripeWebhookDuplicates.Load(),
			},
			RateLimiter: rateLimiterMetrics{
				Rejections: middleware.RateLimitRejections(),
			},
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(resp)
	}
}
