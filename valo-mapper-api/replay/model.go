// Package replay turns a VRFKit Parquet export into the ReplayMatch JSON the
// browser player consumes. It owns no HTTP and never exposes Parquet or VRFKit
// details to the client.
package replay

// ParserVersion is part of the cache key, the X-Parser-Version response header
// and the parse log. Bump the leading number whenever the normalised output can
// change, even if VRFKit itself did not change.
const ParserVersion = "4+vrfkit.0.3.0"

// Match mirrors ReplayMatch in the frontend. Field names and JSON tags are the
// wire contract; do not rename them without a frontend change.
type Match struct {
	MatchID     string   `json:"matchId"`
	MapID       string   `json:"mapId"`
	MapName     string   `json:"mapName"`
	QueueLabel  string   `json:"queueLabel"`
	GameStartAt string   `json:"gameStartAt"`
	Viewer      *Viewer  `json:"viewer"`
	TotalRounds int      `json:"totalRounds"`
	Players     []Player `json:"players"`
	Rounds      []Round  `json:"rounds"`

	Build      string   `json:"build,omitempty"`
	DurationMS uint32   `json:"durationMs,omitempty"`
	Warnings   []string `json:"warnings,omitempty"`
}

type Viewer struct {
	Puuid           string `json:"puuid"`
	BestRoundNumber int    `json:"bestRoundNumber"`
}

type Player struct {
	Puuid         string `json:"puuid"`
	GameName      string `json:"gameName"`
	TagLine       string `json:"tagLine"`
	TeamID        string `json:"teamId"`
	CharacterID   string `json:"characterId"`
	CharacterName string `json:"characterName"`
}

type Round struct {
	RoundNumber     int           `json:"roundNumber"`
	WinningTeam     string        `json:"winningTeam"`
	RoundResultCode string        `json:"roundResultCode"`
	ScoreAfterRound Score         `json:"scoreAfterRound"`
	PlayerStats     []PlayerStats `json:"playerStats"`
	EventLog        []Event       `json:"eventLog"`

	AttackTeamID string  `json:"attackTeamId"`
	DurationMS   int     `json:"durationMs"`
	Frames       []Frame `json:"frames"`

	// BuyEndTimeMS is round-relative (the barrier drop). The player starts its
	// clock here instead of at the round's phase-3 start.
	BuyEndTimeMS *int `json:"buyEndTimeMs,omitempty"`
}

type Score struct {
	Red  int `json:"red"`
	Blue int `json:"blue"`
}

type PlayerStats struct {
	Puuid   string  `json:"puuid"`
	Score   int     `json:"score"`
	Kills   int     `json:"kills"`
	Deaths  int     `json:"deaths"`
	Assists int     `json:"assists"`
	Economy Economy `json:"economy"`

	IncomingDamage int            `json:"incomingDamage"`
	AbilityCasts   map[string]int `json:"abilityCasts"`
	WeaponID       string         `json:"weaponId,omitempty"`
	ArmorID        string         `json:"armorId,omitempty"`
}

type Economy struct {
	LoadoutValue int `json:"loadoutValue"`
	Remaining    int `json:"remaining"`
}

// Event is the union of the existing RoundEventLogEntry variants. EventType
// selects which fields are present; empty optional fields are omitted.
type Event struct {
	EventType                 string    `json:"eventType"`
	TimeSinceRoundStartMillis int       `json:"timeSinceRoundStartMillis"`
	KillerPuuid               string    `json:"killerPuuid,omitempty"`
	VictimPuuid               string    `json:"victimPuuid,omitempty"`
	DamageType                string    `json:"damageType,omitempty"`
	DamageItem                string    `json:"damageItem,omitempty"`
	PlanterPuuid              string    `json:"planterPuuid,omitempty"`
	PlantLocation             *Position `json:"plantLocation,omitempty"`
	DefuserPuuid              string    `json:"defuserPuuid,omitempty"`
	DefuseLocation            *Position `json:"defuseLocation,omitempty"`
}

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type Frame struct {
	TimeMS  int           `json:"timeMs"`
	Players []FramePlayer `json:"players"`
	Spike   *SpikeFrame   `json:"spike"`
}

type FramePlayer struct {
	Puuid       string  `json:"puuid"`
	X           float64 `json:"x"`
	Y           float64 `json:"y"`
	ViewRadians float64 `json:"viewRadians"`
	HP          int     `json:"hp"`
	Credits     int     `json:"credits"`
	WeaponID    string  `json:"weaponId,omitempty"`
	ArmorID     string  `json:"armorId,omitempty"`
	ArmorPoints *int    `json:"armorPoints,omitempty"`
	Alive       bool    `json:"alive"`
}

type SpikeFrame struct {
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	State string  `json:"state"`
}

// Envelope is the POST/GET /api/replays response body.
type Envelope struct {
	ReplayID string   `json:"replayId"`
	Match    *Match   `json:"match"`
	Warnings []string `json:"warnings,omitempty"`
}
