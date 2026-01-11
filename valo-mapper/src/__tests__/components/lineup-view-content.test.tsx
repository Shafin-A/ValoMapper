import { render, screen, fireEvent } from "@testing-library/react";
import { LineupViewContent } from "@/components/canvas/lineup-view-content";

// Mock carousel components
jest.mock("@/components/ui/carousel", () => ({
  Carousel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="carousel">{children}</div>
  ),
  CarouselContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="carousel-content">{children}</div>
  ),
  CarouselItem: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="carousel-item">{children}</div>
  ),
  CarouselNext: () => <button data-testid="carousel-next">Next</button>,
  CarouselPrevious: () => <button data-testid="carousel-prev">Previous</button>,
}));

describe("LineupViewContent", () => {
  const defaultProps = {
    images: [],
    youtubeEmbedUrl: null,
    youtubeLink: "",
    isInvalidYoutubeLink: false,
    notes: "",
    lineColor: "#ffffff",
    onOpenFullscreen: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render image carousel when images are provided", () => {
    render(
      <LineupViewContent
        {...defaultProps}
        images={["image1.jpg", "image2.jpg"]}
      />
    );

    expect(screen.getByText("Lineup Images")).toBeInTheDocument();
    expect(screen.getByTestId("carousel")).toBeInTheDocument();
    expect(screen.getAllByTestId("carousel-item")).toHaveLength(2);
  });

  it("should not render image section when images array is empty", () => {
    render(<LineupViewContent {...defaultProps} images={[]} />);

    expect(screen.queryByText("Lineup Images")).not.toBeInTheDocument();
    expect(screen.queryByTestId("carousel")).not.toBeInTheDocument();
  });

  it("should render embedded YouTube video when valid youtubeEmbedUrl provided", () => {
    render(
      <LineupViewContent
        {...defaultProps}
        youtubeLink="https://youtube.com/watch?v=test123"
        youtubeEmbedUrl="https://www.youtube.com/embed/test123"
      />
    );

    expect(screen.getByText("YouTube Video")).toBeInTheDocument();
    expect(screen.getByTitle("YouTube video player")).toBeInTheDocument();
    expect(screen.getByTitle("YouTube video player")).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/test123"
    );
  });

  it("should not render YouTube section when youtubeLink is empty", () => {
    render(<LineupViewContent {...defaultProps} youtubeLink="" />);

    expect(screen.queryByText("YouTube Video")).not.toBeInTheDocument();
    expect(screen.queryByTitle("YouTube video player")).not.toBeInTheDocument();
  });

  it("should render fallback link when isInvalidYoutubeLink is true", () => {
    render(
      <LineupViewContent
        {...defaultProps}
        youtubeLink="https://invalid-youtube-link.com"
        isInvalidYoutubeLink={true}
      />
    );

    expect(screen.getByText("YouTube Link")).toBeInTheDocument();
    expect(
      screen.getByText("https://invalid-youtube-link.com")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Could not embed video. Click link to open in new tab.")
    ).toBeInTheDocument();
  });

  it("should not render fallback link when isInvalidYoutubeLink is false", () => {
    render(
      <LineupViewContent
        {...defaultProps}
        youtubeLink="https://youtube.com/watch?v=test"
        youtubeEmbedUrl="https://www.youtube.com/embed/test"
        isInvalidYoutubeLink={false}
      />
    );

    expect(
      screen.queryByText(
        "Could not embed video. Click link to open in new tab."
      )
    ).not.toBeInTheDocument();
  });

  it("should render notes section when notes are not empty", () => {
    render(
      <LineupViewContent
        {...defaultProps}
        notes="Aim at the corner of the box"
      />
    );

    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(
      screen.getByText("Aim at the corner of the box")
    ).toBeInTheDocument();
  });

  it("should not render notes section when notes are empty", () => {
    render(<LineupViewContent {...defaultProps} notes="" />);

    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
  });

  it("should not render notes section when notes are only whitespace", () => {
    render(<LineupViewContent {...defaultProps} notes="   " />);

    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
  });

  it("should call onOpenFullscreen with correct index when expand button clicked", () => {
    const onOpenFullscreen = jest.fn();
    render(
      <LineupViewContent
        {...defaultProps}
        images={["image1.jpg", "image2.jpg", "image3.jpg"]}
        onOpenFullscreen={onOpenFullscreen}
      />
    );

    const expandButtons = screen.getAllByRole("button");
    fireEvent.click(expandButtons[0]);

    expect(onOpenFullscreen).toHaveBeenCalledWith(0);
  });

  it("should display line color in the color preview", () => {
    render(<LineupViewContent {...defaultProps} lineColor="#ff0000" />);

    expect(screen.getByText("Line Color")).toBeInTheDocument();
    const colorInput = screen.getByDisplayValue("#ff0000");
    expect(colorInput).toBeInTheDocument();
    expect(colorInput).toBeDisabled();
  });

  it("should render no details message when all content is empty", () => {
    render(
      <LineupViewContent
        {...defaultProps}
        images={[]}
        youtubeLink=""
        notes=""
      />
    );

    expect(
      screen.getByText("No details available for this lineup.")
    ).toBeInTheDocument();
  });

  it("should not render no details message when images are provided", () => {
    render(<LineupViewContent {...defaultProps} images={["image1.jpg"]} />);

    expect(
      screen.queryByText("No details available for this lineup.")
    ).not.toBeInTheDocument();
  });

  it("should not render no details message when youtube link is provided", () => {
    render(
      <LineupViewContent
        {...defaultProps}
        youtubeLink="https://youtube.com/watch?v=test"
        youtubeEmbedUrl="https://www.youtube.com/embed/test"
      />
    );

    expect(
      screen.queryByText("No details available for this lineup.")
    ).not.toBeInTheDocument();
  });

  it("should not render no details message when notes are provided", () => {
    render(<LineupViewContent {...defaultProps} notes="Some notes" />);

    expect(
      screen.queryByText("No details available for this lineup.")
    ).not.toBeInTheDocument();
  });

  it("should render iframe with correct attributes for YouTube embed", () => {
    render(
      <LineupViewContent
        {...defaultProps}
        youtubeLink="https://youtube.com/watch?v=test"
        youtubeEmbedUrl="https://www.youtube.com/embed/test"
      />
    );

    const iframe = screen.getByTitle("YouTube video player");
    expect(iframe).toHaveAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    );
  });

  it("should render fallback link with correct href", () => {
    render(
      <LineupViewContent
        {...defaultProps}
        youtubeLink="youtube.com/watch?v=test"
        isInvalidYoutubeLink={true}
      />
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("should render multiple images in carousel", () => {
    render(
      <LineupViewContent
        {...defaultProps}
        images={["img1.jpg", "img2.jpg", "img3.jpg"]}
      />
    );

    const images = screen.getAllByTestId("mock-image");
    expect(images).toHaveLength(3);
  });

  it("should always render line color section", () => {
    render(<LineupViewContent {...defaultProps} />);

    expect(screen.getByText("Line Color")).toBeInTheDocument();
  });

  it("should preserve whitespace in notes", () => {
    const notesWithNewlines = "Line 1\nLine 2\nLine 3";
    render(<LineupViewContent {...defaultProps} notes={notesWithNewlines} />);

    const notesContainer = screen.getByText((_content, element) => {
      return Boolean(
        element?.classList.contains("whitespace-pre-wrap") &&
          element?.textContent?.includes("Line 1")
      );
    });
    expect(notesContainer).toHaveClass("whitespace-pre-wrap");
  });
});
