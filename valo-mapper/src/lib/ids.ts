const createUuid = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  // `crypto.randomUUID` is only exposed in secure contexts (HTTPS or
  // localhost). When the app is opened over plain HTTP (for example from a
  // phone on the local network), fall back to generating a UUID from
  // `crypto.getRandomValues`, which is available outside secure contexts.
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join("-");
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getNextId = (
  type: "agent" | "ability" | "text" | "image" | "tool",
) => {
  const uuid = createUuid();
  return `${type}-${uuid}`;
};
