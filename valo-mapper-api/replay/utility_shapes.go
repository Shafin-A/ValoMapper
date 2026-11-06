package replay

import (
	"sort"
	"strings"
)

// utilityShapeCollector reads both ground-volume cells and Sage node grids in a
// single pass over fields.parquet. A replay can contain both routes, and the
// field table is large enough that scanning it twice is noticeable.
type utilityShapeCollector struct {
	pitTargets    map[uint32]struct{}
	groundMembers map[uint32]groundVolumeIdentity
	pitCells      map[uint32]map[int32]groundVolumeCell
	slowTargets   map[uint32]*utilityActor
	slowWindows   map[slowOrbWindowKey]*slowOrbWindow
}

func readUtilityShapes(
	exportDir, build string,
	actors map[uint32]*utilityActor,
) (map[uint32]*utilityGroundVolume, map[uint32]*utilityGroundVolume) {
	collector := &utilityShapeCollector{
		pitTargets:  make(map[uint32]struct{}),
		pitCells:    make(map[uint32]map[int32]groundVolumeCell),
		slowTargets: make(map[uint32]*utilityActor),
		slowWindows: make(map[slowOrbWindowKey]*slowOrbWindow),
	}
	declaredOK := groundVolumeDeclaredBuilds[build]
	for guid, actor := range actors {
		class := classBasename(actor.Class)
		if declaredOK && groundVolumeTargetClasses[class] {
			collector.pitTargets[guid] = struct{}{}
		}
		if class == slowOrbPatchClass {
			collector.slowTargets[guid] = actor
		}
	}
	if len(collector.pitTargets) == 0 && len(collector.slowTargets) == 0 {
		return nil, nil
	}
	if len(collector.pitTargets) > 0 {
		members, ok := readGroundVolumeMembers(exportDir)
		if !ok {
			collector.pitTargets = nil
		} else {
			collector.groundMembers = members
		}
	}

	_, err := readParquetRows(exportDir+"/fields.parquet", func(rows []fieldRow) error {
		for i := range rows {
			row := &rows[i]
			collector.consumeGroundVolumeRow(row)
			collector.consumeSlowOrbRow(row)
		}
		return nil
	})
	if err != nil {
		return nil, nil
	}
	return collector.buildGroundVolumeShapes(), collector.buildSlowOrbShapes()
}

func (c *utilityShapeCollector) consumeGroundVolumeRow(row *fieldRow) {
	if c.groundMembers == nil || row.FieldName == nil {
		return
	}
	if *row.FieldName != groundVolumeTailField ||
		row.GroupPath != groundVolumeClassGroup || row.Handle != 0 {
		return
	}
	if _, target := c.pitTargets[row.ActorNetGUID]; !target {
		return
	}
	cells, err := decodeGroundVolumeWindow(row.RawBits, row.BitCount, c.groundMembers)
	if err != nil {
		return
	}
	actorCells := c.pitCells[row.ActorNetGUID]
	if actorCells == nil {
		actorCells = make(map[int32]groundVolumeCell)
		c.pitCells[row.ActorNetGUID] = actorCells
	}
	for _, cell := range cells {
		actorCells[cell.itemID] = cell
	}
}

func (c *utilityShapeCollector) buildGroundVolumeShapes() map[uint32]*utilityGroundVolume {
	result := make(map[uint32]*utilityGroundVolume, len(c.pitCells))
	for actor, cells := range c.pitCells {
		ids := make([]int, 0, len(cells))
		for id := range cells {
			ids = append(ids, int(id))
		}
		sort.Ints(ids)
		shape := &utilityGroundVolume{}
		for _, rawID := range ids {
			cell := cells[int32(rawID)]
			if !cell.active || cell.status == 3 || len(cell.points) < 3 {
				continue
			}
			polygon := make([]Position, 0, len(cell.points))
			for _, point := range cell.points {
				position := Position{X: point.x, Y: point.y}
				if !validUtilityPosition(position) {
					polygon = nil
					break
				}
				polygon = append(polygon, position)
			}
			if len(polygon) < 3 {
				continue
			}
			shape.polygons = append(shape.polygons, polygon)
			for _, segment := range cell.exterior {
				if int(segment.begin) >= len(polygon) || int(segment.end) >= len(polygon) {
					continue
				}
				shape.boundary = append(shape.boundary, []Position{
					polygon[segment.begin],
					polygon[segment.end],
				})
			}
		}
		if len(shape.polygons) > 0 {
			result[actor] = shape
		}
	}
	return result
}

func (c *utilityShapeCollector) consumeSlowOrbRow(row *fieldRow) {
	if len(c.slowTargets) == 0 || row.FieldName == nil {
		return
	}
	if _, target := c.slowTargets[row.ActorNetGUID]; !target {
		return
	}
	name := *row.FieldName
	dot := strings.LastIndex(name, ".")
	if dot < 0 {
		return
	}
	prefix, leaf := name[:dot], name[dot+1:]
	if !strings.HasSuffix(prefix, slowOrbNodeGridName) {
		return
	}
	key := slowOrbWindowKey{
		actor:    row.ActorNetGUID,
		packetID: row.PacketID,
		timeMS:   row.TimeMS,
	}
	window := c.slowWindows[key]
	if window == nil {
		window = &slowOrbWindow{
			actor:    key.actor,
			packetID: key.packetID,
			timeMS:   key.timeMS,
		}
		c.slowWindows[key] = window
	}
	switch leaf {
	case "X":
		window.xs = append(window.xs, fieldRowInt32(row))
	case "Y":
		window.ys = append(window.ys, fieldRowInt32(row))
	case "LineSize":
		window.lineSize = fieldRowInt32(row)
	case "bPatchIsValid":
		window.valid = fieldRowBool(row)
		window.hasValid = true
	case "NodeArray":
		window.raw = row.RawBits
		window.bitCount = row.BitCount
		window.hasNodes = true
	}
}

func (c *utilityShapeCollector) buildSlowOrbShapes() map[uint32]*utilityGroundVolume {
	latest := make(map[uint32]*slowOrbWindow)
	for _, window := range c.slowWindows {
		current := latest[window.actor]
		if current == nil || window.timeMS > current.timeMS ||
			(window.timeMS == current.timeMS && window.packetID > current.packetID) {
			latest[window.actor] = window
		}
	}
	result := make(map[uint32]*utilityGroundVolume, len(latest))
	for actorGUID, window := range latest {
		shape := buildSlowOrbShape(c.slowTargets[actorGUID], window)
		if shape != nil {
			result[actorGUID] = shape
		}
	}
	return result
}
