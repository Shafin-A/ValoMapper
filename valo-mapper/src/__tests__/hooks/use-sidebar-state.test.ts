import { renderHook, act } from "@testing-library/react";
import { useSidebarState } from "@/hooks/use-sidebar-state";

describe("useSidebarState", () => {
  it("should initialize with default values", () => {
    const { result } = renderHook(() => useSidebarState());

    expect(result.current.leftSidebarOpen).toBe(true);
    expect(result.current.rightSidebarOpen).toBe(true);
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

  it("should set both sidebars independently", () => {
    const { result } = renderHook(() => useSidebarState());

    act(() => {
      result.current.setLeftSidebarOpen(false);
      result.current.setRightSidebarOpen(false);
    });

    expect(result.current.leftSidebarOpen).toBe(false);
    expect(result.current.rightSidebarOpen).toBe(false);
  });
});
