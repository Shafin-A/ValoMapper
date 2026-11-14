package models

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCanvasPatchEntryDecodesEntityPayloadAsRaw(t *testing.T) {
	var entry CanvasPatchEntry
	err := json.Unmarshal([]byte(`{
		"entity": "agent",
		"action": "upsert",
		"phaseIndex": 0,
		"id": "a1",
		"payload": {"id": "a1", "name": "Jett", "x": 10, "y": 20}
	}`), &entry)
	require.NoError(t, err)

	assert.NotEmpty(t, entry.RawPayload)
	assert.Nil(t, entry.Payload)

	agent, err := decodePatchPayload[CanvasAgent](entry)
	require.NoError(t, err)
	assert.Equal(t, "a1", agent.ID)
	assert.Equal(t, "Jett", agent.AgentName)
	assert.Equal(t, 10.0, agent.X)
}

func TestCanvasPatchEntryDecodesMetaPayloadAsMap(t *testing.T) {
	var entry CanvasPatchEntry
	err := json.Unmarshal([]byte(`{
		"entity": "side",
		"action": "set",
		"phaseIndex": 0,
		"payload": {"mapSide": "attack"}
	}`), &entry)
	require.NoError(t, err)

	assert.Equal(t, "attack", entry.Payload["mapSide"])
	assert.Empty(t, entry.RawPayload)
}

func TestDedupeRows(t *testing.T) {
	rows := [][]any{
		{"id-1", "lobby", 0},
		{"id-1", "lobby", 0},
		{"id-2", "lobby", 0},
	}

	filtered := dedupeRows(rows, []int{0, 1, 2})

	require.Len(t, filtered, 2)
	assert.Equal(t, "id-1", filtered[0][0])
	assert.Equal(t, "id-2", filtered[1][0])
}
