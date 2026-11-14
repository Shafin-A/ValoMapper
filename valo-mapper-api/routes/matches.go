package routes

import (
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

	matches.Handle("", authenticated(authClient, matchHandler.GetMatches)).Methods("GET")
	matches.Handle("/{matchId}/summary", optionalAuth(authClient, matchHandler.GetMatchSummary)).Methods("GET")
}
