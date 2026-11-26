import { act, renderHook } from "@testing-library/react";

import { useAgentsSidebarDrag } from "@/components/agents-sidebar/use-agents-sidebar-drag";
import type { Agent } from "@/lib/types";

const agent: Agent = { name: "Jett", role: "Duelist" };

const createPointerMove = (x: number, y: number) => {
  const event = new Event("pointermove");
  Object.assign(event, {
    pointerId: 1,
    clientX: x,
    clientY: y,
  });
  return event;
};

const createPointerDown = (pointerType: "mouse" | "pen" | "touch" = "mouse") =>
  ({
    pointerType,
    button: 0,
    pointerId: 1,
    clientX: 0,
    clientY: 0,
    preventDefault: jest.fn(),
    currentTarget: { setPointerCapture: jest.fn() },
  }) as unknown as React.PointerEvent;

describe("useAgentsSidebarDrag", () => {
  it("opens the dragged agent's abilities", () => {
    const setSelectedAgentAbilities = jest.fn();

    const { result } = renderHook(() =>
      useAgentsSidebarDrag({
        selectedCanvasIcon: null,
        setSelectedCanvasIcon: jest.fn(),
        isSidebarDragActive: false,
        setIsSidebarDragActive: jest.fn(),
        isAlly: true,
        agentsOnCanvas: [],
        abilitiesOnCanvas: [],
        setAgentsOnCanvas: jest.fn(),
        setAbilitiesOnCanvas: jest.fn(),
        setToolIconsOnCanvas: jest.fn(),
        setSelectedAgentAbilities,
        setIsDrawMode: jest.fn(),
        setEditingTextId: jest.fn(),
      }),
    );

    act(() => {
      result.current.handleIconPointerDown(createPointerDown(), agent, "agent");
    });

    act(() => {
      window.dispatchEvent(createPointerMove(12, 12));
    });

    expect(setSelectedAgentAbilities).toHaveBeenCalledWith(agent);
  });

  it("starts a drag from a pen pointer", () => {
    const setIsSidebarDragActive = jest.fn();
    const setSelectedAgentAbilities = jest.fn();

    const { result } = renderHook(() =>
      useAgentsSidebarDrag({
        selectedCanvasIcon: null,
        setSelectedCanvasIcon: jest.fn(),
        isSidebarDragActive: false,
        setIsSidebarDragActive,
        isAlly: true,
        agentsOnCanvas: [],
        abilitiesOnCanvas: [],
        setAgentsOnCanvas: jest.fn(),
        setAbilitiesOnCanvas: jest.fn(),
        setToolIconsOnCanvas: jest.fn(),
        setSelectedAgentAbilities,
        setIsDrawMode: jest.fn(),
        setEditingTextId: jest.fn(),
      }),
    );

    act(() => {
      result.current.handleIconPointerDown(
        createPointerDown("pen"),
        agent,
        "agent",
      );
    });

    act(() => {
      window.dispatchEvent(createPointerMove(12, 12));
    });

    expect(setIsSidebarDragActive).toHaveBeenCalledWith(true);
    expect(setSelectedAgentAbilities).toHaveBeenCalledWith(agent);
  });
});
