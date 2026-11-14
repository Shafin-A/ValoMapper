import type {
  AbilityCanvas,
  AgentCanvas,
  ConnectingLine,
  DrawLine,
  IconSettings,
  ImageCanvas,
  MapOption,
  MapSide,
  TextCanvas,
  ToolIconCanvas,
  UndoableState,
} from "@/lib/types";
import {
  AbilityMessageData,
  AgentMessageData,
  ConnectingLineMessageData,
  DrawLineMessageData,
  FullSyncData,
  ImageMessageData,
  ImageMoveMessageData,
  MapChangedData,
  PhaseChangedData,
  RemoveElementData,
  SettingsChangedData,
  SideChangedData,
  TextMessageData,
  ToolIconMessageData,
  WS_MESSAGE_TYPES,
  WSMessage,
} from "@/lib/websocket-types";

type Setter<T> = (updater: (previous: T[]) => T[]) => void;

interface WSMessageHandlerDependencies {
  currentPhaseIndex: number;
  editingTextId: string | null;
  setAgentsOnCanvas: Setter<AgentCanvas>;
  setAbilitiesOnCanvas: Setter<AbilityCanvas>;
  setDrawLines: Setter<DrawLine>;
  setConnectingLines: Setter<ConnectingLine>;
  setTextsOnCanvas: Setter<TextCanvas>;
  setImagesOnCanvas: Setter<ImageCanvas>;
  setToolIconsOnCanvas: Setter<ToolIconCanvas>;
  setSelectedMap: (selectedMap: MapOption) => void;
  setMapSide: (mapSide: MapSide) => void;
  switchToPhase: (phaseIndex: number) => void;
  resetState: (resetAllPhases?: boolean) => void;
  rotateCanvasItemsForSideSwap: () => void;
  applyRemoteState: (state: UndoableState) => void;
  updateAgentsSettings: (settings: Partial<IconSettings>) => void;
  updateAbilitiesSettings: (settings: Partial<IconSettings>) => void;
}

type MessageHandler = (message: WSMessage) => void;

const upsertById = <T extends { id: string }>(items: T[], item: T): T[] => {
  const existing = items.find((candidate) => candidate.id === item.id);

  if (existing) {
    return items.map((candidate) =>
      candidate.id === item.id ? item : candidate,
    );
  }

  return [...items, item];
};

