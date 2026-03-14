const UNSAFE_CONTROL_CHARS = /[\r\n]/;

export const normalizeBillingReturnPath = (
  value: string | null | undefined,
  fallbackPath: string,
): string => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallbackPath;
  }

  if (UNSAFE_CONTROL_CHARS.test(trimmed)) {
    return fallbackPath;
  }

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallbackPath;
  }

  return trimmed;
};
