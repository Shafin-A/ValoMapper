package replay

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sort"
)

// expectedPlayers is the competitive roster size. A replay with any other
// number cannot establish a 5v5 match, so the normaliser rejects it instead of
// inventing a side.
const expectedPlayers = 10

// playerIndex joins the manifest's actor and pawn identifiers back to a
// subject. A pawn named by two subjects is ambiguous and is never guessed.
type playerIndex struct {
	players        []ManifestPlayer
	bySubject      map[string]int
	subjectByActor map[uint32]string
	subjectByPawn  map[uint32]string
	ambiguousPawns map[uint32]struct{}
	ambiguousActs  map[uint32]struct{}
}

func newPlayerIndex(m *Manifest) *playerIndex {
	index := &playerIndex{
		players:        m.Players,
		bySubject:      make(map[string]int, len(m.Players)),
		subjectByActor: make(map[uint32]string, len(m.Players)),
		subjectByPawn:  make(map[uint32]string, len(m.Players)),
		ambiguousPawns: make(map[uint32]struct{}),
		ambiguousActs:  make(map[uint32]struct{}),
	}

	for i, player := range m.Players {
		subject := normaliseUUID(player.Subject)
		if subject == "" {
			continue
		}
		if _, exists := index.bySubject[subject]; !exists {
			index.bySubject[subject] = i
		}
		index.addActor(player.ActorNetGUID, subject)
		if player.CharacterNetGUID != nil {
			index.addPawn(*player.CharacterNetGUID, subject)
		}
		for _, pawn := range player.CharacterNetGUIDs {
			index.addPawn(pawn, subject)
		}
	}

	return index
}

func (p *playerIndex) addActor(actor uint32, subject string) {
	if actor == 0 {
		return
	}
	if previous, exists := p.subjectByActor[actor]; exists && previous != subject {
		p.ambiguousActs[actor] = struct{}{}
		return
	}
	p.subjectByActor[actor] = subject
}

func (p *playerIndex) addPawn(pawn uint32, subject string) {
	if pawn == 0 {
		return
	}
	if previous, exists := p.subjectByPawn[pawn]; exists && previous != subject {
		p.ambiguousPawns[pawn] = struct{}{}
		return
	}
	p.subjectByPawn[pawn] = subject
}

// subjectForPawn resolves a character NetGUID. The second result is false when
// the GUID is unknown or ambiguous.
func (p *playerIndex) subjectForPawn(pawn uint32) (string, bool) {
	if _, ambiguous := p.ambiguousPawns[pawn]; ambiguous {
		return "", false
	}
	subject, ok := p.subjectByPawn[pawn]
	return subject, ok
}

// subjectForActor resolves an actor NetGUID. The second result is false when
// the GUID is unknown or ambiguous.
func (p *playerIndex) subjectForActor(actor uint32) (string, bool) {
	if _, ambiguous := p.ambiguousActs[actor]; ambiguous {
		return "", false
	}
	subject, ok := p.subjectByActor[actor]
	return subject, ok
}

// subjectForCharacter accepts either a pawn or an actor NetGUID, because the
// event stream has used both across builds.
func (p *playerIndex) subjectForCharacter(guid uint32) (string, bool) {
	if subject, ok := p.subjectForPawn(guid); ok {
		return subject, true
	}
	return p.subjectForActor(guid)
}

// pseudonymousID is the browser-visible player id. It is stable for one subject
// without exposing the account UUID.
func pseudonymousID(subject string) string {
	sum := sha256.Sum256([]byte(normaliseUUID(subject)))
	return "vrf-" + hex.EncodeToString(sum[:])[:12]
}

// resolvePlayers builds the ten wire players. Teams are required for every
// subject; a missing team or a roster that does not split 5/5 is
// missing_team_data, never a coin flip.
func resolvePlayers(index *playerIndex, teams map[string]string, agents map[string]string) ([]Player, map[string]string, []string, *Error) {
	subjects := make([]string, 0, len(index.bySubject))
	for subject := range index.bySubject {
		subjects = append(subjects, subject)
	}
	sort.Strings(subjects)

	if len(subjects) != expectedPlayers {
		return nil, nil, nil, NewError(CodeMissingTeamData,
			fmt.Sprintf("The replay contained %d identified players instead of 10.", len(subjects)), nil)
	}

	players := make([]Player, 0, len(subjects))
	puuidBySubject := make(map[string]string, len(subjects))
	var warnings []string

	for _, subject := range subjects {
		team := normaliseTeam(teams[subject])
		if team == "" {
			return nil, nil, nil, NewError(CodeMissingTeamData, "", nil)
		}

		characterID := normaliseUUID(agents[subject])
		characterName := "Unknown"
		if characterID == "" {
			warnings = append(warnings, "An agent could not be identified; it is shown as Unknown.")
		} else if name, ok := agentName(characterID); ok {
			characterName = name
		} else {
			warnings = append(warnings, "An agent UUID was not recognised; it is shown as Unknown.")
		}

		players = append(players, Player{
			Puuid:         pseudonymousID(subject),
			TagLine:       "",
			TeamID:        team,
			CharacterID:   characterID,
			CharacterName: characterName,
		})
		puuidBySubject[subject] = pseudonymousID(subject)
	}

	// The VRF has no Riot IDs. Label players by agent, numbering duplicates
	// ("Jett 1", "Jett 2") so the scoreboard stays unambiguous.
	nameCounts := make(map[string]int, len(players))
	for _, player := range players {
		nameCounts[player.CharacterName]++
	}
	nameIndex := make(map[string]int, len(nameCounts))
	for i := range players {
		name := players[i].CharacterName
		if nameCounts[name] > 1 {
			nameIndex[name]++
			players[i].GameName = fmt.Sprintf("%s %d", name, nameIndex[name])
		} else {
			players[i].GameName = name
		}
	}

	// Deterministic output order: Red first, then Blue, then puuid. The
	// scoreboard groups by team, so this only keeps ids stable run to run.
	sort.SliceStable(players, func(i, j int) bool {
		if players[i].TeamID != players[j].TeamID {
			return players[i].TeamID == "Red"
		}
		return players[i].Puuid < players[j].Puuid
	})

	red, blue := 0, 0
	for _, player := range players {
		switch player.TeamID {
		case "Red":
			red++
		case "Blue":
			blue++
		}
	}
	if red != 5 || blue != 5 {
		return nil, nil, nil, NewError(CodeMissingTeamData,
			"The replay did not split into two five-player teams.", nil)
	}

	return players, puuidBySubject, warnings, nil
}
