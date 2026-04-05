package logger

import (
	"log/slog"
	"os"
)

// Init configures the global slog default logger.
// Set LOG_FORMAT=text for human-readable output (local dev); JSON is the default (production).
func Init() {
	opts := &slog.HandlerOptions{Level: slog.LevelInfo}

	var handler slog.Handler
	if os.Getenv("LOG_FORMAT") == "text" {
		handler = slog.NewTextHandler(os.Stdout, opts)
	} else {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	}

	slog.SetDefault(slog.New(handler))
}
