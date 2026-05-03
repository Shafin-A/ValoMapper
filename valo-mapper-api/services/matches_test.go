package services

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"
	"time"
	"valo-mapper-api/models"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return fn(req)
}

func newJSONResponse(t *testing.T, body string) *http.Response {
	t.Helper()

	return &http.Response{
		StatusCode: http.StatusOK,
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}

func TestGetRecentMatchPreviews_SkipsUnsupportedMatchlistQueuesBeforeDetailFetch(t *testing.T) {
	firebaseUID := "player-puuid"
	rsoSubjectID := "rso-subject"
	requestedMatchDetails := make([]string, 0, 2)

	service := &MatchService{
		httpClient: &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				switch req.URL.Path {
				case "/val/match/v1/matchlists/by-puuid/player-puuid":
					return newJSONResponse(t, `{
						"puuid": "player-puuid",
						"history": [
							{"matchId": "unsupported-match", "queueId": "deathmatch"},
							{"matchId": "custom-match", "queueId": ""}
						]
					}`), nil
				case "/val/match/v1/matches/unsupported-match":
					requestedMatchDetails = append(requestedMatchDetails, "unsupported-match")
					return newJSONResponse(t, `{}`), nil
				case "/val/match/v1/matches/custom-match":
					requestedMatchDetails = append(requestedMatchDetails, "custom-match")
					return newJSONResponse(t, `{
						"matchInfo": {
							"matchId": "custom-match",
							"mapId": "/Game/Maps/Ascent/Ascent",
							"gameStartMillis": 1710000000000,
							"queueId": "",
							"gameMode": "/Game/GameModes/Bomb/BombGameMode.BombGameMode_C"
						},
						"players": [
							{
								"puuid": "player-puuid",
								"teamId": "Blue",
								"gameName": "Player",
								"tagLine": "NA1",
								"characterId": "add6443a-41bd-e414-f6ad-e58d267f4e95",
								"stats": {"score": 210, "kills": 12, "deaths": 7, "assists": 3}
							},
							{
								"puuid": "enemy-puuid",
								"teamId": "Red",
								"gameName": "Enemy",
								"tagLine": "EUW",
								"characterId": "9f0d8ba9-4140-b941-57d3-a7ad57c6b417",
								"stats": {"score": 150, "kills": 7, "deaths": 12, "assists": 2}
							}
						],
						"teams": [
							{"teamId": "Blue", "won": true, "roundsWon": 13},
							{"teamId": "Red", "won": false, "roundsWon": 11}
						]
					}`), nil
				default:
					t.Fatalf("unexpected request path %q", req.URL.Path)
					return nil, nil
				}
			}),
		},
		riotAPIKey: "test-riot-key",
	}

	previews, err := service.GetRecentMatchPreviews(context.Background(), &models.User{
		FirebaseUID:  &firebaseUID,
		RSOSubjectID: &rsoSubjectID,
	}, 10)
	if err != nil {
		t.Fatalf("GetRecentMatchPreviews returned error: %v", err)
	}

	if len(previews) != 1 {
		t.Fatalf("expected 1 preview, got %d", len(previews))
	}
	if previews[0].MatchID != "custom-match" {
		t.Fatalf("expected custom-match preview, got %q", previews[0].MatchID)
	}

	if len(requestedMatchDetails) != 1 || requestedMatchDetails[0] != "custom-match" {
		t.Fatalf("expected only custom-match detail fetch, got %+v", requestedMatchDetails)
	}
}

