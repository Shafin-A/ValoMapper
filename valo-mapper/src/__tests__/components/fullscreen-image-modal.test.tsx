import { render, screen, fireEvent } from "@testing-library/react";
import { FullscreenImageModal } from "@/components/canvas/fullscreen-image-modal";

describe("FullscreenImageModal", () => {
  it("renders image and close button", () => {
    const onClose = jest.fn();

    render(<FullscreenImageModal imageSrc="/small.png" onClose={onClose} />);

    expect(
      screen.getByRole("img", { name: /fullscreen view/i }),
    ).toBeInTheDocument();
    const closeButton = screen.getByRole("button", {
      name: /close fullscreen/i,
    });
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveClass("absolute");
    expect(closeButton).toHaveClass("-top-2");
    expect(closeButton).toHaveClass("-right-2");

    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render when imageSrc is null", () => {
    render(<FullscreenImageModal imageSrc={null} onClose={() => {}} />);

    expect(
      screen.queryByRole("img", { name: /fullscreen view/i }),
    ).not.toBeInTheDocument();
  });
});
