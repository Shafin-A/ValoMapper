package routes

import (
	"net/http"
	"valo-mapper-api/handlers"

	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"
)

func RegisterStrategyRoutes(r *mux.Router, firebaseAuth *auth.Client) {
	strategies := r.PathPrefix("/api/strategies").Subrouter()
	authClient := handlers.NewFirebaseAuthClient(firebaseAuth)

	strategies.HandleFunc("", func(w http.ResponseWriter, r *http.Request) {
		handlers.CreateStrategy(w, r, authClient)
	}).Methods("POST")

	strategies.HandleFunc("", func(w http.ResponseWriter, r *http.Request) {
		handlers.GetStrategies(w, r, authClient)
	}).Methods("GET")

	strategies.HandleFunc("/{id}", func(w http.ResponseWriter, r *http.Request) {
		handlers.UpdateStrategy(w, r, authClient)
	}).Methods("PATCH")

	strategies.HandleFunc("/{id}", func(w http.ResponseWriter, r *http.Request) {
		handlers.DeleteStrategy(w, r, authClient)
	}).Methods("DELETE")
}
