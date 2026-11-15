package routes

import (
	"net/http"
	"valo-mapper-api/handlers"
	"valo-mapper-api/middleware"

	"firebase.google.com/go/v4/auth"
	"github.com/gorilla/mux"
)

func RegisterUserRoutes(r *mux.Router, firebaseAuth *auth.Client, internalAPIKey string) {
	users := r.PathPrefix("/api/users").Subrouter()
	authClient := handlers.NewFirebaseAuthClient(firebaseAuth)

	users.Handle("", authenticated(authClient, handlers.CreateUser)).Methods("POST")
	users.Handle("/me", authenticated(authClient, handlers.GetUser)).Methods("GET")
	users.Handle("/me", authenticated(authClient, handlers.UpdateUser)).Methods("PUT")
	users.Handle("/me", authenticated(authClient, handlers.DeleteUser)).Methods("DELETE")

	subscriptionHandler := middleware.InternalAPIKeyMiddleware(internalAPIKey)(http.HandlerFunc(handlers.UpdateUserSubscription))
	users.Handle("/subscription", subscriptionHandler).Methods("PATCH")
}
