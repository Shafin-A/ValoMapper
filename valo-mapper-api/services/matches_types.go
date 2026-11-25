package services

import (
	"time"
)

type matchSummaryCacheEntry struct {
	summary   *MatchSummaryResponse
	expiresAt time.Time
}

type MatchPreview struct {
	MatchID       string `json:"matchId"`
	PlayedAt      int64  `json:"playedAt"`
	QueueLabel    string `json:"queueLabel"`
	MapID         string `json:"mapId"`
	MapName       string `json:"mapName"`
	AgentID       string `json:"agentId"`
	AgentName     string `json:"agentName"`
	Result        string `json:"result"`
	TeamScore     int    `json:"teamScore"`
	EnemyScore    int    `json:"enemyScore"`
	Kills         int    `json:"kills"`
	Deaths        int    `json:"deaths"`
	Assists       int    `json:"assists"`
	PersonalScore int    `json:"personalScore"`
}

type MatchPreviewPage struct {
	Matches    []MatchPreview         `json:"matches"`
	Pagination MatchPreviewPagination `json:"pagination"`
}

type MatchPreviewPagination struct {
	Start     int  `json:"start"`
	Limit     int  `json:"limit"`
	Total     int  `json:"total"`
	HasMore   bool `json:"hasMore"`
	NextStart *int `json:"nextStart,omitempty"`
}

type MatchSummaryResponse struct {
	MatchID     string               `json:"matchId"`
	MapID       string               `json:"mapId"`
	MapName     string               `json:"mapName"`
	QueueLabel  string               `json:"queueLabel"`
	GameStartAt string               `json:"gameStartAt"`
	Viewer      *ViewerContext       `json:"viewer"`
	TotalRounds int                  `json:"totalRounds"`
	Players     []MatchPlayerSummary `json:"players"`
	Rounds      []RoundSummaryLite   `json:"rounds"`
}

type ViewerContext struct {
	PUUID           string `json:"puuid"`
	BestRoundNumber int    `json:"bestRoundNumber"`
}

type MatchPlayerSummary struct {
	PUUID         string `json:"puuid"`
	GameName      string `json:"gameName"`
	TagLine       string `json:"tagLine"`
	TeamID        string `json:"teamId"`
	CharacterID   string `json:"characterId"`
	CharacterName string `json:"characterName"`
}

type RoundSummaryLite struct {
	RoundNumber     int                    `json:"roundNumber"`
	WinningTeam     string                 `json:"winningTeam"`
	RoundResultCode string                 `json:"roundResultCode"`
	ScoreAfterRound ScoreAfterRound        `json:"scoreAfterRound"`
	PlayerStats     []RoundPlayerStatsLite `json:"playerStats"`
	EventLog        []RoundEventLogEntry   `json:"eventLog"`
}

type ScoreAfterRound struct {
	Red  int `json:"red"`
	Blue int `json:"blue"`
}

type RoundPlayerStatsLite struct {
	PUUID   string      `json:"puuid"`
	Score   int         `json:"score"`
	Kills   int         `json:"kills"`
	Deaths  int         `json:"deaths"`
	Assists int         `json:"assists"`
	Economy EconomyInfo `json:"economy"`
}

type EconomyInfo struct {
	LoadoutValue int `json:"loadoutValue"`
	Remaining    int `json:"remaining"`
}

type MatchWorldPosition struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type MatchPlayerLocation struct {
	PUUID       string             `json:"puuid"`
	ViewRadians float64            `json:"viewRadians"`
	Location    MatchWorldPosition `json:"location"`
}

type RoundEventLogEntry struct {
	EventType                 string                `json:"eventType"`
	TimeSinceRoundStartMillis int                   `json:"timeSinceRoundStartMillis"`
	KillerPuuid               *string               `json:"killerPuuid,omitempty"`
	VictimPuuid               *string               `json:"victimPuuid,omitempty"`
	DamageType                *string               `json:"damageType,omitempty"`
	DamageItem                *string               `json:"damageItem,omitempty"`
	PlanterPuuid              *string               `json:"planterPuuid,omitempty"`
	DefuserPuuid              *string               `json:"defuserPuuid,omitempty"`
	VictimLocation            *MatchWorldPosition   `json:"victimLocation,omitempty"`
	PlayerLocations           []MatchPlayerLocation `json:"playerLocations,omitempty"`
	PlantLocation             *MatchWorldPosition   `json:"plantLocation,omitempty"`
	PlantPlayerLocations      []MatchPlayerLocation `json:"plantPlayerLocations,omitempty"`
	DefuseLocation            *MatchWorldPosition   `json:"defuseLocation,omitempty"`
	DefusePlayerLocations     []MatchPlayerLocation `json:"defusePlayerLocations,omitempty"`
}

