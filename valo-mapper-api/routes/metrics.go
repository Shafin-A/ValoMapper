package routes

import (
	"net/http"
	"valo-mapper-api/handlers"
	"valo-mapper-api/websocket"

	"github.com/gorilla/mux"
)

func RegisterMetricsRoutes(r *mux.Router, hub *websocket.Hub, parser handlers.ReplayParser) {
	r.HandleFunc("/metrics", handlers.HandleMetrics(hub, parser)).Methods(http.MethodGet)
}
