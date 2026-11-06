package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"valo-mapper-api/replay"
	"valo-mapper-api/websocket"
)

func TestHandleMetricsIncludesReplayCounters(t *testing.T) {
	t.Setenv("INTERNAL_API_KEY", "test-key")

	parser := &fakeReplayParser{metrics: replay.Metrics{
		ParsesStarted:   2,
		ParsesSucceeded: 1,
		ParsesFailed:    map[string]uint64{"unsupported_build": 1},
		CacheHits:       3,
		CacheMisses:     1,
		ParserBusy:      1,
		RateLimited:     2,
	}}
	request := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	request.Header.Set("X-Internal-API-Key", "test-key")
	recorder := httptest.NewRecorder()

	HandleMetrics(websocket.NewHub(), parser)(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d (body: %s)", recorder.Code, recorder.Body.String())
	}

	var response struct {
		Replay replay.Metrics `json:"replay"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode metrics: %v", err)
	}
	if response.Replay.ParsesStarted != 2 ||
		response.Replay.ParsesSucceeded != 1 ||
		response.Replay.ParsesFailed["unsupported_build"] != 1 ||
		response.Replay.CacheHits != 3 ||
		response.Replay.CacheMisses != 1 ||
		response.Replay.ParserBusy != 1 ||
		response.Replay.RateLimited != 2 {
		t.Fatalf("replay metrics = %+v", response.Replay)
	}
}
