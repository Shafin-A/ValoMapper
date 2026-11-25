package replay

type netGuidRow struct {
	NetGUID      uint32  `parquet:"net_guid"`
	Path         string  `parquet:"path"`
	OuterNetGUID *uint32 `parquet:"outer_net_guid,optional"`
}

type stateActorRow struct {
	TimeMS       uint32   `parquet:"time_ms"`
	PacketID     uint32   `parquet:"packet_id"`
	ActorNetGUID uint32   `parquet:"actor_net_guid"`
	Event        string   `parquet:"event"`
	ClassPath    *string  `parquet:"class_path,optional"`
	SpawnX       *float32 `parquet:"spawn_x,optional"`
	SpawnY       *float32 `parquet:"spawn_y,optional"`
	SpawnZ       *float32 `parquet:"spawn_z,optional"`
	SpawnYaw     *float32 `parquet:"spawn_yaw,optional"`
}

type actorMoment struct {
	TimeMS   uint32
	PacketID uint32
}

// pawnInterval is one manifest pawn's open interval. A missing open starts at
// the beginning of the match; a missing close runs to the end.
type pawnInterval struct {
	OpenMS   uint32
	HasOpen  bool
	CloseMS  uint32
	HasClose bool
}

func (i pawnInterval) activeAt(timeMS uint32) bool {
	if i.HasOpen && timeMS < i.OpenMS {
		return false
	}
	if i.HasClose && timeMS >= i.CloseMS {
		return false
	}
	return true
}

type stateActorView struct {
	ClassByActor map[uint32]string
	OpenByActor  map[uint32]actorMoment
	CloseByActor map[uint32]actorMoment
	// SpawnByActor keeps the actor's open position. Pickup actors use it as the
	// spike's ground position while the bomb is loose.
	SpawnByActor map[uint32]Position
	// PawnIntervals bounds every manifest pawn by its actor open and close
	// rows, so a reconnect's old pawn cannot keep writing poses.
	PawnIntervals map[uint32]pawnInterval
}

// activePawn returns the first manifest pawn active at timeMS. ambiguous is
// true when a second pawn is active at the same instant; the caller keeps the
// first pawn's sample.
func (v *stateActorView) activePawn(index *playerIndex, subject string, timeMS uint32) (pawn uint32, ok bool, ambiguous bool) {
	if v == nil || index == nil {
		return 0, false, false
	}
	for _, candidate := range index.pawnsForSubject(subject) {
		interval, known := v.PawnIntervals[candidate]
		if !known || !interval.activeAt(timeMS) {
			continue
		}
		if !ok {
			pawn = candidate
			ok = true
			continue
		}
		ambiguous = true
	}
	return pawn, ok, ambiguous
}

func (v *stateActorView) pawnActiveAt(pawn uint32, timeMS uint32) (active bool, known bool) {
	if v == nil {
		return false, false
	}
	interval, known := v.PawnIntervals[pawn]
	if !known {
		return false, false
	}
	return interval.activeAt(timeMS), true
}

func readNetGuids(exportDir string) (map[uint32]string, map[uint32]uint32, error) {
	paths := make(map[uint32]string)
	outer := make(map[uint32]uint32)
	_, err := readParquetRows(exportDir+"/net_guids.parquet", func(rows []netGuidRow) error {
		for i := range rows {
			row := &rows[i]
			paths[row.NetGUID] = row.Path
			if row.OuterNetGUID != nil {
				outer[row.NetGUID] = *row.OuterNetGUID
			}
		}
		return nil
	})
	if err != nil {
		return nil, nil, err
	}
	return paths, outer, nil
}

func readStateActors(exportDir string, index *playerIndex) (*stateActorView, error) {
	view := &stateActorView{
		ClassByActor:  make(map[uint32]string),
		OpenByActor:   make(map[uint32]actorMoment),
		CloseByActor:  make(map[uint32]actorMoment),
		SpawnByActor:  make(map[uint32]Position),
		PawnIntervals: make(map[uint32]pawnInterval),
	}
	_, err := readParquetRows(exportDir+"/actors.parquet", func(rows []stateActorRow) error {
		for i := range rows {
			row := &rows[i]
			if row.ClassPath != nil && *row.ClassPath != "" {
				view.ClassByActor[row.ActorNetGUID] = *row.ClassPath
			}
			if row.SpawnX != nil && row.SpawnY != nil &&
				isFinite32(*row.SpawnX) && isFinite32(*row.SpawnY) {
				if _, exists := view.SpawnByActor[row.ActorNetGUID]; !exists {
					view.SpawnByActor[row.ActorNetGUID] = Position{
						X: float64(*row.SpawnX),
						Y: float64(*row.SpawnY),
					}
				}
			}
			switch row.Event {
			case "open":
				if _, exists := view.OpenByActor[row.ActorNetGUID]; !exists {
					view.OpenByActor[row.ActorNetGUID] = actorMoment{TimeMS: row.TimeMS, PacketID: row.PacketID}
				}
			case "close":
				view.CloseByActor[row.ActorNetGUID] = actorMoment{TimeMS: row.TimeMS, PacketID: row.PacketID}
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	buildPawnIntervals(view, index)
	return view, nil
}

// buildPawnIntervals fills one interval per manifest pawn from the actor rows
// already read. Pawns with neither an open nor a close row stay unbounded and
// do not narrow the single-pawn path.
func buildPawnIntervals(view *stateActorView, index *playerIndex) {
	if view == nil || index == nil {
		return
	}
	if view.PawnIntervals == nil {
		view.PawnIntervals = make(map[uint32]pawnInterval)
	}
	for _, pawns := range index.pawnsBySubject {
		for _, pawn := range pawns {
			interval := pawnInterval{}
			if open, ok := view.OpenByActor[pawn]; ok {
				interval.OpenMS = open.TimeMS
				interval.HasOpen = true
			}
			if closeMoment, ok := view.CloseByActor[pawn]; ok {
				interval.CloseMS = closeMoment.TimeMS
				interval.HasClose = true
			}
			view.PawnIntervals[pawn] = interval
		}
	}
}
