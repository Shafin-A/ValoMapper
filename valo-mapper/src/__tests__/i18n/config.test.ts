import {
  DEFAULT_LOCALE,
  LAUNCH_LOCALES,
  LOCALES,
  LOCALE_META,
  negotiateLocale,
  parseAcceptLanguage,
} from "@/i18n/config";

describe("i18n config", () => {
  it("matches the 18 valorant-api.com locales and excludes en-GB", () => {
    expect(LOCALES).toHaveLength(18);
    expect(LOCALES).not.toContain("en-GB");
    expect(new Set(LOCALES).size).toBe(LOCALES.length);
  });

  it("defers Arabic but keeps it configured", () => {
    expect(LOCALES).toContain("ar-AE");
    expect(LAUNCH_LOCALES).not.toContain("ar-AE");
    expect(LAUNCH_LOCALES).toHaveLength(17);
  });

  it("has metadata for every locale", () => {
    for (const locale of LOCALES) {
      expect(LOCALE_META[locale].nativeName).toBeTruthy();
      expect(LOCALE_META[locale].englishName).toBeTruthy();
    }

    expect(LOCALE_META["ar-AE"].dir).toBe("rtl");
  });

  it("parses and sorts Accept-Language entries by quality", () => {
    expect(parseAcceptLanguage("de-DE;q=0.5, fr-FR;q=0.9, en;q=0.8")).toEqual([
      { tag: "fr-FR", quality: 0.9 },
      { tag: "en", quality: 0.8 },
      { tag: "de-DE", quality: 0.5 },
    ]);
  });

  it("negotiates exact and regional fallbacks", () => {
    expect(negotiateLocale("de-DE")).toBe("de-DE");
    expect(negotiateLocale("en-GB")).toBe("en-US");
    expect(negotiateLocale("pt-PT")).toBe("pt-BR");
    expect(negotiateLocale("fr-CA")).toBe("fr-FR");
    expect(negotiateLocale("es-AR")).toBe("es-MX");
    expect(negotiateLocale("es-ES")).toBe("es-ES");
  });

  it("negotiates Chinese scripts", () => {
    expect(negotiateLocale("zh-Hant-HK")).toBe("zh-TW");
    expect(negotiateLocale("zh-Hans-SG")).toBe("zh-CN");
    expect(negotiateLocale("zh")).toBe("zh-CN");
  });

  it("respects q-order over header order", () => {
    expect(negotiateLocale("de-DE;q=0.4,ja-JP;q=0.9")).toBe("ja-JP");
  });

  it("falls back to English for deferred Arabic in the launch set", () => {
    expect(negotiateLocale("ar-AE")).toBe("en-US");
    expect(negotiateLocale("ar-AE", LOCALES)).toBe("ar-AE");
  });

  it("falls back to the default locale", () => {
    expect(negotiateLocale(null)).toBe(DEFAULT_LOCALE);
    expect(negotiateLocale("")).toBe(DEFAULT_LOCALE);
    expect(negotiateLocale("xx-XX")).toBe(DEFAULT_LOCALE);
  });
});