func TestGetRecentMatchPreviewPage_UsesStartOffsetAcrossSupportedEntries(t *testing.T) {
	firebaseUID := "player-puuid"
	rsoSubjectID := "rso-subject"
	requestedMatchDetails := make([]string, 0, 3)

	service := &MatchService{
		httpClient: &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				switch req.URL.Path {
				case "/val/match/v1/matchlists/by-puuid/player-puuid":
					return newJSONResponse(t, `{
						"puuid": "player-puuid",
						"history": [
							{"matchId": "first-match", "queueId": "competitive"},
							{"matchId": "ignored-match", "queueId": "deathmatch"},
							{"matchId": "second-match", "queueId": "competitive"},
							{"matchId": "third-match", "queueId": ""}
						]
					}`), nil
				case "/val/match/v1/matches/first-match":
					requestedMatchDetails = append(requestedMatchDetails, "first-match")
					return newJSONResponse(t, `{}`), nil
				case "/val/match/v1/matches/second-match":
					requestedMatchDetails = append(requestedMatchDetails, "second-match")
					return newJSONResponse(t, `{
						"matchInfo": {
							"matchId": "second-match",
							"mapId": "/Game/Maps/Ascent/Ascent",
							"gameStartMillis": 1710000000000,
							"queueId": "competitive",
							"gameMode": ""
						},
						"players": [
							{
								"puuid": "player-puuid",
								"teamId": "Blue",
								"gameName": "Player",
								"tagLine": "NA1",
								"characterId": "add6443a-41bd-e414-f6ad-e58d267f4e95",
								"stats": {"score": 210, "kills": 12, "deaths": 7, "assists": 3}
							},
							{
								"puuid": "enemy-puuid",
								"teamId": "Red",
								"gameName": "Enemy",
								"tagLine": "EUW",
								"characterId": "9f0d8ba9-4140-b941-57d3-a7ad57c6b417",
								"stats": {"score": 150, "kills": 7, "deaths": 12, "assists": 2}
							}
						],
						"teams": [
							{"teamId": "Blue", "won": true, "roundsWon": 13},
							{"teamId": "Red", "won": false, "roundsWon": 11}
						]
					}`), nil
				case "/val/match/v1/matches/third-match":
					requestedMatchDetails = append(requestedMatchDetails, "third-match")
					return newJSONResponse(t, `{}`), nil
				default:
					t.Fatalf("unexpected request path %q", req.URL.Path)
					return nil, nil
				}
			}),
		},
		riotAPIKey: "test-riot-key",
	}

	page, err := service.GetRecentMatchPreviewPage(context.Background(), &models.User{
		FirebaseUID:  &firebaseUID,
		RSOSubjectID: &rsoSubjectID,
	}, 1, 1)
	if err != nil {
		t.Fatalf("GetRecentMatchPreviewPage returned error: %v", err)
	}

	if len(page.Matches) != 1 {
		t.Fatalf("expected 1 preview, got %d", len(page.Matches))
	}
	if page.Matches[0].MatchID != "second-match" {
		t.Fatalf("expected second-match preview, got %q", page.Matches[0].MatchID)
	}

	if page.Pagination.Total != 3 {
		t.Fatalf("expected 3 supported matches total, got %d", page.Pagination.Total)
	}
	if !page.Pagination.HasMore {
		t.Fatalf("expected paged result to report more matches")
	}
	if page.Pagination.NextStart == nil || *page.Pagination.NextStart != 2 {
		t.Fatalf("expected nextStart 2, got %+v", page.Pagination.NextStart)
	}

	if len(requestedMatchDetails) != 1 || requestedMatchDetails[0] != "second-match" {
		t.Fatalf("expected only second-match detail fetch, got %+v", requestedMatchDetails)
	}
}

func TestGetRecentMatchPreviews_ReusesSuccessfulMatchlistRegionForDetailFetches(t *testing.T) {
	firebaseUID := "player-puuid"
	rsoSubjectID := "rso-subject"
	requestedDetailHosts := make([]string, 0, 4)

	service := &MatchService{
		httpClient: &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				switch req.URL.Path {
				case "/val/match/v1/matchlists/by-puuid/player-puuid":
					switch req.URL.Host {
					case "na.api.riotgames.com", "latam.api.riotgames.com", "br.api.riotgames.com":
						resp := newJSONResponse(t, `{}`)
						resp.StatusCode = http.StatusNotFound
						return resp, nil
					case "eu.api.riotgames.com":
						return newJSONResponse(t, `{
							"puuid": "player-puuid",
							"history": [
								{"matchId": "custom-match", "queueId": ""}
							]
						}`), nil
					default:
						t.Fatalf("unexpected matchlist host %q", req.URL.Host)
						return nil, nil
					}
				case "/val/match/v1/matches/custom-match":
					requestedDetailHosts = append(requestedDetailHosts, req.URL.Host)
					if req.URL.Host != "eu.api.riotgames.com" {
						resp := newJSONResponse(t, `{}`)
						resp.StatusCode = http.StatusNotFound
						return resp, nil
					}

					return newJSONResponse(t, `{
						"matchInfo": {
							"matchId": "custom-match",
							"mapId": "/Game/Maps/Ascent/Ascent",
							"gameStartMillis": 1710000000000,
							"queueId": "",
							"gameMode": "/Game/GameModes/Bomb/BombGameMode.BombGameMode_C"
						},
						"players": [
							{
								"puuid": "player-puuid",
								"teamId": "Blue",
								"gameName": "Player",
								"tagLine": "NA1",
								"characterId": "add6443a-41bd-e414-f6ad-e58d267f4e95",
								"stats": {"score": 210, "kills": 12, "deaths": 7, "assists": 3}
							},
							{
								"puuid": "enemy-puuid",
								"teamId": "Red",
								"gameName": "Enemy",
								"tagLine": "EUW",
								"characterId": "9f0d8ba9-4140-b941-57d3-a7ad57c6b417",
								"stats": {"score": 150, "kills": 7, "deaths": 12, "assists": 2}
							}
						],
						"teams": [
							{"teamId": "Blue", "won": true, "roundsWon": 13},
							{"teamId": "Red", "won": false, "roundsWon": 11}
						]
					}`), nil
				default:
					t.Fatalf("unexpected request path %q", req.URL.Path)
					return nil, nil
				}
			}),
		},
		riotAPIKey: "test-riot-key",
	}

	previews, err := service.GetRecentMatchPreviews(context.Background(), &models.User{
		FirebaseUID:  &firebaseUID,
		RSOSubjectID: &rsoSubjectID,
	}, 10)
	if err != nil {
		t.Fatalf("GetRecentMatchPreviews returned error: %v", err)
	}

	if len(previews) != 1 {
		t.Fatalf("expected 1 preview, got %d", len(previews))
	}

	if len(requestedDetailHosts) != 1 || requestedDetailHosts[0] != "eu.api.riotgames.com" {
		t.Fatalf("expected detail fetch to reuse eu region only, got %+v", requestedDetailHosts)
	}
}

