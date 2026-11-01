package replay

import (
	"path/filepath"
	"testing"

	"github.com/parquet-go/parquet-go"
)

// TestScanFieldsPairsParticipantsPerActor guards against joining a subject
// from one player's combat report to a team written by another actor. The
// prefix is only unique within an actor, so both rows must be keyed by both.
func TestScanFieldsPairsParticipantsPerActor(t *testing.T) {
	dir := t.TempDir()
	prefix := "Rounds[0].Reports[0].Interactions[0]"
	subjectA := "00000000-0000-0000-0000-00000000000a"
	subjectB := "00000000-0000-0000-0000-00000000000b"
	red := "Red"
	blue := "Blue"
	subjectAName := prefix + ".ParticipantSubject"
	subjectBName := prefix + ".ParticipantSubject"
	teamAName := prefix + ".ParticipantTeamName"
	teamBName := prefix + ".ParticipantTeamName"
	group := "/Game/GameModes/Bomb/Bomb_CombatReportComponent.Bomb_CombatReportComponent_C"

	rows := []fieldRow{
		{ActorNetGUID: 10, TimeMS: 1000, PacketID: 1, GroupPath: group, FieldName: &subjectAName, ValueStr: &subjectA},
		{ActorNetGUID: 20, TimeMS: 1000, PacketID: 2, GroupPath: group, FieldName: &subjectBName, ValueStr: &subjectB},
		{ActorNetGUID: 10, TimeMS: 1000, PacketID: 3, GroupPath: group, FieldName: &teamAName, ValueStr: &red},
		{ActorNetGUID: 20, TimeMS: 1000, PacketID: 4, GroupPath: group, FieldName: &teamBName, ValueStr: &blue},
	}
	if err := parquet.WriteFile(filepath.Join(dir, "fields.parquet"), rows); err != nil {
		t.Fatalf("write fields: %v", err)
	}

	scan, err := scanFields(dir)
	if err != nil {
		t.Fatalf("scanFields: %v", err)
	}
	if got := scan.Teams[subjectA]; got != "Red" {
		t.Errorf("subject A team = %q, want Red", got)
	}
	if got := scan.Teams[subjectB]; got != "Blue" {
		t.Errorf("subject B team = %q, want Blue", got)
	}
	if len(scan.TeamWarnings) != 0 {
		t.Errorf("unexpected team warnings: %v", scan.TeamWarnings)
	}
}

func TestBuildRoundLogsEmitsSpikeExplodedWithoutAPlayer(t *testing.T) {
	windows := []roundWindow{{RoundNumber: 1, StartMS: 1000, EndMS: 5000}}
	events := &eventScan{Explodes: []rawSpike{{TimeMS: 4000}}}
	fields := &fieldScan{State: newFieldStateRows()}
	warnings := newWarnings()

	logs := buildRoundLogs(windows, nil, &playerIndex{}, events, fields, &stateScan{}, warnings)

	log := logs[1]
	if log == nil || len(log.Events) != 1 {
		t.Fatalf("events = %+v, want one spike_exploded", log)
	}
	event := log.Events[0]
	if event.EventType != "spike_exploded" || event.TimeSinceRoundStartMillis != 3000 {
		t.Errorf("event = %+v, want spike_exploded at 3000", event)
	}
	if event.KillerPuuid != "" || event.VictimPuuid != "" || event.PlanterPuuid != "" {
		t.Errorf("spike_exploded carried a player field: %+v", event)
	}
}
