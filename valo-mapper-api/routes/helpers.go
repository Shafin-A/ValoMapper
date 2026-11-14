package routes

import (
	"net/http"
	"valo-mapper-api/handlers"
)

type authedHandler func(http.ResponseWriter, *http.Request, handlers.FirebaseAuthInterface)

func authenticated(auth handlers.FirebaseAuthInterface, handler authedHandler) http.Handler {
	return handlers.RequireAuth(auth)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handler(w, r, auth)
	}))
}

func optionalAuth(auth handlers.FirebaseAuthInterface, handler authedHandler) http.Handler {
	return handlers.OptionalAuth(auth)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handler(w, r, auth)
	}))
}
