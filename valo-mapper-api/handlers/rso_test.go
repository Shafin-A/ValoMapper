package handlers

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"valo-mapper-api/models"
	"valo-mapper-api/testutils"
)

func makeIDTokenFromClaims(t *testing.T, claims map[string]any) string {
	t.Helper()

	payload, err := json.Marshal(claims)
	if err != nil {
		t.Fatalf("failed to marshal claims: %v", err)
	}

	encodedPayload := base64.RawURLEncoding.EncodeToString(payload)
	return fmt.Sprintf("header.%s.signature", encodedPayload)
}

func TestExtractNameFromIDToken_Fallbacks(t *testing.T) {
	t.Run("uses id token name claim", func(t *testing.T) {
		idToken := makeIDTokenFromClaims(t, map[string]any{"name": "Token Name"})
		name := extractNameFromIDToken(idToken)

		if name != "Token Name" {
			t.Fatalf("expected Token Name got %q", name)
		}
	})

	t.Run("uses id token acct object with mixed key styles", func(t *testing.T) {
		idToken := makeIDTokenFromClaims(t, map[string]any{
			"acct": map[string]any{
				"game_name": "TokenGame",
				"tagLine":   "APAC",
			},
		})
		name := extractNameFromIDToken(idToken)

		if name != "TokenGame#APAC" {
			t.Fatalf("expected TokenGame#APAC got %q", name)
		}
	})
}

func TestHandleRSOCallback_LoginFlow(t *testing.T) {
	originalExchangeFunc := exchangeCodeForTokensFunc
	originalGetUserInfoFunc := getUserInfoFromRSOFunc
	originalGetAccountInfoFunc := getAccountInfoFromRSOFunc
	t.Cleanup(func() {
		exchangeCodeForTokensFunc = originalExchangeFunc
		getUserInfoFromRSOFunc = originalGetUserInfoFunc
		getAccountInfoFromRSOFunc = originalGetAccountInfoFunc
	})

	exchangeCodeForTokensFunc = func(_ string) (*RSOTokenResponse, error) {
		return &RSOTokenResponse{AccessToken: "at", RefreshToken: "rt", IDToken: "idt"}, nil
	}
	getUserInfoFromRSOFunc = func(_ string) (*RSOUserInfoResponse, error) {
		return &RSOUserInfoResponse{Sub: "sublogin", GameName: "RiotTester", TagLine: "EUW"}, nil
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

func TestHandleRSOCallback_UsesAccountEndpointFallback(t *testing.T) {
	originalExchangeFunc := exchangeCodeForTokensFunc
	originalGetUserInfoFunc := getUserInfoFromRSOFunc
	originalGetAccountInfoFunc := getAccountInfoFromRSOFunc
	t.Cleanup(func() {
		exchangeCodeForTokensFunc = originalExchangeFunc
		getUserInfoFromRSOFunc = originalGetUserInfoFunc
		getAccountInfoFromRSOFunc = originalGetAccountInfoFunc
	})

	exchangeCodeForTokensFunc = func(_ string) (*RSOTokenResponse, error) {
		return &RSOTokenResponse{AccessToken: "at", RefreshToken: "rt", IDToken: makeIDTokenFromClaims(t, map[string]any{"sub": "sub-empty"})}, nil
	}
	getUserInfoFromRSOFunc = func(_ string) (*RSOUserInfoResponse, error) {
		return &RSOUserInfoResponse{Sub: "sub-empty"}, nil
	}
	getAccountInfoFromRSOFunc = func(_ string) (*RSOAccountResponse, error) {
		return &RSOAccountResponse{GameName: "FromAccountAPI", TagLine: "NA1"}, nil
	}

	mockAuth := &testutils.MockFirebaseAuth{}
	mockAuth.CustomTokenFunc = func(ctx context.Context, uid string) (string, error) {
		return "custom-123", nil
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)
	testutils.TruncateTables(t, pool, "users")

	body := RSORequest{Code: "code"}
	buf, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", "/", bytes.NewReader(buf))
	rec := httptest.NewRecorder()

	HandleRSOCallback(rec, req, mockAuth)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", rec.Code)
	}

	user, err := models.GetUserByRSOSubject(hashRSOSub("sub-empty"))
	if err != nil {
		t.Fatalf("failed to load RSO user: %v", err)
	}
	if user == nil {
		t.Fatalf("expected RSO user to be created")
	}
	if user.Name == nil || *user.Name != "FromAccountAPI#NA1" {
		t.Fatalf("expected name to be set from account endpoint fallback, got %#v", user.Name)
	}
}
