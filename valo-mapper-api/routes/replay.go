package routes

import (
	"net/http"

	"valo-mapper-api/handlers"

	"github.com/gorilla/mux"
)

func RegisterReplayRoutes(r *mux.Router, parser handlers.ReplayParser) {
	if parser == nil {
		return
	}

	handler := handlers.NewReplayHandler(parser)
	r.HandleFunc("/api/replays", handler.Post).Methods(http.MethodPost)
	r.HandleFunc("/api/replays/{id}", handler.Get).Methods(http.MethodGet)
}
