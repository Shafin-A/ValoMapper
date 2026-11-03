package replay

import "sort"

func sortUtilityFuelWrites(writes map[uint32][]utilityFuelWrite) {
	for guid := range writes {
		sort.SliceStable(writes[guid], func(i, j int) bool {
			if writes[guid][i].TimeMS != writes[guid][j].TimeMS {
				return writes[guid][i].TimeMS < writes[guid][j].TimeMS
			}
			return writes[guid][i].PacketID < writes[guid][j].PacketID
		})
	}
}

func sortUtilityDestroyWrites(writes map[uint32][]utilityDestroyWrite) {
	for guid := range writes {
		sort.SliceStable(writes[guid], func(i, j int) bool {
			if writes[guid][i].TimeMS != writes[guid][j].TimeMS {
				return writes[guid][i].TimeMS < writes[guid][j].TimeMS
			}
			return writes[guid][i].PacketID < writes[guid][j].PacketID
		})
	}
}

func sortUtilityActivationWrites(writes map[uint32][]utilityActivationWrite) {
	for guid := range writes {
		sort.SliceStable(writes[guid], func(i, j int) bool {
			if writes[guid][i].TimeMS != writes[guid][j].TimeMS {
				return writes[guid][i].TimeMS < writes[guid][j].TimeMS
			}
			return writes[guid][i].PacketID < writes[guid][j].PacketID
		})
	}
}

func utilityFuelByOwner(
	writes map[uint32][]utilityFuelWrite,
	index *playerIndex,
	puuidBySubject map[string]string,
) map[string][]utilityFuelWrite {
	if index == nil || len(writes) == 0 {
		return nil
	}
	byOwner := make(map[string][]utilityFuelWrite)
	for actor, actorWrites := range writes {
		subject, ok := index.subjectForCharacter(actor)
		if !ok {
			continue
		}
		owner := puuidBySubject[subject]
		if owner == "" {
			continue
		}
		byOwner[owner] = append(byOwner[owner], actorWrites...)
	}
	for owner := range byOwner {
		sort.SliceStable(byOwner[owner], func(i, j int) bool {
			if byOwner[owner][i].TimeMS != byOwner[owner][j].TimeMS {
				return byOwner[owner][i].TimeMS < byOwner[owner][j].TimeMS
			}
			return byOwner[owner][i].PacketID < byOwner[owner][j].PacketID
		})
	}
	return byOwner
}
