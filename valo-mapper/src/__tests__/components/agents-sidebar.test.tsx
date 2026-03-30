import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoleTabs } from "@/components/agents-sidebar/role-tabs";
import { AgentsGrid } from "@/components/agents-sidebar/agents-grid";
import AgentAbilities from "@/components/agents-sidebar/agent-abilities";
import { Agent, AbilityIconDefinition } from "@/lib/types";
import { Tabs } from "@/components/ui/tabs";
import { useCanvas } from "@/contexts/canvas-context";
import {
  getAbilityVariants,
  resolveAbilityVariant,
} from "@/lib/consts/configs/agent-icon/consts";

jest.mock("@/contexts/settings-context", () => ({
  useSettings: () => ({
    agentsSettings: {
      allyColor: "#00ff00",
      enemyColor: "#ff0000",
    },
  }),
}));

jest.mock("@/contexts/canvas-context", () => ({
  useCanvas: jest.fn(),
}));

const mockUseCanvas = jest.mocked(useCanvas);

const defaultCanvasMock = {
  agentsOnCanvas: [
    { id: "1", name: "Jett", role: "Duelist", isAlly: true, x: 0, y: 0 },
    {
      id: "2",
      name: "Sage",
      role: "Sentinel",
      isAlly: false,
      x: 100,
      y: 100,
    },
  ],
  isAlly: true,
  selectedCanvasIcon: null,
  setSelectedCanvasIcon: jest.fn(),
};

