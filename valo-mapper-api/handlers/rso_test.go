package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"valo-mapper-api/models"
	"valo-mapper-api/testutils"
)

func TestHandleRSOCallback_LoginFlow(t *testing.T) {
	exchangeCodeForTokensFunc = func(_ string) (*RSOTokenResponse, error) {
		return &RSOTokenResponse{AccessToken: "at", RefreshToken: "rt", IDToken: "idt"}, nil
	}
	getUserInfoFromRSOFunc = func(_ string) (*RSOUserInfoResponse, error) {
		return &RSOUserInfoResponse{Sub: "sublogin", CPID: "NA1", GameName: "RiotTester", TagLine: "EUW"}, nil
	}

	// mock firebase auth implementation returning static token
	mockAuth := &testutils.MockFirebaseAuth{}
	mockAuth.CustomTokenFunc = func(ctx context.Context, uid string) (string, error) {
		return "custom-123", nil
	}

	// ensure fresh database
	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)
	testutils.TruncateTables(t, pool, "users")

	// first login creates new user
	{
		body := RSORequest{Code: "code"}
		buf, _ := json.Marshal(body)
		req := httptest.NewRequest("POST", "/", bytes.NewReader(buf))
		rec := httptest.NewRecorder()

		HandleRSOCallback(rec, req, mockAuth)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d", rec.Code)
		}
		var resp map[string]interface{}
		_ = json.NewDecoder(rec.Body).Decode(&resp)
		if resp["customToken"] != "custom-123" {
			t.Errorf("unexpected custom token %v", resp)
		}

		user, err := models.GetUserByRSOSubject(hashRSOSub("sublogin"))
		if err != nil {
			t.Fatalf("failed to load RSO user: %v", err)
		}
		if user == nil || user.FirebaseUID == nil || *user.FirebaseUID != hashRSOSub("sublogin") {
			t.Fatalf("expected firebase_uid to be linked for RSO user")
		}
		if user.Name == nil || *user.Name != "RiotTester#EUW" {
			t.Fatalf("expected name to be set from RSO game_name and tag_line")
		}
	}

	// now simulate login again with same subject to ensure no errors
	{
		body := RSORequest{Code: "code"}
		buf, _ := json.Marshal(body)
		req := httptest.NewRequest("POST", "/", bytes.NewReader(buf))
		rec := httptest.NewRecorder()

		HandleRSOCallback(rec, req, mockAuth)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d on second attempt", rec.Code)
		}
		var resp map[string]interface{}
		_ = json.NewDecoder(rec.Body).Decode(&resp)
		if resp["customToken"] != "custom-123" {
			t.Errorf("unexpected custom token on second login %v", resp)
		}
	}
}
