package main

import (
	"log"
	"net/http"
	"valo-mapper-api/db"
	"valo-mapper-api/handlers"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	db.InitDB()
	defer db.DB.Close()

	r := mux.NewRouter()

	r.HandleFunc("/api/lobbies", handlers.CreateLobby).Methods("POST")
	r.HandleFunc("/api/lobbies/{code}", handlers.GetLobby).Methods("GET")
	r.HandleFunc("/api/lobbies/{code}", handlers.UpdateLobby).Methods("PATCH")

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: true,
	})

	handler := c.Handler(r)

	log.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}
