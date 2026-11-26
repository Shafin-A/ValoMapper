import { createRef } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  TagInput,
  type TagInputHandle,
} from "@/components/strategies/tag-input";

describe("TagInput", () => {
  it("adds a tag on Enter", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<TagInput value={[]} onChange={onChange} availableTags={[]} />);

    await user.type(screen.getByRole("textbox"), "Post-Plant{Enter}");

    expect(onChange).toHaveBeenCalledWith(["post-plant"]);
  });

  it("commits pending input when the parent saves", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const ref = createRef<TagInputHandle>();

    render(
      <TagInput ref={ref} value={[]} onChange={onChange} availableTags={[]} />,
    );

    await user.type(screen.getByRole("textbox"), "A Site");
    expect(screen.getByText("0/8 tags")).toBeInTheDocument();

    let committed: string[] | null = null;
    act(() => {
      committed = ref.current?.commit() ?? null;
    });

    expect(committed).toEqual(["a site"]);
    expect(onChange).toHaveBeenCalledWith(["a site"]);
  });

  it("rejects an invalid pending tag instead of silently dropping it", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const ref = createRef<TagInputHandle>();

    render(
      <TagInput ref={ref} value={[]} onChange={onChange} availableTags={[]} />,
    );

    await user.type(screen.getByRole("textbox"), "bad/tag");

    let committed: string[] | null = null;
    act(() => {
      committed = ref.current?.commit() ?? null;
    });

    expect(committed).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tags must be 24 characters or fewer",
    );
  });
});
