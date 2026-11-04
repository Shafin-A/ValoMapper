// Package replay turns a VRFKit Parquet export into the ReplayMatch JSON the
// browser player consumes. It owns no HTTP and never exposes Parquet or VRFKit
// details to the client.
package replay

// ParserVersion is part of the cache key, the X-Parser-Version response header
// and the parse log. Bump the leading number whenever the normalised output can
// change, even if VRFKit itself did not change.
const ParserVersion = "45+vrfkit.0.4.0"

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

	Build           string           `json:"build,omitempty"`
	DurationMS      uint32           `json:"durationMs,omitempty"`
	Warnings        []string         `json:"warnings,omitempty"`
	UtilityWarnings *UtilityWarnings `json:"utilityWarnings,omitempty"`
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

	AttackTeamID string    `json:"attackTeamId"`
	DurationMS   int       `json:"durationMs"`
	Frames       []Frame   `json:"frames"`
	Hits         []Hit     `json:"hits,omitempty"`
	Utilities    []Utility `json:"utilities,omitempty"`

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

type UtilityKind string

const (
	UtilitySmoke  UtilityKind = "smoke"
	UtilityWall   UtilityKind = "wall"
	UtilityMolly  UtilityKind = "molly"
	UtilityTrap   UtilityKind = "trap"
	UtilityMobile UtilityKind = "mobile"
	UtilityArea   UtilityKind = "area"
	UtilityMarker UtilityKind = "marker"
)

type Utility struct {
	ID          string      `json:"id"`
	Kind        UtilityKind `json:"kind"`
	AbilityID   string      `json:"abilityId,omitempty"`
	StartTimeMS int         `json:"startTimeMs"`
	EndTimeMS   int         `json:"endTimeMs"`
	Position    Position    `json:"position"`
	Yaw         float64     `json:"yaw"`
	Length      float64     `json:"length,omitempty"`
	IconOnly    bool        `json:"iconOnly,omitempty"`
	// Inactive marks a reusable utility that is placed but not switched on.
	// The client renders it at reduced opacity.
	Inactive      bool                    `json:"inactive,omitempty"`
	OwnerPuuid    string                  `json:"ownerPuuid,omitempty"`
	Samples       []UtilityPositionSample `json:"samples,omitempty"`
	Path          []UtilityPositionSample `json:"path,omitempty"`
	Vision        []UtilityVisionSample   `json:"vision,omitempty"`
	LengthSamples []UtilityLengthSample   `json:"lengthSamples,omitempty"`
	// StopFraction limits a moving utility to part of its full path, for
	// example when Harbor's Reckoning is stopped before its final endpoint.
	StopFraction *float64 `json:"stopFraction,omitempty"`
}

type UtilityPositionSample struct {
	TimeMS int     `json:"timeMs"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
}

type UtilityLengthSample struct {
	TimeMS int     `json:"timeMs"`
	Length float64 `json:"length"`
}

type UtilityVisionSample struct {
	TimeMS int     `json:"timeMs"`
	Yaw    float64 `json:"yaw"`
	Active bool    `json:"active"`
}

// UtilityWarnings are bounded per-replay counts; they never contain NetGUIDs
// or raw actor class paths.
type UtilityWarnings struct {
	UnknownActors      int `json:"unknownActors,omitempty"`
	InvalidActors      int `json:"invalidActors,omitempty"`
	MissingPositions   int `json:"missingPositions,omitempty"`
	MissingCloses      int `json:"missingCloses,omitempty"`
	UnresolvedOwners   int `json:"unresolvedOwners,omitempty"`
	MissingMovement    int `json:"missingMovement,omitempty"`
	TruncatedUtilities int `json:"truncatedUtilities,omitempty"`
	TruncatedSamples   int `json:"truncatedSamples,omitempty"`
	TruncatedPaths     int `json:"truncatedPaths,omitempty"`
	UnsupportedBuild   int `json:"unsupportedBuild,omitempty"`
}

// Hit is a gun damage event. The player draws a tracer from the shooter to the
// victim just before TimeMS so the hit does not appear from nowhere.
type Hit struct {
	TimeMS       int    `json:"timeMs"`
	ShooterPuuid string `json:"shooterPuuid"`
	VictimPuuid  string `json:"victimPuuid"`
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
	X            float64 `json:"x"`
	Y            float64 `json:"y"`
	State        string  `json:"state"`
	Site         string  `json:"site,omitempty"`
	CarrierPuuid string  `json:"carrierPuuid,omitempty"`
}

// Envelope is the POST/GET /api/replays response body.
type Envelope struct {
	ReplayID string   `json:"replayId"`
	Match    *Match   `json:"match"`
	Warnings []string `json:"warnings,omitempty"`
}
