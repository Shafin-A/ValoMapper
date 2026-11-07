package replay

import "testing"

func astraTestSegment(
	ability, owner string,
	round int,
	start, end uint32,
	x, y float64,
) utilitySegment {
	return utilitySegment{
		life: &utilityActorLife{
			class: utilityCatalogEntry{ability: ability},
			owner: owner,
		},
		roundIndex: round,
		startMS:    start,
		endMS:      end,
		position:   Position{X: x, Y: y},
	}
}

func TestTruncateAstraMarkersUsesConsumingAbilityStart(t *testing.T) {
	segments := []utilitySegment{
		astraTestSegment("astra_passive", "astra", 0, 1000, 9000, 1000, 1000),
		astraTestSegment("nebula__dissipate", "astra", 0, 5000, 8000, 1000, 1000),
		astraTestSegment("gravity_well", "astra", 0, 7000, 8000, 1000, 1000),
	}

	truncateAstraMarkers(segments)

	if segments[0].endMS != 5000 {
		t.Fatalf("marker end = %d, want 5000", segments[0].endMS)
	}
}

func TestTruncateAstraMarkersIgnoresUnrelatedAbilities(t *testing.T) {
	segments := []utilitySegment{
		astraTestSegment("astra_passive", "astra", 0, 1000, 9000, 1000, 1000),
		astraTestSegment("nebula__dissipate", "other", 0, 5000, 8000, 1000, 1000),
		astraTestSegment("nebula__dissipate", "astra", 1, 5000, 8000, 1000, 1000),
		astraTestSegment("nebula__dissipate", "astra", 0, 5000, 8000, 1250, 1000),
		astraTestSegment("cosmic_divide", "astra", 0, 5000, 8000, 1000, 1000),
	}

	truncateAstraMarkers(segments)

	if segments[0].endMS != 9000 {
		t.Fatalf("marker end = %d, want 9000", segments[0].endMS)
	}
}

func TestTruncateAstraMarkersRemovesStarConsumedBeforeMarker(t *testing.T) {
	segments := []utilitySegment{
		astraTestSegment("astra_passive", "astra", 0, 2000, 9000, 1000, 1000),
		astraTestSegment("nova_pulse", "astra", 0, 1000, 8000, 1000, 1000),
	}

	truncateAstraMarkers(segments)
	segments = filterUtilitySegments(segments)

	for _, segment := range segments {
		if segment.life.class.ability == "astra_passive" {
			t.Fatalf("stale astra marker survived: %+v", segment)
		}
	}
}
