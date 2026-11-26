package models

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSearchStrategySummaries(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

	user := createTestUser(t, pool, "library-search-user")
	otherUser := createTestUser(t, pool, "library-search-other")

	_, err := pool.Exec(context.Background(), `INSERT INTO maps (id, text) VALUES ('bind', 'Bind')`)
	require.NoError(t, err)

	attackLobby := createTestLobby(t, pool, "LIB001")
	defenseLobby := createTestLobby(t, pool, "LIB002")
	bindLobby := createTestLobby(t, pool, "LIB003")

	_, err = pool.Exec(context.Background(), `UPDATE lobbies SET map_side = 'defense' WHERE code = $1`, defenseLobby.Code)
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `UPDATE lobbies SET selected_map_id = 'bind' WHERE code = $1`, bindLobby.Code)
	require.NoError(t, err)

	// Make sort order deterministic.
	_, err = pool.Exec(context.Background(), `UPDATE lobbies SET updated_at = NOW() - interval '3 hours' WHERE code = $1`, attackLobby.Code)
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `UPDATE lobbies SET updated_at = NOW() - interval '2 hours' WHERE code = $1`, defenseLobby.Code)
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `UPDATE lobbies SET updated_at = NOW() - interval '1 hour' WHERE code = $1`, bindLobby.Code)
	require.NoError(t, err)

	rush := &Strategy{
		UserID:     user.ID,
		LobbyCode:  attackLobby.Code,
		Name:       "B Site Rush",
		Tags:       []string{"post-plant", "b-site"},
		IsFavorite: true,
	}
	require.NoError(t, rush.Save())

	defaultPlay := &Strategy{
		UserID:    user.ID,
		LobbyCode: defenseLobby.Code,
		Name:      "A Site Default",
		Tags:      []string{"default"},
	}
	require.NoError(t, defaultPlay.Save())

	retake := &Strategy{
		UserID:    user.ID,
		LobbyCode: bindLobby.Code,
		Name:      "Retake",
		Tags:      []string{"retake", "b-site"},
	}
	require.NoError(t, retake.Save())

	other := &Strategy{
		UserID:    otherUser.ID,
		LobbyCode: attackLobby.Code,
		Name:      "Other User B Site",
		Tags:      []string{"b-site"},
	}
	require.NoError(t, other.Save())

	t.Run("filters by name, tags, favorite, map, and side", func(t *testing.T) {
		result, err := SearchStrategySummaries(StrategySearchParams{
			UserID: user.ID,
			Query:  "site",
			Sort:   "updated",
		})
		require.NoError(t, err)
		assert.Equal(t, 2, result.Total)
		require.Len(t, result.Strategies, 2)
		assert.Equal(t, "A Site Default", result.Strategies[0].Name)
		assert.Equal(t, "B Site Rush", result.Strategies[1].Name)

		result, err = SearchStrategySummaries(StrategySearchParams{
			UserID:  user.ID,
			Tags:    []string{"b-site"},
			TagMode: "all",
		})
		require.NoError(t, err)
		assert.Equal(t, 2, result.Total)

		result, err = SearchStrategySummaries(StrategySearchParams{
			UserID:  user.ID,
			Tags:    []string{"b-site", "post-plant"},
			TagMode: "all",
		})
		require.NoError(t, err)
		assert.Equal(t, 1, result.Total)
		assert.Equal(t, "B Site Rush", result.Strategies[0].Name)

		result, err = SearchStrategySummaries(StrategySearchParams{
			UserID:  user.ID,
			Tags:    []string{"b-site", "default"},
			TagMode: "any",
		})
		require.NoError(t, err)
		assert.Equal(t, 3, result.Total)

		favorite := true
		result, err = SearchStrategySummaries(StrategySearchParams{
			UserID:   user.ID,
			Favorite: &favorite,
		})
		require.NoError(t, err)
		assert.Equal(t, 1, result.Total)
		assert.Equal(t, "B Site Rush", result.Strategies[0].Name)

		result, err = SearchStrategySummaries(StrategySearchParams{
			UserID: user.ID,
			MapID:  "bind",
		})
		require.NoError(t, err)
		assert.Equal(t, 1, result.Total)
		assert.Equal(t, "Retake", result.Strategies[0].Name)
		assert.Equal(t, "bind", result.Strategies[0].SelectedMapID)

		result, err = SearchStrategySummaries(StrategySearchParams{
			UserID: user.ID,
			Side:   "defense",
		})
		require.NoError(t, err)
		assert.Equal(t, 1, result.Total)
		assert.Equal(t, "A Site Default", result.Strategies[0].Name)
		assert.Equal(t, "defense", result.Strategies[0].MapSide)
	})

	t.Run("sorts and paginates", func(t *testing.T) {
		result, err := SearchStrategySummaries(StrategySearchParams{
			UserID: user.ID,
			Sort:   "name",
			Limit:  2,
			Offset: 1,
		})
		require.NoError(t, err)
		assert.Equal(t, 3, result.Total)
		require.Len(t, result.Strategies, 2)
		assert.Equal(t, "B Site Rush", result.Strategies[0].Name)
		assert.Equal(t, "Retake", result.Strategies[1].Name)
	})

	t.Run("lists distinct tags", func(t *testing.T) {
		tags, err := ListStrategyTags(user.ID)
		require.NoError(t, err)
		assert.Equal(t, []string{"b-site", "default", "post-plant", "retake"}, tags)
	})

	t.Run("bulk updates and deletes owned strategies", func(t *testing.T) {
		tagsByID, err := GetStrategyTagsByIDs(user.ID, []int{rush.ID, defaultPlay.ID})
		require.NoError(t, err)
		assert.Equal(t, []string{"post-plant", "b-site"}, tagsByID[rush.ID])
		assert.Equal(t, []string{"default"}, tagsByID[defaultPlay.ID])

		favorite := true
		updated, err := BulkUpdateStrategies(BulkUpdateStrategyParams{
			UserID:      user.ID,
			IDs:         []int{rush.ID, defaultPlay.ID},
			HasFolderID: true,
			FolderID:    nil,
			IsFavorite:  &favorite,
			AddTags:     []string{"new"},
			RemoveTags:  []string{"default"},
		})
		require.NoError(t, err)
		assert.Equal(t, int64(2), updated)

		updatedRush, err := GetStrategyByID(rush.ID)
		require.NoError(t, err)
		assert.Equal(t, []string{"b-site", "new", "post-plant"}, updatedRush.Tags)
		assert.True(t, updatedRush.IsFavorite)

		updatedDefault, err := GetStrategyByID(defaultPlay.ID)
		require.NoError(t, err)
		assert.Equal(t, []string{"new"}, updatedDefault.Tags)
		assert.True(t, updatedDefault.IsFavorite)

		folder := &Folder{UserID: user.ID, Name: "Pistol Rounds"}
		require.NoError(t, folder.Save())

		updated, err = BulkUpdateStrategies(BulkUpdateStrategyParams{
			UserID:      user.ID,
			IDs:         []int{rush.ID},
			HasFolderID: true,
			FolderID:    &folder.ID,
		})
		require.NoError(t, err)
		assert.Equal(t, int64(1), updated)

		movedRush, err := GetStrategyByID(rush.ID)
		require.NoError(t, err)
		require.NotNil(t, movedRush.FolderID)
		assert.Equal(t, folder.ID, *movedRush.FolderID)

		deleted, err := BulkDeleteStrategies(user.ID, []int{retake.ID})
		require.NoError(t, err)
		assert.Equal(t, int64(1), deleted)

		loaded, err := GetStrategyByID(retake.ID)
		require.NoError(t, err)
		assert.Nil(t, loaded)

		// Another user's row must not be touched.
		otherLoaded, err := GetStrategyByID(other.ID)
		require.NoError(t, err)
		require.NotNil(t, otherLoaded)
	})
}

