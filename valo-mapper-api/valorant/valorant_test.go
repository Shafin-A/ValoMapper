package valorant

import "testing"

func TestResolveMap(t *testing.T) {
	tests := []struct {
		path string
		id   string
		name string
		ok   bool
	}{
		{"/Game/Maps/Ascent/Ascent", "ascent", "Ascent", true},
		{"/Game/Maps/Bonsai/Bonsai", "split", "Split", true},
		{"/Game/Maps/Jam/Jam", "lotus", "Lotus", true},
		{"Duality", "bind", "Bind", true},
		{"/Game/Maps/Unknown/Unknown", "", "", false},
		{"", "", "", false},
	}

	for _, test := range tests {
		info, ok := ResolveMap(test.path)
		if ok != test.ok {
			t.Errorf("ResolveMap(%q) ok = %v, want %v", test.path, ok, test.ok)
			continue
		}
		if info.ID != test.id || info.Name != test.name {
			t.Errorf("ResolveMap(%q) = %+v", test.path, info)
		}
	}
}

func TestParseBuild(t *testing.T) {
	build, ok := ParseBuild("++Ares-Core+release-13.08")
	if !ok || build != "13.08" {
		t.Fatalf("ParseBuild = %q/%v", build, ok)
	}
	if _, ok := ParseBuild("no release here"); ok {
		t.Fatal("ParseBuild accepted an unknown branch")
	}
	if !IsSupportedBuild("13.08") {
		t.Error("13.08 should be supported")
	}
	if IsSupportedBuild("13.99") {
		t.Error("13.99 should not be supported")
	}
}

func TestAgentName(t *testing.T) {
	name, ok := AgentName("ADD6443A-41BD-E414-F6AD-E58D267F4E95")
	if !ok || name != "Jett" {
		t.Fatalf("AgentName = %q/%v", name, ok)
	}
	if _, ok := AgentName("not-a-uuid"); ok {
		t.Fatal("AgentName accepted an unknown UUID")
	}
}
