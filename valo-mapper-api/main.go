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
	"valo-mapper-api/replay"
	"valo-mapper-api/routes"
	"valo-mapper-api/scheduler"
	"valo-mapper-api/storage"
	"valo-mapper-api/utils"
	"valo-mapper-api/websocket"

	"valo-mapper-api/docs"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"github.com/stripe/stripe-go/v82"
	httpSwagger "github.com/swaggo/http-swagger"
	"golang.org/x/time/rate"
)

// @title ValoMapper API
// @version 1.0
// @description API for ValoMapper backend services.
// @BasePath /
// @schemes https
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

func getEnvString(name, defaultValue string) string {
	rawValue := strings.TrimSpace(os.Getenv(name))
	if rawValue == "" {
		return defaultValue
	}
	return rawValue
}

func getEnvDuration(name string, defaultValue time.Duration) time.Duration {
	rawValue := strings.TrimSpace(os.Getenv(name))
	if rawValue == "" {
		return defaultValue
	}

	parsedValue, err := time.ParseDuration(rawValue)
	if err != nil {
		slog.Warn("invalid duration env var, using default", "name", name, "value", rawValue, "default", defaultValue)
		return defaultValue
	}

	if parsedValue <= 0 {
		slog.Warn("non-positive duration env var, using default", "name", name, "value", rawValue, "default", defaultValue)
		return defaultValue
	}

	return parsedValue
}

func getSwaggerSchemesFromAllowedOrigins() []string {
	origins := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS"))
	if origins == "" {
		return []string{"http", "https"}
	}

	firstOrigin := strings.TrimSpace(strings.Split(origins, ",")[0])
	lowerOrigin := strings.ToLower(firstOrigin)

	switch {
	case strings.HasPrefix(lowerOrigin, "http://"):
		return []string{"http"}
	case strings.HasPrefix(lowerOrigin, "https://"):
		return []string{"https"}
	case strings.HasPrefix(lowerOrigin, "localhost") || strings.HasPrefix(lowerOrigin, "127.0.0.1"):
		return []string{"http", "https"}
	default:
		return []string{"https"}
	}
}

func main() {
	started := time.Now()
	logger.Init()

	markStartup := func(phase string) {
		slog.Info("startup", "phase", phase, "elapsed_ms", time.Since(started).Milliseconds())
	}

	if err := godotenv.Load(); err != nil {
		slog.Info("no .env file found, using environment variables")
	}

	docs.SwaggerInfo.Schemes = getSwaggerSchemesFromAllowedOrigins()

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
		"RIOT_API_KEY",
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
	markStartup("config_ready")

	stripe.Key = strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY"))

	if err := db.InitDB(); err != nil {
		slog.Error("failed to initialize database", "error", err)
		os.Exit(1)
	}
	defer db.Close()
	markStartup("db_ready")

	firebaseAuth, err := firebase.InitFirebaseAuth()
	if err != nil {
		slog.Error("failed to initialize firebase", "error", err)
		os.Exit(1)
	}
	markStartup("firebase_ready")

	rsoclient := os.Getenv("RSO_CLIENT_ID")
	rsosecret := os.Getenv("RSO_CLIENT_SECRET")
	rsoredirect := os.Getenv("RSO_REDIRECT_URI")
	handlers.InitializeRSOConfig(rsoclient, rsosecret, rsoredirect)

	if err := storage.InitTigris(); err != nil {
		slog.Warn("tigris storage not initialized; image uploads unavailable", "error", err)
	}
	markStartup("storage_ready")

	conn, err := db.GetDB()
	if err != nil {
		slog.Error("failed to get database connection", "error", err)
		os.Exit(1)
	}

	cleanupScheduler := scheduler.NewCleanupScheduler(conn, 12*time.Hour)
	cleanupScheduler.Start()

	hub := websocket.NewHub()
	go hub.Run()

	replay.CleanStaleTempDirs(time.Hour)
	markStartup("replay_cleanup")

	replayService := replay.NewService(replay.Config{
		VRFKitBin:       getEnvString("VRFKIT_BIN", "vrfkit"),
		InspectTimeout:  getEnvDuration("REPLAY_INSPECT_TIMEOUT", 15*time.Second),
		ExportTimeout:   getEnvDuration("REPLAY_EXPORT_TIMEOUT", 3*time.Minute),
		ParseTimeout:    getEnvDuration("REPLAY_PARSE_TIMEOUT", 3*time.Minute),
		QueueWait:       getEnvDuration("REPLAY_QUEUE_WAIT", 30*time.Second),
		MaxUploadBytes:  int64(getEnvInt("REPLAY_MAX_UPLOAD_MB", 250)) << 20,
		CacheTTL:        getEnvDuration("REPLAY_CACHE_TTL", 30*time.Minute),
		CacheMaxEntries: getEnvInt("REPLAY_CACHE_MAX_ENTRIES", 8),
		CacheMaxBytes:   int64(getEnvInt("REPLAY_CACHE_MAX_MB", 64)) << 20,
		MaxConcurrent:   getEnvInt("REPLAY_MAX_CONCURRENT", 1),
		FrameHz:         getEnvInt("REPLAY_FRAME_HZ", 8),
	})
	markStartup("replay_ready")

	r := mux.NewRouter()
	r.NotFoundHandler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		utils.SendJSONError(w, utils.NewNotFound("Not found"), middleware.GetRequestID(r))
	})
	r.MethodNotAllowedHandler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		utils.SendJSONError(w, &utils.HTTPError{Status: http.StatusMethodNotAllowed, Message: "Method not allowed"}, middleware.GetRequestID(r))
	})
	routes.SetupRoutes(r, firebaseAuth, hub, replayService, os.Getenv("INTERNAL_API_KEY"))
	r.PathPrefix("/swagger/").Handler(middleware.SwaggerBasicAuth(httpSwagger.WrapHandler))
	markStartup("routes_ready")

	rateLimitRPS := getEnvFloat("RATE_LIMIT_RPS", 20)
	rateLimitBurst := getEnvInt("RATE_LIMIT_BURST", 60)
	rateLimiter := middleware.NewIPRateLimiter(rate.Limit(rateLimitRPS), rateLimitBurst)
	slog.Info("rate limiter configured", "rps", rateLimitRPS, "burst", rateLimitBurst)

	var handler http.Handler = r
	handler = middleware.BodyLimitMiddleware(handler)
	handler = middleware.RateLimitMiddleware(rateLimiter)(handler)

	allowedOrigins := []string{"http://localhost:3000"}
	if origin := os.Getenv("ALLOWED_ORIGINS"); origin != "" {
		allowedOrigins = strings.Split(origin, ",")
	}
	websocket.ConfigureAllowedOrigins(allowedOrigins)

	c := cors.New(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		ExposedHeaders:   []string{"X-Request-ID", "Retry-After", "X-Parser-Version", "X-Replay-Parse-Ms"},
		AllowCredentials: true,
	})
	handler = c.Handler(handler)
	handler = middleware.AccessLogMiddleware(handler)
	handler = middleware.FirstRequestLogger(started)(handler)
	handler = middleware.RequestIDMiddleware(handler)
	handler = middleware.SecurityHeadersMiddleware(handler)
	markStartup("middleware_ready")

	srv := &http.Server{
		Addr:              ":8080",
		Handler:           handler,
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	markStartup("listening")

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
