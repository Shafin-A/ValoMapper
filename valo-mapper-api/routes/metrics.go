package routes

import (
	"net/http"
	"valo-mapper-api/handlers"
	"valo-mapper-api/middleware"
	"valo-mapper-api/websocket"

	"github.com/gorilla/mux"
)

func RegisterMetricsRoutes(r *mux.Router, hub *websocket.Hub, parser handlers.ReplayParser, internalAPIKey string) {
	handler := middleware.InternalAPIKeyMiddleware(internalAPIKey)(handlers.HandleMetrics(hub, parser))
	r.Handle("/metrics", handler).Methods(http.MethodGet)
}