func TestCopyLobby(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)

	truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

	lobby, mapID := createCanvasTestLobby(t, pool)
	state := FullCanvasState{
		SelectedMap:       MapOption{ID: mapID},
		MapSide:           "attack",
		CurrentPhaseIndex: 0,
		EditedPhases:      []int{0},
		Phases:            NewEmptyPhaseStates(),
	}
	state.Phases[0] = PhaseState{
		AgentsOnCanvas: []CanvasAgent{
			{ID: "agent1", AgentName: "Jett", IsAlly: true, X: 100, Y: 200, Note: "entry"},
		},
		AbilitiesOnCanvas: []CanvasAbility{
			{ID: "ability1", AgentName: "Jett", Action: "dash", X: 120, Y: 220, IsAlly: true},
		},
		DrawLines: []CanvasDrawLine{
			{ID: "line1", Tool: "pen", Points: []Position{{X: 10, Y: 20}, {X: 30, Y: 40}}, Color: "#FF0000", Size: 2.5},
		},
		ConnectingLines: []CanvasConnectingLine{
			{ID: "cline1", FromID: "agent1", ToID: "ability1", StrokeColor: "#00FF00", StrokeWidth: 2, UploadedImages: []string{"images/lineup.png"}, YoutubeLink: "https://youtube.com/watch?v=test", Notes: "lineup"},
		},
		TextsOnCanvas: []CanvasText{
			{ID: "text1", Text: "Push A", X: 300, Y: 400, Width: 100, Height: 50, FontSize: 24},
		},
		ImagesOnCanvas: []CanvasImage{
			{ID: "img1", Src: "images/map.png", X: 500, Y: 600, Width: 200, Height: 150},
		},
		ToolIconsOnCanvas: []CanvasToolIcon{
			{ID: "icon1", Name: "Spike", X: 700, Y: 800, Width: 32, Height: 32},
		},
	}
	require.NoError(t, SaveCanvasState(lobby.Code, state))

	newCode, err := CopyLobby(lobby.Code)
	require.NoError(t, err)
	require.NotEmpty(t, newCode)
	assert.NotEqual(t, lobby.Code, newCode)

	source, err := GetLobbyByCode(lobby.Code)
	require.NoError(t, err)
	copied, err := GetLobbyByCode(newCode)
	require.NoError(t, err)
	require.NotNil(t, source)
	require.NotNil(t, copied)

	assert.Equal(t, source.CanvasState.SelectedMap.ID, copied.CanvasState.SelectedMap.ID)
	assert.Equal(t, source.CanvasState.MapSide, copied.CanvasState.MapSide)
	assert.Equal(t, source.CanvasState.EditedPhases, copied.CanvasState.EditedPhases)

	for phaseIndex := range source.CanvasState.Phases {
		sourcePhase := source.CanvasState.Phases[phaseIndex]
		copiedPhase := copied.CanvasState.Phases[phaseIndex]
		assert.Len(t, copiedPhase.AgentsOnCanvas, len(sourcePhase.AgentsOnCanvas))
		assert.Len(t, copiedPhase.AbilitiesOnCanvas, len(sourcePhase.AbilitiesOnCanvas))
		assert.Len(t, copiedPhase.DrawLines, len(sourcePhase.DrawLines))
		assert.Len(t, copiedPhase.ConnectingLines, len(sourcePhase.ConnectingLines))
		assert.Len(t, copiedPhase.TextsOnCanvas, len(sourcePhase.TextsOnCanvas))
		assert.Len(t, copiedPhase.ImagesOnCanvas, len(sourcePhase.ImagesOnCanvas))
		assert.Len(t, copiedPhase.ToolIconsOnCanvas, len(sourcePhase.ToolIconsOnCanvas))
	}

	require.Len(t, copied.CanvasState.Phases[0].AgentsOnCanvas, 1)
	assert.Equal(t, "agent1", copied.CanvasState.Phases[0].AgentsOnCanvas[0].ID)
	assert.Equal(t, "entry", copied.CanvasState.Phases[0].AgentsOnCanvas[0].Note)
	require.Len(t, copied.CanvasState.Phases[0].ConnectingLines, 1)
	assert.Equal(t, []string{"images/lineup.png"}, copied.CanvasState.Phases[0].ConnectingLines[0].UploadedImages)

	// The source lobby remains untouched.
	require.Len(t, source.CanvasState.Phases[0].AgentsOnCanvas, 1)
}

func TestCopyLobbyMissingSource(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	pool := setupTestDB(t)
	defer cleanupTestDB(t, pool)
	truncateTables(t, pool, "strategies", "folders", "lobbies", "maps", "users")

	_, err := CopyLobby("MISSING")
	assert.ErrorIs(t, err, ErrLobbyNotFound)
}
