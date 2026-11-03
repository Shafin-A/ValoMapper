package replay

import (
	"fmt"
	"math"
	"sort"
)

func addNanoswarmPlacedMarkers(utilities [][]Utility, windows []roundWindow) {
	for roundIndex := range utilities {
		if roundIndex >= len(windows) {
			break
		}
		roundEndMS := int(windows[roundIndex].EndMS - windows[roundIndex].StartMS)
		activated := make([]int, 0)
		for i := range utilities[roundIndex] {
			utility := utilities[roundIndex][i]
			if utility.AbilityID == "nanoswarm" && utility.Kind == UtilityMolly {
				activated = append(activated, i)
			}
		}

		usedActivations := make(map[int]struct{})
		var placed []Utility
		for _, flight := range utilities[roundIndex] {
			if flight.AbilityID != "nanoswarm" || flight.Kind != UtilityMobile ||
				len(flight.Samples) == 0 {
				continue
			}
			positionSample := flight.Samples[len(flight.Samples)-1]
			position := Position{X: positionSample.X, Y: positionSample.Y}
			placedStart := flight.EndTimeMS
			settledAt := positionSample.TimeMS + nanoswarmSettledMS
			if placedStart > settledAt {
				placedStart = settledAt
			}
			if placedStart >= roundEndMS {
				continue
			}
			placedEnd := roundEndMS
			if flight.EndTimeMS > settledAt {
				placedEnd = flight.EndTimeMS
			}
			bestDistance := math.Inf(1)
			bestActivation := -1
			for _, activationIndex := range activated {
				activation := utilities[roundIndex][activationIndex]
				if _, used := usedActivations[activationIndex]; used ||
					activation.StartTimeMS < positionSample.TimeMS ||
					activation.StartTimeMS >= placedEnd ||
					(flight.OwnerPuuid != "" && activation.OwnerPuuid != flight.OwnerPuuid) {
					continue
				}
				distance := math.Hypot(
					activation.Position.X-position.X,
					activation.Position.Y-position.Y,
				)
				if distance < bestDistance {
					bestDistance = distance
					bestActivation = activationIndex
				}
			}
			if bestActivation >= 0 && bestDistance <= 500 {
				placedEnd = utilities[roundIndex][bestActivation].StartTimeMS
				usedActivations[bestActivation] = struct{}{}
			}
			if placedStart >= placedEnd {
				continue
			}
			placed = append(placed, Utility{
				ID:          flight.ID + "-placed",
				Kind:        UtilityMarker,
				AbilityID:   "nanoswarm",
				StartTimeMS: placedStart,
				EndTimeMS:   placedEnd,
				Position:    position,
				OwnerPuuid:  flight.OwnerPuuid,
				IconOnly:    true,
			})
		}
		for _, marker := range placed {
			utilities[roundIndex] = append(utilities[roundIndex], marker)
		}
		sort.SliceStable(utilities[roundIndex], func(i, j int) bool {
			if utilities[roundIndex][i].StartTimeMS != utilities[roundIndex][j].StartTimeMS {
				return utilities[roundIndex][i].StartTimeMS < utilities[roundIndex][j].StartTimeMS
			}
			return utilities[roundIndex][i].ID < utilities[roundIndex][j].ID
		})
	}
}

func addPoisonCloudPlacedMarkers(utilities [][]Utility, windows []roundWindow) {
	type poisonCloudEmitter struct {
		flight       Utility
		landing      Position
		landingMS    int
		lastSampleMS int
		activations  []Utility
	}

	for roundIndex := range utilities {
		if roundIndex >= len(windows) {
			break
		}
		roundEndMS := int(windows[roundIndex].EndMS - windows[roundIndex].StartMS)
		emitters := make([]*poisonCloudEmitter, 0)
		activationIndexes := make([]int, 0)
		for i := range utilities[roundIndex] {
			utility := utilities[roundIndex][i]
			if utility.AbilityID != "poison_cloud" {
				continue
			}
			switch utility.Kind {
			case UtilityMobile:
				if len(utility.Samples) == 0 {
					continue
				}
				sample := utility.Samples[len(utility.Samples)-1]
				landingMS := utility.EndTimeMS
				settledMS := sample.TimeMS + poisonCloudSettledMS
				if landingMS > settledMS {
					landingMS = settledMS
				}
				if landingMS >= roundEndMS {
					continue
				}
				emitters = append(emitters, &poisonCloudEmitter{
					flight:       utility,
					landing:      Position{X: sample.X, Y: sample.Y},
					landingMS:    landingMS,
					lastSampleMS: sample.TimeMS,
				})
			case UtilitySmoke:
				activationIndexes = append(activationIndexes, i)
			}
		}

		for _, activationIndex := range activationIndexes {
			activation := utilities[roundIndex][activationIndex]
			bestDistance := math.Inf(1)
			var best *poisonCloudEmitter
			for _, emitter := range emitters {
				if activation.StartTimeMS < emitter.lastSampleMS ||
					(emitter.flight.OwnerPuuid != "" && activation.OwnerPuuid != "" &&
						emitter.flight.OwnerPuuid != activation.OwnerPuuid) {
					continue
				}
				distance := math.Hypot(
					activation.Position.X-emitter.landing.X,
					activation.Position.Y-emitter.landing.Y,
				)
				if distance < bestDistance {
					bestDistance = distance
					best = emitter
				}
			}
			if best != nil && bestDistance <= 500 {
				best.activations = append(best.activations, activation)
			}
		}

		var placed []Utility
		for _, emitter := range emitters {
			sort.SliceStable(emitter.activations, func(i, j int) bool {
				return emitter.activations[i].StartTimeMS < emitter.activations[j].StartTimeMS
			})
			cursor := emitter.landingMS
			ordinal := 0
			appendMarker := func(startMS, endMS int) {
				if startMS < 0 {
					startMS = 0
				}
				if endMS > roundEndMS {
					endMS = roundEndMS
				}
				if startMS >= endMS {
					return
				}
				ordinal++
				placed = append(placed, Utility{
					ID:          fmt.Sprintf("%s-placed-%d", emitter.flight.ID, ordinal),
					Kind:        UtilityMarker,
					AbilityID:   "poison_cloud",
					StartTimeMS: startMS,
					EndTimeMS:   endMS,
					Position:    emitter.landing,
					OwnerPuuid:  emitter.flight.OwnerPuuid,
					IconOnly:    true,
				})
			}
			for _, activation := range emitter.activations {
				if activation.StartTimeMS > cursor {
					appendMarker(cursor, activation.StartTimeMS)
				}
				if activation.EndTimeMS > cursor {
					cursor = activation.EndTimeMS
				}
			}
			appendMarker(cursor, roundEndMS)
		}

		for _, marker := range placed {
			utilities[roundIndex] = append(utilities[roundIndex], marker)
		}
		sort.SliceStable(utilities[roundIndex], func(i, j int) bool {
			if utilities[roundIndex][i].StartTimeMS != utilities[roundIndex][j].StartTimeMS {
				return utilities[roundIndex][i].StartTimeMS < utilities[roundIndex][j].StartTimeMS
			}
			return utilities[roundIndex][i].ID < utilities[roundIndex][j].ID
		})
	}
}
