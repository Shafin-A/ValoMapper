import { render, screen } from "@testing-library/react";
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

  it("hides the percentage when progress is indeterminate", () => {
    render(
      <ReplayLoadingOverlay
        progress={{
          percent: 42,
          label: "Decoding replay…",
          indeterminate: true,
        }}
      />,
    );

    expect(screen.getByText("Decoding replay…")).toBeInTheDocument();
    expect(screen.queryByText("42%")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("replay-progress-indeterminate"),
    ).toBeInTheDocument();
  });
});
