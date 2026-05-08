import { render, screen } from "@testing-library/react";
import { AnimatedContent } from "@/components/ui/animated-content";

describe("AnimatedContent", () => {
  it("uses the measured scroll height for the animation variable", () => {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return 144;
      },
    });

    const { container } = render(
      <AnimatedContent show>
        <div>Measured content</div>
      </AnimatedContent>,
    );

    expect(screen.getByText("Measured content")).toBeInTheDocument();
    expect(container.firstChild).toHaveStyle({
      "--content-height": "144px",
    });
  });
});
