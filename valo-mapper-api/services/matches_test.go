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