func TestGetRecentMatchPreviews_PreservesMatchlistOrderAcrossConcurrentDetailFetches(t *testing.T) {
	firebaseUID := "player-puuid"
	rsoSubjectID := "rso-subject"
	firstMatchRequested := make(chan struct{})
	allowFirstMatchResponse := make(chan struct{})

	service := &MatchService{
		httpClient: &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				switch req.URL.Path {
				case "/val/match/v1/matchlists/by-puuid/player-puuid":
					return newJSONResponse(t, `{
						"puuid": "player-puuid",
						"history": [
							{"matchId": "first-match", "queueId": "competitive"},
							{"matchId": "second-match", "queueId": "competitive"}
						]
					}`), nil
				case "/val/match/v1/matches/first-match":
					close(firstMatchRequested)
					select {
					case <-allowFirstMatchResponse:
					case <-time.After(time.Second):
						t.Fatalf("first match detail fetch was never released; requests may still be sequential")
					}

					return newJSONResponse(t, `{
						"matchInfo": {
							"matchId": "first-match",
							"mapId": "/Game/Maps/Ascent/Ascent",
							"gameStartMillis": 1710000000000,
							"queueId": "competitive",
							"gameMode": ""
						},
						"players": [
							{
								"puuid": "player-puuid",
								"teamId": "Blue",
								"gameName": "Player",
								"tagLine": "NA1",
								"characterId": "add6443a-41bd-e414-f6ad-e58d267f4e95",
								"stats": {"score": 210, "kills": 12, "deaths": 7, "assists": 3}
							},
							{
								"puuid": "enemy-one",
								"teamId": "Red",
								"gameName": "Enemy One",
								"tagLine": "EUW",
								"characterId": "9f0d8ba9-4140-b941-57d3-a7ad57c6b417",
								"stats": {"score": 150, "kills": 7, "deaths": 12, "assists": 2}
							}
						],
						"teams": [
							{"teamId": "Blue", "won": true, "roundsWon": 13},
							{"teamId": "Red", "won": false, "roundsWon": 11}
						]
					}`), nil
				case "/val/match/v1/matches/second-match":
					select {
					case <-firstMatchRequested:
					case <-time.After(time.Second):
						t.Fatalf("second match detail fetch did not overlap with first fetch")
					}
					close(allowFirstMatchResponse)

					return newJSONResponse(t, `{
						"matchInfo": {
							"matchId": "second-match",
							"mapId": "/Game/Maps/Bonsai/Bonsai",
							"gameStartMillis": 1710000001000,
							"queueId": "competitive",
							"gameMode": ""
						},
						"players": [
							{
								"puuid": "player-puuid",
								"teamId": "Blue",
								"gameName": "Player",
								"tagLine": "NA1",
								"characterId": "add6443a-41bd-e414-f6ad-e58d267f4e95",
								"stats": {"score": 240, "kills": 15, "deaths": 9, "assists": 4}
							},
							{
								"puuid": "enemy-two",
								"teamId": "Red",
								"gameName": "Enemy Two",
								"tagLine": "EUW",
								"characterId": "9f0d8ba9-4140-b941-57d3-a7ad57c6b417",
								"stats": {"score": 120, "kills": 9, "deaths": 15, "assists": 1}
							}
						],
						"teams": [
							{"teamId": "Blue", "won": false, "roundsWon": 10},
							{"teamId": "Red", "won": true, "roundsWon": 13}
						]
					}`), nil
				default:
					t.Fatalf("unexpected request path %q", req.URL.Path)
					return nil, nil
				}
			}),
		},
		riotAPIKey: "test-riot-key",
	}

	previews, err := service.GetRecentMatchPreviews(context.Background(), &models.User{
		FirebaseUID:  &firebaseUID,
		RSOSubjectID: &rsoSubjectID,
	}, 10)
	if err != nil {
		t.Fatalf("GetRecentMatchPreviews returned error: %v", err)
	}

	if len(previews) != 2 {
		t.Fatalf("expected 2 previews, got %d", len(previews))
	}

	if previews[0].MatchID != "first-match" || previews[1].MatchID != "second-match" {
		t.Fatalf("expected previews to preserve matchlist order, got %+v", previews)
	}
}

