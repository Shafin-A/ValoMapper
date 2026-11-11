"use client";

import { useEffect } from "react";

const PEN_MOVE_THRESHOLD_PX = 10;
const CLICK_SUPPRESSION_MS = 150;
const INTERACTIVE_SELECTOR =
  "button, a, [role='button'], [role='tab'], [role='menuitem'], [role='menuitemradio'], [role='menuitemcheckbox'], [role='option'], [role='switch'], [role='checkbox'], [role='radio'], input, select, textarea, label, [data-slot='sheet-overlay'], [data-slot='dialog-overlay']";

const isColorInput = (
  target: Element,
): target is HTMLInputElement & { showPicker?: () => void } =>
  target instanceof HTMLInputElement && target.type === "color";

const dispatchMouseSequence = (target: Element) => {
  const base = {
    bubbles: true,
    cancelable: true,
    view: window,
    button: 0,
  };

  target.dispatchEvent(
    new MouseEvent("mousedown", { ...base, buttons: 1 }),
  );
  target.dispatchEvent(new MouseEvent("mouseup", { ...base, buttons: 0 }));
  target.dispatchEvent(new MouseEvent("click", base));
};

export const PenTapToClick = () => {
  useEffect(() => {
    let penDown: { id: number; x: number; y: number } | null = null;
    let moved = false;
    let syntheticClick = false;
    let suppressClickUntil = 0;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "pen") return;

      penDown = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
      moved = false;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (
        event.pointerType !== "pen" ||
        !penDown ||
        penDown.id !== event.pointerId
      ) {
        return;
      }

      const distance = Math.hypot(
        event.clientX - penDown.x,
        event.clientY - penDown.y,
      );

      if (distance > PEN_MOVE_THRESHOLD_PX) {
        moved = true;
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerType !== "pen") return;

      const down = penDown;
      penDown = null;

      if (!down || moved) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const interactive = target.closest(INTERACTIVE_SELECTOR);
      if (!interactive) return;
      if (
        interactive instanceof HTMLButtonElement &&
        interactive.disabled
      ) {
        return;
      }
      if (interactive.getAttribute("aria-disabled") === "true") return;

      if (isColorInput(interactive)) {
        try {
          interactive.showPicker?.();
        } catch {
          interactive.click();
        }
        suppressClickUntil = performance.now() + CLICK_SUPPRESSION_MS;
        return;
      }

      syntheticClick = true;
      try {
        dispatchMouseSequence(target);
      } finally {
        syntheticClick = false;
        suppressClickUntil = performance.now() + CLICK_SUPPRESSION_MS;
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (syntheticClick) return;

      if (performance.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handlePointerCancel = () => {
      penDown = null;
      moved = false;
    };

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("pointermove", handlePointerMove, true);
    window.addEventListener("pointerup", handlePointerUp, true);
    window.addEventListener("pointercancel", handlePointerCancel, true);
    window.addEventListener("click", handleClick, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("pointerup", handlePointerUp, true);
      window.removeEventListener("pointercancel", handlePointerCancel, true);
      window.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
};
