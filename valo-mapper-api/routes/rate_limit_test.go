package routes

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"valo-mapper-api/websocket"

	"github.com/gorilla/mux"
)

const testClientAddr = "192.0.2.10:4321"

// Handlers may fail without a database; only the limiter's 429 is asserted.
func postFromSameIP(t *testing.T, handler http.Handler, path string) int {
	t.Helper()

	req := httptest.NewRequest(http.MethodPost, path, nil)
	req.RemoteAddr = testClientAddr
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, req)

	return recorder.Code
}

func assertBurstThenRateLimited(t *testing.T, handler http.Handler, path string, burst int) {
	t.Helper()

	for request := 1; request <= burst; request++ {
		if code := postFromSameIP(t, handler, path); code == http.StatusTooManyRequests {
			t.Fatalf("request %d should be within the burst, got 429", request)
		}
	}

	if code := postFromSameIP(t, handler, path); code != http.StatusTooManyRequests {
		t.Fatalf("request beyond the burst expected 429, got %d", code)
	}
}

func TestLobbyCreateRouteIsRateLimited(t *testing.T) {
	r := mux.NewRouter()
	RegisterLobbyRoutes(r, websocket.NewHub())

	assertBurstThenRateLimited(t, r, "/api/lobbies", lobbyCreateBurst)
}

func TestImageUploadRouteIsRateLimited(t *testing.T) {
	r := mux.NewRouter()
	RegisterImageRoutes(r)

	assertBurstThenRateLimited(t, r, "/api/images/upload", imageUploadBurst)
}

func TestLobbyReadsAreNotTightlyLimited(t *testing.T) {
	r := mux.NewRouter()
	RegisterLobbyRoutes(r, websocket.NewHub())

	// Only creation is budgeted; reads and patches run on the global limiter.
	for request := 1; request <= lobbyCreateBurst+1; request++ {
		req := httptest.NewRequest(http.MethodGet, "/api/lobbies/ABCDEFG", nil)
		req.RemoteAddr = testClientAddr
		recorder := httptest.NewRecorder()
		r.ServeHTTP(recorder, req)

		if recorder.Code == http.StatusTooManyRequests {
			t.Fatalf("GET request %d should not be rate limited", request)
		}
	}
}