func TestGetRecentMatchPreviews_UsesCachedPreviewsOnRepeatedRequest(t *testing.T) {
	firebaseUID := "player-puuid"
	rsoSubjectID := "rso-subject"
	fixedNow := time.Unix(1_710_000_000, 0)
	var requestCount atomic.Int32

	service := &MatchService{
		httpClient: &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				requestCount.Add(1)

				switch req.URL.Path {
				case "/val/match/v1/matchlists/by-puuid/player-puuid":
					return newJSONResponse(t, `{
						"puuid": "player-puuid",
						"history": [
							{"matchId": "cached-match", "queueId": "competitive"}
						]
					}`), nil
				case "/val/match/v1/matches/cached-match":
					return newJSONResponse(t, `{
						"matchInfo": {
							"matchId": "cached-match",
							"mapId": "/Game/Maps/Ascent/Ascent",
							"gameStartMillis": 1710000000000,
							"queueId": "competitive",
							"gameMode": ""
						},
						"players": [
							{
								"puuid": "player-puuid",
								"teamId": "Blue",
								"gameName": "Player",
								"tagLine": "NA1",
								"characterId": "add6443a-41bd-e414-f6ad-e58d267f4e95",
								"stats": {"score": 210, "kills": 12, "deaths": 7, "assists": 3}
							},
							{
								"puuid": "enemy-puuid",
								"teamId": "Red",
								"gameName": "Enemy",
								"tagLine": "EUW",
								"characterId": "9f0d8ba9-4140-b941-57d3-a7ad57c6b417",
								"stats": {"score": 150, "kills": 7, "deaths": 12, "assists": 2}
							}
						],
						"teams": [
							{"teamId": "Blue", "won": true, "roundsWon": 13},
							{"teamId": "Red", "won": false, "roundsWon": 11}
						]
					}`), nil
				default:
					t.Fatalf("unexpected request path %q", req.URL.Path)
					return nil, nil
				}
			}),
		},
		riotAPIKey:        "test-riot-key",
		matchPreviewCache: make(map[string]matchPreviewCacheEntry),
		now:               func() time.Time { return fixedNow },
	}

	user := &models.User{FirebaseUID: &firebaseUID, RSOSubjectID: &rsoSubjectID}

	firstPreviews, err := service.GetRecentMatchPreviews(context.Background(), user, 10)
	if err != nil {
		t.Fatalf("first GetRecentMatchPreviews returned error: %v", err)
	}

	secondPreviews, err := service.GetRecentMatchPreviews(context.Background(), user, 10)
	if err != nil {
		t.Fatalf("second GetRecentMatchPreviews returned error: %v", err)
	}

	if requestCount.Load() != 2 {
		t.Fatalf("expected only 2 Riot requests total (matchlist + detail), got %d", requestCount.Load())
	}

	if len(firstPreviews) != 1 || len(secondPreviews) != 1 {
		t.Fatalf("expected one preview from both calls, got %d and %d", len(firstPreviews), len(secondPreviews))
	}

	if firstPreviews[0].MatchID != "cached-match" || secondPreviews[0].MatchID != "cached-match" {
		t.Fatalf("expected cached-match previews on both calls, got %+v and %+v", firstPreviews, secondPreviews)
	}
}

