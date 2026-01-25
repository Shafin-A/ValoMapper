import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelpTab } from "@/components/help/help-tab";

jest.mock("@/components/legal/privacy-policy", () => ({
  PrivacyPolicy: () => (
    <div data-testid="privacy-policy">Privacy Policy Content</div>
  ),
}));

jest.mock("@/components/legal/terms-of-service", () => ({
  TermsOfService: () => (
    <div data-testid="terms-of-service">Terms of Service Content</div>
  ),
}));

jest.mock("@/components/help/shortcuts", () => ({
  Shortcuts: () => <div data-testid="shortcuts">Shortcuts Content</div>,
}));

describe("HelpTab", () => {
  it("should render all tab triggers", () => {
    render(<HelpTab />);

    expect(screen.getByRole("tab", { name: "About" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Keyboard Shortcuts" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Lobbies" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Privacy Policy" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Terms of Service" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Contact" })).toBeInTheDocument();
  });

  it("should display About tab content by default", () => {
    render(<HelpTab />);

    expect(screen.getByText(/ValoMapper is a website/i)).toBeInTheDocument();
    expect(screen.getByText(/We give you a clean canvas/i)).toBeInTheDocument();
  });

  it("should have About tab selected by default", () => {
    render(<HelpTab />);

    const aboutTab = screen.getByRole("tab", { name: "About" });
    expect(aboutTab).toHaveAttribute("data-state", "active");
  });

  it("should switch to Keyboard Shortcuts tab when clicked", async () => {
    const user = userEvent.setup();
    render(<HelpTab />);

    const keyboardShortcutsTab = screen.getByRole("tab", {
      name: "Keyboard Shortcuts",
    });
    await user.click(keyboardShortcutsTab);

    expect(keyboardShortcutsTab).toHaveAttribute("data-state", "active");
    expect(screen.getByTestId("shortcuts")).toBeInTheDocument();
  });

  it("should switch to Lobbies tab and display lobbies content", async () => {
    const user = userEvent.setup();
    render(<HelpTab />);

    const lobbiesTab = screen.getByRole("tab", { name: "Lobbies" });
    await user.click(lobbiesTab);

    expect(lobbiesTab).toHaveAttribute("data-state", "active");
    expect(
      screen.getByText(/Each lobby is a shareable strategy board/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/You can share the URL or code with teammates/i),
    ).toBeInTheDocument();
  });

  it("should switch to Privacy Policy tab and render component", async () => {
    const user = userEvent.setup();
    render(<HelpTab />);

    const privacyTab = screen.getByRole("tab", { name: "Privacy Policy" });
    await user.click(privacyTab);

    expect(privacyTab).toHaveAttribute("data-state", "active");
    expect(screen.getByTestId("privacy-policy")).toBeInTheDocument();
  });

  it("should switch to Terms of Service tab and render component", async () => {
    const user = userEvent.setup();
    render(<HelpTab />);

    const termsTab = screen.getByRole("tab", { name: "Terms of Service" });
    await user.click(termsTab);

    expect(termsTab).toHaveAttribute("data-state", "active");
    expect(screen.getByTestId("terms-of-service")).toBeInTheDocument();
  });

  it("should switch to Contact tab and display contact content", async () => {
    const user = userEvent.setup();
    render(<HelpTab />);

    const contactTab = screen.getByRole("tab", { name: "Contact" });
    await user.click(contactTab);

    expect(contactTab).toHaveAttribute("data-state", "active");
    expect(
      screen.getByText(/valomappercontact@gmail.com/i),
    ).toBeInTheDocument();
  });

  it("should display tab title in content area", () => {
    render(<HelpTab />);

    // Default tab is About
    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
  });

  it("should update tab title when switching tabs", async () => {
    const user = userEvent.setup();
    render(<HelpTab />);

    const lobbiesTab = screen.getByRole("tab", { name: "Lobbies" });
    await user.click(lobbiesTab);

    expect(
      screen.getByRole("heading", { name: "Lobbies" }),
    ).toBeInTheDocument();
  });

  it("should preserve whitespace in text content", () => {
    render(<HelpTab />);

    const textContent = screen.getByText(/ValoMapper is a website/i);
    const whitespacedDiv = textContent.closest(".whitespace-pre-line");
    expect(whitespacedDiv).toBeInTheDocument();
  });

  it("should render text content for About tab", () => {
    render(<HelpTab />);

    expect(screen.getByText(/not endorsed by Riot Games/i)).toBeInTheDocument();
  });

  it("should render all tabs in vertical orientation", () => {
    const { container } = render(<HelpTab />);

    const tabsRoot = container.querySelector('[data-orientation="vertical"]');
    expect(tabsRoot).toBeInTheDocument();
  });

  it("should maintain inactive state for non-selected tabs", async () => {
    const user = userEvent.setup();
    render(<HelpTab />);

    const lobbiesTab = screen.getByRole("tab", { name: "Lobbies" });
    const aboutTab = screen.getByRole("tab", { name: "About" });

    expect(aboutTab).toHaveAttribute("data-state", "active");
    expect(lobbiesTab).toHaveAttribute("data-state", "inactive");

    await user.click(lobbiesTab);

    expect(lobbiesTab).toHaveAttribute("data-state", "active");
    expect(aboutTab).toHaveAttribute("data-state", "inactive");
  });
});
