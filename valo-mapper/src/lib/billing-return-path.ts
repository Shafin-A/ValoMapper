const UNSAFE_CONTROL_CHARS = /[\r\n]/;

const STATIC_TOP_LEVEL_ROUTES = new Set([
  "auth",
  "billing",
  "privacy-policy",
  "profile",
  "strategies",
  "terms-of-service",
]);

type BillingReturnDestination =
  | "home"
  | "strategies"
  | "profile"
  | "strategy"
  | "other";

const getPathname = (path: string): string => {
  const [pathname] = path.split(/[?#]/);
  return pathname || "/";
};

const getBillingReturnDestination = (
  returnToPath: string,
): BillingReturnDestination => {
  const pathname = getPathname(returnToPath);

  if (pathname === "/") {
    return "home";
  }

  if (pathname === "/strategies") {
    return "strategies";
  }

  if (pathname === "/profile") {
    return "profile";
  }

  const topLevelSegment = pathname.slice(1).split("/")[0];
  if (!topLevelSegment || STATIC_TOP_LEVEL_ROUTES.has(topLevelSegment)) {
    return "other";
  }

  return "strategy";
};

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

export const getBillingCancelReturnLabel = (returnToPath: string): string => {
  const destination = getBillingReturnDestination(returnToPath);

  switch (destination) {
    case "home":
      return "Back to Home";
    case "strategies":
      return "Back to My Strategies";
    case "profile":
      return "Back to Profile";
    case "strategy":
      return "Back to your strategy";
    default:
      return "Back to previous page";
  }
};

export const getBillingSuccessReturnLabel = (returnToPath: string): string => {
  const destination = getBillingReturnDestination(returnToPath);

  switch (destination) {
    case "home":
      return "Go to Home";
    case "strategies":
      return "Go to My Strategies";
    case "profile":
      return "Go to Profile";
    case "strategy":
      return "Back to your strategy";
    default:
      return "Continue";
  }
};
