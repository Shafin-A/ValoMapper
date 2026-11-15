package routes

import (
	"net/http"
	"valo-mapper-api/handlers"
)

func authenticated(auth handlers.FirebaseAuthInterface, handler http.HandlerFunc) http.Handler {
	return handlers.RequireAuth(auth)(handler)
}

func optionalAuth(auth handlers.FirebaseAuthInterface, handler http.HandlerFunc) http.Handler {
	return handlers.OptionalAuth(auth)(handler)
}
