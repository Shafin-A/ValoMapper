// Package valorant holds the small, stable lookup tables shared by the replay
// normaliser: VALORANT map codenames, agent UUIDs and the builds VRFKit
// supports. Keeping them out of replay/ makes the tables reusable and easy to
// test without a Parquet export.
package valorant

import (
	"path"
	"regexp"
	"strings"
)

// Map is the ValoMapper identity of a VALORANT map.
type Map struct {
	// ID is the id used by getMapCallouts and match-history payloads.
	ID string
	// Name is the display name.
	Name string
	// Codename is the Unreal map asset name (the last path segment).
	Codename string
}

// MapsByCodename maps the UE map asset name to its ValoMapper identity.
var MapsByCodename = map[string]Map{
	"ascent":   {ID: "ascent", Name: "Ascent", Codename: "Ascent"},
	"bonsai":   {ID: "split", Name: "Split", Codename: "Bonsai"},
	"duality":  {ID: "bind", Name: "Bind", Codename: "Duality"},
	"triad":    {ID: "haven", Name: "Haven", Codename: "Triad"},
	"port":     {ID: "icebox", Name: "Icebox", Codename: "Port"},
	"canyon":   {ID: "fracture", Name: "Fracture", Codename: "Canyon"},
	"foxtrot":  {ID: "breeze", Name: "Breeze", Codename: "Foxtrot"},
	"jam":      {ID: "lotus", Name: "Lotus", Codename: "Jam"},
	"juliett":  {ID: "sunset", Name: "Sunset", Codename: "Juliett"},
	"pitt":     {ID: "pearl", Name: "Pearl", Codename: "Pitt"},
	"infinity": {ID: "abyss", Name: "Abyss", Codename: "Infinity"},
	"rook":     {ID: "corrode", Name: "Corrode", Codename: "Rook"},
	"plummet":  {ID: "summit", Name: "Summit", Codename: "Plummet"},
}

// AgentNames maps the Riot agent UUID to the display name used by the
// frontend's AGENT_ICON_CONFIGS. UUIDs are compared case-insensitively.
var AgentNames = map[string]string{
	"41fb69c1-4189-7b37-f117-bcaf1e96f1bf": "Astra",
	"5f8d3a7f-467b-97f3-062c-13acf203c006": "Breach",
	"9f0d8ba9-4140-b941-57d3-a7ad57c6b417": "Brimstone",
	"22697a3d-45bf-8dd7-4fec-84a9e28c69d7": "Chamber",
	"1dbf2edd-4729-0984-3115-daa5eed44993": "Clove",
	"117ed9e3-49f3-6512-3ccf-0cada7e3823b": "Cypher",
	"cc8b64c8-4b25-4ff9-6e7f-37b4da43d235": "Deadlock",
	"dade69b4-4f5a-8528-247b-219e5a1facd6": "Fade",
	"e370fa57-4757-3604-3648-499e1f642d3f": "Gekko",
	"95b78ed7-4637-86d9-7e41-71ba8c293152": "Harbor",
	"0e38b510-41a8-5780-5e8f-568b2a4f2d6c": "Iso",
	"add6443a-41bd-e414-f6ad-e58d267f4e95": "Jett",
	"601dbbe7-43ce-be57-2a40-4abd24953621": "KAY/O",
	"1e58de9c-4950-5125-93e9-a0aee9f98746": "Killjoy",
	"7c8a4701-4de6-9355-b254-e09bc2a34b72": "Miks",
	"bb2a4828-46eb-8cd1-e765-15848195d751": "Neon",
	"8e253930-4c05-31dd-1b6c-968525494517": "Omen",
	"eb93336a-449b-9c1b-0a54-a891f7921d69": "Phoenix",
	"f94c3b30-42be-e959-889c-5aa313dba261": "Raze",
	"a3bfb853-43b2-7238-a4f1-ad90e9e46bcc": "Reyna",
	"569fdd95-4d10-43ab-ca70-79becc718b46": "Sage",
	"6f2a04ca-43e0-be17-7f36-b3908627744d": "Skye",
	"320b2a48-4d9b-a075-30f1-1f93a9b638fa": "Sova",
	"b444168c-4e35-8076-db47-ef9bf368f384": "Tejo",
	"92eeef5d-43b5-1d4a-8d03-b3927a09034b": "Veto",
	"707eab51-4836-f488-046a-cda6bf494859": "Viper",
	"efba5359-4016-a1e5-7626-b1ae76895940": "Vyse",
	"df1cb487-4902-002e-5c17-d28e83e78588": "Waylay",
	"7f94d92c-4234-0a36-9646-3a87eb8b5c89": "Yoru",
}

// SupportedBuilds is VRFKit v0.4.0's verified build set. A replay whose
// release is not here is rejected with unsupported_build rather than guessed.
var SupportedBuilds = map[string]struct{}{
	"11.06": {},
	"11.07": {},
	"11.08": {},
	"11.09": {},
	"11.10": {},
	"11.11": {},
	"12.00": {},
	"12.01": {},
	"12.02": {},
	"12.03": {},
	"12.04": {},
	"12.05": {},
	"12.06": {},
	"12.07": {},
	"12.08": {},
	"12.09": {},
	"12.10": {},
	"12.11": {},
	"13.00": {},
	"13.01": {},
	"13.02": {},
	"13.04": {},
	"13.05": {},
	"13.06": {},
	"13.08": {},
	"13.09": {},
}

var releasePattern = regexp.MustCompile(`release-(\d+\.\d+)`)

// ParseBuild extracts the release number from a VRF branch string such as
// "++Ares-Core+release-13.08".
func ParseBuild(branch string) (string, bool) {
	match := releasePattern.FindStringSubmatch(branch)
	if len(match) != 2 {
		return "", false
	}
	return match[1], true
}

// IsSupportedBuild reports whether the release is in VRFKit's verified set.
func IsSupportedBuild(release string) bool {
	_, ok := SupportedBuilds[release]
	return ok
}

// ResolveMap resolves a level asset path such as "/Game/Maps/Jam/Jam" or the
// bare codename "Jam". The comparison ignores case and a trailing extension.
func ResolveMap(levelPath string) (Map, bool) {
	clean := strings.TrimSpace(strings.ReplaceAll(levelPath, `\`, "/"))
	clean = strings.TrimSuffix(clean, "/")
	codename := path.Base(clean)
	codename = strings.TrimSuffix(codename, path.Ext(codename))
	if codename == "" || codename == "." || codename == "/" {
		return Map{}, false
	}
	m, ok := MapsByCodename[strings.ToLower(codename)]
	return m, ok
}

// AgentName resolves an agent UUID, returning the display name.
func AgentName(uuid string) (string, bool) {
	name, ok := AgentNames[strings.ToLower(strings.TrimSpace(uuid))]
	return name, ok
}
