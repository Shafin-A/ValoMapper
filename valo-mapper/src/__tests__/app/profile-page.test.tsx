import { render, screen } from "@testing-library/react";
import ProfilePage from "@/app/profile/page";

jest.mock("@/components/profile/profile-content", () => ({
  ProfileContent: () => (
    <div data-testid="profile-content">profile content</div>
  ),
}));

describe("ProfilePage", () => {
  it("renders the profile content", () => {
    render(<ProfilePage />);

    expect(screen.getByTestId("profile-content")).toBeInTheDocument();
  });
});
