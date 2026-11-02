import { act, render, screen } from "@testing-library/react";
import { ReplayLoadingOverlay } from "@/components/replay/replay-loading-overlay";

describe("ReplayLoadingOverlay progress", () => {
  it("shows a determinate bar with the percentage", () => {
    render(
      <ReplayLoadingOverlay
        progress={{ percent: 42, label: "Uploading replay…" }}
      />,
    );

    expect(screen.getByText("Uploading replay…")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(
      screen.queryByTestId("replay-progress-indeterminate"),
    ).not.toBeInTheDocument();
  });

  it("shows a percentage when progress is indeterminate", () => {
    render(
      <ReplayLoadingOverlay
        progress={{
          percent: 0,
          label: "Uploading replay…",
          indeterminate: true,
        }}
      />,
    );

    expect(screen.getByText("Uploading replay…")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(
      screen.getByTestId("replay-progress-indeterminate"),
    ).toBeInTheDocument();
  });

  it("shows and advances the estimate during decoding", () => {
    jest.useFakeTimers();
    const { unmount } = render(
      <ReplayLoadingOverlay
        progress={{
          percent: 70,
          label: "Decoding replay…",
          indeterminate: true,
        }}
      />,
    );

    const bar = screen.getByTestId("replay-progress-estimated");
    expect(bar).toHaveStyle({ width: "70%" });
    expect(screen.getByText("70%")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(bar).toHaveStyle({ width: "75%" });
    expect(screen.getByText("75%")).toBeInTheDocument();

    unmount();
    jest.useRealTimers();
  });
});
