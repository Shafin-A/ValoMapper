package replay

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"valo-mapper-api/valorant"
)

// Manifest mirrors the subset of vrfkit's manifest.json the normaliser keeps.
// Large members such as net_field_export_groups are deliberately not declared
// so they are never decoded into memory.
type Manifest struct {
	ReplayBuild        string             `json:"replay_build"`
	ReplayVersion      string             `json:"replay_version"`
	DurationMS         uint32             `json:"duration_ms"`
	TimestampTicks     uint64             `json:"timestamp_ticks"`
	GUID               [4]uint32          `json:"guid"`
	LevelNamesAndTimes []LevelNameAndTime `json:"level_names_and_times"`
	GameSpecificData   []string           `json:"game_specific_data"`
	Players            []ManifestPlayer   `json:"players"`
	Quality            ManifestQuality    `json:"quality"`
}

type LevelNameAndTime struct {
	Name   string `json:"name"`
	TimeMS uint32 `json:"time_ms"`
}

type ManifestPlayer struct {
	ActorNetGUID      uint32   `json:"actor_net_guid"`
	Subject           string   `json:"subject"`
	CharacterNetGUID  *uint32  `json:"character_net_guid"`
	CharacterNetGUIDs []uint32 `json:"character_net_guids"`
}

// ManifestQuality is vrfkit's completeness accounting.
type ManifestQuality struct {
	ContentBlocksLost     uint64 `json:"content_blocks_lost"`
	MovementRows          uint64 `json:"movement_rows"`
	EventRows             uint64 `json:"event_rows"`
	EventLayoutMismatches uint64 `json:"event_layout_mismatches"`
	EventPayloadUnknown   uint64 `json:"event_payload_unknown_groups"`
}

// levelPath returns the first level asset path, if any.
func (m *Manifest) levelPath() string {
	if len(m.LevelNamesAndTimes) == 0 {
		return ""
	}
	return m.LevelNamesAndTimes[0].Name
}

// readManifest loads manifest.json from an export directory.
func readManifest(dir string) (*Manifest, error) {
	data, err := os.ReadFile(filepath.Join(dir, "manifest.json"))
	if err != nil {
		return nil, err
	}

	var m Manifest
	if err := json.Unmarshal(data, &m); err != nil {
		return nil, fmt.Errorf("decode manifest: %w", err)
	}
	return &m, nil
}

// loadoutAgents returns subject -> lower-case agent UUID from the
// game_specific_data playerLoadouts document. Both the observed array shape
// and a subject-keyed object are accepted; anything else is a warning, never a
// guess.
func loadoutAgents(gameSpecificData []string) (map[string]string, []string) {
	agents := make(map[string]string)
	var warnings []string
	foundDocument := false

	for _, raw := range gameSpecificData {
		if !strings.Contains(raw, "playerLoadouts") && !strings.Contains(raw, "characterId") {
			continue
		}
		foundDocument = true
		parsed, warning := decodeLoadoutDocument([]byte(raw))
		if warning != "" {
			warnings = append(warnings, warning)
		}
		for subject, characterID := range parsed {
			agents[normaliseUUID(subject)] = normaliseUUID(characterID)
		}
	}

	if !foundDocument {
		warnings = append(warnings, "No playerLoadouts document was found; agent names are unavailable.")
	}

	return agents, warnings
}

func decodeLoadoutDocument(raw []byte) (map[string]string, string) {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" {
		return nil, ""
	}

	// Some builds put the loadout object directly in game_specific_data.
	if strings.HasPrefix(trimmed, "[") {
		out, err := decodeLoadoutArray([]byte(trimmed))
		if err != nil {
			return nil, "The playerLoadouts array could not be decoded; agent names are unavailable."
		}
		return out, ""
	}

	var envelope struct {
		PlayerLoadouts json.RawMessage `json:"playerLoadouts"`
	}
	if err := json.Unmarshal([]byte(trimmed), &envelope); err == nil && len(envelope.PlayerLoadouts) > 0 {
		return decodeLoadoutValue(envelope.PlayerLoadouts)
	}

	// Fall back to a subject-keyed object: {"<subject>": {"characterId": "..."}}
	var object map[string]json.RawMessage
	if err := json.Unmarshal([]byte(trimmed), &object); err != nil {
		return nil, ""
	}
	out := make(map[string]string)
	for subject, value := range object {
		var entry struct {
			CharacterID string `json:"characterId"`
		}
		if err := json.Unmarshal(value, &entry); err == nil && entry.CharacterID != "" {
			out[subject] = entry.CharacterID
		}
	}
	if len(out) == 0 {
		return nil, ""
	}
	return out, ""
}

func decodeLoadoutValue(raw json.RawMessage) (map[string]string, string) {
	trimmed := strings.TrimSpace(string(raw))
	if strings.HasPrefix(trimmed, "[") {
		out, err := decodeLoadoutArray([]byte(trimmed))
		if err != nil {
			return nil, "The playerLoadouts array could not be decoded; agent names are unavailable."
		}
		return out, ""
	}

	var object map[string]struct {
		CharacterID string `json:"characterId"`
	}
	if err := json.Unmarshal([]byte(trimmed), &object); err != nil {
		return nil, "The playerLoadouts object could not be decoded; agent names are unavailable."
	}
	out := make(map[string]string, len(object))
	for subject, entry := range object {
		if entry.CharacterID != "" {
			out[subject] = entry.CharacterID
		}
	}
	return out, ""
}

func decodeLoadoutArray(raw []byte) (map[string]string, error) {
	var entries []struct {
		Subject     string `json:"subject"`
		CharacterID string `json:"characterId"`
	}
	if err := json.Unmarshal(raw, &entries); err != nil {
		return nil, err
	}
	out := make(map[string]string, len(entries))
	for _, entry := range entries {
		if entry.Subject != "" && entry.CharacterID != "" {
			out[entry.Subject] = entry.CharacterID
		}
	}
	return out, nil
}

func normaliseUUID(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

// agentName resolves a loadout UUID, returning "Unknown" plus a warning when
// the UUID is absent from the table.
func agentName(characterID string) (string, bool) {
	if name, ok := valorant.AgentName(characterID); ok {
		return name, true
	}
	return "Unknown", false
}
