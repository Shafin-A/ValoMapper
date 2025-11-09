package routes

import (
	"net/http"
	"valo-mapper-api/handlers"

	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"
)

func RegisterUserRoutes(r *mux.Router, firebaseAuth *auth.Client) {
	users := r.PathPrefix("/api/users").Subrouter()

	users.HandleFunc("", func(w http.ResponseWriter, r *http.Request) {
		handlers.CreateUser(w, r, firebaseAuth)
	}).Methods("POST")

	users.HandleFunc("/me", func(w http.ResponseWriter, r *http.Request) {
		handlers.GetUser(w, r, firebaseAuth)
	}).Methods("GET")
}
