import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { LAUNCH_LOCALES } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";

jest.mock("@/i18n/actions", () => ({
  setLocale: jest.fn().mockResolvedValue(undefined),
}));

describe("LanguageSwitcher", () => {
  it("lists every launch locale", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole("button", { name: "Language" }));

    expect(await screen.findByText("Deutsch")).toBeInTheDocument();
    expect(screen.getByText("日本語")).toBeInTheDocument();
    expect(screen.getByText("العربية")).toBeInTheDocument();

    // Radix renders each radio item; the menu label is also present.
    expect(screen.getAllByRole("menuitemradio")).toHaveLength(
      LAUNCH_LOCALES.length,
    );
  });

  it("stores the next locale and refreshes the page", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole("button", { name: "Language" }));
    await user.click(await screen.findByText("Deutsch"));

    await waitFor(() => {
      expect(setLocale).toHaveBeenCalledWith("de-DE");
    });
  });
});
