package routes

import (
	"valo-mapper-api/handlers"

	"github.com/gorilla/mux"
)

func RegisterImageRoutes(r *mux.Router) {
	r.HandleFunc("/api/images/upload", handlers.UploadImage).Methods("POST")
	r.HandleFunc("/api/images/object", handlers.GetImage).Methods("GET")
}
