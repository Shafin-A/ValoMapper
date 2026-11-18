import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateFolderForm } from "@/components/strategies/create-folder-form";

describe("CreateFolderForm", () => {
  it("disables submission while the name is empty", () => {
    render(<CreateFolderForm onSubmit={jest.fn()} isPending={false} />);

    expect(screen.getByRole("button", { name: "Create Folder" })).toBeDisabled();
  });

  it("keeps submission disabled for whitespace-only names", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(<CreateFolderForm onSubmit={onSubmit} isPending={false} />);
    await user.type(screen.getByLabelText("Folder name"), "   ");

    expect(screen.getByRole("button", { name: "Create Folder" })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the trimmed folder name and clears the input", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(<CreateFolderForm onSubmit={onSubmit} isPending={false} />);

    const input = screen.getByLabelText("Folder name");
    await user.type(input, "  B Site Rush  ");
    await user.click(screen.getByRole("button", { name: "Create Folder" }));

    expect(onSubmit).toHaveBeenCalledWith("B Site Rush");
    expect(input).toHaveValue("");
  });

  it("shows pending state and blocks repeat submissions", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(<CreateFolderForm onSubmit={onSubmit} isPending={true} />);
    await user.type(screen.getByLabelText("Folder name"), "Retakes");

    const button = screen.getByRole("button", { name: "Creating..." });

    expect(button).toBeDisabled();
    await user.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
