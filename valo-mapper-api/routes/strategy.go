package routes

import (
	"valo-mapper-api/handlers"

	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"
)

func RegisterStrategyRoutes(r *mux.Router, firebaseAuth *auth.Client) {
	strategies := r.PathPrefix("/api/strategies").Subrouter()
	authClient := handlers.NewFirebaseAuthClient(firebaseAuth)

	strategies.Handle("", authenticated(authClient, handlers.CreateStrategy)).Methods("POST")
	strategies.Handle("", authenticated(authClient, handlers.GetStrategies)).Methods("GET")
	strategies.Handle("/{id}", authenticated(authClient, handlers.UpdateStrategy)).Methods("PATCH")
	strategies.Handle("/{id}", authenticated(authClient, handlers.DeleteStrategy)).Methods("DELETE")
}
