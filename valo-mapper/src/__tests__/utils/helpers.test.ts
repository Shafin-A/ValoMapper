import {
  cn,
  debounce,
  mToPixels,
  isAgent,
  isCircleAbility,
  isLineAbility,
  isAdjustableLineAbility,
  isDoubleLineAbility,
  isXLineAbility,
  isCurvableLineAbility,
  isArcAbility,
  doLinesIntersect,
  getNextId,
} from "@/lib/utils";
import { PIXELS_PER_METER } from "@/lib/consts";

describe("Utils", () => {
  describe("cn (className merge)", () => {
    it("should merge class names", () => {
      expect(cn("class1", "class2")).toBe("class1 class2");
    });

    it("should handle conditional classes", () => {
      expect(cn("class1", false && "class2", "class3")).toBe("class1 class3");
    });

    it("should merge tailwind classes correctly", () => {
      expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    });
  });

  describe("mToPixels", () => {
    it("should convert meters to pixels", () => {
      expect(mToPixels(1)).toBe(PIXELS_PER_METER);
      expect(mToPixels(2)).toBe(PIXELS_PER_METER * 2);
      expect(mToPixels(0)).toBe(0);
    });
  });

  describe("debounce", () => {
    jest.useFakeTimers();

    it("should delay function execution", () => {
      const func = jest.fn();
      const debouncedFunc = debounce(func, 100);

      debouncedFunc();
      expect(func).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1);
    });

    it("should cancel previous calls", () => {
      const func = jest.fn();
      const debouncedFunc = debounce(func, 100);

      debouncedFunc();
      debouncedFunc();
      debouncedFunc();

      jest.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1);
    });

    afterAll(() => {
      jest.useRealTimers();
    });
  });

  describe("isAgent", () => {
    it("should return true for valid agent objects", () => {
      expect(isAgent({ name: "Jett", role: "Duelist" })).toBe(true);
    });

    it("should return false for invalid objects", () => {
      expect(isAgent({})).toBe(false);
      expect(isAgent({ name: "Jett" })).toBe(false);
      expect(isAgent(null)).toBe(false);
      expect(isAgent(undefined)).toBe(false);
      expect(isAgent("string")).toBe(false);
    });
  });

  describe("Type guards for abilities", () => {
    it("should identify circle abilities", () => {
      expect(isCircleAbility("brim_smoke")).toBe(true);
      expect(isCircleAbility("sage_wall")).toBe(false);
    });

    it("should identify line abilities", () => {
      expect(isLineAbility("sage_wall")).toBe(true);
      expect(isLineAbility("brim_smoke")).toBe(false);
    });

    it("should identify adjustable line abilities", () => {
      expect(isAdjustableLineAbility("breach_stun")).toBe(true);
      expect(isAdjustableLineAbility("brim_smoke")).toBe(false);
    });

    it("should identify double line abilities", () => {
      expect(isDoubleLineAbility("neon_wall")).toBe(true);
      expect(isDoubleLineAbility("sage_wall")).toBe(false);
    });

    it("should identify X line abilities", () => {
      expect(isXLineAbility("deadlock_wall")).toBe(true);
      expect(isXLineAbility("sage_wall")).toBe(false);
    });

    it("should identify curvable line abilities", () => {
      expect(isCurvableLineAbility("harbor_wall")).toBe(true);
      expect(isCurvableLineAbility("sage_wall")).toBe(false);
    });

    it("should identify arc abilities", () => {
      expect(isArcAbility("kj_turret")).toBe(true);
      expect(isArcAbility("brim_smoke")).toBe(false);
    });
  });

  describe("Geometry functions", () => {
    it("should detect when lines intersect", () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 10, y: 10 };
      const p3 = { x: 0, y: 10 };
      const p4 = { x: 10, y: 0 };

      expect(doLinesIntersect(p1, p2, p3, p4)).toBe(true);
    });

    it("should detect when lines do not intersect", () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 10, y: 0 };
      const p3 = { x: 0, y: 5 };
      const p4 = { x: 10, y: 5 };

      expect(doLinesIntersect(p1, p2, p3, p4)).toBe(false);
    });

    it("should detect parallel lines as non-intersecting", () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 10, y: 0 };
      const p3 = { x: 0, y: 0 };
      const p4 = { x: 10, y: 0 };

      expect(doLinesIntersect(p1, p2, p3, p4)).toBe(false);
    });
  });

  describe("ID generation", () => {
    it("should generate unique IDs for different types", () => {
      const agentId = getNextId("agent");
      const abilityId = getNextId("ability");
      const textId = getNextId("text");
      const imageId = getNextId("image");
      const toolId = getNextId("tool");

      expect(agentId).toMatch(/^agent-/);
      expect(abilityId).toMatch(/^ability-/);
      expect(textId).toMatch(/^text-/);
      expect(imageId).toMatch(/^image-/);
      expect(toolId).toMatch(/^tool-/);
    });

    it("should generate different IDs on subsequent calls", () => {
      jest.useFakeTimers();
      jest.setSystemTime(0);

      const id1 = getNextId("agent");
      jest.advanceTimersByTime(1);
      const id2 = getNextId("agent");

      expect(id1).not.toBe(id2);

      jest.useRealTimers();
    });
  });
});
