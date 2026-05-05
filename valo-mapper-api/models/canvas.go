package models

type FullCanvasState struct {
	SelectedMap       MapOption     `json:"selectedMap"`
	MapSide           string        `json:"mapSide"`
	CurrentPhaseIndex int           `json:"currentPhaseIndex"`
	EditedPhases      []int         `json:"editedPhases"`
	Phases            []PhaseState  `json:"phases"`
	AgentsSettings    *IconSettings `json:"agentsSettings,omitempty"`
	AbilitiesSettings *IconSettings `json:"abilitiesSettings,omitempty"`
}

type PhaseState struct {
	AgentsOnCanvas    []CanvasAgent          `json:"agentsOnCanvas"`
	AbilitiesOnCanvas []CanvasAbility        `json:"abilitiesOnCanvas"`
	DrawLines         []CanvasDrawLine       `json:"drawLines"`
	ConnectingLines   []CanvasConnectingLine `json:"connectingLines"`
	TextsOnCanvas     []CanvasText           `json:"textsOnCanvas"`
	ImagesOnCanvas    []CanvasImage          `json:"imagesOnCanvas"`
	ToolIconsOnCanvas []CanvasToolIcon       `json:"toolIconsOnCanvas"`
}

type MapOption struct {
	ID        string `json:"id"`
	Text      string `json:"text"`
	TextColor string `json:"textColor"`
}

type IconSettings struct {
	Scale         int     `json:"scale"`
	BorderOpacity float64 `json:"borderOpacity"`
	BorderWidth   int     `json:"borderWidth"`
	Radius        int     `json:"radius"`
	AllyColor     string  `json:"allyColor"`
	EnemyColor    string  `json:"enemyColor"`
}

type CanvasAgent struct {
	ID        string  `json:"id"`
	AgentName string  `json:"name"`
	Role      string  `json:"role"`
	IsAlly    bool    `json:"isAlly"`
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
}

var agentRoleByName = map[string]string{
	"Astra":     "Controller",
	"Breach":    "Initiator",
	"Brimstone": "Controller",
	"Chamber":   "Sentinel",
	"Clove":     "Controller",
	"Cypher":    "Sentinel",
	"Deadlock":  "Sentinel",
	"Fade":      "Initiator",
	"Gekko":     "Initiator",
	"Harbor":    "Controller",
	"Iso":       "Duelist",
	"Jett":      "Duelist",
	"KAY/O":     "Initiator",
	"Killjoy":   "Sentinel",
	"Miks":      "Controller",
	"Neon":      "Duelist",
	"Omen":      "Controller",
	"Phoenix":   "Duelist",
	"Raze":      "Duelist",
	"Reyna":     "Duelist",
	"Sage":      "Sentinel",
	"Skye":      "Initiator",
	"Sova":      "Initiator",
	"Tejo":      "Initiator",
	"Veto":      "Sentinel",
	"Viper":     "Controller",
	"Vyse":      "Sentinel",
	"Waylay":    "Duelist",
	"Yoru":      "Duelist",
}

type CanvasAbility struct {
	ID              string     `json:"id"`
	AgentName       string     `json:"name"`
	Action          string     `json:"action"`
	X               float64    `json:"x"`
	Y               float64    `json:"y"`
	AttachedToID    string     `json:"attachedToId,omitempty"`
	CurrentPath     []Position `json:"currentPath,omitempty"`
	CurrentLength   float64    `json:"currentLength,omitempty"`
	CurrentRotation float64    `json:"currentRotation,omitempty"`
	IsAlly          bool       `json:"isAlly"`
	IconOnly        bool       `json:"iconOnly"`
	ShowOuterCircle bool       `json:"showOuterCircle"`
}

type CanvasDrawLine struct {
	ID          string     `json:"id"`
	Tool        string     `json:"tool"`
	Points      []Position `json:"points"`
	Color       string     `json:"color"`
	Size        float64    `json:"size"`
	IsDashed    bool       `json:"isDashed"`
	IsArrowHead bool       `json:"isArrowHead"`
	Shape       string     `json:"shape,omitempty"`
	Opacity     float64    `json:"opacity,omitempty"`
}

type CanvasConnectingLine struct {
	ID             string   `json:"id"`
	FromID         string   `json:"fromId"`
	ToID           string   `json:"toId"`
	StrokeColor    string   `json:"strokeColor"`
	StrokeWidth    float64  `json:"strokeWidth"`
	UploadedImages []string `json:"uploadedImages,omitempty"`
	YoutubeLink    string   `json:"youtubeLink,omitempty"`
	Notes          string   `json:"notes,omitempty"`
}

type CanvasText struct {
	ID     string  `json:"id"`
	Text   string  `json:"text"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
}

type CanvasImage struct {
	ID     string  `json:"id"`
	Src    string  `json:"src"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
}

type CanvasToolIcon struct {
	ID     string  `json:"id"`
	Name   string  `json:"name"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
}

type CanvasPatchEntry struct {
	Entity     string         `json:"entity"`
	Action     string         `json:"action"`
	PhaseIndex int            `json:"phaseIndex"`
	ID         string         `json:"id,omitempty"`
	Payload    map[string]any `json:"payload,omitempty"`
}

type CanvasPatch struct {
	Entries []CanvasPatchEntry `json:"entries"`
}

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}
