import { renderHook, act } from "@testing-library/react";
import { useLineupForm } from "@/components/tools-sidebar/lineup-dialog/use-lineup-form";

describe("useLineupForm", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should initialize with empty default values", () => {
    const { result } = renderHook(() => useLineupForm());

    expect(result.current.selectedAgent).toBe("");
    expect(result.current.selectedAbility).toBe("");
    expect(result.current.uploadedImages).toEqual([]);
    expect(result.current.youtubeLink).toBe("");
    expect(result.current.notes).toBe("");
    expect(result.current.lineColor).toBe("#ffffff");
  });

  it("should update selectedAgent and clear selectedAbility on handleAgentChange", () => {
    const { result } = renderHook(() => useLineupForm());

    act(() => {
      result.current.setSelectedAbility("some-ability");
    });

    expect(result.current.selectedAbility).toBe("some-ability");

    act(() => {
      result.current.handleAgentChange("Jett");
    });

    expect(result.current.selectedAgent).toBe("Jett");
    expect(result.current.selectedAbility).toBe("");
  });

  it("should remove image at correct index on handleRemoveImage", () => {
    const { result } = renderHook(() => useLineupForm());

    act(() => {
      result.current.setUploadedImages(["image1", "image2", "image3"]);
    });

    expect(result.current.uploadedImages).toHaveLength(3);

    act(() => {
      result.current.handleRemoveImage(1);
    });

    expect(result.current.uploadedImages).toEqual(["image1", "image3"]);
  });

  it("should reset all form fields on resetForm", () => {
    const { result } = renderHook(() => useLineupForm());

    act(() => {
      result.current.setSelectedAgent("Jett");
      result.current.setSelectedAbility("Blade Storm");
      result.current.setUploadedImages(["image1"]);
      result.current.setYoutubeLink("https://youtube.com/watch?v=123");
      result.current.setNotes("Some notes");
      result.current.debouncedSetLineColor("#ff0000");
      jest.runAllTimers();
    });

    expect(result.current.selectedAgent).toBe("Jett");
    expect(result.current.lineColor).toBe("#ff0000");

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.selectedAgent).toBe("");
    expect(result.current.selectedAbility).toBe("");
    expect(result.current.uploadedImages).toEqual([]);
    expect(result.current.youtubeLink).toBe("");
    expect(result.current.notes).toBe("");
    expect(result.current.lineColor).toBe("#ffffff");
  });

  it("isFormValid should return false when agent is not selected", () => {
    const { result } = renderHook(() => useLineupForm());

    act(() => {
      result.current.setSelectedAbility("Blade Storm");
      result.current.setUploadedImages(["image1"]);
    });

    expect(result.current.isFormValid()).toBeFalsy();
  });

  it("isFormValid should return false when ability is not selected", () => {
    const { result } = renderHook(() => useLineupForm());

    act(() => {
      result.current.setSelectedAgent("Jett");
      result.current.setUploadedImages(["image1"]);
    });

    expect(result.current.isFormValid()).toBeFalsy();
  });

  it("isFormValid should return false when no content (images, youtube, notes) provided", () => {
    const { result } = renderHook(() => useLineupForm());

    act(() => {
      result.current.setSelectedAgent("Jett");
      result.current.setSelectedAbility("Blade Storm");
    });

    expect(result.current.isFormValid()).toBeFalsy();
  });

  it("isFormValid should return true with valid agent, ability, and images", () => {
    const { result } = renderHook(() => useLineupForm());

    act(() => {
      result.current.setSelectedAgent("Jett");
      result.current.setSelectedAbility("Blade Storm");
      result.current.setUploadedImages(["image1"]);
    });

    expect(result.current.isFormValid()).toBeTruthy();
  });

  it("isFormValid should return true with valid agent, ability, and youtube link", () => {
    const { result } = renderHook(() => useLineupForm());

    act(() => {
      result.current.setSelectedAgent("Sova");
      result.current.setSelectedAbility("Recon Bolt");
      result.current.setYoutubeLink("https://youtube.com/watch?v=123");
    });

    expect(result.current.isFormValid()).toBeTruthy();
  });

  it("isFormValid should return true with valid agent, ability, and notes", () => {
    const { result } = renderHook(() => useLineupForm());

    act(() => {
      result.current.setSelectedAgent("Viper");
      result.current.setSelectedAbility("Snake Bite");
      result.current.setNotes("Line up with the corner of the box");
    });

    expect(result.current.isFormValid()).toBeTruthy();
  });

  it("isFormValid should return false when youtube link is only whitespace", () => {
    const { result } = renderHook(() => useLineupForm());

    act(() => {
      result.current.setSelectedAgent("Jett");
      result.current.setSelectedAbility("Blade Storm");
      result.current.setYoutubeLink("   ");
    });

    expect(result.current.isFormValid()).toBeFalsy();
  });

  it("isFormValid should return false when notes is only whitespace", () => {
    const { result } = renderHook(() => useLineupForm());

    act(() => {
      result.current.setSelectedAgent("Jett");
      result.current.setSelectedAbility("Blade Storm");
      result.current.setNotes("   ");
    });

    expect(result.current.isFormValid()).toBeFalsy();
  });

  it("should debounce line color changes", () => {
    const { result } = renderHook(() => useLineupForm());

    act(() => {
      result.current.debouncedSetLineColor("#ff0000");
    });

    // Color should not update immediately due to debounce
    expect(result.current.lineColor).toBe("#ffffff");

    act(() => {
      jest.runAllTimers();
    });

    expect(result.current.lineColor).toBe("#ff0000");
  });

  it("should handle multiple rapid line color changes with debounce", () => {
    const { result } = renderHook(() => useLineupForm());

    act(() => {
      result.current.debouncedSetLineColor("#ff0000");
      result.current.debouncedSetLineColor("#00ff00");
      result.current.debouncedSetLineColor("#0000ff");
    });

    act(() => {
      jest.runAllTimers();
    });

    // Only the last color should be applied
    expect(result.current.lineColor).toBe("#0000ff");
  });

  it("should update youtubeLink directly", () => {
    const { result } = renderHook(() => useLineupForm());

    act(() => {
      result.current.setYoutubeLink("https://youtube.com/watch?v=abc123");
    });

    expect(result.current.youtubeLink).toBe(
      "https://youtube.com/watch?v=abc123"
    );
  });

  it("should update notes directly", () => {
    const { result } = renderHook(() => useLineupForm());

    act(() => {
      result.current.setNotes("Aim at the corner");
    });

    expect(result.current.notes).toBe("Aim at the corner");
  });

  it("should add images to uploadedImages", () => {
    const { result } = renderHook(() => useLineupForm());

    act(() => {
      result.current.setUploadedImages(["image1", "image2"]);
    });

    expect(result.current.uploadedImages).toEqual(["image1", "image2"]);
  });

  it("should handle removing first image", () => {
    const { result } = renderHook(() => useLineupForm());

    act(() => {
      result.current.setUploadedImages(["image1", "image2", "image3"]);
    });

    act(() => {
      result.current.handleRemoveImage(0);
    });

    expect(result.current.uploadedImages).toEqual(["image2", "image3"]);
  });

  it("should handle removing last image", () => {
    const { result } = renderHook(() => useLineupForm());

    act(() => {
      result.current.setUploadedImages(["image1", "image2", "image3"]);
    });

    act(() => {
      result.current.handleRemoveImage(2);
    });

    expect(result.current.uploadedImages).toEqual(["image1", "image2"]);
  });
});
