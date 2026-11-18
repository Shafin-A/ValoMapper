import { capitalize, getRelativeTime } from "@/lib/format";

const NOW = new Date("2026-06-15T12:00:00Z");

const secondsAgo = (seconds: number) =>
  new Date(NOW.getTime() - seconds * 1000);

describe("getRelativeTime", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns now for timestamps less than a second old", () => {
    expect(getRelativeTime(NOW)).toBe("now");
    expect(getRelativeTime(secondsAgo(0.4))).toBe("now");
  });

  it("formats recent timestamps in seconds", () => {
    expect(getRelativeTime(secondsAgo(1))).toBe("1 second ago");
    expect(getRelativeTime(secondsAgo(42))).toBe("42 seconds ago");
  });

  it("formats minutes, hours, days, weeks, months, and years", () => {
    expect(getRelativeTime(secondsAgo(60))).toBe("1 minute ago");
    expect(getRelativeTime(secondsAgo(3 * 3600))).toBe("3 hours ago");
    expect(getRelativeTime(secondsAgo(2 * 86400))).toBe("2 days ago");
    expect(getRelativeTime(secondsAgo(3 * 604800))).toBe("3 weeks ago");
    expect(getRelativeTime(secondsAgo(5 * 2592000))).toBe("5 months ago");
    expect(getRelativeTime(secondsAgo(2 * 31536000))).toBe("2 years ago");
  });

});

describe("capitalize", () => {
  it("uppercases the first character", () => {
    expect(capitalize("attack")).toBe("Attack");
    expect(capitalize("Defense")).toBe("Defense");
    expect(capitalize("a")).toBe("A");
  });

  it("leaves the rest of the string untouched", () => {
    expect(capitalize("aScent")).toBe("AScent");
    expect(capitalize("two words")).toBe("Two words");
  });

  it("handles empty strings", () => {
    expect(capitalize("")).toBe("");
  });
});
