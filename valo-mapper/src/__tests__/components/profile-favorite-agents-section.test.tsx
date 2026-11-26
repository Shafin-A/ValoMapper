import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProfileFavoriteAgentsSection } from "@/components/profile/profile-favorite-agents-section";

describe("ProfileFavoriteAgentsSection", () => {
  it("filters agents and saves the selected list", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();

    render(
      <ProfileFavoriteAgentsSection
        favoriteAgents={["Jett"]}
        isSaving={false}
        onSave={onSave}
      />,
    );

    const saveButton = screen.getByRole("button", { name: "Save favorites" });
    expect(saveButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText("Search agents..."), "sage");
    await user.click(screen.getByRole("checkbox", { name: "Sage" }));
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(["Jett", "Sage"]);
  });

  it("shows an empty search state", async () => {
    const user = userEvent.setup();

    render(
      <ProfileFavoriteAgentsSection
        favoriteAgents={[]}
        isSaving={false}
        onSave={jest.fn()}
      />,
    );

    await user.type(
      screen.getByPlaceholderText("Search agents..."),
      "missing agent",
    );

    expect(screen.getByText("No agents match your search.")).toBeInTheDocument();
  });
});
