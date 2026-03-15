package routes

import (
	"net/http"
	"valo-mapper-api/handlers"

	"github.com/gorilla/mux"
)

func RegisterHealthRoutes(r *mux.Router) {
	r.HandleFunc("/health", handlers.HandleHealth).Methods(http.MethodGet)
}
