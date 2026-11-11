import manifest from "@/app/manifest";

describe("web app manifest", () => {
  const appManifest = manifest();

  it("is installable as a standalone app", () => {
    expect(appManifest.name).toBe("ValoMapper");
    expect(appManifest.start_url).toBe("/");
    expect(appManifest.scope).toBe("/");
    expect(appManifest.display).toBe("standalone");
    expect(appManifest.theme_color).toBe("#0c0a09");
  });

  it("provides regular and maskable icons", () => {
    const icons = appManifest.icons ?? [];

    expect(icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "/icons/icon-192.png", sizes: "192x192" }),
        expect.objectContaining({ src: "/icons/icon-512.png", sizes: "512x512" }),
        expect.objectContaining({
          src: "/icons/maskable-512.png",
          purpose: "maskable",
        }),
      ]),
    );
  });
});
