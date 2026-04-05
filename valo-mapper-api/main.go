package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"
	"valo-mapper-api/db"
	"valo-mapper-api/firebase"
	"valo-mapper-api/handlers"
	"valo-mapper-api/middleware"
	"valo-mapper-api/routes"
	"valo-mapper-api/scheduler"
	"valo-mapper-api/storage"
	"valo-mapper-api/websocket"

	_ "valo-mapper-api/docs"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	httpSwagger "github.com/swaggo/http-swagger"
	"golang.org/x/time/rate"
)

// @title ValoMapper API
// @version 1.0
// @description API for ValoMapper backend services.
// @BasePath /
// @schemes http https
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Firebase bearer token in the form "Bearer <token>".
// @securityDefinitions.apikey InternalAPIKey
// @in header
// @name X-Internal-API-Key
// @description Internal service API key.

func getEnvInt(name string, defaultValue int) int {
	rawValue := strings.TrimSpace(os.Getenv(name))
	if rawValue == "" {
		return defaultValue
	}

	parsedValue, err := strconv.Atoi(rawValue)
	if err != nil {
		log.Printf("Invalid %s value %q. Falling back to %d", name, rawValue, defaultValue)
		return defaultValue
	}

	if parsedValue <= 0 {
		log.Printf("Non-positive %s value %q. Falling back to %d", name, rawValue, defaultValue)
		return defaultValue
	}

	return parsedValue
}

func getEnvFloat(name string, defaultValue float64) float64 {
	rawValue := strings.TrimSpace(os.Getenv(name))
	if rawValue == "" {
		return defaultValue
	}

	parsedValue, err := strconv.ParseFloat(rawValue, 64)
	if err != nil {
		log.Printf("Invalid %s value %q. Falling back to %.2f", name, rawValue, defaultValue)
		return defaultValue
	}

	if parsedValue <= 0 {
		log.Printf("Non-positive %s value %q. Falling back to %.2f", name, rawValue, defaultValue)
		return defaultValue
	}

	return parsedValue
}

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
		"STRIPE_PRICE_LOOKUP_KEY_MONTHLY",
		"STRIPE_PRICE_LOOKUP_KEY_YEARLY",
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

	if err := storage.InitTigris(); err != nil {
		log.Printf("Warning: Tigris storage not initialized (%v); image uploads will be unavailable", err)
	}

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
	r.PathPrefix("/swagger/").HandlerFunc(httpSwagger.WrapHandler)

	rateLimitRPS := getEnvFloat("RATE_LIMIT_RPS", 20)
	rateLimitBurst := getEnvInt("RATE_LIMIT_BURST", 60)
	rateLimiter := middleware.NewIPRateLimiter(rate.Limit(rateLimitRPS), rateLimitBurst)
	log.Printf("Rate limiter configured: %.2f req/s with burst %d", rateLimitRPS, rateLimitBurst)

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

	hub.Stop()

	log.Println("Server stopped successfully")
}
