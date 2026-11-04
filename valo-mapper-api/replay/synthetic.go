package replay

import (
	"fmt"
	"math"
	"sort"
	"strings"

	"valo-mapper-api/valorant"
)

const (
	maxSovaBeams          = 3
	sovaBeamDurationMS    = 1000
	sovaCastBeamFallback  = 4000
	sovaBeamTimeTolerance = 1000
	// The state machine reaches its first fire state within about a second of
	// the cast, and all three beams are done well inside this window.
	sovaStateSearchBeforeMS = 1000
	sovaStateSearchAfterMS  = 8000
)

// addSyntheticSovaUltimates renders Hunter's Fury from the ability-cast record.
// The replay does not contain a replicated beam actor for Sova's ultimate. The
// LaserStateMachine does record each fire, including misses, so its
// LSM_SyncRespondToFireState transitions are the preferred beam source.
func addSyntheticSovaUltimates(
	result [][]Utility,
	windows []roundWindow,
	index *playerIndex,
	puuidBySubject map[string]string,
	agents map[string]string,
	movement *movementScan,
	fields *fieldScan,
	netPaths map[uint32]string,
) {
	if fields == nil {
		return
	}
	casts := resolveCasts(windows, index, &fields.State)
	if len(casts.Casts) == 0 {
		return
	}

	identities := make([]castIdentity, 0, len(casts.Casts))
	for identity := range casts.Casts {
		identities = append(identities, identity)
	}
	sort.Slice(identities, func(i, j int) bool {
		if identities[i].Round != identities[j].Round {
			return identities[i].Round < identities[j].Round
		}
		if identities[i].CastMS != identities[j].CastMS {
			return identities[i].CastMS < identities[j].CastMS
		}
		return identities[i].Subject < identities[j].Subject
	})

	nextID := 1
	for _, identity := range identities {
		if identity.Slot != 9 {
			continue
		}
		name, known := valorant.AgentName(agents[identity.Subject])
		if !known || name != "Sova" {
			continue
		}
		location, hasLocation := casts.Locations[identity]
		if !hasLocation || !validUtilityPosition(location) {
			continue
		}

		windowIndex := -1
		for i := range windows {
			if windows[i].RoundNumber-1 == identity.Round {
				windowIndex = i
				break
			}
		}
		if windowIndex < 0 {
			continue
		}
		window := windows[windowIndex]
		absoluteMS := casts.Casts[identity]
		if absoluteMS < window.StartMS || absoluteMS >= window.EndMS {
			continue
		}
		puuid := puuidBySubject[identity.Subject]
		if puuid == "" {
			continue
		}

		castStartMS := int(absoluteMS - window.StartMS)
		castSample, castSampleOK := sovaBeamPose(
			movement, windowIndex, identity.Subject, castStartMS,
		)

		beamTimes := sovaStateBeamTimes(
			fields.AbilityStates,
			fields.UtilityOwners,
			netPaths,
			index,
			identity.Subject,
			absoluteMS,
		)
		if len(beamTimes) == 0 {
			beamTimes = sovaEffectBeamTimes(
				casts.EffectTimes[identity],
				identity.CastMS,
				absoluteMS,
			)
		}
		if len(beamTimes) == 0 {
			// No state or effect timestamps: keep the previous single beam at
			// the cast time.
			addSyntheticSovaBeam(
				result,
				window,
				windowIndex,
				location,
				castSample,
				castSampleOK,
				castStartMS,
				sovaCastBeamFallback,
				puuid,
				&nextID,
			)
			continue
		}

		if len(beamTimes) > maxSovaBeams {
			beamTimes = beamTimes[:maxSovaBeams]
		}
		for _, beamAbsoluteMS := range beamTimes {
			if beamAbsoluteMS < window.StartMS || beamAbsoluteMS >= window.EndMS {
				continue
			}
			beamStartMS := int(beamAbsoluteMS - window.StartMS)
			sample, sampleOK := sovaBeamPose(
				movement, windowIndex, identity.Subject, beamStartMS,
			)
			addSyntheticSovaBeam(
				result,
				window,
				windowIndex,
				location,
				sample,
				sampleOK,
				beamStartMS,
				sovaBeamDurationMS,
				puuid,
				&nextID,
			)
		}
	}
}

