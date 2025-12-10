package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"valo-mapper-api/models"
	"valo-mapper-api/testutils"

	"firebase.google.com/go/v4/auth"
	"github.com/stretchr/testify/assert"
)

func testCreateStrategy(w http.ResponseWriter, r *http.Request, mockAuth *testutils.MockFirebaseAuth) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusBadRequest)
		return
	}

	user, err := testAuthenticateRequest(r, mockAuth)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateStrategyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if req.LobbyCode == "" {
		http.Error(w, "Lobby code is required", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		http.Error(w, "Strategy name is required", http.StatusBadRequest)
		return
	}

	lobby, err := models.GetLobbyByCode(req.LobbyCode)
	if err != nil {
		http.Error(w, "Unable to retrieve lobby", http.StatusInternalServerError)
		return
	}
	if lobby == nil {
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte("Lobby not found"))
		return
	}

	strategy := &models.Strategy{
		UserID:    user.ID,
		FolderID:  req.FolderID,
		LobbyCode: req.LobbyCode,
		Name:      req.Name,
	}

	if err := strategy.Save(); err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			http.Error(w, "You have already saved this lobby", http.StatusConflict)
			return
		}
		http.Error(w, "Unable to create strategy", http.StatusInternalServerError)
		return
	}

	response := NewStrategyResponse(strategy, lobby)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(response)
}

func testGetStrategies(w http.ResponseWriter, r *http.Request, mockAuth *testutils.MockFirebaseAuth) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusBadRequest)
		return
	}

	user, err := testAuthenticateRequest(r, mockAuth)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	folderIDStr := r.URL.Query().Get("folderId")
	var folderID *int
	if folderIDStr != "" {
		id, err := strconv.Atoi(folderIDStr)
		if err != nil {
			http.Error(w, "Invalid folder ID", http.StatusBadRequest)
			return
		}
		folderID = &id
	}

	var strategies []models.Strategy
	if folderID != nil {
		strategies, err = models.GetStrategiesByFolderID(user.ID, *folderID)
	} else {
		strategies, err = models.GetStrategiesByUserID(user.ID)
	}

	if err != nil {
		http.Error(w, "Unable to retrieve strategies", http.StatusInternalServerError)
		return
	}

	lobbyCodes := make([]string, 0, len(strategies))
	for _, s := range strategies {
		lobbyCodes = append(lobbyCodes, s.LobbyCode)
	}

	lobbies, err := models.GetLobbiesByCodes(lobbyCodes)
	if err != nil {
		http.Error(w, "Unable to retrieve lobbies", http.StatusInternalServerError)
		return
	}

	lobbyMap := make(map[string]*models.Lobby)
	for i := range lobbies {
		lobbyMap[lobbies[i].Code] = &lobbies[i]
	}

	var responses []*StrategyResponse
	for _, s := range strategies {
		lobby, exists := lobbyMap[s.LobbyCode]
		if !exists || lobby == nil {
			continue
		}
		responses = append(responses, NewStrategyResponse(&s, lobby))
	}

	if responses == nil {
		responses = []*StrategyResponse{}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(responses)
}

func testUpdateStrategy(w http.ResponseWriter, r *http.Request, mockAuth *testutils.MockFirebaseAuth) {
	if r.Method != http.MethodPatch {
		http.Error(w, "Method not allowed", http.StatusBadRequest)
		return
	}

	user, err := testAuthenticateRequest(r, mockAuth)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	path := r.URL.Path
	idStr := strings.TrimPrefix(path, "/api/strategies/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid strategy ID", http.StatusBadRequest)
		return
	}

	var req UpdateStrategyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	strategy, err := models.GetStrategyByID(id)
	if err != nil {
		http.Error(w, "Unable to retrieve strategy", http.StatusInternalServerError)
		return
	}
	if strategy == nil {
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte("Strategy not found"))
		return
	}

	if strategy.UserID != user.ID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if req.Name != nil {
		strategy.Name = *req.Name
	}
	if req.FolderID != nil {
		strategy.FolderID = req.FolderID
	}

	if err := strategy.Update(); err != nil {
		http.Error(w, "Unable to update strategy", http.StatusInternalServerError)
		return
	}

	lobby, err := models.GetLobbyByCode(strategy.LobbyCode)
	if err != nil {
		http.Error(w, "Unable to retrieve lobby", http.StatusInternalServerError)
		return
	}
	if lobby == nil {
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte("Lobby not found"))
		return
	}

	response := NewStrategyResponse(strategy, lobby)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(response)
}

