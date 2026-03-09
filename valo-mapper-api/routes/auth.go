package routes

import (
	"net/http"
	"valo-mapper-api/handlers"

	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"
)

func RegisterAuthRoutes(r *mux.Router, firebaseAuth *auth.Client) {
	auth := r.PathPrefix("/api/auth").Subrouter()

	auth.HandleFunc("/rso/callback", func(w http.ResponseWriter, r *http.Request) {
		handlers.HandleRSOCallback(w, r, handlers.NewFirebaseAuthClient(firebaseAuth))
	}).Methods("POST")
}
