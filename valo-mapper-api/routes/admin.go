package routes

import (
	"net/http"
	"valo-mapper-api/handlers"

	"github.com/gorilla/mux"
)

func RegisterAdminRoutes(r *mux.Router) {
	r.HandleFunc("/admin/lobbies", handlers.HandleAdminLobbies).Methods(http.MethodGet)
}
