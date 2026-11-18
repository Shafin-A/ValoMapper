import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextAddButton } from "@/components/tools-sidebar/text-add-button";
import {
  useCanvasEntityActions,
  useCanvasUi,
} from "@/contexts/canvas-context";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { MAP_SIZE } from "@/lib/consts";
import { TextCanvas } from "@/lib/types";

jest.mock("@/contexts/canvas-context", () => ({
  useCanvasEntityActions: jest.fn(),
  useCanvasUi: jest.fn(),
}));

jest.mock("@/hooks/use-collaborative-canvas", () => ({
  useCollaborativeCanvas: jest.fn(),
}));

const mockUseCanvasEntityActions = jest.mocked(useCanvasEntityActions);
const mockUseCanvasUi = jest.mocked(useCanvasUi);
const mockUseCollaborativeCanvas = jest.mocked(useCollaborativeCanvas);

const getAddedText = (
  setTextsOnCanvas: jest.Mock,
): TextCanvas => {
  const updater = setTextsOnCanvas.mock.calls[0][0] as (
    previous: TextCanvas[],
  ) => TextCanvas[];
  return updater([])[0];
};

describe("TextAddButton", () => {
  const setTextsOnCanvas = jest.fn();
  const setEditingTextId = jest.fn();
  const setIsDrawMode = jest.fn();
  const notifyTextAdded = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Math, "random").mockReturnValue(0);

    mockUseCanvasEntityActions.mockReturnValue({
      setTextsOnCanvas,
    } as unknown as ReturnType<typeof useCanvasEntityActions>);
    mockUseCanvasUi.mockReturnValue({
      setEditingTextId,
      setIsDrawMode,
    } as unknown as ReturnType<typeof useCanvasUi>);
    mockUseCollaborativeCanvas.mockReturnValue({
      notifyTextAdded,
    } as unknown as ReturnType<typeof useCollaborativeCanvas>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("adds a text item centered on the map position", async () => {
    const user = userEvent.setup();
    const onTextAdded = jest.fn();
    const onBeforeAdd = jest.fn();

    render(
      <TextAddButton
        mapPosition={{ x: 10, y: 20 }}
        onTextAdded={onTextAdded}
        onBeforeAdd={onBeforeAdd}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add text" }));

    const addedText = getAddedText(setTextsOnCanvas);

    expect(addedText).toMatchObject({
      text: "",
      width: 200,
      height: 60,
      x: 10 + MAP_SIZE / 2,
      y: 20 + MAP_SIZE / 2,
    });
    expect(addedText.id).toMatch(/^text-/);
    expect(onBeforeAdd).toHaveBeenCalled();
    expect(onTextAdded).toHaveBeenCalledWith(addedText);
    expect(notifyTextAdded).toHaveBeenCalledWith(addedText);
  });

  it("clears text editing and exits draw mode", async () => {
    const user = userEvent.setup();

    render(<TextAddButton mapPosition={{ x: 0, y: 0 }} />);
    await user.click(screen.getByRole("button", { name: "Add text" }));

    expect(setEditingTextId).toHaveBeenCalledWith(null);
    expect(setIsDrawMode).toHaveBeenCalledWith(false);
  });

  it("runs the provided click handler first", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    render(
      <TextAddButton mapPosition={{ x: 0, y: 0 }} onClick={onClick} />,
    );
    await user.click(screen.getByRole("button", { name: "Add text" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(setTextsOnCanvas).toHaveBeenCalledTimes(1);
  });

  it("does not add text when the click handler prevents the default", () => {
    const onClick = jest.fn((event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
    });

    render(
      <TextAddButton mapPosition={{ x: 0, y: 0 }} onClick={onClick} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add text" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(setTextsOnCanvas).not.toHaveBeenCalled();
    expect(notifyTextAdded).not.toHaveBeenCalled();
  });
});
