package main

import (
	"context"
	"log/slog"
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
	"valo-mapper-api/logger"
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
		slog.Warn("invalid env var value, using default", "name", name, "value", rawValue, "default", defaultValue)
		return defaultValue
	}

	if parsedValue <= 0 {
		slog.Warn("non-positive env var value, using default", "name", name, "value", rawValue, "default", defaultValue)
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
		slog.Warn("invalid env var value, using default", "name", name, "value", rawValue, "default", defaultValue)
		return defaultValue
	}

	if parsedValue <= 0 {
		slog.Warn("non-positive env var value, using default", "name", name, "value", rawValue, "default", defaultValue)
		return defaultValue
	}

	return parsedValue
}

func main() {
	logger.Init()

	if err := godotenv.Load(); err != nil {
		slog.Info("no .env file found, using environment variables")
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
		slog.Error("missing required environment variables", "vars", missingVars)
		os.Exit(1)
	}

	if err := db.InitDB(); err != nil {
		slog.Error("failed to initialize database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	firebaseAuth, err := firebase.InitFirebaseAuth()
	if err != nil {
		slog.Error("failed to initialize firebase", "error", err)
		os.Exit(1)
	}

	rsoclient := os.Getenv("RSO_CLIENT_ID")
	rsosecret := os.Getenv("RSO_CLIENT_SECRET")
	rsoredirect := os.Getenv("RSO_REDIRECT_URI")
	handlers.InitializeRSOConfig(rsoclient, rsosecret, rsoredirect)

	if err := storage.InitTigris(); err != nil {
		slog.Warn("tigris storage not initialized; image uploads unavailable", "error", err)
	}

	conn, err := db.GetDB()
	if err != nil {
		slog.Error("failed to get database connection", "error", err)
		os.Exit(1)
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
	slog.Info("rate limiter configured", "rps", rateLimitRPS, "burst", rateLimitBurst)

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
		slog.Info("server running", "addr", ":8080")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server failed to start", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	<-quit
	slog.Info("shutting down server gracefully")

	cleanupScheduler.Stop()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("server forced to shutdown", "error", err)
		os.Exit(1)
	}

	hub.Stop()

	slog.Info("server stopped")
}
