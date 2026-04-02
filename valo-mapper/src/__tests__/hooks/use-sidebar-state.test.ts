import { renderHook, act } from "@testing-library/react";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { useIsMobile } from "@/hooks/use-mobile";

jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: jest.fn(),
}));

const mockUseIsMobile = jest.mocked(useIsMobile);

describe("useSidebarState", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseIsMobile.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should initialize with both sidebars open on desktop", () => {
    const { result } = renderHook(() => useSidebarState());

    expect(result.current.leftSidebarOpen).toBe(true);
    expect(result.current.rightSidebarOpen).toBe(true);
  });

  it("should initialize with both sidebars closed on mobile", () => {
    mockUseIsMobile.mockReturnValue(true);
    const { result } = renderHook(() => useSidebarState());

    expect(result.current.leftSidebarOpen).toBe(false);
    expect(result.current.rightSidebarOpen).toBe(false);
  });

  it("should update left sidebar state", () => {
    const { result } = renderHook(() => useSidebarState());

    act(() => {
      result.current.setLeftSidebarOpen(false);
    });

    expect(result.current.leftSidebarOpen).toBe(false);

    act(() => {
      result.current.setLeftSidebarOpen(true);
    });

    expect(result.current.leftSidebarOpen).toBe(true);
  });

  it("should update right sidebar state", () => {
    const { result } = renderHook(() => useSidebarState());

    act(() => {
      result.current.setRightSidebarOpen(false);
    });

    expect(result.current.rightSidebarOpen).toBe(false);
  });

  it("should set both sidebars independently on desktop", () => {
    const { result } = renderHook(() => useSidebarState());

    act(() => {
      result.current.setLeftSidebarOpen(false);
      result.current.setRightSidebarOpen(false);
    });

    expect(result.current.leftSidebarOpen).toBe(false);
    expect(result.current.rightSidebarOpen).toBe(false);
  });

  it("should keep sidebars mutually exclusive on mobile", () => {
    mockUseIsMobile.mockReturnValue(true);
    const { result } = renderHook(() => useSidebarState());

    act(() => {
      result.current.setLeftSidebarOpen(true);
    });

    expect(result.current.leftSidebarOpen).toBe(true);
    expect(result.current.rightSidebarOpen).toBe(false);

    act(() => {
      result.current.setRightSidebarOpen(true);
    });

    expect(result.current.leftSidebarOpen).toBe(false);
    expect(result.current.rightSidebarOpen).toBe(true);
  });
});
