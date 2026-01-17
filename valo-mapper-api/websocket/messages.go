package websocket

import "encoding/json"

const (
	MessageTypeAgentAdded        = "agent_added"
	MessageTypeAgentMoved        = "agent_moved"
	MessageTypeAgentRemoved      = "agent_removed"
	MessageTypeAbilityAdded      = "ability_added"
	MessageTypeAbilityMoved      = "ability_moved"
	MessageTypeAbilityRemoved    = "ability_removed"
	MessageTypeLineDrawn         = "line_drawn"
	MessageTypeLineRemoved       = "line_removed"
	MessageTypeConnLineAdded     = "connecting_line_added"
	MessageTypeConnLineRemoved   = "connecting_line_removed"
	MessageTypeConnLineUpdated   = "connecting_line_updated"
	MessageTypeTextAdded         = "text_added"
	MessageTypeTextUpdated       = "text_updated"
	MessageTypeTextRemoved       = "text_removed"
	MessageTypeImageAdded        = "image_added"
	MessageTypeImageMoved        = "image_moved"
	MessageTypeImageRemoved      = "image_removed"
	MessageTypeImageSyncRequired = "image_sync_required"
	MessageTypeToolIconAdded     = "tool_icon_added"
	MessageTypeToolIconMoved     = "tool_icon_moved"
	MessageTypeToolIconRemoved   = "tool_icon_removed"

	MessageTypeMapChanged   = "map_changed"
	MessageTypeSideChanged  = "side_changed"
	MessageTypePhaseChanged = "phase_changed"
	MessageTypeFullSync     = "full_sync"

	MessageTypeUserJoined = "user_joined"
	MessageTypeUserLeft   = "user_left"
	MessageTypeUserList   = "user_list"
	MessageTypeCursorMove = "cursor_move"
	MessageTypeUserTyping = "user_typing"

	MessageTypeBatchUpdate = "batch_update"
)

type Message struct {
	Type       string         `json:"type"`
	PhaseIndex int            `json:"phaseIndex,omitempty"`
	Data       map[string]any `json:"data"`
	Timestamp  int64          `json:"timestamp,omitempty"`
}

type UserPresence struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Color    string `json:"color"`
}

func ParseMessage(data []byte) (*Message, error) {
	var msg Message
	if err := json.Unmarshal(data, &msg); err != nil {
		return nil, err
	}
	return &msg, nil
}

func (m *Message) Marshal() ([]byte, error) {
	return json.Marshal(m)
}

type BatchMessage struct {
	Type       string    `json:"type"`
	PhaseIndex int       `json:"phaseIndex,omitempty"`
	Operations []Message `json:"operations"`
	Timestamp  int64     `json:"timestamp,omitempty"`
}
