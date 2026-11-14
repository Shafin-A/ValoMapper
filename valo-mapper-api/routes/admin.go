package routes

import (
	"net/http"
	"valo-mapper-api/handlers"
	"valo-mapper-api/middleware"

	"github.com/gorilla/mux"
)

func RegisterAdminRoutes(r *mux.Router, internalAPIKey string) {
	handler := middleware.InternalAPIKeyMiddleware(internalAPIKey)(http.HandlerFunc(handlers.HandleAdminLobbies))
	r.Handle("/admin/lobbies", handler).Methods(http.MethodGet)
}