func TestGetMatchSummary_UsesCachedSummaryOnRepeatedRequest(t *testing.T) {
	firebaseUID := "player-puuid"
	rsoSubjectID := "rso-subject"
	fixedNow := time.Unix(1_710_000_000, 0)
	var requestCount atomic.Int32

	service := &MatchService{
		httpClient: &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				requestCount.Add(1)

				switch req.URL.Path {
				case "/val/match/v1/matches/cached-summary-match":
					return newJSONResponse(t, `{
						"matchInfo": {
							"matchId": "cached-summary-match",
							"mapId": "/Game/Maps/Ascent/Ascent",
							"gameStartMillis": 1710000000000,
							"queueId": "competitive",
							"gameMode": ""
						},
						"players": [
							{
								"puuid": "player-puuid",
								"teamId": "Blue",
								"gameName": "Player",
								"tagLine": "NA1",
								"characterId": "add6443a-41bd-e414-f6ad-e58d267f4e95"
							},
							{
								"puuid": "enemy-puuid",
								"teamId": "Red",
								"gameName": "Enemy",
								"tagLine": "EUW",
								"characterId": "9f0d8ba9-4140-b941-57d3-a7ad57c6b417"
							}
						],
						"teams": [
							{"teamId": "Blue", "won": true, "roundsWon": 1},
							{"teamId": "Red", "won": false, "roundsWon": 0}
						],
						"roundResults": [
							{
								"roundNum": 0,
								"roundResult": "Eliminated",
								"winningTeam": "Blue",
								"playerStats": [
									{
										"puuid": "player-puuid",
										"kills": [
											{
												"timeSinceGameStartMillis": 1000,
												"timeSinceRoundStartMillis": 5000,
												"killer": "player-puuid",
												"victim": "enemy-puuid",
												"assistants": [],
												"victimLocation": {"x": 1, "y": 2},
												"playerLocations": [
													{
														"puuid": "player-puuid",
														"viewRadians": 1.5,
														"location": {"x": 3, "y": 4}
													}
												],
												"finishingDamage": {
													"damageType": "Weapon",
													"damageItem": "weapon-1",
													"isSecondaryFireMode": false
												}
											}
										],
										"economy": {"loadoutValue": 3900, "remaining": 200, "spent": 3700},
										"score": 250
									},
									{
										"puuid": "enemy-puuid",
										"kills": [],
										"economy": {"loadoutValue": 3400, "remaining": 0, "spent": 3400},
										"score": 100
									}
								]
							}
						]
					}`), nil
				default:
					t.Fatalf("unexpected request path %q", req.URL.Path)
					return nil, nil
				}
			}),
		},
		riotAPIKey:        "test-riot-key",
		matchSummaryCache: make(map[string]matchSummaryCacheEntry),
		now:               func() time.Time { return fixedNow },
	}

	user := &models.User{FirebaseUID: &firebaseUID, RSOSubjectID: &rsoSubjectID}

	firstSummary, err := service.GetMatchSummary(context.Background(), user, "cached-summary-match", true)
	if err != nil {
		t.Fatalf("first GetMatchSummary returned error: %v", err)
	}

	if len(firstSummary.Players) == 0 || len(firstSummary.Rounds) == 0 || len(firstSummary.Rounds[0].EventLog) == 0 {
		t.Fatalf("expected populated summary from first request, got %+v", firstSummary)
	}

	firstSummary.QueueLabel = "Mutated"
	firstSummary.Players[0].GameName = "Mutated"
	firstSummary.Rounds[0].EventLog[0].EventType = "Mutated"
	if firstSummary.Rounds[0].EventLog[0].KillerPuuid == nil {
		t.Fatalf("expected first event killer in cached summary")
	}
	if firstSummary.Rounds[0].EventLog[0].VictimLocation == nil {
		t.Fatalf("expected first event victim location in cached summary")
	}
	if len(firstSummary.Rounds[0].EventLog[0].PlayerLocations) != 1 {
		t.Fatalf("expected one player location in cached summary, got %d", len(firstSummary.Rounds[0].EventLog[0].PlayerLocations))
	}
	*firstSummary.Rounds[0].EventLog[0].KillerPuuid = "mutated-killer"
	firstSummary.Rounds[0].EventLog[0].VictimLocation.X = 99
	firstSummary.Rounds[0].EventLog[0].PlayerLocations[0].Location.X = 123

	secondSummary, err := service.GetMatchSummary(context.Background(), user, "cached-summary-match", true)
	if err != nil {
		t.Fatalf("second GetMatchSummary returned error: %v", err)
	}

	if requestCount.Load() != 1 {
		t.Fatalf("expected only 1 Riot request total for cached summary, got %d", requestCount.Load())
	}

	if secondSummary.QueueLabel != "Competitive" {
		t.Fatalf("expected cached summary queue label to remain Competitive, got %q", secondSummary.QueueLabel)
	}

	if secondSummary.Players[0].GameName != "Player" {
		t.Fatalf("expected cached summary player name to remain Player, got %q", secondSummary.Players[0].GameName)
	}

	if secondSummary.Rounds[0].EventLog[0].EventType != "kill" {
		t.Fatalf("expected cached summary event type to remain kill, got %q", secondSummary.Rounds[0].EventLog[0].EventType)
	}

	if secondSummary.Rounds[0].EventLog[0].KillerPuuid == nil || *secondSummary.Rounds[0].EventLog[0].KillerPuuid != "player-puuid" {
		t.Fatalf("expected cached summary killer to remain player-puuid, got %+v", secondSummary.Rounds[0].EventLog[0].KillerPuuid)
	}
	if secondSummary.Rounds[0].EventLog[0].VictimLocation == nil || secondSummary.Rounds[0].EventLog[0].VictimLocation.X != 1 || secondSummary.Rounds[0].EventLog[0].VictimLocation.Y != 2 {
		t.Fatalf("expected cached summary victim location to remain {1,2}, got %+v", secondSummary.Rounds[0].EventLog[0].VictimLocation)
	}
	if len(secondSummary.Rounds[0].EventLog[0].PlayerLocations) != 1 || secondSummary.Rounds[0].EventLog[0].PlayerLocations[0].Location.X != 3 || secondSummary.Rounds[0].EventLog[0].PlayerLocations[0].Location.Y != 4 {
		t.Fatalf("expected cached summary player locations to remain unchanged, got %+v", secondSummary.Rounds[0].EventLog[0].PlayerLocations)
	}
}

