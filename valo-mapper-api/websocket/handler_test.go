package websocket

import "testing"

func TestConfigureAllowedOrigins(t *testing.T) {
	reset := func() {
		ConfigureAllowedOrigins([]string{
			"https://valomapper.com",
			"https://www.valomapper.com",
			"http://localhost:3000",
			"http://localhost:3001",
		})
	}
	defer reset()

	ConfigureAllowedOrigins([]string{" https://staging.example.com ", ""})

	if !isAllowedOrigin("https://staging.example.com") {
		t.Fatal("expected configured origin to be allowed")
	}
	if isAllowedOrigin("https://valomapper.com") {
		t.Fatal("previous allowlist should have been replaced")
	}
	if isAllowedOrigin("") {
		t.Fatal("empty origin should not be allowed")
	}
}

func TestDefaultAllowedOriginsIncludeWWW(t *testing.T) {
	if !isAllowedOrigin("https://www.valomapper.com") {
		t.Fatal("www origin should be allowed by default")
	}
}
