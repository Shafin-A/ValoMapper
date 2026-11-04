package replay

import "testing"

func TestAddSyntheticSovaUltimates(t *testing.T) {
	const (
		subject   = "sova-subject"
		puuid     = "sova-puuid"
		sovaAgent = "320b2a48-4d9b-a075-30f1-1f93a9b638fa"
		actorGUID = uint32(500)
	)
	index := newPlayerIndex(&Manifest{Players: []ManifestPlayer{{
		ActorNetGUID:      100,
		Subject:           subject,
		CharacterNetGUID:  ptr(actorGUID),
		CharacterNetGUIDs: []uint32{actorGUID},
	}}})
	windows := []roundWindow{{
		RoundNumber: 1,
		StartMS:     1000,
		EndMS:       100000,
		BuyEndMS:    ptr(uint32(2000)),
	}}
	raw := newFieldStateRows()
	raw.Casts[castKey{Actor: actorGUID, TimeMS: 3000, PacketID: 7, Index: 0}] = &castElement{
		Slot: 9, HasSlot: true,
		Round: 0, HasRound: true,
		CastTime: 3, HasCastTime: true,
		Player:          subject,
		CastLocation:    Position{X: 1000, Y: 2000},
		HasCastLocation: true,
	}
	movement := &movementScan{
		timelines: []map[string][]timelineSample{{
			subject: {{TimeMS: 4000, X: 1000, Y: 2000, Yaw: 45}},
		}},
	}

	result := make([][]Utility, len(windows))
	addSyntheticSovaUltimates(
		result,
		windows,
		index,
		map[string]string{subject: puuid},
		map[string]string{subject: sovaAgent},
		movement,
		&fieldScan{State: raw},
		nil,
	)

	if len(result[0]) != 1 {
		t.Fatalf("utilities = %#v, want one Hunter's Fury beam", result[0])
	}
	utility := result[0][0]
	if utility.AbilityID != "hunters_fury" || utility.Kind != UtilityArea {
		t.Fatalf("utility identity = %q/%q", utility.Kind, utility.AbilityID)
	}
	if utility.StartTimeMS != 4000 || utility.EndTimeMS != 8000 {
		t.Errorf("interval = %d..%d, want 4000..8000",
			utility.StartTimeMS, utility.EndTimeMS)
	}
	if utility.Position != (Position{X: 1000, Y: 2000}) || utility.Yaw != 45 {
		t.Errorf("geometry = pos %#v yaw %v", utility.Position, utility.Yaw)
	}
	if utility.OwnerPuuid != puuid {
		t.Errorf("owner = %q, want %q", utility.OwnerPuuid, puuid)
	}
}

func TestAddSyntheticSovaUltimatesUsesStateMachineFires(t *testing.T) {
	const (
		subject   = "sova-subject"
		puuid     = "sova-puuid"
		sovaAgent = "320b2a48-4d9b-a075-30f1-1f93a9b638fa"
		actorGUID = uint32(500)
		manager   = uint32(900)
		stateObj  = uint32(800)
	)
	index := newPlayerIndex(&Manifest{Players: []ManifestPlayer{{
		ActorNetGUID:      100,
		Subject:           subject,
		CharacterNetGUID:  ptr(actorGUID),
		CharacterNetGUIDs: []uint32{actorGUID},
	}}})
	windows := []roundWindow{{
		RoundNumber: 1,
		StartMS:     1000,
		EndMS:       100000,
		BuyEndMS:    ptr(uint32(2000)),
	}}
	raw := newFieldStateRows()
	raw.Casts[castKey{Actor: actorGUID, TimeMS: 3000, PacketID: 7, Index: 0}] = &castElement{
		Slot: 9, HasSlot: true,
		Round: 0, HasRound: true,
		CastTime: 3, HasCastTime: true,
		Player:          subject,
		CastLocation:    Position{X: 1000, Y: 2000},
		HasCastLocation: true,
	}
	stateWrites := []abilityStateWrite{
		{TimeMS: 5400, PacketID: 1, ObjectNetGUID: ptr(stateObj), StateGUID: 1001},
		{TimeMS: 5500, PacketID: 2, ObjectNetGUID: ptr(stateObj), StateGUID: 1002},
		{TimeMS: 6000, PacketID: 3, ObjectNetGUID: ptr(stateObj), StateGUID: 1003},
		{TimeMS: 6400, PacketID: 4, ObjectNetGUID: ptr(stateObj), StateGUID: 1001},
		{TimeMS: 6500, PacketID: 5, ObjectNetGUID: ptr(stateObj), StateGUID: 1002},
		{TimeMS: 7000, PacketID: 6, ObjectNetGUID: ptr(stateObj), StateGUID: 1003},
		{TimeMS: 7400, PacketID: 7, ObjectNetGUID: ptr(stateObj), StateGUID: 1001},
		{TimeMS: 7500, PacketID: 8, ObjectNetGUID: ptr(stateObj), StateGUID: 1002},
		{TimeMS: 8000, PacketID: 9, ObjectNetGUID: ptr(stateObj), StateGUID: 1003},
	}
	fields := &fieldScan{
		State:         raw,
		AbilityStates: map[uint32][]abilityStateWrite{manager: stateWrites},
		UtilityOwners: map[uint32][]utilityOwnerWrite{
			manager: {{TimeMS: 0, Owner: ptr(uint32(100))}},
		},
	}
	netPaths := map[uint32]string{
		1001: "LSM_SyncRespondToFireState",
		1002: "LSM_ChargingBuffState",
		1003: "LSM_LaserCooldownTimedState",
	}
	movement := &movementScan{
		timelines: []map[string][]timelineSample{{
			subject: {
				{TimeMS: 4500, X: 100, Y: 200, Yaw: 20},
				{TimeMS: 5500, X: 300, Y: 400, Yaw: 30},
				{TimeMS: 6500, X: 500, Y: 600, Yaw: 40},
			},
		}},
	}

	result := make([][]Utility, len(windows))
	addSyntheticSovaUltimates(
		result,
		windows,
		index,
		map[string]string{subject: puuid},
		map[string]string{subject: sovaAgent},
		movement,
		fields,
		netPaths,
	)

	if len(result[0]) != 3 {
		t.Fatalf("utilities = %d, want 3 state-machine fires; %#v",
			len(result[0]), result[0])
	}
	wantYaws := []float64{20, 30, 40}
	for i, utility := range result[0] {
		if utility.Yaw != wantYaws[i] {
			t.Errorf("beam %d yaw = %v, want %v", i, utility.Yaw, wantYaws[i])
		}
	}
}

