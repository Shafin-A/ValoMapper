package replay

// scanState builds the state timelines. The 1.9 M-row fields file is not read
// here: its rows were already collected by scanFields. Only the small net_guids
// and actors tables are read.
func scanState(exportDir string, index *playerIndex, raw *fieldStateRows) (*stateScan, error) {
	scan := &stateScan{Timelines: make(map[string][]stateSample)}
	if raw == nil {
		rows := newFieldStateRows()
		raw = &rows
	}

	paths, outer, err := readNetGuids(exportDir)
	if err != nil {
		return nil, err
	}
	actors, err := readStateActors(exportDir, index)
	if err != nil {
		return nil, err
	}
	scan.Actors = actors
	scan.Outer = outer
	scan.Paths = paths

	ownersByActor, instigatorsByActor := collectStateWrites(raw)
	applyStateAbilityStats(scan, raw, index, actors, ownersByActor, instigatorsByActor)

	builders := newTimelineBuilders(index)
	itemSubjects := buildArmourTimelineEvents(scan, raw, actors, outer, index, builders)
	buildHealthTimelineEvents(scan, raw, paths, outer, actors, index, builders, itemSubjects)
	buildCreditTimelineEvents(scan, raw, index, builders)
	buildWeaponTimelineEvents(scan, raw, paths, actors, index, builders)

	finalizeStateScan(scan, builders, raw, paths, actors, index, outer)

	return scan, nil
}

func collectStateWrites(raw *fieldStateRows) (map[uint32][]stateWrite, map[uint32][]stateWrite) {
	ownersByActor := make(map[uint32][]stateWrite)
	for _, write := range raw.OwnerWrites {
		ownersByActor[write.Actor] = append(ownersByActor[write.Actor], write)
	}
	instigatorsByActor := make(map[uint32][]stateWrite)
	for _, write := range raw.InstigatorWrites {
		instigatorsByActor[write.Actor] = append(instigatorsByActor[write.Actor], write)
	}
	sortStateWrites(ownersByActor)
	sortStateWrites(instigatorsByActor)
	return ownersByActor, instigatorsByActor
}

func applyStateAbilityStats(
	scan *stateScan,
	raw *fieldStateRows,
	index *playerIndex,
	actors *stateActorView,
	ownersByActor map[uint32][]stateWrite,
	instigatorsByActor map[uint32][]stateWrite,
) {
	scan.AbilityCharges, scan.AbilityChargeWrites,
		scan.AbilityChargeUnresolved, scan.AbilityChargeUnknownSlot =
		buildAbilityChargeSamples(raw, index, actors)

	scan.UltimateSamples, scan.UltimateUnresolved = buildUltimateSamples(
		raw.UltimatePoints, raw.UltimateActive, index,
	)
	scan.UltimatePointWrites = len(raw.UltimatePoints)
	scan.UltimateActiveWrites = len(raw.UltimateActive)

	scan.ChargeFolders = collectChargeFolders(
		raw.ChargeActors, actors, index, ownersByActor, instigatorsByActor,
	)
	scan.Cooldowns, scan.CooldownUnresolved, scan.CooldownUnknownSlot =
		buildCooldownWindows(
			raw.Cooldowns, index, actors, ownersByActor, instigatorsByActor,
		)
	scan.CooldownWrites = len(raw.Cooldowns)
	scan.CooldownWindows = len(scan.Cooldowns)
}

func newTimelineBuilders(index *playerIndex) map[string]*timelineBuilder {
	builders := make(map[string]*timelineBuilder, len(index.bySubject))
	for subject := range index.bySubject {
		builders[subject] = &timelineBuilder{}
	}
	return builders
}

func finalizeStateScan(
	scan *stateScan,
	builders map[string]*timelineBuilder,
	raw *fieldStateRows,
	paths map[uint32]string,
	actors *stateActorView,
	index *playerIndex,
	outer map[uint32]uint32,
) {
	for subject, builder := range builders {
		scan.Timelines[subject] = builder.build()
	}

	scan.Kills = resolveKillData(raw.KillData, paths, index, outer)
	scan.Hits = resolveDamageHits(raw.Hits, paths, actors.ClassByActor, index, outer)

	appendStateWarnings(scan)
}

func appendStateWarnings(scan *stateScan) {
	scan.Warnings = append(scan.Warnings,
		coverageWarning(scan.HPUnresolvedSection,
			scan.HPWrites+scan.HPNonPlayer+scan.HPUnresolvedSection,
			"Some player health changes could not be attributed and were skipped."))
	scan.Warnings = append(scan.Warnings,
		coverageWarning(scan.WeaponUnresolved,
			scan.WeaponWrites+scan.WeaponUnresolved,
			"Some equipped weapons could not be identified and were omitted."))
	scan.Warnings = append(scan.Warnings,
		coverageWarning(scan.ArmorUnowned, scan.ArmorItems,
			"Some armour items could not be attributed to a player and were skipped."))
}