type riotMatchlistResponse struct {
	PUUID   string                  `json:"puuid"`
	History []riotMatchlistEntryDTO `json:"history"`
}

type riotMatchlistEntryDTO struct {
	MatchID             string `json:"matchId"`
	GameStartTimeMillis int64  `json:"gameStartTimeMillis"`
	QueueID             string `json:"queueId"`
}

type riotMatchDTO struct {
	MatchInfo riotMatchInfoDTO `json:"matchInfo"`
	Players   []riotPlayerDTO  `json:"players"`
	Teams     []riotTeamDTO    `json:"teams"`
}

type riotMatchInfoDTO struct {
	MatchID         string `json:"matchId"`
	MapID           string `json:"mapId"`
	GameStartMillis int64  `json:"gameStartMillis"`
	QueueID         string `json:"queueId"`
	GameMode        string `json:"gameMode"`
}

type riotPlayerDTO struct {
	PUUID       string             `json:"puuid"`
	TeamID      string             `json:"teamId"`
	GameName    string             `json:"gameName"`
	TagLine     string             `json:"tagLine"`
	Stats       riotPlayerStatsDTO `json:"stats"`
	CharacterID string             `json:"characterId"`
}

type riotPlayerStatsDTO struct {
	Score   int `json:"score"`
	Kills   int `json:"kills"`
	Deaths  int `json:"deaths"`
	Assists int `json:"assists"`
}

type riotTeamDTO struct {
	TeamID    string `json:"teamId"`
	Won       bool   `json:"won"`
	RoundsWon int    `json:"roundsWon"`
}

type riotDetailedMatchDTO struct {
	MatchInfo riotMatchInfoDTO `json:"matchInfo"`
	Players   []riotPlayerDTO  `json:"players"`
	Teams     []riotTeamDTO    `json:"teams"`
	Rounds    []riotRoundDTO   `json:"roundResults"`
}

type riotRoundDTO struct {
	RoundNum              int                    `json:"roundNum"`
	RoundResult           string                 `json:"roundResult"`
	WinningTeam           string                 `json:"winningTeam"`
	BombPlanter           *string                `json:"bombPlanter"`
	BombDefuser           *string                `json:"bombDefuser"`
	PlantRoundTime        int                    `json:"plantRoundTime"`
	PlantPlayerLocations  []riotPlayerLocation   `json:"plantPlayerLocations"`
	PlantLocation         *riotWorldPosition     `json:"plantLocation"`
	DefuseRoundTime       int                    `json:"defuseRoundTime"`
	DefusePlayerLocations []riotPlayerLocation   `json:"defusePlayerLocations"`
	DefuseLocation        *riotWorldPosition     `json:"defuseLocation"`
	PlayersStats          []riotRoundPlayerStats `json:"playerStats"`
}

type riotRoundPlayerStats struct {
	PUUID        string           `json:"puuid"`
	Kills        []riotKillEvent  `json:"kills"`
	EconomyState riotEconomyState `json:"economy"`
	Score        int              `json:"score"`
}

type riotKillEvent struct {
	TimeSinceGameStartMillis  int                  `json:"timeSinceGameStartMillis"`
	TimeSinceRoundStartMillis int                  `json:"timeSinceRoundStartMillis"`
	Killer                    string               `json:"killer"`
	Victim                    string               `json:"victim"`
	Assistants                []string             `json:"assistants"`
	VictimLocation            *riotWorldPosition   `json:"victimLocation"`
	PlayerLocations           []riotPlayerLocation `json:"playerLocations"`
	FinishingDamage           riotFinishingDamage  `json:"finishingDamage"`
}

type riotWorldPosition struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type riotPlayerLocation struct {
	PUUID       string            `json:"puuid"`
	ViewRadians float64           `json:"viewRadians"`
	Location    riotWorldPosition `json:"location"`
}

type riotFinishingDamage struct {
	DamageType          string `json:"damageType"`
	DamageItem          string `json:"damageItem"`
	IsSecondaryFireMode bool   `json:"isSecondaryFireMode"`
}

type riotEconomyState struct {
	LoadoutValue int `json:"loadoutValue"`
	Remaining    int `json:"remaining"`
	Spent        int `json:"spent"`
}

type roundCombatCounts struct {
	Kills   int
	Deaths  int
	Assists int
}

type matchPreviewFetchResult struct {
	preview MatchPreview
	ok      bool
}

type matchPreviewCacheEntry struct {
	page      *MatchPreviewPage
	expiresAt time.Time
}
