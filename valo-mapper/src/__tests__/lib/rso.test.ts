import { generateRSOAuthLink, parseRSORedirect } from "@/lib/rso";
import { GET } from "@/app/api/auth/rso/callback/route";

describe("RSO helpers", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_RSO_REDIRECT_URI;
  });

  test("generateRSOAuthLink uses API callback by default", () => {
    const link = generateRSOAuthLink("my-client");
    expect(link).toContain("https://auth.riotgames.com/authorize");
    // redirect uri should be encoded and include the api path
    expect(link).toMatch(/redirect_uri=.*%2Fapi%2Fauth%2Frso%2Fcallback/);
    expect(link).toMatch(/client_id=my-client/);
  });

  test("generateRSOAuthLink respects NEXT_PUBLIC_RSO_REDIRECT_URI", () => {
    process.env.NEXT_PUBLIC_RSO_REDIRECT_URI = "https://foobar.local/cb";
    const link = generateRSOAuthLink("cid");
    expect(link).toMatch(/redirect_uri=.*https%3A%2F%2Ffoobar.local%2Fcb/);
  });
});

describe("state encoding and parsing", () => {
  test("parseRSORedirect returns slash when state undefined", () => {
    expect(parseRSORedirect(undefined)).toBe("/");
  });

  test("parseRSORedirect extracts encoded path", () => {
    const encoded = encodeURIComponent("/foo/bar");
    expect(parseRSORedirect(`redirect=${encoded}`)).toBe("/foo/bar");
  });

  test("generateRSOAuthLink includes state when provided", () => {
    const link = generateRSOAuthLink("cid", "redirect=/foo");
    expect(link).toContain("state=");
    // value should be URL-encoded once by URLSearchParams
    expect(link).toMatch(/state=redirect%3D%2Ffoo/);
  });
});

describe("/api/auth/rso/callback route", () => {
  it("GET should redirect to client page preserving params", async () => {
    const req = new Request(
      "https://example.com/api/auth/rso/callback?code=abc123&state=xyz",
    );
    const res = await GET(req as Request);
    expect(res.status).toBe(307);
    // inspect headers directly
    console.log("res.headers object", res.headers);
    // our handler adds a `redirectPath` property for testing
    const redirectPath = (res as unknown as { redirectPath?: string })
      .redirectPath;
    expect(redirectPath).toBe(
      "https://example.com/auth/rso-callback?code=abc123&state=xyz",
    );
  });
});