// sovaStateBeamTimes counts LSM_ChargingBuffState transitions on the caster's
// ultimate state machine. A charging transition happens for every beam fired,
// whether or not the beam later produces a damage/kill effect. The
// LSM_SyncRespondToFireState transition is not reliable: the second beam can
// go straight from LaserActiveTimedState to ChargingBuffState.
func sovaStateBeamTimes(
	states map[uint32][]abilityStateWrite,
	owners map[uint32][]utilityOwnerWrite,
	netPaths map[uint32]string,
	index *playerIndex,
	subject string,
	castAbsoluteMS uint32,
) []uint32 {
	if len(states) == 0 || netPaths == nil {
		return nil
	}
	fromMS := castAbsoluteMS - sovaStateSearchBeforeMS
	toMS := castAbsoluteMS + sovaStateSearchAfterMS

	var times []uint32
	for manager, writes := range states {
		owner, ok := sovaManagerOwner(manager, castAbsoluteMS, owners)
		if !ok {
			continue
		}
		ownerSubject, found := index.subjectForPawn(owner)
		if !found {
			ownerSubject, found = index.subjectForActor(owner)
		}
		if !found || ownerSubject != subject {
			continue
		}

		lastByObject := make(map[uint32]uint32)
		for _, write := range writes {
			if write.TimeMS >= toMS {
				break
			}
			object := uint32(0)
			if write.ObjectNetGUID != nil {
				object = *write.ObjectNetGUID
			}
			path := netPaths[write.StateGUID]
			if write.TimeMS < fromMS {
				lastByObject[object] = write.StateGUID
				continue
			}
			previous := lastByObject[object]
			if strings.Contains(path, "LSM_ChargingBuffState") &&
				previous != write.StateGUID {
				times = append(times, write.TimeMS)
			}
			lastByObject[object] = write.StateGUID
		}
	}

	sort.Slice(times, func(i, j int) bool { return times[i] < times[j] })
	deduped := times[:0]
	for _, timeMS := range times {
		if len(deduped) > 0 && timeMS-deduped[len(deduped)-1] < 100 {
			continue
		}
		deduped = append(deduped, timeMS)
	}
	return deduped
}

// sovaManagerOwner finds the player actor for an ability manager. The manager's
// Owner is cleared while it sits in persistent data, so use the latest nonzero
// owner at or before the cast, falling back to the first nonzero owner.
func sovaManagerOwner(
	manager uint32,
	castMS uint32,
	owners map[uint32][]utilityOwnerWrite,
) (uint32, bool) {
	var owner uint32
	found := false
	for _, write := range owners[manager] {
		if write.Owner == nil || *write.Owner == 0 {
			continue
		}
		if write.TimeMS <= castMS {
			owner = *write.Owner
			found = true
			continue
		}
		if !found {
			owner = *write.Owner
			found = true
		}
		break
	}
	return owner, found
}

func sovaEffectBeamTimes(
	effectTimes []float64,
	castMS int64,
	castAbsoluteMS uint32,
) []uint32 {
	castSeconds := float64(castMS) / 1000
	times := make([]uint32, 0, len(effectTimes))
	for _, effectTime := range effectTimes {
		if effectTime < castSeconds-0.1 || effectTime > castSeconds+10 {
			continue
		}
		offsetMS := int64(math.Round(effectTime*1000)) - castMS
		absoluteMS := int64(castAbsoluteMS) + offsetMS
		if absoluteMS < 0 || absoluteMS > math.MaxUint32 {
			continue
		}
		times = append(times, uint32(absoluteMS))
	}
	sort.Slice(times, func(i, j int) bool { return times[i] < times[j] })
	deduped := times[:0]
	for _, timeMS := range times {
		if len(deduped) > 0 && timeMS-deduped[len(deduped)-1] < 100 {
			continue
		}
		deduped = append(deduped, timeMS)
	}
	return deduped
}

func sovaBeamPose(
	movement *movementScan,
	roundIndex int,
	subject string,
	timeMS int,
) (timelineSample, bool) {
	if movement == nil {
		return timelineSample{}, false
	}
	sample, ok := movement.sampleAt(roundIndex, subject, uint32(timeMS))
	if !ok ||
		math.Abs(float64(sample.TimeMS)-float64(timeMS)) >
			sovaBeamTimeTolerance {
		return timelineSample{}, false
	}
	return sample, true
}

func addSyntheticSovaBeam(
	result [][]Utility,
	window roundWindow,
	windowIndex int,
	castLocation Position,
	sample timelineSample,
	sampleOK bool,
	startMS int,
	durationMS int,
	puuid string,
	nextID *int,
) {
	endMS := startMS + durationMS
	if roundEnd := int(window.EndMS - window.StartMS); endMS > roundEnd {
		endMS = roundEnd
	}
	if endMS <= startMS {
		return
	}
	position := castLocation
	yaw := 0.0
	if sampleOK {
		position = Position{X: sample.X, Y: sample.Y}
		yaw = sample.Yaw
	}
	if !validUtilityPosition(position) {
		return
	}
	result[windowIndex] = append(result[windowIndex], Utility{
		ID:          fmt.Sprintf("utility-cast-%04d", *nextID),
		Kind:        UtilityArea,
		AbilityID:   "hunters_fury",
		StartTimeMS: startMS,
		EndTimeMS:   endMS,
		Position:    position,
		Yaw:         yaw,
		OwnerPuuid:  puuid,
	})
	(*nextID)++
}
