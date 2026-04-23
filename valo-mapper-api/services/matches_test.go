package services

import (
	"encoding/json"
	"testing"
)

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
				"defuseRoundTime": 18000,
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
								"playerLocations": [],
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
	summaries := service.buildRoundSummaries(match)
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
