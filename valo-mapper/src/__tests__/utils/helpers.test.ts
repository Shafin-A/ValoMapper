import { cn, debounce, mToPixels, isAgent } from "@/lib/utils";
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
});
