"use client";

import type {
  AbilityCanvas,
  AgentCanvas,
  ConnectingLine,
  DrawLine,
  ImageCanvas,
  TextCanvas,
  ToolIconCanvas,
} from "@/lib/types";
import {
  createContext,
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  useContext,
  useMemo,
  type Context,
} from "react";

export interface CanvasAgentsContextValue {
  agentsOnCanvas: AgentCanvas[];
  setAgentsOnCanvas: Dispatch<SetStateAction<AgentCanvas[]>>;
}

export interface CanvasAbilitiesContextValue {
  abilitiesOnCanvas: AbilityCanvas[];
  setAbilitiesOnCanvas: Dispatch<SetStateAction<AbilityCanvas[]>>;
}

export interface CanvasDrawLinesContextValue {
  drawLines: DrawLine[];
  setDrawLines: Dispatch<SetStateAction<DrawLine[]>>;
}

export interface CanvasConnectingLinesContextValue {
  connectingLines: ConnectingLine[];
  setConnectingLines: Dispatch<SetStateAction<ConnectingLine[]>>;
}

export interface CanvasTextsContextValue {
  textsOnCanvas: TextCanvas[];
  setTextsOnCanvas: Dispatch<SetStateAction<TextCanvas[]>>;
}

export interface CanvasImagesContextValue {
  imagesOnCanvas: ImageCanvas[];
  setImagesOnCanvas: Dispatch<SetStateAction<ImageCanvas[]>>;
}

export interface CanvasToolIconsContextValue {
  toolIconsOnCanvas: ToolIconCanvas[];
  setToolIconsOnCanvas: Dispatch<SetStateAction<ToolIconCanvas[]>>;
}

export interface CanvasEntitiesContextValue
  extends CanvasAgentsContextValue,
    CanvasAbilitiesContextValue,
    CanvasDrawLinesContextValue,
    CanvasConnectingLinesContextValue,
    CanvasTextsContextValue,
    CanvasImagesContextValue,
    CanvasToolIconsContextValue {}

export type CanvasEntitiesSnapshot = Pick<
  CanvasEntitiesContextValue,
  | "agentsOnCanvas"
  | "abilitiesOnCanvas"
  | "drawLines"
  | "connectingLines"
  | "textsOnCanvas"
  | "imagesOnCanvas"
  | "toolIconsOnCanvas"
>;

export const EMPTY_CANVAS_ENTITIES: CanvasEntitiesSnapshot = {
  agentsOnCanvas: [],
  abilitiesOnCanvas: [],
  drawLines: [],
  connectingLines: [],
  textsOnCanvas: [],
  imagesOnCanvas: [],
  toolIconsOnCanvas: [],
};

const CanvasAgentsContext = createContext<
  CanvasAgentsContextValue | undefined
>(undefined);
const CanvasAbilitiesContext = createContext<
  CanvasAbilitiesContextValue | undefined
>(undefined);
const CanvasDrawLinesContext = createContext<
  CanvasDrawLinesContextValue | undefined
>(undefined);
const CanvasConnectingLinesContext = createContext<
  CanvasConnectingLinesContextValue | undefined
>(undefined);
const CanvasTextsContext = createContext<CanvasTextsContextValue | undefined>(
  undefined,
);
const CanvasImagesContext = createContext<CanvasImagesContextValue | undefined>(
  undefined,
);
const CanvasToolIconsContext = createContext<
  CanvasToolIconsContextValue | undefined
>(undefined);

const useRequiredContext = <T,>(
  context: Context<T | undefined>,
  hookName: string,
): T => {
  const value = useContext(context);
  if (value === undefined) {
    throw new Error(`${hookName} must be used within a CanvasProvider`);
  }
  return value;
};

export const useCanvasAgents = () =>
  useRequiredContext(CanvasAgentsContext, "useCanvasAgents");

export const useCanvasAbilities = () =>
  useRequiredContext(CanvasAbilitiesContext, "useCanvasAbilities");

export const useCanvasDrawLines = () =>
  useRequiredContext(CanvasDrawLinesContext, "useCanvasDrawLines");

export const useCanvasConnectingLines = () =>
  useRequiredContext(CanvasConnectingLinesContext, "useCanvasConnectingLines");

export const useCanvasTexts = () =>
  useRequiredContext(CanvasTextsContext, "useCanvasTexts");

export const useCanvasImages = () =>
  useRequiredContext(CanvasImagesContext, "useCanvasImages");

export const useCanvasToolIcons = () =>
  useRequiredContext(CanvasToolIconsContext, "useCanvasToolIcons");

export const useCanvasEntities = (): CanvasEntitiesContextValue => {
  const agents = useCanvasAgents();
  const abilities = useCanvasAbilities();
  const drawLines = useCanvasDrawLines();
  const connectingLines = useCanvasConnectingLines();
  const texts = useCanvasTexts();
  const images = useCanvasImages();
  const toolIcons = useCanvasToolIcons();

  return useMemo(
    () => ({
      ...agents,
      ...abilities,
      ...drawLines,
      ...connectingLines,
      ...texts,
      ...images,
      ...toolIcons,
    }),
    [
      agents,
      abilities,
      drawLines,
      connectingLines,
      texts,
      images,
      toolIcons,
    ],
  );
};

export const CanvasEntityProviders: FC<{
  agents: CanvasAgentsContextValue;
  abilities: CanvasAbilitiesContextValue;
  drawLines: CanvasDrawLinesContextValue;
  connectingLines: CanvasConnectingLinesContextValue;
  texts: CanvasTextsContextValue;
  images: CanvasImagesContextValue;
  toolIcons: CanvasToolIconsContextValue;
  children: ReactNode;
}> = ({
  agents,
  abilities,
  drawLines,
  connectingLines,
  texts,
  images,
  toolIcons,
  children,
}) => (
  <CanvasAgentsContext.Provider value={agents}>
    <CanvasAbilitiesContext.Provider value={abilities}>
      <CanvasDrawLinesContext.Provider value={drawLines}>
        <CanvasConnectingLinesContext.Provider value={connectingLines}>
          <CanvasTextsContext.Provider value={texts}>
            <CanvasImagesContext.Provider value={images}>
              <CanvasToolIconsContext.Provider value={toolIcons}>
                {children}
              </CanvasToolIconsContext.Provider>
            </CanvasImagesContext.Provider>
          </CanvasTextsContext.Provider>
        </CanvasConnectingLinesContext.Provider>
      </CanvasDrawLinesContext.Provider>
    </CanvasAbilitiesContext.Provider>
  </CanvasAgentsContext.Provider>
);
