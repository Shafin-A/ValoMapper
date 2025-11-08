package routes

import (
	"net/http"
	"valo-mapper-api/handlers"

	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"
)

func RegisterUserRoutes(r *mux.Router, firebaseAuth *auth.Client) {
	r.HandleFunc("/api/users", func(w http.ResponseWriter, r *http.Request) {
		handlers.CreateUser(w, r, firebaseAuth)
	}).Methods("POST")
}
