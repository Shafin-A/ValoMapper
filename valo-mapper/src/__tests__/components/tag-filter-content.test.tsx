import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TagFilterContent } from "@/components/strategies/tag-filter-content";

const renderContent = (overrides: Partial<React.ComponentProps<typeof TagFilterContent>> = {}) => {
  const props = {
    availableTags: ["a-site", "post-plant", "retake"],
    selectedTags: [],
    tagMode: "all" as const,
    onToggleTag: jest.fn(),
    onTagModeChange: jest.fn(),
    onClear: jest.fn(),
    ...overrides,
  };

  render(<TagFilterContent {...props} />);
  return props;
};

describe("TagFilterContent", () => {
  it("filters tags by the search query", async () => {
    const user = userEvent.setup();
    renderContent();

    await user.type(screen.getByPlaceholderText("Search tags..."), "post");

    expect(screen.getByRole("checkbox", { name: "post-plant" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "a-site" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "retake" })).not.toBeInTheDocument();
  });

  it("shows an empty state when no tags match", async () => {
    const user = userEvent.setup();
    renderContent();

    await user.type(screen.getByPlaceholderText("Search tags..."), "missing");

    expect(screen.getByText("No tags match your search.")).toBeInTheDocument();
  });

  it("clears the search query", async () => {
    const user = userEvent.setup();
    renderContent();

    const input = screen.getByPlaceholderText("Search tags...");
    await user.type(input, "post");
    await user.click(screen.getByRole("button", { name: "Clear tag search" }));

    expect(input).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: "a-site" })).toBeInTheDocument();
  });

  it("toggles a tag", async () => {
    const user = userEvent.setup();
    const props = renderContent();

    await user.click(screen.getByRole("checkbox", { name: "retake" }));

    expect(props.onToggleTag).toHaveBeenCalledWith("retake");
  });
});
