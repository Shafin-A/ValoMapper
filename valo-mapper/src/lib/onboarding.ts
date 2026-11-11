const ONBOARDING_SEEN_KEY = "valomapper-onboarding-seen";
const MOBILE_ONBOARDING_COMPLETED_KEY =
  "valomapper-mobile-onboarding-completed";
const TOUR_COMPLETED_KEY = "valomapper-tour-completed";

export const hasSeenOnboarding = () => {
  if (typeof window === "undefined") return false;

  try {
    return (
      localStorage.getItem(ONBOARDING_SEEN_KEY) === "true" ||
      localStorage.getItem(MOBILE_ONBOARDING_COMPLETED_KEY) === "true" ||
      localStorage.getItem(TOUR_COMPLETED_KEY) === "true"
    );
  } catch {
    return false;
  }
};

export const markOnboardingSeen = () => {
  try {
    localStorage.setItem(ONBOARDING_SEEN_KEY, "true");
  } catch {
    // Ignore storage failures.
  }
};

export const markMobileOnboardingCompleted = () => {
  try {
    localStorage.setItem(MOBILE_ONBOARDING_COMPLETED_KEY, "true");
    localStorage.setItem(ONBOARDING_SEEN_KEY, "true");
    localStorage.setItem(TOUR_COMPLETED_KEY, "true");
  } catch {
    // Ignore storage failures.
  }
};