describe("RoleTabs", () => {
  const renderRoleTabs = (selectedRole: string = "All") => {
    return render(
      <Tabs defaultValue={selectedRole}>
        <RoleTabs selectedRole={selectedRole} />
      </Tabs>,
    );
  };

  it("should render all role tabs", () => {
    renderRoleTabs();

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(5);
  });

  it("should render tabs for each role", () => {
    renderRoleTabs();

    expect(screen.getByRole("tab", { name: "Duelist" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Controller" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Initiator" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sentinel" })).toBeInTheDocument();
  });

  it("should have correct aria-selected for active tab", () => {
    renderRoleTabs("Duelist");

    const duelistTab = screen.getByRole("tab", { name: "Duelist" });
    expect(duelistTab).toHaveAttribute("aria-selected", "true");
  });

  it("should have first tab selected by default", () => {
    renderRoleTabs("All");

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  });
});

describe("AgentsGrid", () => {
  const mockOnAgentClick = jest.fn();
  const mockSetSelectedAgentAbilities = jest.fn();

  const defaultProps = {
    selectedRole: "All" as const,
    onMap: false,
    onAgentClick: mockOnAgentClick,
    onAgentPointerDown: jest.fn(),
    selectedAgentAbilities: null,
    setSelectedAgentAbilities: mockSetSelectedAgentAbilities,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCanvas.mockReturnValue(
      defaultCanvasMock as unknown as ReturnType<typeof useCanvas>,
    );
  });

  it("should render agents grid", () => {
    render(<AgentsGrid {...defaultProps} />);

    expect(screen.getByRole("img", { name: "Jett" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sage" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Brimstone" })).toBeInTheDocument();
  });

  it("should filter agents by role", () => {
    render(<AgentsGrid {...defaultProps} selectedRole="Duelist" />);

    expect(screen.getByRole("img", { name: "Jett" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Raze" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Sage" })).not.toBeInTheDocument();
  });

  it("should call onAgentClick when agent is clicked", async () => {
    const user = userEvent.setup();
    render(<AgentsGrid {...defaultProps} />);

    const jettImage = screen.getByRole("img", { name: "Jett" });
    await user.click(jettImage);

    expect(mockOnAgentClick).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Jett", role: "Duelist" }),
    );
  });

  it("should show empty state when filtering by onMap with no matching agents", () => {
    mockUseCanvas.mockReturnValue({
      ...defaultCanvasMock,
      agentsOnCanvas: [],
    } as unknown as ReturnType<typeof useCanvas>);

    render(<AgentsGrid {...defaultProps} onMap={true} />);

    expect(screen.getByText("No agents on map")).toBeInTheDocument();
  });

  it("should show role-specific empty state message", () => {
    mockUseCanvas.mockReturnValue({
      ...defaultCanvasMock,
      agentsOnCanvas: [],
    } as unknown as ReturnType<typeof useCanvas>);

    render(
      <AgentsGrid {...defaultProps} selectedRole="Duelist" onMap={true} />,
    );

    expect(screen.getByText("No duelist agents on map")).toBeInTheDocument();
  });
});

describe("AgentAbilities", () => {
  const mockOnClose = jest.fn();
  const mockOnAbilityClick = jest.fn();

  const mockAgent: Agent = { name: "Brimstone", role: "Controller" };

  const defaultProps = {
    agent: mockAgent,
    sidebarOpen: true,
    onClose: mockOnClose,
    onAbilityClick: mockOnAbilityClick,
    onAbilitySwap: jest.fn(),
    resolveAbility: (ability: AbilityIconDefinition) =>
      resolveAbilityVariant(ability, 0),
    onAbilityPointerDown: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCanvas.mockReturnValue(
      defaultCanvasMock as unknown as ReturnType<typeof useCanvas>,
    );
  });

  it("should render close button and ability images", () => {
    render(<AgentAbilities {...defaultProps} />);

    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Stim Beacon" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Incendiary" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sky Smoke" })).toBeInTheDocument();
  });

  it("should not render when agent is null", () => {
    const { container } = render(
      <AgentAbilities {...defaultProps} agent={null} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should not render when sidebar is closed", () => {
    const { container } = render(
      <AgentAbilities {...defaultProps} sidebarOpen={false} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should call onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    render(<AgentAbilities {...defaultProps} />);

    const closeButton = screen.getByRole("button", { name: /close/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("shows a swap button for abilities with alternate variants", () => {
    render(
      <AgentAbilities
        {...defaultProps}
        agent={{ name: "Miks", role: "Initiator" }}
      />,
    );

    expect(
      screen.getByRole("button", { name: /swap to m-pulse heal/i }),
    ).toBeInTheDocument();
  });

  it("swap button cycles ability variant and click uses the new variant", async () => {
    const user = userEvent.setup();
    const onAbilitySwap = jest.fn();
    const variantIndices: Record<string, number> = {};

    const resolveAbility = (ability: AbilityIconDefinition) => {
      const idx = variantIndices[ability.id] ?? 0;
      return resolveAbilityVariant(ability, idx);
    };

    const handleAbilitySwap = (ability: AbilityIconDefinition) => {
      const variants = getAbilityVariants(ability);
      const current = variantIndices[ability.id] ?? 0;
      variantIndices[ability.id] = (current + 1) % variants.length;
      onAbilitySwap(ability);
    };

    const { rerender } = render(
      <AgentAbilities
        {...defaultProps}
        agent={{ name: "Miks", role: "Initiator" }}
        onAbilitySwap={handleAbilitySwap}
        resolveAbility={resolveAbility}
      />,
    );

    // default shows M-Pulse Concuss
    expect(
      screen.getByRole("img", { name: "M-Pulse Concuss" }),
    ).toBeInTheDocument();

    // press swap
    await user.click(
      screen.getByRole("button", { name: /swap to m-pulse heal/i }),
    );

    // re-render with updated resolve
    rerender(
      <AgentAbilities
        {...defaultProps}
        agent={{ name: "Miks", role: "Initiator" }}
        onAbilitySwap={handleAbilitySwap}
        resolveAbility={resolveAbility}
      />,
    );

    // now shows M-Pulse Heal
    expect(
      screen.getByRole("img", { name: "M-Pulse Heal" }),
    ).toBeInTheDocument();

    // clicking places M-Pulse Heal
    await user.click(screen.getByRole("img", { name: "M-Pulse Heal" }));

    expect(onAbilitySwap).toHaveBeenCalledWith(
      expect.objectContaining({ id: "mpulse" }),
    );
    expect(mockOnAbilityClick).toHaveBeenCalledWith(
      expect.objectContaining({ name: "M-Pulse Heal", action: "miks_heal" }),
    );
  });
});