func TestGetMatchSummary_SharesCachedMatchAcrossPublicAndViewerRequests(t *testing.T) {
	viewerPUUID := "viewer-puuid"
	spectatorPUUID := "spectator-puuid"
	var requestCount atomic.Int32
	fixedNow := time.Unix(1710000000, 0)

	service := &MatchService{
		httpClient: &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				requestCount.Add(1)

				switch req.URL.Path {
				case "/val/match/v1/matches/shared-summary-match":
					return newJSONResponse(t, `{
						"matchInfo": {
							"matchId": "shared-summary-match",
							"mapId": "/Game/Maps/Ascent/Ascent",
							"gameStartMillis": 1710000000000,
							"queueId": "competitive",
							"gameMode": "competitive"
						},
						"players": [
							{
								"puuid": "viewer-puuid",
								"teamId": "Blue",
								"gameName": "Viewer",
								"tagLine": "NA1",
								"characterId": "agent-1",
								"stats": {"score": 250, "kills": 10, "deaths": 7, "assists": 4}
							},
							{
								"puuid": "enemy-puuid",
								"teamId": "Red",
								"gameName": "Enemy",
								"tagLine": "EUW",
								"characterId": "agent-2",
								"stats": {"score": 100, "kills": 7, "deaths": 10, "assists": 2}
							}
						],
						"teams": [
							{"teamId": "Blue", "won": true, "roundsWon": 1},
							{"teamId": "Red", "won": false, "roundsWon": 0}
						],
						"roundResults": [
							{
								"roundNum": 0,
								"roundResult": "Elimination",
								"winningTeam": "Blue",
								"playerStats": [
									{
										"puuid": "viewer-puuid",
										"kills": [],
										"economy": {"loadoutValue": 3900, "remaining": 200, "spent": 3700},
										"score": 250
									},
									{
										"puuid": "enemy-puuid",
										"kills": [],
										"economy": {"loadoutValue": 3400, "remaining": 0, "spent": 3400},
										"score": 100
									}
								]
							}
						]
					}`), nil
				default:
					t.Fatalf("unexpected request path %q", req.URL.Path)
					return nil, nil
				}
			}),
		},
		riotAPIKey:        "test-riot-key",
		matchSummaryCache: make(map[string]matchSummaryCacheEntry),
		now:               func() time.Time { return fixedNow },
	}

	publicSummary, err := service.GetMatchSummary(context.Background(), nil, "shared-summary-match", true)
	if err != nil {
		t.Fatalf("public GetMatchSummary returned error: %v", err)
	}
	if publicSummary.Viewer != nil {
		t.Fatalf("expected public summary to omit viewer context, got %+v", publicSummary.Viewer)
	}

	viewerSummary, err := service.GetMatchSummary(context.Background(), &models.User{FirebaseUID: &viewerPUUID}, "shared-summary-match", true)
	if err != nil {
		t.Fatalf("viewer GetMatchSummary returned error: %v", err)
	}
	if viewerSummary.Viewer == nil {
		t.Fatalf("expected viewer summary to include viewer context")
	}
	if viewerSummary.Viewer.PUUID != viewerPUUID {
		t.Fatalf("expected viewer puuid %q, got %q", viewerPUUID, viewerSummary.Viewer.PUUID)
	}
	if viewerSummary.Viewer.BestRoundNumber != 1 {
		t.Fatalf("expected viewer best round 1, got %d", viewerSummary.Viewer.BestRoundNumber)
	}

	spectatorSummary, err := service.GetMatchSummary(context.Background(), &models.User{FirebaseUID: &spectatorPUUID}, "shared-summary-match", true)
	if err != nil {
		t.Fatalf("spectator GetMatchSummary returned error: %v", err)
	}
	if spectatorSummary.Viewer != nil {
		t.Fatalf("expected non-participant summary to omit viewer context, got %+v", spectatorSummary.Viewer)
	}

	if requestCount.Load() != 1 {
		t.Fatalf("expected one Riot request shared across public and viewer summaries, got %d", requestCount.Load())
	}
}

