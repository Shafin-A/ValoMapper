import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImageUploadButton } from "@/components/tools-sidebar/image-upload-button";
import { useCanvas } from "@/contexts/canvas-context";

type UseCanvasMock = jest.MockedFunction<typeof useCanvas>;

jest.mock("@/contexts/canvas-context", () => ({
  useCanvas: jest.fn(),
}));

describe("ImageUploadButton", () => {
  const setImagesOnCanvas = jest.fn();
  const onImageAdded = jest.fn();
  let originalImage: typeof global.Image;

  beforeAll(() => {
    originalImage = global.Image;

    // mock image loading lifecycle from createObjectURL

    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 100;
      naturalHeight = 100;
      set src(_src: string) {
        setTimeout(() => {
          this.onload?.();
        }, 0);
      }
    } as unknown as typeof global.Image;
  });

  afterAll(() => {
    global.Image = originalImage;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (useCanvas as UseCanvasMock).mockReturnValue({
      setImagesOnCanvas,
    } as unknown as ReturnType<typeof useCanvas>);
  });

  it("disables the upload button while upload is in progress", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://example.com/test.png" }),
    });

    (global as unknown as { fetch?: typeof fetch }).fetch = fetchMock;

    (
      URL as unknown as { createObjectURL: (blob: Blob) => string }
    ).createObjectURL = jest.fn().mockReturnValue("blob://object-url");
    (
      URL as unknown as { revokeObjectURL: (url: string) => void }
    ).revokeObjectURL = jest.fn();

    render(
      <ImageUploadButton
        mapPosition={{ x: 0, y: 0 }}
        onImageAdded={onImageAdded}
      />,
    );

    const button = screen.getByRole("button");
    const input = screen.getByTestId("image-upload-input") as HTMLInputElement;

    expect(button).toBeEnabled();

    const file = new File(["dummy"], "test.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    await waitFor(() => {
      expect(setImagesOnCanvas).toHaveBeenCalled();
      expect(onImageAdded).toHaveBeenCalled();
    });

    expect(button).toBeEnabled();
    expect(fetchMock).toHaveBeenCalled();
  });
});
