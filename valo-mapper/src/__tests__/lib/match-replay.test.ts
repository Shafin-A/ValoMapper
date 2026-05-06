import { buildMatchReplayRoundStates } from "@/lib/match-replay";
import { transformRiotWorldToCanvasPoint } from "@/lib/map-positioning";
import {
  getMapCallouts,
  MAP_SIZE,
  VIRTUAL_HEIGHT,
  VIRTUAL_WIDTH,
} from "@/lib/consts";
import { MatchSummaryResponse } from "@/lib/types";

const REPLAY_VIEW_VECTOR_LENGTH = 100;

const getExpectedReplayConeRotation = ({
  mapId,
  mapSide,
  position,
  viewRadians,
}: {
  mapId: string;
  mapSide: "attack" | "defense";
  position: { x: number; y: number };
  viewRadians: number;
}) => {
  const transform = getMapCallouts(mapId);
  if (!transform) {
    throw new Error(`Missing callouts for ${mapId}`);
  }

  const mapPosition = {
    x: (VIRTUAL_WIDTH - MAP_SIZE) / 2,
    y: (VIRTUAL_HEIGHT - MAP_SIZE) / 2,
  };

  const origin = transformRiotWorldToCanvasPoint({
    position,
    transform,
    mapPosition,
    mapSide,
  });
  const facingPoint = transformRiotWorldToCanvasPoint({
    position: {
      x: position.x + Math.cos(viewRadians) * REPLAY_VIEW_VECTOR_LENGTH,
      y: position.y + Math.sin(viewRadians) * REPLAY_VIEW_VECTOR_LENGTH,
    },
    transform,
    mapPosition,
    mapSide,
  });

  return (
    (Math.atan2(facingPoint.y - origin.y, facingPoint.x - origin.x) * 180) /
    Math.PI
  );
};

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
            {
              eventType: "spike_defused",
              timeSinceRoundStartMillis: 40000,
              defuserPuuid: "viewer-puuid",
              defuseLocation: { x: 100, y: 100 },
              defusePlayerLocations: [
                {
                  puuid: "viewer-puuid",
                  viewRadians: 0,
                  location: { x: -500, y: 2400 },
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
    expect(replayState.mapSide).toBe("defense");
    expect(replayState.phases).toHaveLength(3);
    expect(replayState.editedPhases).toEqual([0, 1, 2]);
    expect(replayState.phases[0].agentsOnCanvas).toHaveLength(2);
    expect(replayState.phases[0].drawLines).toHaveLength(0);
    expect(replayState.phases[0].connectingLines).toHaveLength(1);
    expect(replayState.phases[0].connectingLines[0]).toMatchObject({
      id: "replay-kill-1-0",
      fromId: "replay-agent-0",
      toId: "replay-agent-1",
      isInteractive: false,
    });
    expect(replayState.phases[0].agentsOnCanvas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "replay-agent-1",
          isGray: true,
        }),
      ]),
    );
    expect(replayState.phases[2].connectingLines).toHaveLength(0);
    expect(replayState.phases[2].imagesOnCanvas).toHaveLength(0);
    expect(replayState.phases[2].toolIconsOnCanvas).toHaveLength(1);
    expect(replayState.phases[2].toolIconsOnCanvas[0]).toMatchObject({
      id: "replay-spike-1",
      name: "spike",
      width: 32,
      height: 32,
    });

    expect(replayState.phases[2].toolIconsOnCanvas[0]).toMatchObject({
      x: replayState.phases[1].toolIconsOnCanvas[0].x,
      y: replayState.phases[1].toolIconsOnCanvas[0].y,
    });

    expect(replayState.phases[2].agentsOnCanvas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "replay-agent-1",
        }),
      ]),
    );

    const mapPosition = {
      x: (VIRTUAL_WIDTH - MAP_SIZE) / 2,
      y: (VIRTUAL_HEIGHT - MAP_SIZE) / 2,
    };

    const plantTransform = getMapCallouts("ascent");
    expect(plantTransform).toBeDefined();

    const plantCanvasPoint = transformRiotWorldToCanvasPoint({
      position: { x: -500, y: 2400 },
      transform: plantTransform!,
      mapPosition,
      mapSide: "defense",
    });

    expect(replayState.phases[1].toolIconsOnCanvas[0]).toMatchObject({
      x: plantCanvasPoint.x,
      y: plantCanvasPoint.y,
    });
  });

  it("attaches 103 vision cones to replay agents using player view radians", () => {
    const viewerViewRadians = Math.PI / 2;
    const enemyViewRadians = Math.PI;

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
                  viewRadians: viewerViewRadians,
                  location: { x: -1000, y: 1500 },
                },
                {
                  puuid: "enemy-puuid",
                  viewRadians: enemyViewRadians,
                  location: { x: -1200, y: 1800 },
                },
              ],
            },
          ],
        },
      ],
    };

    const replayState =
      buildMatchReplayRoundStates(matchSummary).roundStates[1];
    const firstPhase = replayState.phases[0];
    const viewerAgent = firstPhase.agentsOnCanvas.find(
      (agent) => agent.id === "replay-agent-0",
    );
    const enemyAgent = firstPhase.agentsOnCanvas.find(
      (agent) => agent.id === "replay-agent-1",
    );
    const viewerCone = firstPhase.abilitiesOnCanvas.find(
      (ability) => ability.attachedToId === "replay-agent-0",
    );
    const enemyCone = firstPhase.abilitiesOnCanvas.find(
      (ability) => ability.attachedToId === "replay-agent-1",
    );

    if (!viewerAgent || !enemyAgent || !viewerCone || !enemyCone) {
      throw new Error("Expected replay agents and attached vision cones");
    }

    expect(firstPhase.abilitiesOnCanvas).toHaveLength(2);
    expect(viewerCone).toMatchObject({
      id: "replay-agent-0-cone",
      name: "Vision Cone 103",
      action: "vision_cone_103",
      attachedToId: "replay-agent-0",
      iconOnly: false,
      showOuterCircle: true,
      x: viewerAgent.x,
      y: viewerAgent.y,
    });
    expect(enemyCone).toMatchObject({
      id: "replay-agent-1-cone",
      name: "Vision Cone 103",
      action: "vision_cone_103",
      attachedToId: "replay-agent-1",
      iconOnly: false,
      showOuterCircle: true,
      x: enemyAgent.x,
      y: enemyAgent.y,
    });

    expect(viewerCone.currentRotation).toBeCloseTo(
      getExpectedReplayConeRotation({
        mapId: "ascent",
        mapSide: "defense",
        position: { x: -1000, y: 1500 },
        viewRadians: viewerViewRadians,
      }),
      5,
    );
    expect(enemyCone.currentRotation).toBeCloseTo(
      getExpectedReplayConeRotation({
        mapId: "ascent",
        mapSide: "defense",
        position: { x: -1200, y: 1800 },
        viewRadians: enemyViewRadians,
      }),
      5,
    );
  });

  it("restores a previously killed player when they appear again in a later kill event", () => {
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
              eventType: "kill",
              timeSinceRoundStartMillis: 13000,
              killerPuuid: "viewer-puuid",
              victimPuuid: "enemy-puuid",
              victimLocation: { x: -1300, y: 1900 },
              playerLocations: [
                {
                  puuid: "viewer-puuid",
                  viewRadians: 0,
                  location: { x: -1100, y: 1600 },
                },
              ],
            },
          ],
        },
      ],
    };

    const replayState =
      buildMatchReplayRoundStates(matchSummary).roundStates[1];

    expect(replayState.phases[1].agentsOnCanvas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "replay-agent-1" }),
      ]),
    );
  });

  it("uses database-safe replay ids when player identifiers are long", () => {
    const longViewerPuuid = `viewer-${"a".repeat(80)}`;
    const longEnemyPuuid = `enemy-${"b".repeat(80)}`;

    const matchSummary: MatchSummaryResponse = {
      matchId: "match-1",
      mapId: "/Game/Maps/Ascent/Ascent",
      mapName: "Ascent",
      queueLabel: "Competitive",
      gameStartAt: "2024-01-01T00:00:00Z",
      viewer: {
        puuid: longViewerPuuid,
        bestRoundNumber: 1,
      },
      totalRounds: 1,
      players: [
        {
          puuid: longViewerPuuid,
          gameName: "Viewer",
          tagLine: "NA1",
          teamId: "Blue",
          characterId: "agent-1",
          characterName: "Jett",
        },
        {
          puuid: longEnemyPuuid,
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
              killerPuuid: longViewerPuuid,
              victimPuuid: longEnemyPuuid,
              victimLocation: { x: -1200, y: 1800 },
              playerLocations: [
                {
                  puuid: longViewerPuuid,
                  viewRadians: 0,
                  location: { x: -1000, y: 1500 },
                },
                {
                  puuid: longEnemyPuuid,
                  viewRadians: 0,
                  location: { x: -1200, y: 1800 },
                },
              ],
            },
          ],
        },
      ],
    };

    const replayState =
      buildMatchReplayRoundStates(matchSummary).roundStates[1];

    expect(replayState.phases[0].agentsOnCanvas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "replay-agent-0" }),
        expect.objectContaining({ id: "replay-agent-1" }),
      ]),
    );

    const replayKillLine = replayState.phases[0].connectingLines[0];
    expect(replayKillLine).toMatchObject({
      id: "replay-kill-1-0",
      fromId: "replay-agent-0",
      toId: "replay-agent-1",
    });

    expect(
      replayState.phases[0].agentsOnCanvas.every(
        (agent) => agent.id.length <= 50,
      ),
    ).toBe(true);
    expect(replayKillLine.id.length).toBeLessThanOrEqual(50);
    expect(replayKillLine.fromId.length).toBeLessThanOrEqual(50);
    expect(replayKillLine.toId.length).toBeLessThanOrEqual(50);
  });
});