func TestBuildRoundSummariesFromRoundResultsPayload(t *testing.T) {
	payload := []byte(`{
		"matchInfo": {
			"matchId": "match-123",
			"mapId": "/Game/Maps/Test/Test",
			"gameStartMillis": 1710000000000,
			"queueId": "competitive",
			"gameMode": "competitive"
		},
		"players": [
			{"puuid": "blue-player", "teamId": "Blue", "characterId": "agent-blue"},
			{"puuid": "red-player", "teamId": "Red", "characterId": "agent-red"},
			{"puuid": "blue-assist", "teamId": "Blue", "characterId": "agent-assist"}
		],
		"teams": [
			{"teamId": "Blue", "won": true, "roundsWon": 1},
			{"teamId": "Red", "won": false, "roundsWon": 0}
		],
		"roundResults": [
			{
				"roundNum": 0,
				"roundResult": "Bomb defused",
				"roundCeremony": "CeremonyCloser",
				"winningTeam": "Blue",
				"bombPlanter": "red-player",
				"bombDefuser": "blue-player",
				"plantRoundTime": 12000,
				"plantPlayerLocations": [
					{
						"puuid": "red-player",
						"viewRadians": 2.5,
						"location": {"x": 11, "y": 22}
					}
				],
				"plantLocation": {"x": 33, "y": 44},
				"defuseRoundTime": 18000,
				"defusePlayerLocations": [
					{
						"puuid": "blue-player",
						"viewRadians": 1.25,
						"location": {"x": 55, "y": 66}
					}
				],
				"defuseLocation": {"x": 77, "y": 88},
				"playerStats": [
					{
						"puuid": "blue-player",
						"kills": [
							{
								"timeSinceGameStartMillis": 1000,
								"timeSinceRoundStartMillis": 5000,
								"killer": "blue-player",
								"victim": "red-player",
								"assistants": ["blue-assist"],
								"victimLocation": {"x": 1, "y": 2},
								"playerLocations": [
									{
										"puuid": "blue-player",
										"viewRadians": 0.5,
										"location": {"x": 3, "y": 4}
									},
									{
										"puuid": "red-player",
										"viewRadians": 1.5,
										"location": {"x": 5, "y": 6}
									}
								],
								"finishingDamage": {
									"damageType": "Weapon",
									"damageItem": "weapon-1",
									"isSecondaryFireMode": false
								}
							}
						],
						"economy": {"loadoutValue": 3900, "remaining": 200, "spent": 3700},
						"score": 250
					},
					{
						"puuid": "red-player",
						"kills": [],
						"economy": {"loadoutValue": 3400, "remaining": 0, "spent": 3400},
						"score": 100
					},
					{
						"puuid": "blue-assist",
						"kills": [],
						"economy": {"loadoutValue": 3200, "remaining": 150, "spent": 3050},
						"score": 80
					}
				]
			}
		]
	}`)

	var match riotDetailedMatchDTO
	if err := json.Unmarshal(payload, &match); err != nil {
		t.Fatalf("unmarshal detailed match: %v", err)
	}

	if len(match.Rounds) != 1 {
		t.Fatalf("expected 1 round from roundResults, got %d", len(match.Rounds))
	}

	service := &MatchService{}
	summaries := service.buildRoundSummaries(match, true)
	if len(summaries) != 1 {
		t.Fatalf("expected 1 round summary, got %d", len(summaries))
	}

	round := summaries[0]
	if round.RoundNumber != 1 {
		t.Fatalf("expected one-based round number 1, got %d", round.RoundNumber)
	}
	if round.RoundResultCode != "Defuse" {
		t.Fatalf("expected normalized round result Defuse, got %q", round.RoundResultCode)
	}
	if round.ScoreAfterRound.Blue != 1 || round.ScoreAfterRound.Red != 0 {
		t.Fatalf("unexpected score after round: %+v", round.ScoreAfterRound)
	}

	statsByPlayer := make(map[string]RoundPlayerStatsLite, len(round.PlayerStats))
	for _, stat := range round.PlayerStats {
		statsByPlayer[stat.PUUID] = stat
	}

	if got := statsByPlayer["blue-player"]; got.Kills != 1 || got.Deaths != 0 || got.Assists != 0 {
		t.Fatalf("unexpected blue-player combat line: %+v", got)
	}
	if got := statsByPlayer["red-player"]; got.Kills != 0 || got.Deaths != 1 || got.Assists != 0 {
		t.Fatalf("unexpected red-player combat line: %+v", got)
	}
	if got := statsByPlayer["blue-assist"]; got.Kills != 0 || got.Deaths != 0 || got.Assists != 1 {
		t.Fatalf("unexpected blue-assist combat line: %+v", got)
	}

	if len(round.EventLog) != 3 {
		t.Fatalf("expected 3 round events, got %d", len(round.EventLog))
	}
	if round.EventLog[0].EventType != "kill" || round.EventLog[1].EventType != "spike_planted" || round.EventLog[2].EventType != "spike_defused" {
		t.Fatalf("unexpected event ordering: %+v", round.EventLog)
	}
	if round.EventLog[0].DamageType == nil || *round.EventLog[0].DamageType != "Weapon" {
		t.Fatalf("expected kill event damageType Weapon, got %+v", round.EventLog[0].DamageType)
	}
	if round.EventLog[0].DamageItem == nil || *round.EventLog[0].DamageItem != "weapon-1" {
		t.Fatalf("expected kill event damageItem weapon-1, got %+v", round.EventLog[0].DamageItem)
	}
	if round.EventLog[0].VictimLocation == nil || round.EventLog[0].VictimLocation.X != 1 || round.EventLog[0].VictimLocation.Y != 2 {
		t.Fatalf("expected kill event victim location {1,2}, got %+v", round.EventLog[0].VictimLocation)
	}
	if len(round.EventLog[0].PlayerLocations) != 2 {
		t.Fatalf("expected kill event player locations, got %+v", round.EventLog[0].PlayerLocations)
	}
	if round.EventLog[1].PlantLocation == nil || round.EventLog[1].PlantLocation.X != 33 || round.EventLog[1].PlantLocation.Y != 44 {
		t.Fatalf("expected plant location {33,44}, got %+v", round.EventLog[1].PlantLocation)
	}
	if len(round.EventLog[1].PlantPlayerLocations) != 1 || round.EventLog[1].PlantPlayerLocations[0].Location.X != 11 || round.EventLog[1].PlantPlayerLocations[0].Location.Y != 22 {
		t.Fatalf("expected plant player locations, got %+v", round.EventLog[1].PlantPlayerLocations)
	}
	if round.EventLog[2].DefuseLocation == nil || round.EventLog[2].DefuseLocation.X != 77 || round.EventLog[2].DefuseLocation.Y != 88 {
		t.Fatalf("expected defuse location {77,88}, got %+v", round.EventLog[2].DefuseLocation)
	}
	if len(round.EventLog[2].DefusePlayerLocations) != 1 || round.EventLog[2].DefusePlayerLocations[0].Location.X != 55 || round.EventLog[2].DefusePlayerLocations[0].Location.Y != 66 {
		t.Fatalf("expected defuse player locations, got %+v", round.EventLog[2].DefusePlayerLocations)
	}

	summariesWithoutTelemetry := service.buildRoundSummaries(match, false)
	if len(summariesWithoutTelemetry) != 1 {
		t.Fatalf("expected 1 round summary without telemetry, got %d", len(summariesWithoutTelemetry))
	}
	if summariesWithoutTelemetry[0].EventLog[0].VictimLocation != nil || len(summariesWithoutTelemetry[0].EventLog[0].PlayerLocations) != 0 {
		t.Fatalf("expected kill telemetry to be omitted without replay flag, got %+v", summariesWithoutTelemetry[0].EventLog[0])
	}
	if summariesWithoutTelemetry[0].EventLog[1].PlantLocation != nil || len(summariesWithoutTelemetry[0].EventLog[1].PlantPlayerLocations) != 0 {
		t.Fatalf("expected plant telemetry to be omitted without replay flag, got %+v", summariesWithoutTelemetry[0].EventLog[1])
	}
	if summariesWithoutTelemetry[0].EventLog[2].DefuseLocation != nil || len(summariesWithoutTelemetry[0].EventLog[2].DefusePlayerLocations) != 0 {
		t.Fatalf("expected defuse telemetry to be omitted without replay flag, got %+v", summariesWithoutTelemetry[0].EventLog[2])
	}
}

