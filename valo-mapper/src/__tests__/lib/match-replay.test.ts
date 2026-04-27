import { buildMatchReplayRoundStates } from "@/lib/match-replay";
import { MatchSummaryResponse } from "@/lib/types";

describe("buildMatchReplayRoundStates", () => {
  it("builds cumulative replay phases from match telemetry", () => {
    const matchSummary: MatchSummaryResponse = {
      matchId: "match-1",
      mapId: "/Game/Maps/Ascent/Ascent",
      mapName: "Ascent",
      queueLabel: "Competitive",
      gameStartAt: "2024-01-01T00:00:00Z",
      viewer: {
        puuid: "viewer-puuid",
        bestRoundNumber: 1,
      },
      totalRounds: 1,
      players: [
        {
          puuid: "viewer-puuid",
          gameName: "Viewer",
          tagLine: "NA1",
          teamId: "Blue",
          characterId: "agent-1",
          characterName: "Jett",
        },
        {
          puuid: "enemy-puuid",
          gameName: "Enemy",
          tagLine: "NA1",
          teamId: "Red",
          characterId: "agent-2",
          characterName: "Sage",
        },
      ],
      rounds: [
        {
          roundNumber: 1,
          winningTeam: "Blue",
          roundResultCode: "Elimination",
          scoreAfterRound: {
            red: 0,
            blue: 1,
          },
          playerStats: [],
          eventLog: [
            {
              eventType: "kill",
              timeSinceRoundStartMillis: 9000,
              killerPuuid: "viewer-puuid",
              victimPuuid: "enemy-puuid",
              victimLocation: { x: -1200, y: 1800 },
              playerLocations: [
                {
                  puuid: "viewer-puuid",
                  viewRadians: 0,
                  location: { x: -1000, y: 1500 },
                },
                {
                  puuid: "enemy-puuid",
                  viewRadians: 0,
                  location: { x: -1200, y: 1800 },
                },
              ],
            },
            {
              eventType: "spike_planted",
              timeSinceRoundStartMillis: 25000,
              planterPuuid: "viewer-puuid",
              plantLocation: { x: -500, y: 2400 },
              plantPlayerLocations: [
                {
                  puuid: "viewer-puuid",
                  viewRadians: 0,
                  location: { x: -700, y: 2200 },
                },
                {
                  puuid: "enemy-puuid",
                  viewRadians: 0,
                  location: { x: -1400, y: 1800 },
                },
              ],
            },
          ],
        },
      ],
    };

    const replayState =
      buildMatchReplayRoundStates(matchSummary).roundStates[1];

    expect(replayState.selectedMap.id).toBe("ascent");
    expect(replayState.mapSide).toBe("attack");
    expect(replayState.phases).toHaveLength(2);
    expect(replayState.editedPhases).toEqual([0, 1]);
    expect(replayState.phases[0].agentsOnCanvas).toHaveLength(2);
    expect(replayState.phases[0].drawLines).toHaveLength(0);
    expect(replayState.phases[0].connectingLines).toHaveLength(1);
    expect(replayState.phases[0].connectingLines[0]).toMatchObject({
      fromId: "replay-agent-viewer-puuid",
      toId: "replay-agent-enemy-puuid",
      isInteractive: false,
    });
    expect(replayState.phases[0].agentsOnCanvas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "replay-agent-enemy-puuid",
          isGray: true,
        }),
      ]),
    );
    expect(replayState.phases[1].connectingLines).toHaveLength(0);
    expect(replayState.phases[1].imagesOnCanvas).toHaveLength(0);
    expect(replayState.phases[1].toolIconsOnCanvas).toHaveLength(1);
    expect(replayState.phases[1].toolIconsOnCanvas[0]).toMatchObject({
      id: "replay-spike-1",
      name: "spike",
      width: 32,
      height: 32,
    });
  });
});
