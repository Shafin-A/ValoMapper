import type { ConnectingLine, MapSide } from "@/lib/types";
import type { ReplayFrame, ReplayMatch, ReplayRound } from "../types";
import { REPLAY_PREFIX } from "./constants";
import { toReplayCanvasPoint } from "./geometry";
import { getFramePlayer, getReplayAgentId } from "./players";

export const buildLatestKillLine = ({
  match,
  round,
  frame,
  mapSide,
}: {
  match: ReplayMatch;
  round: ReplayRound;
  frame: ReplayFrame;
  mapSide: MapSide;
}): ConnectingLine | null => {
  let latestKillIndex = -1;

  round.eventLog.forEach((event, index) => {
    if (
      event.eventType === "kill" &&
      event.timeSinceRoundStartMillis <= frame.timeMs
    ) {
      latestKillIndex = index;
    }
  });

  if (latestKillIndex < 0) {
    return null;
  }

  const event = round.eventLog[latestKillIndex];
  if (event.eventType !== "kill" || !event.victimLocation) {
    return null;
  }

  const killerIndex = match.players.findIndex(
    (player) => player.puuid === event.killerPuuid,
  );
  const victimIndex = match.players.findIndex(
    (player) => player.puuid === event.victimPuuid,
  );

  if (killerIndex < 0 || victimIndex < 0) {
    return null;
  }

  const killerFramePlayer = getFramePlayer(frame, event.killerPuuid);
  const start = killerFramePlayer
    ? toReplayCanvasPoint({
        mapId: match.mapId,
        mapSide,
        position: { x: killerFramePlayer.x, y: killerFramePlayer.y },
      })
    : null;
  const end = toReplayCanvasPoint({
    mapId: match.mapId,
    mapSide,
    position: event.victimLocation,
  });

  if (!start || !end) {
    return null;
  }

  const killer = match.players[killerIndex];

  return {
    id: `${REPLAY_PREFIX}kill-${round.roundNumber}-${latestKillIndex}`,
    fromId: getReplayAgentId(killerIndex),
    toId: getReplayAgentId(victimIndex),
    strokeColor: killer.teamId === "Blue" ? "#42EEC7" : "#FF4655",
    strokeWidth: 3,
    isInteractive: false,
  };
};
