package routes

import (
	"net/http"
	"valo-mapper-api/handlers"
	"valo-mapper-api/middleware"

	"github.com/gorilla/mux"
	"golang.org/x/time/rate"
)

func RegisterImageRoutes(r *mux.Router) {
	uploadImage := middleware.RouteRateLimitMiddleware(
		middleware.NewIPRateLimiter(rate.Every(imageUploadInterval), imageUploadBurst),
		"Too many image uploads. Please wait a moment and try again.",
		imageUploadInterval,
	)(http.HandlerFunc(handlers.UploadImage))

	r.Handle("/api/images/upload", uploadImage).Methods("POST")
	r.HandleFunc("/api/images/object", handlers.GetImage).Methods("GET")
}
