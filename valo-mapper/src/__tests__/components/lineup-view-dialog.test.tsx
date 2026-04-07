import { render as rtlRender, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LineupViewDialog } from "@/components/canvas/lineup-view-dialog";
import { ConnectingLine } from "@/lib/types";

const mockSetConnectingLines = jest.fn();

const render = (children: React.ReactElement) => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return rtlRender(children, { wrapper });
};

jest.mock("@/contexts/canvas-context", () => ({
  useCanvas: () => ({
    setConnectingLines: mockSetConnectingLines,
  }),
}));

jest.mock("@/components/canvas/lineup-view-content", () => ({
  LineupViewContent: ({
    images,
    notes,
    onOpenFullscreen,
  }: {
    images: string[];
    notes: string;
    onOpenFullscreen: (index: number) => void;
  }) => (
    <div data-testid="lineup-view-content">
      <span data-testid="view-image-count">{images.length}</span>
      <span data-testid="view-notes">{notes}</span>
      <button data-testid="open-fullscreen" onClick={() => onOpenFullscreen(0)}>
        Fullscreen
      </button>
    </div>
  ),
}));

jest.mock("@/components/canvas/lineup-edit-content", () => ({
  LineupEditContent: ({
    images,
    youtubeLink,
    notes,
    onImagesAdd,
    onImageRemove,
    onYoutubeLinkChange,
    onNotesChange,
  }: {
    images: string[];
    youtubeLink: string;
    notes: string;
    onImagesAdd: (images: string[]) => void;
    onImageRemove: (index: number) => void;
    onYoutubeLinkChange: (value: string) => void;
    onNotesChange: (value: string) => void;
  }) => (
    <div data-testid="lineup-edit-content">
      <span data-testid="edit-image-count">{images.length}</span>
      <span data-testid="edit-youtube">{youtubeLink}</span>
      <span data-testid="edit-notes">{notes}</span>
      <button
        data-testid="add-images"
        onClick={() => onImagesAdd(["new-image"])}
      >
        Add
      </button>
      <button data-testid="remove-image" onClick={() => onImageRemove(0)}>
        Remove
      </button>
      <button
        data-testid="change-youtube"
        onClick={() => onYoutubeLinkChange("new-youtube-link")}
      >
        Change YouTube
      </button>
      <button
        data-testid="change-notes"
        onClick={() => onNotesChange("new notes")}
      >
        Change Notes
      </button>
    </div>
  ),
}));

jest.mock(
  "@/components/tools-sidebar/lineup-dialog/lineup-fullscreen-viewer",
  () => ({
    LineupFullscreenViewer: ({
      isOpen,
      startIndex,
      onClose,
    }: {
      isOpen: boolean;
      startIndex: number;
      onClose: () => void;
    }) =>
      isOpen ? (
        <div data-testid="fullscreen-viewer">
          <span data-testid="fullscreen-index">{startIndex}</span>
          <button data-testid="close-fullscreen" onClick={onClose}>
            Close
          </button>
        </div>
      ) : null,
  }),
);

jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  getYoutubeEmbedUrl: (url: string) => {
    try {
      const { hostname } = new URL(url);
      return hostname === "youtube.com" ||
        hostname === "www.youtube.com" ||
        hostname === "youtu.be"
        ? `https://www.youtube.com/embed/test`
        : null;
    } catch {
      return null;
    }
  },
}));

