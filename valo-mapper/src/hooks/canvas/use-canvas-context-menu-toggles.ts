import {
  canAttachVisionCone,
  isVisionConeAction,
} from "@/lib/vision-cone-utils";
import {
  findAbilityDefinitionByAction,
  getAbilityVariants,
} from "@/lib/consts/configs/agent-icon/consts";
import type { AbilityCanvas, AgentCanvas } from "@/lib/types";
import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import type {
  CanvasContextMenuNotifications,
  CanvasContextMenuSession,
} from "./canvas-context-menu-types";

type ToggleNotifications = Pick<
  CanvasContextMenuNotifications,
  "notifyAgentMoved" | "notifyAbilityMoved"
>;

interface UseCanvasContextMenuTogglesOptions extends ToggleNotifications {
  session: CanvasContextMenuSession;
  setAgentsOnCanvas: Dispatch<SetStateAction<AgentCanvas[]>>;
  setAbilitiesOnCanvas: Dispatch<SetStateAction<AbilityCanvas[]>>;
}

export const useCanvasContextMenuToggles = ({
  session,
  setAgentsOnCanvas,
  setAbilitiesOnCanvas,
  notifyAgentMoved,
  notifyAbilityMoved,
}: UseCanvasContextMenuTogglesOptions) => {
  const {
    contextMenu,
    getEntities,
    getAnchorEntry,
    closeContextMenu,
  } = session;

  const handleToggleAlly = useCallback(() => {
    if (!contextMenu.open) return;

    const { agentsOnCanvas, abilitiesOnCanvas } = getEntities();
    const anchor = getAnchorEntry();
    if (
      !anchor ||
      (anchor.type !== "agent" && anchor.type !== "ability")
    ) {
      return;
    }

    const nextIsAlly = !anchor.item.isAlly;
    const agentIds = new Set(
      contextMenu.targetItems
        .filter((target) => target.type === "agent")
        .map((target) => target.id),
    );
    const abilityIds = new Set(
      contextMenu.targetItems
        .filter((target) => target.type === "ability")
        .map((target) => target.id),
    );

    if (agentIds.size > 0) {
      const updatedAgents = agentsOnCanvas
        .filter((agent) => agentIds.has(agent.id))
        .map((agent) => ({ ...agent, isAlly: nextIsAlly }));

      setAgentsOnCanvas((previous) =>
        previous.map((agent) =>
          agentIds.has(agent.id)
            ? { ...agent, isAlly: nextIsAlly }
            : agent,
        ),
      );
      updatedAgents.forEach(notifyAgentMoved);
    }

    if (abilityIds.size > 0) {
      const updatedAbilities = abilitiesOnCanvas
        .filter((ability) => abilityIds.has(ability.id))
        .map((ability) => ({ ...ability, isAlly: nextIsAlly }));

      setAbilitiesOnCanvas((previous) =>
        previous.map((ability) =>
          abilityIds.has(ability.id)
            ? { ...ability, isAlly: nextIsAlly }
            : ability,
        ),
      );
      updatedAbilities.forEach(notifyAbilityMoved);
    }

    closeContextMenu();
  }, [
    closeContextMenu,
    contextMenu,
    getAnchorEntry,
    getEntities,
    notifyAbilityMoved,
    notifyAgentMoved,
    setAbilitiesOnCanvas,
    setAgentsOnCanvas,
  ]);

  const handleToggleAgentDead = useCallback(() => {
    if (!contextMenu.open) return;

    const { agentsOnCanvas } = getEntities();
    const anchor = getAnchorEntry();
    if (!anchor || anchor.type !== "agent") return;

    const nextIsGray = !anchor.item.isGray;
    const agentIds = new Set(
      contextMenu.targetItems
        .filter((target) => target.type === "agent")
        .map((target) => target.id),
    );

    const updatedAgents = agentsOnCanvas
      .filter((agent) => agentIds.has(agent.id))
      .map((agent) => ({ ...agent, isGray: nextIsGray }));

    setAgentsOnCanvas((previous) =>
      previous.map((agent) =>
        agentIds.has(agent.id) ? { ...agent, isGray: nextIsGray } : agent,
      ),
    );
    updatedAgents.forEach(notifyAgentMoved);
    closeContextMenu();
  }, [
    closeContextMenu,
    contextMenu,
    getAnchorEntry,
    getEntities,
    notifyAgentMoved,
    setAgentsOnCanvas,
  ]);

  const handleSwapAbility = useCallback(() => {
    if (!contextMenu.open) return;

    const { abilitiesOnCanvas } = getEntities();
    const updates = new Map<string, AbilityCanvas>();

    contextMenu.targetItems
      .filter((target) => target.type === "ability")
      .forEach((target) => {
        const ability = abilitiesOnCanvas.find(
          (item) => item.id === target.id,
        );
        if (!ability) return;

        const definition = findAbilityDefinitionByAction(ability.action);
        if (!definition) return;

        const variants = getAbilityVariants(definition);
        if (variants.length < 2) return;

        const currentIndex = variants.findIndex(
          (variant) => variant.action === ability.action,
        );
        const nextVariant = variants[(currentIndex + 1) % variants.length];

        updates.set(ability.id, {
          ...ability,
          action: nextVariant.action,
          name: nextVariant.name,
        });
      });

    if (updates.size === 0) {
      closeContextMenu();
      return;
    }

    setAbilitiesOnCanvas((previous) =>
      previous.map((ability) => updates.get(ability.id) ?? ability),
    );
    updates.forEach((ability) => notifyAbilityMoved(ability));
    closeContextMenu();
  }, [
    closeContextMenu,
    contextMenu,
    getEntities,
    notifyAbilityMoved,
    setAbilitiesOnCanvas,
  ]);

  const handleToggleAbilityIconOnly = useCallback(() => {
    if (!contextMenu.open) return;

    const { abilitiesOnCanvas } = getEntities();
    const anchor = getAnchorEntry();
    if (!anchor || anchor.type !== "ability" || anchor.item.action === "icon") {
      return;
    }

    const nextIconOnly = !anchor.item.iconOnly;
    const abilityIds = new Set(
      contextMenu.targetItems
        .filter((target) => target.type === "ability")
        .map((target) => target.id),
    );
    const updates = new Map<string, AbilityCanvas>();

    abilitiesOnCanvas
      .filter((ability) => abilityIds.has(ability.id))
      .forEach((ability) => {
        if (ability.action === "icon") return;

        const updated: AbilityCanvas = {
          ...ability,
          iconOnly: nextIconOnly,
        };

        if (
          isVisionConeAction(ability.action) &&
          !canAttachVisionCone(updated)
        ) {
          updated.attachedToId = undefined;
        }

        updates.set(updated.id, updated);
      });

    setAbilitiesOnCanvas((previous) =>
      previous.map((ability) => updates.get(ability.id) ?? ability),
    );
    updates.forEach((ability) => notifyAbilityMoved(ability));
    closeContextMenu();
  }, [
    closeContextMenu,
    contextMenu,
    getAnchorEntry,
    getEntities,
    notifyAbilityMoved,
    setAbilitiesOnCanvas,
  ]);

  const handleToggleAbilityOuterCircle = useCallback(() => {
    if (!contextMenu.open) return;

    const { abilitiesOnCanvas } = getEntities();
    const anchor = getAnchorEntry();
    if (!anchor || anchor.type !== "ability") return;

    const nextShowOuterCircle = anchor.item.showOuterCircle === false;
    const abilityIds = new Set(
      contextMenu.targetItems
        .filter((target) => target.type === "ability")
        .map((target) => target.id),
    );

    const updates = abilitiesOnCanvas
      .filter((ability) => abilityIds.has(ability.id))
      .map((ability) => ({
        ...ability,
        showOuterCircle: nextShowOuterCircle,
      }));

    setAbilitiesOnCanvas((previous) =>
      previous.map(
        (ability) =>
          updates.find((updated) => updated.id === ability.id) ?? ability,
      ),
    );
    updates.forEach((ability) => notifyAbilityMoved(ability));
    closeContextMenu();
  }, [
    closeContextMenu,
    contextMenu,
    getAnchorEntry,
    getEntities,
    notifyAbilityMoved,
    setAbilitiesOnCanvas,
  ]);

  return {
    handleToggleAlly,
    handleToggleAgentDead,
    handleSwapAbility,
    handleToggleAbilityIconOnly,
    handleToggleAbilityOuterCircle,
  };
};
