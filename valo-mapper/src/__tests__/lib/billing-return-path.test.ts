import {
  getBillingCancelReturnLabel,
  getBillingSuccessReturnLabel,
  normalizeBillingReturnPath,
} from "@/lib/billing-return-path";

describe("normalizeBillingReturnPath", () => {
  it("keeps safe absolute paths", () => {
    expect(normalizeBillingReturnPath("/strategies", "/profile")).toBe(
      "/strategies",
    );
    expect(normalizeBillingReturnPath("  /profile  ", "/")).toBe("/profile");
    expect(
      normalizeBillingReturnPath("/strategies/abc?tab=notes", "/"),
    ).toBe("/strategies/abc?tab=notes");
  });

  it("falls back for missing paths", () => {
    expect(normalizeBillingReturnPath(null, "/profile")).toBe("/profile");
    expect(normalizeBillingReturnPath(undefined, "/profile")).toBe("/profile");
    expect(normalizeBillingReturnPath("   ", "/profile")).toBe("/profile");
  });

  it("rejects protocol-relative and relative paths", () => {
    expect(normalizeBillingReturnPath("//evil.example", "/profile")).toBe(
      "/profile",
    );
    expect(normalizeBillingReturnPath("https://evil.example", "/profile")).toBe(
      "/profile",
    );
    expect(normalizeBillingReturnPath("profile", "/profile")).toBe("/profile");
  });

  it("rejects paths containing control characters", () => {
    expect(normalizeBillingReturnPath("/profile\n/evil", "/home")).toBe("/home");
    expect(normalizeBillingReturnPath("/pro\rfile", "/home")).toBe("/home");
  });
});

describe("billing return labels", () => {
  const cases: Array<[string, string, string]> = [
    ["/", "Back to Home", "Go to Home"],
    ["/strategies", "Back to My Strategies", "Go to My Strategies"],
    ["/profile", "Back to Profile", "Go to Profile"],
    ["/ABCD", "Back to your strategy", "Back to your strategy"],
    ["/privacy-policy", "Back to previous page", "Continue"],
    ["/unknown-page", "Back to your strategy", "Back to your strategy"],
  ];

  it.each(cases)(
    "labels the return path %s",
    (path, cancelLabel, successLabel) => {
      expect(getBillingCancelReturnLabel(path)).toBe(cancelLabel);
      expect(getBillingSuccessReturnLabel(path)).toBe(successLabel);
    },
  );

  it("ignores query strings and hashes when choosing a label", () => {
    expect(getBillingCancelReturnLabel("/?checkout=success")).toBe(
      "Back to Home",
    );
    expect(getBillingSuccessReturnLabel("/strategies#latest")).toBe(
      "Go to My Strategies",
    );
    expect(getBillingSuccessReturnLabel("/ABCD?tab=one#top")).toBe(
      "Back to your strategy",
    );
  });
});
