package replay

import "testing"

func TestApplyPlantCreditBonusesUpdatesDeadTeammate(t *testing.T) {
	windows := []roundWindow{{RoundNumber: 1, StartMS: 1000, EndMS: 100000}}
	players := []Player{
		{Puuid: "planter", TeamID: "Red"},
		{Puuid: "dead", TeamID: "Red"},
		{Puuid: "enemy", TeamID: "Blue"},
	}
	puuidBySubject := map[string]string{
		"s-planter": "planter",
		"s-dead":    "dead",
		"s-enemy":   "enemy",
	}
	state := &stateScan{Timelines: map[string][]stateSample{
		"s-planter": {
			{TimeMS: 2000, Credits: 250},
			{TimeMS: 5100, Credits: 550},
		},
		"s-dead": {
			{TimeMS: 2000, Credits: 150},
			{TimeMS: 6000, Credits: 450},
		},
		"s-enemy": {
			{TimeMS: 2000, Credits: 200},
		},
	}}
	logs := map[int]*roundLog{1: {Events: []Event{{
		EventType:                 "spike_planted",
		TimeSinceRoundStartMillis: 4000,
		PlanterPuuid:              "planter",
	}}}}

	applyPlantCreditBonuses(windows, players, puuidBySubject, state, logs)

	dead := state.Timelines["s-dead"]
	if len(dead) != 3 || dead[1].TimeMS != 5000 || dead[1].Credits != 450 {
		t.Fatalf("dead teammate timeline = %+v", dead)
	}
	planter := state.Timelines["s-planter"]
	if len(planter) != 3 || planter[1].TimeMS != 5000 || planter[1].Credits != 550 {
		t.Fatalf("planter timeline = %+v", planter)
	}
	enemy := state.Timelines["s-enemy"]
	if len(enemy) != 1 || enemy[0].Credits != 200 {
		t.Fatalf("enemy timeline = %+v", enemy)
	}
}

func TestApplyPlantCreditBonusesClampsAtCreditCap(t *testing.T) {
	windows := []roundWindow{{RoundNumber: 1, StartMS: 1000, EndMS: 100000}}
	players := []Player{{Puuid: "planter", TeamID: "Red"}}
	puuidBySubject := map[string]string{"s-planter": "planter"}
	logs := map[int]*roundLog{1: {Events: []Event{{
		EventType:                 "spike_planted",
		TimeSinceRoundStartMillis: 4000,
		PlanterPuuid:              "planter",
	}}}}

	nearCap := &stateScan{Timelines: map[string][]stateSample{
		"s-planter": {{TimeMS: 2000, Credits: 8900}},
	}}
	applyPlantCreditBonuses(windows, players, puuidBySubject, nearCap, logs)
	if timeline := nearCap.Timelines["s-planter"]; len(timeline) != 2 ||
		timeline[1].TimeMS != 5000 || timeline[1].Credits != 9000 {
		t.Fatalf("near-cap timeline = %+v", timeline)
	}

	atCap := &stateScan{Timelines: map[string][]stateSample{
		"s-planter": {{TimeMS: 2000, Credits: 9000}},
	}}
	applyPlantCreditBonuses(windows, players, puuidBySubject, atCap, logs)
	if timeline := atCap.Timelines["s-planter"]; len(timeline) != 1 ||
		timeline[0].Credits != 9000 {
		t.Fatalf("at-cap timeline = %+v", timeline)
	}
}

func TestApplyPlantCreditBonusesDoesNotDoubleApply(t *testing.T) {
	windows := []roundWindow{{RoundNumber: 1, StartMS: 1000, EndMS: 100000}}
	players := []Player{{Puuid: "planter", TeamID: "Red"}}
	puuidBySubject := map[string]string{"s-planter": "planter"}
	state := &stateScan{Timelines: map[string][]stateSample{
		"s-planter": {
			{TimeMS: 2000, Credits: 250},
			{TimeMS: 4990, Credits: 550},
		},
	}}
	logs := map[int]*roundLog{1: {Events: []Event{{
		EventType:                 "spike_planted",
		TimeSinceRoundStartMillis: 4000,
		PlanterPuuid:              "planter",
	}}}}

	applyPlantCreditBonuses(windows, players, puuidBySubject, state, logs)

	timeline := state.Timelines["s-planter"]
	if len(timeline) != 2 || timeline[1].Credits != 550 {
		t.Fatalf("plant bonus was applied twice: %+v", timeline)
	}
}
