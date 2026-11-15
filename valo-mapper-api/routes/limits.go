package routes

import "time"

// Per-route budgets for anonymous writes, on top of the global 20 req/s limiter.
const (
	lobbyCreateInterval = 10 * time.Second
	lobbyCreateBurst    = 3

	imageUploadInterval = 30 * time.Second
	imageUploadBurst    = 20
)
