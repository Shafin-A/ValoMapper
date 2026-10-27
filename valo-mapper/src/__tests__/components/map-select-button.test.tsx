import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MapSelect } from "@/components/tools-sidebar/map-select-button";
import { useCollaborativeCanvas } from "@/hooks/use-collaborative-canvas";
import { MapOption, MapSide } from "@/lib/types";

jest.mock("@/hooks/use-collaborative-canvas", () => ({
  useCollaborativeCanvas: jest.fn(),
}));

const mockUseCollaborativeCanvas = jest.mocked(useCollaborativeCanvas);

const mapOptions: MapOption[] = [
  { id: "ascent", text: "Ascent", textColor: "text-white" },
  { id: "bind", text: "Bind", textColor: "text-white" },
];

describe("MapSelect", () => {
  const mockNotifyMapChanged = jest.fn();
  const mockNotifySideChanged = jest.fn();
  const mockSetSelectedMap = jest.fn();
  const mockSetMapSide = jest.fn();
  const mockOnMapSelect = jest.fn();
  const mockOnMapRotate = jest.fn();

  const renderComponent = (
    selectedMap: MapOption = mapOptions[0],
    mapSide: MapSide = "attack",
    readOnly = false,
  ) => {
    return render(
      <MapSelect
        mapOptions={mapOptions}
        selectedMap={selectedMap}
        setSelectedMap={mockSetSelectedMap}
        onMapSelect={mockOnMapSelect}
        allyColor="#00ff00"
        enemyColor="#ff0000"
        mapSide={mapSide}
        setMapSide={mockSetMapSide}
        onMapRotate={mockOnMapRotate}
        disabled={false}
        readOnly={readOnly}
      />,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCollaborativeCanvas.mockReturnValue({
      notifyMapChanged: mockNotifyMapChanged,
      notifySideChanged: mockNotifySideChanged,
    } as unknown as ReturnType<typeof useCollaborativeCanvas>);
  });

  it("does nothing when selecting the already selected map", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole("button", { name: "Ascent" }));

    const ascentLabels = await screen.findAllByText("Ascent");
    await user.click(ascentLabels[1]);

    expect(mockSetSelectedMap).not.toHaveBeenCalled();
    expect(mockNotifyMapChanged).not.toHaveBeenCalled();
    expect(mockOnMapSelect).not.toHaveBeenCalled();
  });

  it("updates map state and notifies collaborators when selecting a different map", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole("button", { name: "Ascent" }));
    await user.click(await screen.findByText("Bind"));

    expect(mockSetSelectedMap).toHaveBeenCalledWith(mapOptions[1]);
    expect(mockNotifyMapChanged).toHaveBeenCalledWith(mapOptions[1], true);
    expect(mockOnMapSelect).toHaveBeenCalledWith(mapOptions[1]);
  });

  it("does not open the map menu when readOnly", async () => {
    const user = userEvent.setup();
    renderComponent(mapOptions[0], "defense", true);

    await user.click(screen.getByText("Ascent"));

    expect(screen.queryByText("Bind")).not.toBeInTheDocument();
    expect(mockSetSelectedMap).not.toHaveBeenCalled();
    expect(mockNotifyMapChanged).not.toHaveBeenCalled();
    expect(mockOnMapSelect).not.toHaveBeenCalled();
  });

  it("still rotates the map when readOnly", async () => {
    const user = userEvent.setup();
    renderComponent(mapOptions[0], "defense", true);

    await user.click(screen.getByRole("button", { name: /defense/i }));

    expect(mockSetMapSide).toHaveBeenCalledWith("attack");
    expect(mockNotifySideChanged).toHaveBeenCalledWith("attack");
    expect(mockOnMapRotate).toHaveBeenCalled();
  });
});
