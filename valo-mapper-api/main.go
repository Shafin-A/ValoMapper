package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
	"valo-mapper-api/db"
	"valo-mapper-api/firebase"
	"valo-mapper-api/handlers"
	"valo-mapper-api/middleware"
	"valo-mapper-api/routes"
	"valo-mapper-api/scheduler"
	"valo-mapper-api/websocket"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"golang.org/x/time/rate"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	requiredEnvVars := []string{
		"DB_HOST",
		"DB_PORT",
		"DB_USER",
		"DB_PASSWORD",
		"DB_NAME",
		"GOOGLE_APPLICATION_CREDENTIALS",
		"RSO_CLIENT_ID",
		"RSO_CLIENT_SECRET",
		"RSO_REDIRECT_URI",
		"INTERNAL_API_KEY",
		"STRIPE_SECRET_KEY",
		"STRIPE_PRICE_ID_MONTHLY",
		"STRIPE_PRICE_ID_YEARLY",
		"STRIPE_WEBHOOK_SECRET",
	}

	var missingVars []string
	for _, envVar := range requiredEnvVars {
		if os.Getenv(envVar) == "" {
			missingVars = append(missingVars, envVar)
		}
	}

	if len(missingVars) > 0 {
		log.Fatalf("Missing required environment variables: %v", missingVars)
	}

	if err := db.InitDB(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer db.Close()

	firebaseAuth, err := firebase.InitFirebaseAuth()
	if err != nil {
		log.Fatalf("Failed to initialize Firebase: %v", err)
	}

	rsoclient := os.Getenv("RSO_CLIENT_ID")
	rsosecret := os.Getenv("RSO_CLIENT_SECRET")
	rsoredirect := os.Getenv("RSO_REDIRECT_URI")
	handlers.InitializeRSOConfig(rsoclient, rsosecret, rsoredirect)

	conn, err := db.GetDB()
	if err != nil {
		log.Fatalf("Failed to get database connection: %v", err)
	}

	cleanupScheduler := scheduler.NewCleanupScheduler(conn, 12*time.Hour)
	cleanupScheduler.Start()

	hub := websocket.NewHub()
	go hub.Run()

	r := mux.NewRouter()
	routes.SetupRoutes(r, firebaseAuth, hub)

	rateLimiter := middleware.NewIPRateLimiter(rate.Limit(10), 20)

	var handler http.Handler = r
	handler = middleware.DBHealthMiddleware(handler)
	handler = middleware.RateLimitMiddleware(rateLimiter)(handler)
	handler = middleware.RequestIDMiddleware(handler)

	allowedOrigins := []string{"http://localhost:3000"}
	if origin := os.Getenv("ALLOWED_ORIGINS"); origin != "" {
		allowedOrigins = strings.Split(origin, ",")
	}

	c := cors.New(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})
	handler = c.Handler(handler)

	srv := &http.Server{
		Addr:         ":8080",
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Println("Server running on :8080")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Server failed to start:", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	<-quit
	log.Println("Shutting down server gracefully...")

	cleanupScheduler.Stop()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server stopped successfully")
}
