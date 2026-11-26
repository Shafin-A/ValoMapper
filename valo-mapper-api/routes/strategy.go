package routes

import (
	"valo-mapper-api/handlers"

	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"
)

func RegisterStrategyRoutes(r *mux.Router, firebaseAuth *auth.Client) {
	strategies := r.PathPrefix("/api/strategies").Subrouter()
	authClient := handlers.NewFirebaseAuthClient(firebaseAuth)

	// Register static paths before /{id} so gorilla/mux does not parse them as IDs.
	strategies.Handle("/library", authenticated(authClient, handlers.GetStrategyLibrary)).Methods("GET")
	strategies.Handle("/tags", authenticated(authClient, handlers.GetStrategyTags)).Methods("GET")
	strategies.Handle("/bulk", authenticated(authClient, handlers.BulkUpdateStrategies)).Methods("PATCH")
	strategies.Handle("/bulk-delete", authenticated(authClient, handlers.BulkDeleteStrategies)).Methods("POST")

	strategies.Handle("", authenticated(authClient, handlers.CreateStrategy)).Methods("POST")
	strategies.Handle("", authenticated(authClient, handlers.GetStrategies)).Methods("GET")
	strategies.Handle("/{id}/duplicate", authenticated(authClient, handlers.DuplicateStrategy)).Methods("POST")
	strategies.Handle("/{id}", authenticated(authClient, handlers.UpdateStrategy)).Methods("PATCH")
	strategies.Handle("/{id}", authenticated(authClient, handlers.DeleteStrategy)).Methods("DELETE")
}