export const createWSMessageHandler = ({
  currentPhaseIndex,
  editingTextId,
  setAgentsOnCanvas,
  setAbilitiesOnCanvas,
  setDrawLines,
  setConnectingLines,
  setTextsOnCanvas,
  setImagesOnCanvas,
  setToolIconsOnCanvas,
  setSelectedMap,
  setMapSide,
  switchToPhase,
  resetState,
  rotateCanvasItemsForSideSwap,
  applyRemoteState,
  updateAgentsSettings,
  updateAbilitiesSettings,
}: WSMessageHandlerDependencies): MessageHandler => {
  const currentPhaseOnly =
    (handler: (message: WSMessage) => void): MessageHandler =>
    (message) => {
      if (
        message.phaseIndex === undefined ||
        message.phaseIndex === currentPhaseIndex
      ) {
        handler(message);
      }
    };

  const handlers: Partial<Record<WSMessage["type"], MessageHandler>> = {
    [WS_MESSAGE_TYPES.AGENT_ADDED]: currentPhaseOnly((message) => {
      const { agent } = message.data as AgentMessageData;
      setAgentsOnCanvas((previous) => upsertById(previous, agent));
    }),
    [WS_MESSAGE_TYPES.AGENT_MOVED]: currentPhaseOnly((message) => {
      const { agent } = message.data as AgentMessageData;
      setAgentsOnCanvas((previous) => upsertById(previous, agent));
    }),
    [WS_MESSAGE_TYPES.AGENT_REMOVED]: currentPhaseOnly((message) => {
      const { id } = message.data as RemoveElementData;
      setAgentsOnCanvas((previous) =>
        previous.filter((agent) => agent.id !== id),
      );
    }),
    [WS_MESSAGE_TYPES.ABILITY_ADDED]: currentPhaseOnly((message) => {
      const { ability } = message.data as AbilityMessageData;
      setAbilitiesOnCanvas((previous) => upsertById(previous, ability));
    }),
    [WS_MESSAGE_TYPES.ABILITY_MOVED]: currentPhaseOnly((message) => {
      const { ability } = message.data as AbilityMessageData;
      setAbilitiesOnCanvas((previous) => upsertById(previous, ability));
    }),
    [WS_MESSAGE_TYPES.ABILITY_REMOVED]: currentPhaseOnly((message) => {
      const { id } = message.data as RemoveElementData;
      setAbilitiesOnCanvas((previous) =>
        previous.filter((ability) => ability.id !== id),
      );
    }),
    [WS_MESSAGE_TYPES.LINE_DRAWN]: currentPhaseOnly((message) => {
      const { line } = message.data as DrawLineMessageData;
      setDrawLines((previous) => upsertById(previous, line));
    }),
    [WS_MESSAGE_TYPES.LINE_REMOVED]: currentPhaseOnly((message) => {
      const { id } = message.data as RemoveElementData;
      setDrawLines((previous) => previous.filter((line) => line.id !== id));
    }),
    [WS_MESSAGE_TYPES.CONN_LINE_ADDED]: currentPhaseOnly((message) => {
      const { line } = message.data as ConnectingLineMessageData;
      setConnectingLines((previous) => upsertById(previous, line));
    }),
    [WS_MESSAGE_TYPES.CONN_LINE_UPDATED]: currentPhaseOnly((message) => {
      const { line } = message.data as ConnectingLineMessageData;
      setConnectingLines((previous) => upsertById(previous, line));
    }),
    [WS_MESSAGE_TYPES.CONN_LINE_REMOVED]: currentPhaseOnly((message) => {
      const { id } = message.data as RemoveElementData;
      setConnectingLines((previous) =>
        previous.filter((line) => line.id !== id),
      );
    }),
    [WS_MESSAGE_TYPES.TEXT_ADDED]: currentPhaseOnly((message) => {
      const { text } = message.data as TextMessageData;

      if (editingTextId === text.id) {
        return;
      }

      setTextsOnCanvas((previous) => upsertById(previous, text));
    }),
    [WS_MESSAGE_TYPES.TEXT_UPDATED]: currentPhaseOnly((message) => {
      const { text } = message.data as TextMessageData;

      if (editingTextId === text.id) {
        return;
      }

      setTextsOnCanvas((previous) => upsertById(previous, text));
    }),
    [WS_MESSAGE_TYPES.TEXT_REMOVED]: currentPhaseOnly((message) => {
      const { id } = message.data as RemoveElementData;
      setTextsOnCanvas((previous) => previous.filter((text) => text.id !== id));
    }),
    [WS_MESSAGE_TYPES.IMAGE_ADDED]: currentPhaseOnly((message) => {
      const { image } = message.data as ImageMessageData;
      setImagesOnCanvas((previous) => upsertById(previous, image));
    }),
    [WS_MESSAGE_TYPES.IMAGE_MOVED]: currentPhaseOnly((message) => {
      const { image } = message.data as ImageMoveMessageData;
      setImagesOnCanvas((previous) =>
        previous.map((item) =>
          item.id === image.id
            ? {
                ...item,
                x: image.x,
                y: image.y,
                width: image.width,
                height: image.height,
              }
            : item,
        ),
      );
    }),
    [WS_MESSAGE_TYPES.IMAGE_UPDATED]: currentPhaseOnly((message) => {
      const { image } = message.data as ImageMessageData;
      setImagesOnCanvas((previous) => upsertById(previous, image));
    }),
    [WS_MESSAGE_TYPES.IMAGE_REMOVED]: currentPhaseOnly((message) => {
      const { id } = message.data as RemoveElementData;
      setImagesOnCanvas((previous) =>
        previous.filter((image) => image.id !== id),
      );
    }),
    [WS_MESSAGE_TYPES.TOOL_ICON_ADDED]: currentPhaseOnly((message) => {
      const { toolIcon } = message.data as ToolIconMessageData;
      setToolIconsOnCanvas((previous) => upsertById(previous, toolIcon));
    }),
    [WS_MESSAGE_TYPES.TOOL_ICON_MOVED]: currentPhaseOnly((message) => {
      const { toolIcon } = message.data as ToolIconMessageData;
      setToolIconsOnCanvas((previous) => upsertById(previous, toolIcon));
    }),
    [WS_MESSAGE_TYPES.TOOL_ICON_REMOVED]: currentPhaseOnly((message) => {
      const { id } = message.data as RemoveElementData;
      setToolIconsOnCanvas((previous) =>
        previous.filter((toolIcon) => toolIcon.id !== id),
      );
    }),
    [WS_MESSAGE_TYPES.MAP_CHANGED]: (message) => {
      const { selectedMap } = message.data as MapChangedData;
      setSelectedMap(selectedMap);
      resetState(true);
    },
    [WS_MESSAGE_TYPES.SIDE_CHANGED]: (message) => {
      const { mapSide } = message.data as SideChangedData;
      setMapSide(mapSide);
      rotateCanvasItemsForSideSwap();
    },
    [WS_MESSAGE_TYPES.PHASE_CHANGED]: (message) => {
      const { phaseIndex } = message.data as PhaseChangedData;

      if (phaseIndex !== currentPhaseIndex) {
        switchToPhase(phaseIndex);
      }
    },
    [WS_MESSAGE_TYPES.FULL_SYNC]: (message) => {
      if (editingTextId) {
        return;
      }

      const data = message.data as FullSyncData;

      applyRemoteState({
        phases: data.phases,
        selectedMap: data.selectedMap,
        mapSide: data.mapSide,
        currentPhaseIndex: data.currentPhaseIndex,
        editedPhases: data.editedPhases,
      });
    },
    [WS_MESSAGE_TYPES.SETTINGS_CHANGED]: (message) => {
      const settings = message.data as SettingsChangedData;

      if (settings.agentsSettings) {
        updateAgentsSettings(settings.agentsSettings);
      }

      if (settings.abilitiesSettings) {
        updateAbilitiesSettings(settings.abilitiesSettings);
      }
    },
  };

  return (message) => {
    const handler = handlers[message.type];

    if (!handler) {
      console.warn(`[WebSocket] Unknown message type: ${message.type}`);
      return;
    }

    handler(message);
  };
};
