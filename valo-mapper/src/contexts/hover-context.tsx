"use client";

import {
  createContext,
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from "react";

const HoveredElementIdContext = createContext<string | null>(null);
const SetHoveredElementIdContext = createContext<
  Dispatch<SetStateAction<string | null>>
>(() => {});

export const HoveredElementProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);

  return (
    <SetHoveredElementIdContext.Provider value={setHoveredElementId}>
      <HoveredElementIdContext.Provider value={hoveredElementId}>
        {children}
      </HoveredElementIdContext.Provider>
    </SetHoveredElementIdContext.Provider>
  );
};

export const useHoveredElementId = () => useContext(HoveredElementIdContext);

export const useSetHoveredElementId = () =>
  useContext(SetHoveredElementIdContext);
