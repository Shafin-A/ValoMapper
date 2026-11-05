package replay

func poisonCloudActivationEndMS(
	openMS, closeMS uint32,
	destroys []utilityDestroyWrite,
	fuel []utilityFuelWrite,
) (uint32, bool) {
	if endMS, ok := poisonCloudDestroyMS(openMS, closeMS, destroys); ok {
		return endMS, true
	}
	return poisonCloudFuelStopMS(openMS, closeMS, fuel)
}

func poisonCloudDestroyMS(
	openMS, closeMS uint32,
	writes []utilityDestroyWrite,
) (uint32, bool) {
	var earliest uint32
	found := false
	for _, write := range writes {
		if write.Name != "" && write.Name != "Multicast Destroy Smoke" {
			continue
		}
		if write.TimeMS <= openMS || write.TimeMS > closeMS {
			continue
		}
		if !found || write.TimeMS < earliest {
			earliest = write.TimeMS
			found = true
		}
	}
	return earliest, found
}

func poisonCloudFuelStopMS(
	openMS, closeMS uint32,
	writes []utilityFuelWrite,
) (uint32, bool) {
	draining := false
	sawStart := false
	for _, write := range writes {
		if write.Draining == nil {
			continue
		}
		if write.TimeMS < openMS {
			draining = *write.Draining
			continue
		}
		if write.TimeMS > closeMS {
			break
		}
		next := *write.Draining
		if next && !draining {
			sawStart = true
		}
		if sawStart && draining && !next {
			return write.TimeMS, true
		}
		draining = next
	}
	return 0, false
}
