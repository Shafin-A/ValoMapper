package main

import (
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"
	"valo-mapper-api/logger"
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

func getEnvValue[T any](name string, defaultValue T, parse func(string) (T, error), valid func(T) bool) T {
	rawValue := strings.TrimSpace(os.Getenv(name))
	if rawValue == "" {
		return defaultValue
	}

	parsedValue, err := parse(rawValue)
	if err != nil || (valid != nil && !valid(parsedValue)) {
		slog.Warn("invalid env var value, using default", "name", name, "value", rawValue, "default", defaultValue)
		return defaultValue
	}

	return parsedValue
}

func getEnvInt(name string, defaultValue int) int {
	return getEnvValue(name, defaultValue, strconv.Atoi, func(value int) bool { return value > 0 })
}

func getEnvFloat(name string, defaultValue float64) float64 {
	return getEnvValue(name, defaultValue, func(raw string) (float64, error) {
		return strconv.ParseFloat(raw, 64)
	}, func(value float64) bool { return value > 0 })
}

func getEnvString(name, defaultValue string) string {
	return getEnvValue(name, defaultValue, func(raw string) (string, error) { return raw, nil }, nil)
}

func getEnvDuration(name string, defaultValue time.Duration) time.Duration {
	return getEnvValue(name, defaultValue, time.ParseDuration, func(value time.Duration) bool { return value > 0 })
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

	if missingVars := initializeConfig(); len(missingVars) > 0 {
		slog.Error("missing required environment variables", "vars", missingVars)
		os.Exit(1)
	}
	markStartup("config_ready")

	runtime, err := initializeRuntime(markStartup)
	if err != nil {
		slog.Error("failed to initialize runtime", "error", err)
		os.Exit(1)
	}
	defer runtime.close()

	srv := buildHTTPServer(runtime, started, markStartup)
	serveUntilShutdown(srv, runtime, markStartup)
}
