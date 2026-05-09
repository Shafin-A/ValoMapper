import type { AgentCanvas, ToolIconCanvas } from "@/lib/types";
import {
  canAttachToolIcon,
  findToolIconAttachmentTarget,
  getToolIconAttachmentPosition,
} from "@/lib/tool-icon";

describe("tool-icon-utils", () => {
  const agentSettings = {
    scale: 48,
    borderOpacity: 0,
    borderWidth: 1,
    radius: 0,
    allyColor: "#fff",
    enemyColor: "#000",
  };

  const agent: AgentCanvas = {
    id: "agent-1",
    name: "Jett",
    isAlly: true,
    x: 200,
    y: 200,
    role: "Duelist",
  };

  it("identifies gun and shield tool icons as attachable", () => {
    expect(
      canAttachToolIcon({
        id: "tool-1",
        name: "vandal",
        isAlly: true,
        x: 0,
        y: 0,
        width: 20,
        height: 20,
      } as ToolIconCanvas),
    ).toBe(true);

    expect(
      canAttachToolIcon({
        id: "tool-2",
        name: "phantom_shield",
        isAlly: true,
        x: 0,
        y: 0,
        width: 20,
        height: 20,
      } as ToolIconCanvas),
    ).toBe(true);

    expect(
      canAttachToolIcon({
        id: "tool-3",
        name: "smoke",
        isAlly: true,
        x: 0,
        y: 0,
        width: 20,
        height: 20,
      } as ToolIconCanvas),
    ).toBe(false);
  });

  it("finds the nearest agent target when a tool icon is placed inside the agent box", () => {
    const target = findToolIconAttachmentTarget({
      point: { x: 202, y: 205 },
      agentsOnCanvas: [agent],
      agentsSettings: agentSettings,
    });

    expect(target).toEqual(agent);
  });

  it("returns null when the tool icon is outside the agent bounds", () => {
    const target = findToolIconAttachmentTarget({
      point: { x: 300, y: 300 },
      agentsOnCanvas: [agent],
      agentsSettings: agentSettings,
    });

    expect(target).toBeNull();
  });

  it("positions guns at the bottom-left and shields at the top-right of an agent", () => {
    const gunIcon: ToolIconCanvas = {
      id: "gun",
      name: "vandal",
      x: 0,
      y: 0,
      width: 16,
      height: 16,
    };

    const shieldIcon: ToolIconCanvas = {
      id: "shield",
      name: "operator_shield",
      x: 0,
      y: 0,
      width: 16,
      height: 16,
    };

    expect(
      getToolIconAttachmentPosition(gunIcon, agent.x, agent.y, agentSettings),
    ).toEqual({
      x: agent.x - agentSettings.scale / 2 - 8,
      y: agent.y + agentSettings.scale / 2 + 8,
    });

    expect(
      getToolIconAttachmentPosition(
        shieldIcon,
        agent.x,
        agent.y,
        agentSettings,
      ),
    ).toEqual({
      x: agent.x + agentSettings.scale / 2 + 8,
      y: agent.y - agentSettings.scale / 2 - 8,
    });
  });
});
