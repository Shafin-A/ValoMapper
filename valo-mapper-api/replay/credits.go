package replay

import "sort"

const (
	spikePlantCreditBonus   = 300
	spikePlantCreditMatchMS = 1000
)

// applyPlantCreditBonuses inserts the team-wide plant bonus at the plant time.
// The replay updates living players immediately but can delay a dead player's
// money write until the next replication, so the sidebar would otherwise show
// stale credits on the scoreboard.
func applyPlantCreditBonuses(
	windows []roundWindow,
	players []Player,
	puuidBySubject map[string]string,
	state *stateScan,
	logs map[int]*roundLog,
) {
	if state == nil {
		return
	}
	teamByPuuid := make(map[string]string, len(players))
	for _, player := range players {
		teamByPuuid[player.Puuid] = player.TeamID
	}
	subjectByPuuid := make(map[string]string, len(puuidBySubject))
	for subject, puuid := range puuidBySubject {
		subjectByPuuid[puuid] = subject
	}

	for i := range windows {
		window := &windows[i]
		log := logs[window.RoundNumber]
		if log == nil {
			continue
		}
		for _, event := range log.Events {
			if event.EventType != "spike_planted" || event.PlanterPuuid == "" {
				continue
			}
			team := teamByPuuid[event.PlanterPuuid]
			if team == "" {
				continue
			}
			plantMS := window.StartMS + uint32(event.TimeSinceRoundStartMillis)
			for _, player := range players {
				if player.TeamID != team {
					continue
				}
				subject := subjectByPuuid[player.Puuid]
				if subject == "" {
					continue
				}
				applyPlantCreditBonus(state, subject, plantMS)
			}
		}
	}
}

func applyPlantCreditBonus(state *stateScan, subject string, plantMS uint32) {
	timeline := state.Timelines[subject]
	if len(timeline) == 0 {
		return
	}

	index := sort.Search(len(timeline), func(i int) bool {
		return timeline[i].TimeMS > plantMS
	}) - 1
	if index < 0 {
		return
	}
	current := timeline[index]

	// If the credits already jumped by the plant bonus near the plant, the
	// replay applied it promptly. Do not add it twice.
	previousIndex := index
	for previousIndex > 0 && timeline[previousIndex-1].Credits == current.Credits {
		previousIndex--
	}
	if previousIndex > 0 {
		previous := timeline[previousIndex-1]
		if current.Credits-previous.Credits == spikePlantCreditBonus &&
			plantMS-current.TimeMS <= spikePlantCreditMatchMS {
			return
		}
	}

	if current.TimeMS == plantMS {
		timeline[index].Credits = current.Credits + spikePlantCreditBonus
		state.PlantCreditBonuses++
		return
	}
	sample := current
	sample.TimeMS = plantMS
	sample.Credits = current.Credits + spikePlantCreditBonus
	timeline = append(timeline, sample)
	sort.SliceStable(timeline, func(i, j int) bool {
		return timeline[i].TimeMS < timeline[j].TimeMS
	})
	state.Timelines[subject] = timeline
	state.PlantCreditBonuses++
}