func TestToMapName_HardcodedMapUrlMappings(t *testing.T) {
	tests := []struct {
		mapID    string
		expected string
	}{
		{"/Game/Maps/Ascent/Ascent", "Ascent"},
		{"/Game/Maps/Bonsai/Bonsai", "Split"},
		{"/Game/Maps/Canyon/Canyon", "Fracture"},
		{"/Game/Maps/Duality/Duality", "Bind"},
	}

	for _, test := range tests {
		if got := toMapName(test.mapID); got != test.expected {
			t.Fatalf("toMapName(%q) = %q, expected %q", test.mapID, got, test.expected)
		}
	}
}

func TestToMapName_FallbacksToInternalName(t *testing.T) {
	if got := toMapName("/Game/Maps/Unknown/Unknown_Map"); got != "Unknown Map" {
		t.Fatalf("expected fallback to internal name, got %q", got)
	}
}

func TestIsSupportedQueue(t *testing.T) {
	tests := []struct {
		name    string
		queueID string
		want    bool
	}{
		{name: "competitive queue", queueID: "competitive", want: true},
		{name: "unrated queue", queueID: "unrated", want: true},
		{name: "custom empty queue", queueID: "", want: true},
		{name: "unsupported queue", queueID: "deathmatch", want: false},
	}

	for _, test := range tests {
		if got := isSupportedQueue(test.queueID); got != test.want {
			t.Fatalf("%s: isSupportedQueue(%q) = %t, want %t", test.name, test.queueID, got, test.want)
		}
	}
}

func TestNormalizeQueueLabel(t *testing.T) {
	tests := []struct {
		name    string
		queueID string
		want    string
	}{
		{name: "competitive queue", queueID: "competitive", want: "Competitive"},
		{name: "unrated queue", queueID: "unrated", want: "Unrated"},
		{name: "custom empty queue", queueID: "", want: "Custom"},
		{name: "falls back to queue id", queueID: "swiftplay", want: "swiftplay"},
	}

	for _, test := range tests {
		if got := normalizeQueueLabel(test.queueID); got != test.want {
			t.Fatalf("%s: normalizeQueueLabel(%q) = %q, want %q", test.name, test.queueID, got, test.want)
		}
	}
}

func TestNormalizeRoundResult(t *testing.T) {
	tests := []struct {
		name   string
		result string
		want   string
	}{
		{name: "bomb defused", result: "Bomb defused", want: "Defuse"},
		{name: "round timer expired", result: "Round timer expired", want: "TimeExpired"},
		{name: "surrendered", result: "Surrendered", want: "Surrendered"},
		{name: "fallback raw result", result: "Some Future Result", want: "Some Future Result"},
	}

	for _, test := range tests {
		if got := normalizeRoundResult(test.result); got != test.want {
			t.Fatalf("%s: normalizeRoundResult(%q) = %q, want %q", test.name, test.result, got, test.want)
		}
	}
}

func TestToAgentName_KnownAgentUUIDMappings(t *testing.T) {
	tests := []struct {
		agentID  string
		expected string
	}{
		{"add6443a-41bd-e414-f6ad-e58d267f4e95", "Jett"},
		{"9f0d8ba9-4140-b941-57d3-a7ad57c6b417", "Brimstone"},
		{"601dbbe7-43ce-be57-2a40-4abd24953621", "KAY/O"},
	}

	for _, test := range tests {
		if got := toAgentName(test.agentID); got != test.expected {
			t.Fatalf("toAgentName(%q) = %q, expected %q", test.agentID, got, test.expected)
		}
	}
}

func TestToAgentName_Fallbacks(t *testing.T) {
	if got := toAgentName(""); got != "Unknown" {
		t.Fatalf("expected unknown fallback for empty UUID, got %q", got)
	}

	unknownUUID := "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
	if got := toAgentName(unknownUUID); got != unknownUUID {
		t.Fatalf("expected UUID passthrough fallback for unknown agent, got %q", got)
	}
}
