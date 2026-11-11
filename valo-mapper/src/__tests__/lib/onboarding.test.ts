import {
  hasSeenOnboarding,
  markMobileOnboardingCompleted,
  markOnboardingSeen,
} from "@/lib/onboarding";

describe("onboarding storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts unseen", () => {
    expect(hasSeenOnboarding()).toBe(false);
  });

  it("detects a previously seen onboarding", () => {
    markOnboardingSeen();
    expect(hasSeenOnboarding()).toBe(true);
  });

  it("detects the legacy desktop tour completion", () => {
    localStorage.setItem("valomapper-tour-completed", "true");
    expect(hasSeenOnboarding()).toBe(true);
  });

  it("detects the legacy mobile completion", () => {
    localStorage.setItem("valomapper-mobile-onboarding-completed", "true");
    expect(hasSeenOnboarding()).toBe(true);
  });

  it("marks both onboarding paths complete together", () => {
    markMobileOnboardingCompleted();

    expect(hasSeenOnboarding()).toBe(true);
    expect(
      localStorage.getItem("valomapper-mobile-onboarding-completed"),
    ).toBe("true");
    expect(localStorage.getItem("valomapper-tour-completed")).toBe("true");
  });
});
