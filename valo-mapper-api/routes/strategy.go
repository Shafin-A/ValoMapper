package routes

import (
	"net/http"
	"valo-mapper-api/handlers"

	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"
)

func RegisterStrategyRoutes(r *mux.Router, firebaseAuth *auth.Client) {
	strategies := r.PathPrefix("/api/strategies").Subrouter()

	strategies.HandleFunc("", func(w http.ResponseWriter, r *http.Request) {
		handlers.CreateStrategy(w, r, firebaseAuth)
	}).Methods("POST")

	strategies.HandleFunc("", func(w http.ResponseWriter, r *http.Request) {
		handlers.GetStrategies(w, r, firebaseAuth)
	}).Methods("GET")

	strategies.HandleFunc("/{id}", func(w http.ResponseWriter, r *http.Request) {
		handlers.UpdateStrategy(w, r, firebaseAuth)
	}).Methods("PATCH")

	strategies.HandleFunc("/{id}", func(w http.ResponseWriter, r *http.Request) {
		handlers.DeleteStrategy(w, r, firebaseAuth)
	}).Methods("DELETE")
}