func TestAddSyntheticSovaUltimatesUsesEffectTimes(t *testing.T) {
	const (
		subject   = "sova-subject"
		puuid     = "sova-puuid"
		sovaAgent = "320b2a48-4d9b-a075-30f1-1f93a9b638fa"
		actorGUID = uint32(500)
	)
	index := newPlayerIndex(&Manifest{Players: []ManifestPlayer{{
		ActorNetGUID:      100,
		Subject:           subject,
		CharacterNetGUID:  ptr(actorGUID),
		CharacterNetGUIDs: []uint32{actorGUID},
	}}})
	windows := []roundWindow{{
		RoundNumber: 1,
		StartMS:     1000,
		EndMS:       100000,
		BuyEndMS:    ptr(uint32(2000)),
	}}
	raw := newFieldStateRows()
	raw.Casts[castKey{Actor: actorGUID, TimeMS: 3000, PacketID: 7, Index: 0}] = &castElement{
		Slot: 9, HasSlot: true,
		Round: 0, HasRound: true,
		CastTime: 3, HasCastTime: true,
		Player:          subject,
		CastLocation:    Position{X: 1000, Y: 2000},
		HasCastLocation: true,
		EffectTimes:     []float64{3.5, 4, 4.5, 5},
	}
	movement := &movementScan{
		timelines: []map[string][]timelineSample{{
			subject: {
				{TimeMS: 4500, X: 100, Y: 200, Yaw: 10},
				{TimeMS: 5000, X: 300, Y: 400, Yaw: 20},
				{TimeMS: 5500, X: 500, Y: 600, Yaw: 30},
			},
		}},
	}

	result := make([][]Utility, len(windows))
	addSyntheticSovaUltimates(
		result,
		windows,
		index,
		map[string]string{subject: puuid},
		map[string]string{subject: sovaAgent},
		movement,
		&fieldScan{State: raw},
		nil,
	)

	if len(result[0]) != 3 {
		t.Fatalf("utilities = %d, want 3 beams; %#v", len(result[0]), result[0])
	}
	wantYaws := []float64{10, 20, 30}
	for i, utility := range result[0] {
		if utility.StartTimeMS != 4500+i*500 || utility.EndTimeMS != 5500+i*500 {
			t.Errorf("beam %d interval = %d..%d", i,
				utility.StartTimeMS, utility.EndTimeMS)
		}
		if utility.Yaw != wantYaws[i] {
			t.Errorf("beam %d yaw = %v, want %v", i, utility.Yaw, wantYaws[i])
		}
		if utility.Position != (Position{X: float64(100 + i*200), Y: float64(200 + i*200)}) {
			t.Errorf("beam %d position = %#v", i, utility.Position)
		}
	}
}
