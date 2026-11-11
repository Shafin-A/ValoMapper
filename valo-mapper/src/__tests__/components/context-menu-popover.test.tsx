import { fireEvent, render, screen } from "@testing-library/react";
import { ContextMenuPopover } from "@/components/canvas/context-menu-popover";
import type { AgentCanvas, TextCanvas } from "@/lib/types";

jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

const textItem: TextCanvas = {
  id: "text-1",
  x: 0,
  y: 0,
  text: "Hello",
  width: 120,
  height: 40,
};

const agentItem: AgentCanvas = {
  id: "agent-1",
  name: "Jett",
  role: "Duelist",
  isAlly: true,
  x: 0,
  y: 0,
};

const renderMenu = (
  overrides: Partial<React.ComponentProps<typeof ContextMenuPopover>> = {},
) => {
  const onOpenChange = jest.fn();
  const onDuplicate = jest.fn();
  const onDelete = jest.fn();

  render(
    <ContextMenuPopover
      open
      x={0}
      y={0}
      itemType="text"
      selectedCount={1}
      currentItem={textItem}
      onOpenChange={onOpenChange}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      {...overrides}
    />,
  );

  return { onOpenChange, onDuplicate, onDelete };
};

describe("ContextMenuPopover mobile actions", () => {
  it("shows labelled actions in a sheet and closes after selecting one", () => {
    const { onDelete, onOpenChange } = renderMenu();

    expect(screen.getByText("Duplicate text")).toBeInTheDocument();
    expect(screen.getByText("Delete text")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Delete text"));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("includes agent-specific actions", () => {
    renderMenu({
      itemType: "agent",
      currentItem: agentItem,
      onToggleAlly: jest.fn(),
      onToggleAgentDead: jest.fn(),
      onSwapAbility: jest.fn(),
    });

    expect(screen.getByText("Make enemy")).toBeInTheDocument();
    expect(screen.getByText("Kill agent")).toBeInTheDocument();
    expect(screen.getByText("Swap ability")).toBeInTheDocument();
    expect(screen.getByText("Delete agent")).toBeInTheDocument();
  });
});
