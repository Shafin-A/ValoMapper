package routes

import (
	"net/http"
	"valo-mapper-api/handlers"

	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"
)

func RegisterUserRoutes(r *mux.Router, firebaseAuth *auth.Client) {
	users := r.PathPrefix("/api/users").Subrouter()
	authClient := handlers.NewFirebaseAuthClient(firebaseAuth)

	users.HandleFunc("", func(w http.ResponseWriter, r *http.Request) {
		handlers.CreateUser(w, r, authClient)
	}).Methods("POST")

	users.HandleFunc("/me", func(w http.ResponseWriter, r *http.Request) {
		handlers.GetUser(w, r, authClient)
	}).Methods("GET")

	users.HandleFunc("/me", func(w http.ResponseWriter, r *http.Request) {
		handlers.UpdateUser(w, r, authClient)
	}).Methods("PUT")

	users.HandleFunc("/me", func(w http.ResponseWriter, r *http.Request) {
		handlers.DeleteUser(w, r, authClient)
	}).Methods("DELETE")

	users.HandleFunc("/subscription", func(w http.ResponseWriter, r *http.Request) {
		handlers.UpdateUserSubscription(w, r, authClient)
	}).Methods("PATCH")
}
