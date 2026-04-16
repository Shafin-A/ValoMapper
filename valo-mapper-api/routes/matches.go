package routes

import (
	"net/http"
	"valo-mapper-api/handlers"

	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"
)

func RegisterMatchRoutes(r *mux.Router, firebaseAuth *auth.Client) {
	matches := r.PathPrefix("/api/matches").Subrouter()
	authClient := handlers.NewFirebaseAuthClient(firebaseAuth)
	matchHandler := handlers.NewMatchHandler(handlers.MatchHandlerDependencies{
		MatchService: nil,
	})

	matches.HandleFunc("", func(w http.ResponseWriter, r *http.Request) {
		matchHandler.GetMatches(w, r, authClient)
	}).Methods("GET")
}
