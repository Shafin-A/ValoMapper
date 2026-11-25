package replay

import "math"

func readUtilityMovementData(
	exportDir string,
	segments []utilitySegment,
	splineChildrenByParent map[uint32][]uint32,
	ownerWrites map[uint32][]utilityOwnerWrite,
) (
	map[uint32][]movementRow,
	map[uint32][]utilityPathWrite,
	map[uint32][]utilitySplineWrite,
	error,
) {
	movementGUIDs := make(map[uint32]struct{})
	replicatedMovementGUIDs := make(map[uint32]struct{})
	splineMovementGUIDs := make(map[uint32]struct{})
	for _, segment := range segments {
		if segment.life.class.mobile {
			movementGUIDs[segment.life.guid] = struct{}{}
		}
		if segment.life.class.followsParent && segment.life.attachParent != 0 {
			movementGUIDs[segment.life.attachParent] = struct{}{}
		}
		if segment.life.class.visionCone &&
			hasActiveUtilityControllerWrite(ownerWrites[segment.life.guid]) {
			movementGUIDs[segment.life.guid] = struct{}{}
		}
		if segment.life.class.replicatedMovement {
			replicatedMovementGUIDs[segment.life.guid] = struct{}{}
		}
		if segment.life.class.splineMovement && !segment.life.class.splineChild {
			if segment.life.class.splineFromChildren {
				for _, childGUID := range splineChildrenByParent[segment.life.guid] {
					splineMovementGUIDs[childGUID] = struct{}{}
				}
			} else {
				splineMovementGUIDs[segment.life.guid] = struct{}{}
			}
		}
	}

	movementByGUID := make(map[uint32][]movementRow, len(movementGUIDs))
	if len(movementGUIDs) > 0 {
		_, err := readParquetRows(exportDir+"/movement.parquet", func(rows []movementRow) error {
			for i := range rows {
				row := rows[i]
				if _, wanted := movementGUIDs[row.CharacterNetGUID]; !wanted ||
					!isFinite32(row.PosX) || !isFinite32(row.PosY) ||
					math.Abs(float64(row.PosX)) > 1_000_000 ||
					math.Abs(float64(row.PosY)) > 1_000_000 {
					continue
				}
				movementByGUID[row.CharacterNetGUID] = append(
					movementByGUID[row.CharacterNetGUID], row,
				)
			}
			return nil
		})
		if err != nil {
			return nil, nil, nil, err
		}
	}

	replicatedMovementByGUID, splineMovementByGUID, err := readUtilityReplicatedMovement(
		exportDir,
		replicatedMovementGUIDs,
		splineMovementGUIDs,
	)
	if err != nil {
		return nil, nil, nil, err
	}

	return movementByGUID, replicatedMovementByGUID, splineMovementByGUID, nil
}
