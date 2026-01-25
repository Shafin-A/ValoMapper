import { render, screen, fireEvent } from "@testing-library/react";
import { LineupEditContent } from "@/components/canvas/lineup-edit-content";

jest.mock(
  "@/components/tools-sidebar/lineup-dialog/lineup-image-upload",
  () => ({
    LineupImageUpload: ({
      images,
      onImagesAdd,
      onImageRemove,
      onImageExpand,
    }: {
      images: string[];
      onImagesAdd: (images: string[]) => void;
      onImageRemove: (index: number) => void;
      onImageExpand: (index: number) => void;
    }) => (
      <div data-testid="lineup-image-upload">
        <span data-testid="image-count">{images.length}</span>
        <button
          data-testid="add-images"
          onClick={() => onImagesAdd(["new-image"])}
        >
          Add
        </button>
        <button data-testid="remove-image" onClick={() => onImageRemove(0)}>
          Remove
        </button>
        <button data-testid="expand-image" onClick={() => onImageExpand(0)}>
          Expand
        </button>
      </div>
    ),
  }),
);

jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  debounce: (fn: (...args: unknown[]) => void) => fn,
}));

describe("LineupEditContent", () => {
  const defaultProps = {
    images: [],
    youtubeLink: "",
    notes: "",
    lineColor: "#ffffff",
    onImagesAdd: jest.fn(),
    onImageRemove: jest.fn(),
    onImageExpand: jest.fn(),
    onYoutubeLinkChange: jest.fn(),
    onNotesChange: jest.fn(),
    onLineColorChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render all form fields", () => {
    render(<LineupEditContent {...defaultProps} />);

    expect(screen.getByTestId("lineup-image-upload")).toBeInTheDocument();
    expect(screen.getByLabelText("YouTube Link")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
    expect(screen.getByLabelText("Line Color")).toBeInTheDocument();
  });

  it("should display current youtube link value", () => {
    render(
      <LineupEditContent
        {...defaultProps}
        youtubeLink="https://youtube.com/watch?v=test123"
      />,
    );

    const input = screen.getByLabelText("YouTube Link") as HTMLInputElement;
    expect(input.value).toBe("https://youtube.com/watch?v=test123");
  });

  it("should display current notes value", () => {
    render(
      <LineupEditContent {...defaultProps} notes="Aim at the corner of box" />,
    );

    const textarea = screen.getByLabelText("Notes") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Aim at the corner of box");
  });

  it("should display current line color value", () => {
    render(<LineupEditContent {...defaultProps} lineColor="#ff0000" />);

    const colorInput = screen.getByLabelText("Line Color") as HTMLInputElement;
    expect(colorInput.value).toBe("#ff0000");
  });

  it("should call onYoutubeLinkChange when youtube input changes", () => {
    const onYoutubeLinkChange = jest.fn();
    render(
      <LineupEditContent
        {...defaultProps}
        onYoutubeLinkChange={onYoutubeLinkChange}
      />,
    );

    const input = screen.getByLabelText("YouTube Link");
    fireEvent.change(input, {
      target: { value: "https://youtube.com/watch?v=newvideo" },
    });

    expect(onYoutubeLinkChange).toHaveBeenCalledWith(
      "https://youtube.com/watch?v=newvideo",
    );
  });

  it("should call onNotesChange when notes textarea changes", () => {
    const onNotesChange = jest.fn();
    render(
      <LineupEditContent {...defaultProps} onNotesChange={onNotesChange} />,
    );

    const textarea = screen.getByLabelText("Notes");
    fireEvent.change(textarea, { target: { value: "New lineup notes" } });

    expect(onNotesChange).toHaveBeenCalledWith("New lineup notes");
  });

  it("should call onLineColorChange when color picker changes", () => {
    const onLineColorChange = jest.fn();
    render(
      <LineupEditContent
        {...defaultProps}
        onLineColorChange={onLineColorChange}
      />,
    );

    const colorInput = screen.getByLabelText("Line Color");
    fireEvent.change(colorInput, { target: { value: "#00ff00" } });

    expect(onLineColorChange).toHaveBeenCalledWith("#00ff00");
  });

  it("should pass images to LineupImageUpload component", () => {
    render(
      <LineupEditContent
        {...defaultProps}
        images={["image1", "image2", "image3"]}
      />,
    );

    expect(screen.getByTestId("image-count")).toHaveTextContent("3");
  });

  it("should call onImagesAdd when images are added via LineupImageUpload", () => {
    const onImagesAdd = jest.fn();
    render(<LineupEditContent {...defaultProps} onImagesAdd={onImagesAdd} />);

    fireEvent.click(screen.getByTestId("add-images"));

    expect(onImagesAdd).toHaveBeenCalledWith(["new-image"]);
  });

  it("should call onImageRemove when image is removed via LineupImageUpload", () => {
    const onImageRemove = jest.fn();
    render(
      <LineupEditContent {...defaultProps} onImageRemove={onImageRemove} />,
    );

    fireEvent.click(screen.getByTestId("remove-image"));

    expect(onImageRemove).toHaveBeenCalledWith(0);
  });

  it("should call onImageExpand when image is expanded via LineupImageUpload", () => {
    const onImageExpand = jest.fn();
    render(
      <LineupEditContent {...defaultProps} onImageExpand={onImageExpand} />,
    );

    fireEvent.click(screen.getByTestId("expand-image"));

    expect(onImageExpand).toHaveBeenCalledWith(0);
  });

  it("should have correct placeholder text for youtube input", () => {
    render(<LineupEditContent {...defaultProps} />);

    const input = screen.getByLabelText("YouTube Link");
    expect(input).toHaveAttribute(
      "placeholder",
      "https://www.youtube.com/watch?v=...",
    );
  });

  it("should have correct placeholder text for notes textarea", () => {
    render(<LineupEditContent {...defaultProps} />);

    const textarea = screen.getByLabelText("Notes");
    expect(textarea).toHaveAttribute(
      "placeholder",
      "Add any notes about this lineup...",
    );
  });

  it("should have url type for youtube input", () => {
    render(<LineupEditContent {...defaultProps} />);

    const input = screen.getByLabelText("YouTube Link");
    expect(input).toHaveAttribute("type", "url");
  });

  it("should have color type for line color input", () => {
    render(<LineupEditContent {...defaultProps} />);

    const colorInput = screen.getByLabelText("Line Color");
    expect(colorInput).toHaveAttribute("type", "color");
  });

  it("should render with empty values", () => {
    render(<LineupEditContent {...defaultProps} />);

    const youtubeInput = screen.getByLabelText(
      "YouTube Link",
    ) as HTMLInputElement;
    const notesTextarea = screen.getByLabelText("Notes") as HTMLTextAreaElement;

    expect(youtubeInput.value).toBe("");
    expect(notesTextarea.value).toBe("");
    expect(screen.getByTestId("image-count")).toHaveTextContent("0");
  });
});
