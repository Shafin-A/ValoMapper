package routes

import (
	"net/http"
	"valo-mapper-api/handlers"

	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"
)

func RegisterFolderRoutes(r *mux.Router, firebaseAuth *auth.Client) {
	folders := r.PathPrefix("/api/folders").Subrouter()
	authClient := handlers.NewFirebaseAuthClient(firebaseAuth)

	folders.HandleFunc("", func(w http.ResponseWriter, r *http.Request) {
		handlers.CreateFolder(w, r, authClient)
	}).Methods("POST")

	folders.HandleFunc("", func(w http.ResponseWriter, r *http.Request) {
		handlers.GetFolders(w, r, authClient)
	}).Methods("GET")

	folders.HandleFunc("/{id}", func(w http.ResponseWriter, r *http.Request) {
		handlers.UpdateFolder(w, r, authClient)
	}).Methods("PATCH")

	folders.HandleFunc("/{id}", func(w http.ResponseWriter, r *http.Request) {
		handlers.DeleteFolder(w, r, authClient)
	}).Methods("DELETE")
}
