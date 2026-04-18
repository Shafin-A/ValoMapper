package services

import "testing"

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
