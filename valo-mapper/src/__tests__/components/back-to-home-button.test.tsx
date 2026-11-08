import { fireEvent, render, screen } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { NavigationHistoryProvider } from "@/components/providers/navigation-history-provider";
import { BackToHomeButton } from "@/components/shared/back-to-home-button";

const mockUsePathname = jest.mocked(usePathname);
const mockUseRouter = jest.mocked(useRouter);
const mockBack = jest.fn();

const renderButton = () => (
  <NavigationHistoryProvider>
    <BackToHomeButton />
  </NavigationHistoryProvider>
);

describe("BackToHomeButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      back: mockBack,
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
      forward: jest.fn(),
    } as unknown as ReturnType<typeof useRouter>);
  });

  it("links home when there is no previous page", () => {
    mockUsePathname.mockReturnValue("/terms-of-service");

    render(renderButton());

    expect(
      screen.getByRole("link", { name: "Back to ValoMapper" }),
    ).toHaveAttribute("href", "/");
  });

  it("links home when the previous page is home", () => {
    mockUsePathname.mockReturnValue("/");
    const { rerender } = render(renderButton());

    mockUsePathname.mockReturnValue("/login");
    rerender(renderButton());

    expect(
      screen.getByRole("link", { name: "Back to ValoMapper" }),
    ).toHaveAttribute("href", "/");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("navigates back when the previous page is not home", () => {
    mockUsePathname.mockReturnValue("/");
    const { rerender } = render(renderButton());

    mockUsePathname.mockReturnValue("/login");
    rerender(renderButton());

    mockUsePathname.mockReturnValue("/terms-of-service");
    rerender(renderButton());

    const backLink = screen.getByRole("link", { name: "Back" });
    expect(backLink).toHaveAttribute("href", "/");

    fireEvent.click(backLink);

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