describe("LineupViewDialog", () => {
  const mockLine: ConnectingLine = {
    id: "line-1",
    fromId: "agent-1",
    toId: "ability-1",
    strokeColor: "#ff0000",
    strokeWidth: 8,
    uploadedImages: ["image1.jpg", "image2.jpg"],
    youtubeLink: "https://youtube.com/watch?v=test123",
    notes: "Test notes",
  };

  const defaultProps = {
    line: mockLine,
    isOpen: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not render when line is null", () => {
    render(<LineupViewDialog line={null} isOpen={true} onClose={jest.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should render dialog when isOpen is true", () => {
    render(<LineupViewDialog {...defaultProps} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should show view mode by default (not edit mode)", () => {
    render(<LineupViewDialog {...defaultProps} />);

    expect(screen.getByText("Lineup Details")).toBeInTheDocument();
    expect(screen.getByTestId("lineup-view-content")).toBeInTheDocument();
    expect(screen.queryByTestId("lineup-edit-content")).not.toBeInTheDocument();
  });

  it("should show Edit button in view mode", () => {
    render(<LineupViewDialog {...defaultProps} />);

    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
  });

  it("should switch to edit mode when Edit button is clicked", () => {
    render(<LineupViewDialog {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    expect(screen.getByText("Edit Lineup")).toBeInTheDocument();
    expect(screen.getByTestId("lineup-edit-content")).toBeInTheDocument();
    expect(screen.queryByTestId("lineup-view-content")).not.toBeInTheDocument();
  });

  it("should not show Edit button in edit mode", () => {
    render(<LineupViewDialog {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    const editButtons = screen.queryAllByRole("button", { name: /^edit$/i });
    expect(editButtons).toHaveLength(0);
  });

  it("should show Cancel and Save buttons in edit mode", () => {
    render(<LineupViewDialog {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("should revert changes when Cancel is clicked in edit mode", () => {
    render(<LineupViewDialog {...defaultProps} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    // Make changes
    fireEvent.click(screen.getByTestId("change-notes"));

    // Cancel
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    // Should be back in view mode with original notes
    expect(screen.getByTestId("lineup-view-content")).toBeInTheDocument();
    expect(screen.getByTestId("view-notes")).toHaveTextContent("Test notes");
  });

  it("should save changes and update connectingLines when Save is clicked", () => {
    render(<LineupViewDialog {...defaultProps} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    // Make changes
    fireEvent.click(screen.getByTestId("change-notes"));

    // Save
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(mockSetConnectingLines).toHaveBeenCalled();
    // Should be back in view mode
    expect(screen.getByTestId("lineup-view-content")).toBeInTheDocument();
  });

  it("should disable Save button when edit content is empty", () => {
    const emptyLine: ConnectingLine = {
      ...mockLine,
      uploadedImages: [],
      youtubeLink: "",
      notes: "",
    };

    render(<LineupViewDialog {...defaultProps} line={emptyLine} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("should open fullscreen viewer when image expand is clicked", () => {
    render(<LineupViewDialog {...defaultProps} />);

    fireEvent.click(screen.getByTestId("open-fullscreen"));

    expect(screen.getByTestId("fullscreen-viewer")).toBeInTheDocument();
  });

  it("should close fullscreen viewer when close is triggered", () => {
    render(<LineupViewDialog {...defaultProps} />);

    // Open fullscreen
    fireEvent.click(screen.getByTestId("open-fullscreen"));
    expect(screen.getByTestId("fullscreen-viewer")).toBeInTheDocument();

    // Close fullscreen
    fireEvent.click(screen.getByTestId("close-fullscreen"));
    expect(screen.queryByTestId("fullscreen-viewer")).not.toBeInTheDocument();
  });

  it("should pass correct startIndex to fullscreen viewer", () => {
    render(<LineupViewDialog {...defaultProps} />);

    fireEvent.click(screen.getByTestId("open-fullscreen"));

    expect(screen.getByTestId("fullscreen-index")).toHaveTextContent("0");
  });

  it("should call onClose when dialog is closed", () => {
    const onClose = jest.fn();
    render(<LineupViewDialog {...defaultProps} onClose={onClose} />);

    // Find and click the close button (X button in dialog)
    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("should reset to view mode when dialog is closed and reopened", () => {
    const { rerender } = render(<LineupViewDialog {...defaultProps} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByTestId("lineup-edit-content")).toBeInTheDocument();

    // Close dialog
    rerender(<LineupViewDialog {...defaultProps} isOpen={false} />);

    // Reopen dialog
    rerender(<LineupViewDialog {...defaultProps} isOpen={true} />);

    // Should be back in view mode
    expect(screen.getByTestId("lineup-view-content")).toBeInTheDocument();
  });

  it("should sync state from line prop when dialog opens", () => {
    const { rerender } = render(
      <LineupViewDialog {...defaultProps} isOpen={false} />,
    );

    const updatedLine: ConnectingLine = {
      ...mockLine,
      notes: "Updated notes",
      uploadedImages: ["new-image.jpg"],
    };

    rerender(
      <LineupViewDialog {...defaultProps} line={updatedLine} isOpen={true} />,
    );

    expect(screen.getByTestId("view-notes")).toHaveTextContent("Updated notes");
    expect(screen.getByTestId("view-image-count")).toHaveTextContent("1");
  });

  it("should add images in edit mode", () => {
    render(<LineupViewDialog {...defaultProps} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    // Initial count
    expect(screen.getByTestId("edit-image-count")).toHaveTextContent("2");

    // Add image
    fireEvent.click(screen.getByTestId("add-images"));

    expect(screen.getByTestId("edit-image-count")).toHaveTextContent("3");
  });

  it("should remove images in edit mode", () => {
    render(<LineupViewDialog {...defaultProps} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    // Initial count
    expect(screen.getByTestId("edit-image-count")).toHaveTextContent("2");

    // Remove image
    fireEvent.click(screen.getByTestId("remove-image"));

    expect(screen.getByTestId("edit-image-count")).toHaveTextContent("1");
  });

  it("should update youtube link in edit mode", () => {
    render(<LineupViewDialog {...defaultProps} />);

    // Enter edit mode
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    // Change youtube link
    fireEvent.click(screen.getByTestId("change-youtube"));

    expect(screen.getByTestId("edit-youtube")).toHaveTextContent(
      "new-youtube-link",
    );
  });

  it("should not render fullscreen viewer when no images exist", () => {
    const lineWithoutImages: ConnectingLine = {
      ...mockLine,
      uploadedImages: [],
    };

    render(<LineupViewDialog {...defaultProps} line={lineWithoutImages} />);

    expect(screen.queryByTestId("fullscreen-viewer")).not.toBeInTheDocument();
  });

  it("should display correct title based on edit mode", () => {
    render(<LineupViewDialog {...defaultProps} />);

    expect(screen.getByText("Lineup Details")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    expect(screen.getByText("Edit Lineup")).toBeInTheDocument();
  });
});
