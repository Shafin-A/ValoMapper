import { act, fireEvent, render, screen } from "@testing-library/react";
import { MobileOnboarding } from "@/components/onboarding/mobile-onboarding";

const mockIsMobile = jest.fn(() => true);

jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockIsMobile(),
}));

describe("MobileOnboarding", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    mockIsMobile.mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows the mobile quick start once the lobby is ready", () => {
    render(<MobileOnboarding ready />);

    act(() => {
      jest.advanceTimersByTime(800);
    });

    expect(screen.getByText("Mobile quick start")).toBeInTheDocument();
    expect(screen.getByText("Place items")).toBeInTheDocument();
  });

  it("walks through the steps and saves completion", () => {
    render(<MobileOnboarding ready />);

    act(() => {
      jest.advanceTimersByTime(800);
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Zoom and pan")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    expect(
      localStorage.getItem("valomapper-mobile-onboarding-completed"),
    ).toBe("true");
  });

  it("does not show when onboarding was already completed", () => {
    localStorage.setItem("valomapper-mobile-onboarding-completed", "true");

    render(<MobileOnboarding ready />);

    act(() => {
      jest.advanceTimersByTime(800);
    });

    expect(screen.queryByText("Mobile quick start")).not.toBeInTheDocument();
  });
});
