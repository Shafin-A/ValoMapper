"use client";

import { DrawLine } from "@/lib/types";
import {
  createContext,
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from "react";

const CurrentStrokeContext = createContext<DrawLine | null>(null);
const SetCurrentStrokeContext = createContext<
  Dispatch<SetStateAction<DrawLine | null>>
>(() => {});

export const DrawingPreviewProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentStroke, setCurrentStroke] = useState<DrawLine | null>(null);

  return (
    <SetCurrentStrokeContext.Provider value={setCurrentStroke}>
      <CurrentStrokeContext.Provider value={currentStroke}>
        {children}
      </CurrentStrokeContext.Provider>
    </SetCurrentStrokeContext.Provider>
  );
};

export const useCurrentStroke = () => useContext(CurrentStrokeContext);

export const useSetCurrentStroke = () => useContext(SetCurrentStrokeContext);
