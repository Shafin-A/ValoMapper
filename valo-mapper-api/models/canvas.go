package models

type FullCanvasState struct {
	SelectedMap       MapOption        `json:"selectedMap"`
	MapSide           string           `json:"mapSide"`
	CurrentPhaseIndex int              `json:"currentPhaseIndex"`
	AgentsOnCanvas    []CanvasAgent    `json:"agentsOnCanvas"`
	AbilitiesOnCanvas []CanvasAbility  `json:"abilitiesOnCanvas"`
	DrawLines         []CanvasDrawLine `json:"drawLines"`
	TextsOnCanvas     []CanvasText     `json:"textsOnCanvas"`
	ImagesOnCanvas    []CanvasImage    `json:"imagesOnCanvas"`
	ToolIconsOnCanvas []CanvasToolIcon `json:"toolIconsOnCanvas"`
}

type MapOption struct {
	ID        string `json:"id"`
	Text      string `json:"text"`
	TextColor string `json:"textColor"`
}

type CanvasAgent struct {
	ID         string `json:"id"`
	AgentName  string `json:"name"`
	Role       string `json:"role"`
	IsAlly     bool   `json:"isAlly"`
	X          int    `json:"x"`
	Y          int    `json:"y"`
	PhaseIndex int    `json:"phaseIndex"`
}

type CanvasAbility struct {
	ID              string     `json:"id"`
	AgentName       string     `json:"name"`
	Action          string     `json:"action"`
	X               int        `json:"x"`
	Y               int        `json:"y"`
	CurrentPath     []Position `json:"currentPath,omitempty"`
	CurrentLength   float64    `json:"currentLength,omitempty"`
	CurrentRotation float64    `json:"currentRotation,omitempty"`
	PhaseIndex      int        `json:"phaseIndex"`
	IsAlly          bool       `json:"isAlly"`
}

type CanvasDrawLine struct {
	ID          string     `json:"id"`
	Tool        string     `json:"tool"`
	Points      []Position `json:"points"`
	Color       string     `json:"color"`
	Size        float64    `json:"size"`
	IsDashed    bool       `json:"isDashed"`
	IsArrowHead bool       `json:"isArrowHead"`
	PhaseIndex  int        `json:"phaseIndex"`
}

type CanvasText struct {
	ID         string  `json:"id"`
	Text       string  `json:"text"`
	X          int     `json:"x"`
	Y          int     `json:"y"`
	Width      float64 `json:"width"`
	Height     float64 `json:"height"`
	PhaseIndex int     `json:"phaseIndex"`
}

type CanvasImage struct {
	ID         string  `json:"id"`
	Src        string  `json:"src"`
	X          int     `json:"x"`
	Y          int     `json:"y"`
	Width      float64 `json:"width"`
	Height     float64 `json:"height"`
	PhaseIndex int     `json:"phaseIndex"`
}

type CanvasToolIcon struct {
	ID         string  `json:"id"`
	X          int     `json:"x"`
	Y          int     `json:"y"`
	Width      float64 `json:"width"`
	Height     float64 `json:"height"`
	PhaseIndex int     `json:"phaseIndex"`
}

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}
