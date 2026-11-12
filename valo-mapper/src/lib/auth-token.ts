const isInvalidTokenValue = (value: string): boolean => {
  const lowered = value.toLowerCase();

  return (
    lowered === "undefined" ||
    lowered === "null" ||
    lowered === "[object object]"
  );
};

export const normalizeAuthToken = (token: unknown): string | null => {
  if (typeof token !== "string") {
    return null;
  }

  const trimmed = token.trim();
  if (!trimmed || isInvalidTokenValue(trimmed)) {
    return null;
  }

  const bearerMatch = /^bearer\s+(.+)$/i.exec(trimmed);
  if (bearerMatch) {
    const bearerToken = bearerMatch[1].trim();

    if (
      !bearerToken ||
      /\s/.test(bearerToken) ||
      isInvalidTokenValue(bearerToken)
    ) {
      return null;
    }

    return bearerToken;
  }

  if (/\s/.test(trimmed)) {
    return null;
  }

  return trimmed;
};
