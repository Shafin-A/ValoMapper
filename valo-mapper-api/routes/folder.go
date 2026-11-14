package routes

import (
	"valo-mapper-api/handlers"

	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"
)

func RegisterFolderRoutes(r *mux.Router, firebaseAuth *auth.Client) {
	folders := r.PathPrefix("/api/folders").Subrouter()
	authClient := handlers.NewFirebaseAuthClient(firebaseAuth)

	folders.Handle("", authenticated(authClient, handlers.CreateFolder)).Methods("POST")
	folders.Handle("", authenticated(authClient, handlers.GetFolders)).Methods("GET")
	folders.Handle("/{id}", authenticated(authClient, handlers.UpdateFolder)).Methods("PATCH")
	folders.Handle("/{id}", authenticated(authClient, handlers.DeleteFolder)).Methods("DELETE")
}