func testDeleteStrategy(w http.ResponseWriter, r *http.Request, mockAuth *testutils.MockFirebaseAuth) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusBadRequest)
		return
	}

	user, err := testAuthenticateRequest(r, mockAuth)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	path := r.URL.Path
	idStr := strings.TrimPrefix(path, "/api/strategies/")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid strategy ID", http.StatusBadRequest)
		return
	}

	strategy, err := models.GetStrategyByID(id)
	if err != nil {
		http.Error(w, "Unable to retrieve strategy", http.StatusInternalServerError)
		return
	}
	if strategy == nil {
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte("Strategy not found"))
		return
	}

	if strategy.UserID != user.ID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if err := strategy.Delete(); err != nil {
		http.Error(w, "Unable to delete strategy", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Tests
func TestCreateStrategy(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "strategies", "lobbies", "users")

	mockAuth := &testutils.MockFirebaseAuth{}
	testUser := testutils.CreateTestUser(t, pool, "firebase-uid-strategy-test")

	t.Run("successfully creates strategy", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		lobby := testutils.CreateTestLobby(t, pool)

		reqBody := CreateStrategyRequest{
			LobbyCode: lobby.Code,
			Name:      "Test Strategy",
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/strategies", reqBody, "valid-token")
		w := httptest.NewRecorder()

		testCreateStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusCreated, w.Code)

		var response StrategyResponse
		testutils.ParseJSONResponse(t, w, &response)

		assert.Equal(t, "Test Strategy", response.Name)
		assert.Equal(t, testUser.ID, response.UserID)
		assert.Equal(t, lobby.Code, response.LobbyCode)
		assert.Nil(t, response.FolderID)
		assert.NotZero(t, response.ID)
	})

	t.Run("successfully creates strategy with folder", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		lobby := testutils.CreateTestLobby(t, pool)
		folder := testutils.CreateTestFolder(t, pool, testUser.ID, "Test Folder")

		reqBody := CreateStrategyRequest{
			LobbyCode: lobby.Code,
			Name:      "Strategy in Folder",
			FolderID:  &folder.ID,
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/strategies", reqBody, "valid-token")
		w := httptest.NewRecorder()

		testCreateStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusCreated, w.Code)

		var response StrategyResponse
		testutils.ParseJSONResponse(t, w, &response)

		assert.Equal(t, "Strategy in Folder", response.Name)
		assert.NotNil(t, response.FolderID)
		assert.Equal(t, folder.ID, *response.FolderID)
	})

	t.Run("rejects missing lobby code", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		reqBody := CreateStrategyRequest{
			LobbyCode: "",
			Name:      "Test Strategy",
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/strategies", reqBody, "valid-token")
		w := httptest.NewRecorder()

		testCreateStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects missing strategy name", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		lobby := testutils.CreateTestLobby(t, pool)

		reqBody := CreateStrategyRequest{
			LobbyCode: lobby.Code,
			Name:      "",
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/strategies", reqBody, "valid-token")
		w := httptest.NewRecorder()

		testCreateStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects non-existent lobby", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		reqBody := CreateStrategyRequest{
			LobbyCode: "NONEXIST",
			Name:      "Test Strategy",
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/strategies", reqBody, "valid-token")
		w := httptest.NewRecorder()

		testCreateStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("rejects duplicate strategy", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		lobby := testutils.CreateTestLobby(t, pool)
		testutils.CreateTestStrategy(t, pool, testUser.ID, lobby.Code)

		reqBody := CreateStrategyRequest{
			LobbyCode: lobby.Code,
			Name:      "Duplicate Strategy",
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/strategies", reqBody, "valid-token")
		w := httptest.NewRecorder()

		testCreateStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusConflict, w.Code)
	})

	t.Run("rejects missing authorization", func(t *testing.T) {
		lobby := testutils.CreateTestLobby(t, pool)

		reqBody := CreateStrategyRequest{
			LobbyCode: lobby.Code,
			Name:      "Test Strategy",
		}

		req := testutils.MakeRequest(t, http.MethodPost, "/api/strategies", reqBody, "")
		w := httptest.NewRecorder()

		testCreateStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("rejects non-POST methods", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/strategies", nil)
		w := httptest.NewRecorder()

		testCreateStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestGetStrategies(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "strategies", "lobbies", "folders", "users")

	mockAuth := &testutils.MockFirebaseAuth{}
	testUser := testutils.CreateTestUser(t, pool, "firebase-uid-get-strategies")

	t.Run("successfully retrieves user strategies", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		lobby1 := testutils.CreateTestLobby(t, pool)
		lobby2 := testutils.CreateTestLobby(t, pool)
		strategy1 := testutils.CreateTestStrategy(t, pool, testUser.ID, lobby1.Code)
		strategy2 := testutils.CreateTestStrategy(t, pool, testUser.ID, lobby2.Code)

		req := testutils.MakeRequest(t, http.MethodGet, "/api/strategies", nil, "valid-token")
		w := httptest.NewRecorder()

		testGetStrategies(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)

		var responses []*StrategyResponse
		testutils.ParseJSONResponse(t, w, &responses)

		assert.Len(t, responses, 2)
		strategyNames := []string{responses[0].Name, responses[1].Name}
		assert.Contains(t, strategyNames, strategy1.Name)
		assert.Contains(t, strategyNames, strategy2.Name)
	})

	t.Run("successfully retrieves strategies by folder", func(t *testing.T) {
		testUser2 := testutils.CreateTestUser(t, pool, "firebase-uid-folder-strategies")

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser2.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser2.Email},
				EmailVerified: true,
			}, nil
		}

		folder := testutils.CreateTestFolder(t, pool, testUser2.ID, "Test Folder")
		lobby := testutils.CreateTestLobby(t, pool)

		strategy := &models.Strategy{
			UserID:    testUser2.ID,
			FolderID:  &folder.ID,
			LobbyCode: lobby.Code,
			Name:      "Strategy in Folder",
		}
		err := strategy.Save()
		assert.NoError(t, err)

		req := testutils.MakeRequest(t, http.MethodGet, fmt.Sprintf("/api/strategies?folderId=%d", folder.ID), nil, "valid-token")
		w := httptest.NewRecorder()

		testGetStrategies(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)

		var responses []*StrategyResponse
		testutils.ParseJSONResponse(t, w, &responses)

		assert.Len(t, responses, 1)
		assert.Equal(t, "Strategy in Folder", responses[0].Name)
		assert.Equal(t, folder.ID, *responses[0].FolderID)
	})

	t.Run("returns empty array when no strategies", func(t *testing.T) {
		testUser3 := testutils.CreateTestUser(t, pool, "firebase-uid-no-strategies")

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser3.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser3.Email},
				EmailVerified: true,
			}, nil
		}

		req := testutils.MakeRequest(t, http.MethodGet, "/api/strategies", nil, "valid-token")
		w := httptest.NewRecorder()

		testGetStrategies(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)

		var responses []*StrategyResponse
		testutils.ParseJSONResponse(t, w, &responses)

		assert.Empty(t, responses)
	})

	t.Run("rejects invalid folder ID", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		req := testutils.MakeRequest(t, http.MethodGet, "/api/strategies?folderId=invalid", nil, "valid-token")
		w := httptest.NewRecorder()

		testGetStrategies(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects missing authorization", func(t *testing.T) {
		req := testutils.MakeRequest(t, http.MethodGet, "/api/strategies", nil, "")
		w := httptest.NewRecorder()

		testGetStrategies(w, req, mockAuth)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("rejects non-GET methods", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/strategies", nil)
		w := httptest.NewRecorder()

		testGetStrategies(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestUpdateStrategy(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "strategies", "lobbies", "folders", "users")

	mockAuth := &testutils.MockFirebaseAuth{}
	testUser := testutils.CreateTestUser(t, pool, "firebase-uid-update-strategy")

	t.Run("successfully updates strategy name", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		lobby := testutils.CreateTestLobby(t, pool)
		strategy := testutils.CreateTestStrategy(t, pool, testUser.ID, lobby.Code)

		newName := "Updated Strategy Name"
		reqBody := UpdateStrategyRequest{
			Name: &newName,
		}

		req := testutils.MakeRequest(t, http.MethodPatch, fmt.Sprintf("/api/strategies/%d", strategy.ID), reqBody, "valid-token")
		w := httptest.NewRecorder()

		testUpdateStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)

		var response StrategyResponse
		testutils.ParseJSONResponse(t, w, &response)

		assert.Equal(t, "Updated Strategy Name", response.Name)
		assert.Equal(t, strategy.ID, response.ID)
	})

	t.Run("successfully updates strategy folder", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		lobby := testutils.CreateTestLobby(t, pool)
		strategy := testutils.CreateTestStrategy(t, pool, testUser.ID, lobby.Code)
		folder := testutils.CreateTestFolder(t, pool, testUser.ID, "Target Folder")

		reqBody := UpdateStrategyRequest{
			FolderID: &folder.ID,
		}

		req := testutils.MakeRequest(t, http.MethodPatch, fmt.Sprintf("/api/strategies/%d", strategy.ID), reqBody, "valid-token")
		w := httptest.NewRecorder()

		testUpdateStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusOK, w.Code)

		var response StrategyResponse
		testutils.ParseJSONResponse(t, w, &response)

		assert.NotNil(t, response.FolderID)
		assert.Equal(t, folder.ID, *response.FolderID)
	})

	t.Run("returns 404 for non-existent strategy", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		newName := "New Name"
		reqBody := UpdateStrategyRequest{
			Name: &newName,
		}

		req := testutils.MakeRequest(t, http.MethodPatch, "/api/strategies/99999", reqBody, "valid-token")
		w := httptest.NewRecorder()

		testUpdateStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("rejects access to another user's strategy", func(t *testing.T) {
		otherUser := testutils.CreateTestUser(t, pool, "firebase-uid-other-user-strategy")
		lobby := testutils.CreateTestLobby(t, pool)
		strategy := testutils.CreateTestStrategy(t, pool, otherUser.ID, lobby.Code)

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		newName := "Hacked Name"
		reqBody := UpdateStrategyRequest{
			Name: &newName,
		}

		req := testutils.MakeRequest(t, http.MethodPatch, fmt.Sprintf("/api/strategies/%d", strategy.ID), reqBody, "valid-token")
		w := httptest.NewRecorder()

		testUpdateStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("rejects invalid strategy ID", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		newName := "New Name"
		reqBody := UpdateStrategyRequest{
			Name: &newName,
		}

		req := testutils.MakeRequest(t, http.MethodPatch, "/api/strategies/invalid", reqBody, "valid-token")
		w := httptest.NewRecorder()

		testUpdateStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects missing authorization", func(t *testing.T) {
		lobby := testutils.CreateTestLobby(t, pool)
		strategy := testutils.CreateTestStrategy(t, pool, testUser.ID, lobby.Code)

		newName := "New Name"
		reqBody := UpdateStrategyRequest{
			Name: &newName,
		}

		req := testutils.MakeRequest(t, http.MethodPatch, fmt.Sprintf("/api/strategies/%d", strategy.ID), reqBody, "")
		w := httptest.NewRecorder()

		testUpdateStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("rejects non-PATCH methods", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/strategies/1", nil)
		w := httptest.NewRecorder()

		testUpdateStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestDeleteStrategy(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	pool := testutils.SetupTestDB(t)
	defer testutils.CleanupTestDB(t, pool)

	testutils.TruncateTables(t, pool, "strategies", "lobbies", "users")

	mockAuth := &testutils.MockFirebaseAuth{}
	testUser := testutils.CreateTestUser(t, pool, "firebase-uid-delete-strategy")

	t.Run("successfully deletes strategy", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		lobby := testutils.CreateTestLobby(t, pool)
		strategy := testutils.CreateTestStrategy(t, pool, testUser.ID, lobby.Code)

		req := testutils.MakeRequest(t, http.MethodDelete, fmt.Sprintf("/api/strategies/%d", strategy.ID), nil, "valid-token")
		w := httptest.NewRecorder()

		testDeleteStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusNoContent, w.Code)

		// Verify strategy was deleted (GetStrategyByID returns (nil, nil) when not found)
		deletedStrategy, _ := models.GetStrategyByID(strategy.ID)
		assert.Nil(t, deletedStrategy)
	})

	t.Run("returns 404 for non-existent strategy", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		req := testutils.MakeRequest(t, http.MethodDelete, "/api/strategies/99999", nil, "valid-token")
		w := httptest.NewRecorder()

		testDeleteStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("rejects access to another user's strategy", func(t *testing.T) {
		otherUser := testutils.CreateTestUser(t, pool, "firebase-uid-other-user-delete")
		lobby := testutils.CreateTestLobby(t, pool)
		strategy := testutils.CreateTestStrategy(t, pool, otherUser.ID, lobby.Code)

		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		req := testutils.MakeRequest(t, http.MethodDelete, fmt.Sprintf("/api/strategies/%d", strategy.ID), nil, "valid-token")
		w := httptest.NewRecorder()

		testDeleteStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("rejects invalid strategy ID", func(t *testing.T) {
		mockAuth.VerifyTokenFunc = func(ctx context.Context, idToken string) (*auth.Token, error) {
			return &auth.Token{UID: testUser.FirebaseUID}, nil
		}
		mockAuth.GetUserFunc = func(ctx context.Context, uid string) (*auth.UserRecord, error) {
			return &auth.UserRecord{
				UserInfo:      &auth.UserInfo{UID: uid, Email: testUser.Email},
				EmailVerified: true,
			}, nil
		}

		req := testutils.MakeRequest(t, http.MethodDelete, "/api/strategies/invalid", nil, "valid-token")
		w := httptest.NewRecorder()

		testDeleteStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("rejects missing authorization", func(t *testing.T) {
		lobby := testutils.CreateTestLobby(t, pool)
		strategy := testutils.CreateTestStrategy(t, pool, testUser.ID, lobby.Code)

		req := testutils.MakeRequest(t, http.MethodDelete, fmt.Sprintf("/api/strategies/%d", strategy.ID), nil, "")
		w := httptest.NewRecorder()

		testDeleteStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("rejects non-DELETE methods", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/strategies/1", nil)
		w := httptest.NewRecorder()

		testDeleteStrategy(w, req, mockAuth)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}
