import { getNextId } from "@/lib/ids";

const ID_TYPES = ["agent", "ability", "text", "image", "tool"] as const;

describe("getNextId", () => {
  it("prefixes ids with the entity type", () => {
    ID_TYPES.forEach((type) => {
      expect(getNextId(type)).toMatch(
        new RegExp(`^${type}-[0-9a-z-]+$`),
      );
    });
  });

  it("generates unique ids across calls", () => {
    const ids = Array.from({ length: 50 }, () => getNextId("agent"));

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("generates UUID-shaped ids when randomUUID is available", () => {
    const id = getNextId("text").replace(/^text-/, "");

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
