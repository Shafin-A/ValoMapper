import { GET as getBillingPlans } from "@/app/api/billing/plans/route";
import { POST as cancelSubscription } from "@/app/api/billing/cancel-subscription/route";
import { POST as createCheckoutSession } from "@/app/api/billing/checkout-session/route";
import { POST as resumeSubscription } from "@/app/api/billing/resume-subscription/route";
import { POST as acceptStackInvite } from "@/app/api/billing/stack/accept/[id]/route";
import { POST as declineStackInvite } from "@/app/api/billing/stack/decline/[id]/route";
import { POST as inviteStackMember } from "@/app/api/billing/stack/invite/route";
import { DELETE as leaveStack } from "@/app/api/billing/stack/leave/route";
import { DELETE as removeStackMember } from "@/app/api/billing/stack/members/[id]/route";
import { GET as getStackMembers } from "@/app/api/billing/stack/members/route";
import { GET as getPendingInvite } from "@/app/api/billing/stack/pending-invite/route";
import { GET as getPendingInvites } from "@/app/api/billing/stack/pending-invites/route";
import { DELETE as deleteFolder, PATCH as updateFolder } from "@/app/api/folders/[folderId]/route";
import { GET as getLobby, PATCH as updateLobby } from "@/app/api/lobbies/[lobbyCode]/route";
import { GET as getMatches } from "@/app/api/matches/route";
import { GET as getMatchSummary } from "@/app/api/matches/[matchId]/summary/route";
import { POST as duplicateStrategy } from "@/app/api/strategies/[strategyId]/duplicate/route";
import { DELETE as deleteStrategy, PATCH as updateStrategy } from "@/app/api/strategies/[strategyId]/route";
import { PATCH as bulkUpdateStrategies } from "@/app/api/strategies/bulk/route";
import { POST as bulkDeleteStrategies } from "@/app/api/strategies/bulk-delete/route";
import { GET as searchStrategies } from "@/app/api/strategies/library/route";
import { GET as getStrategyTags } from "@/app/api/strategies/tags/route";
import { DELETE as deleteUser, GET as getUser, PUT as updateUser } from "@/app/api/users/me/route";

const API_URL = process.env.API_URL;

const originalFetch = global.fetch;
let mockFetch: jest.Mock;

const okResponse = (data: unknown = { ok: true }, status = 200) => ({
  ok: true,
  status,
  json: async () => data,
});

const errorResponse = (status: number, body?: unknown) => ({
  ok: false,
  status,
  json:
    body === undefined
      ? async () => {
          throw new Error("Malformed error payload");
        }
      : async () => body,
});

const createRequest = (
  url = "http://localhost/api/test",
  init: { method?: string; headers?: Record<string, string>; body?: string } = {},
) =>
  new Request(url, {
    method: init.method,
    body: init.body,
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

const withTextBody = (request: Request, text: string) => {
  (request as unknown as { text: () => Promise<string> }).text = async () =>
    text;
  return request;
};

const backendCall = () => mockFetch.mock.calls[0];
const backendOptions = () => backendCall()[1];
const backendUrl = () => backendCall()[0];

beforeEach(() => {
  mockFetch = jest.fn().mockResolvedValue(okResponse());
  global.fetch = mockFetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("thin authenticated proxy routes", () => {
  const routes: Array<{
    name: string;
    handler: (request: Request) => Promise<Response>;
    method: string;
    path: string;
    auth?: boolean;
  }> = [
    {
      name: "cancel subscription",
      handler: cancelSubscription,
      method: "POST",
      path: "/billing/cancel-subscription",
    },
    {
      name: "resume subscription",
      handler: resumeSubscription,
      method: "POST",
      path: "/billing/resume-subscription",
    },
    {
      name: "leave stack",
      handler: leaveStack,
      method: "DELETE",
      path: "/billing/stack/leave",
    },
    {
      name: "list stack members",
      handler: getStackMembers,
      method: "GET",
      path: "/billing/stack/members",
    },
    {
      name: "list pending invites",
      handler: getPendingInvites,
      method: "GET",
      path: "/billing/stack/pending-invites",
    },
    {
      name: "pending invite alias",
      handler: getPendingInvite,
      method: "GET",
      path: "/billing/stack/pending-invites",
    },
    {
      name: "billing plans",
      handler: getBillingPlans,
      method: "GET",
      path: "/billing/plans",
      auth: false,
    },
  ];

  it.each(routes)(
    "$name forwards $method $path",
    async ({ handler, method, path, auth = true }) => {
      const request = auth
        ? createRequest()
        : new Request("http://localhost/api/billing/plans");

      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(backendUrl()).toBe(`${API_URL}${path}`);
      expect(backendOptions()).toMatchObject({ method });
      expect(backendOptions().headers.Authorization).toBe(
        auth ? "Bearer test-token" : undefined,
      );
    },
  );

  it("requires authorization on protected routes", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
    });

    const response = await cancelSubscription(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("passes backend errors and messages through", async () => {
    mockFetch.mockResolvedValueOnce(
      errorResponse(403, { error: "Premium required" }),
    );

    const response = await cancelSubscription(createRequest());
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({ error: "Premium required" });
  });

  it("falls back to the route error message for malformed error payloads", async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(500));

    const response = await getStackMembers(createRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to load stack members" });
  });

  it("turns backend 204 responses into a success payload", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });

    const response = await leaveStack(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
  });

  it("returns 504 when the backend request is aborted", async () => {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";
    mockFetch.mockRejectedValueOnce(abortError);

    const response = await cancelSubscription(createRequest());
    const data = await response.json();

    expect(response.status).toBe(504);
    expect(data).toEqual({ error: "Request timed out. Please try again." });
  });
});

describe("routes with dynamic ids", () => {
  it("forwards stack invite ids", async () => {
    const acceptResponse = await acceptStackInvite(createRequest(), {
      params: Promise.resolve({ id: "42" }),
    });
    expect(acceptResponse.status).toBe(200);
    expect(backendUrl()).toBe(`${API_URL}/billing/stack/accept/42`);
    expect(backendOptions().method).toBe("POST");
  });

  it("forwards decline ids", async () => {
    await declineStackInvite(createRequest(), {
      params: Promise.resolve({ id: "7" }),
    });

    expect(backendUrl()).toBe(`${API_URL}/billing/stack/decline/7`);
    expect(backendOptions().method).toBe("POST");
  });

  it("forwards stack member ids for removal", async () => {
    await removeStackMember(createRequest(), {
      params: Promise.resolve({ id: "9" }),
    });

    expect(backendUrl()).toBe(`${API_URL}/billing/stack/members/9`);
    expect(backendOptions().method).toBe("DELETE");
  });

  it("forwards folder ids and patch bodies", async () => {
    await deleteFolder(createRequest(), {
      params: Promise.resolve({ folderId: "12" }),
    });
    expect(backendUrl()).toBe(`${API_URL}/folders/12`);
    expect(backendOptions().method).toBe("DELETE");

    mockFetch.mockClear();
    await updateFolder(
      createRequest("http://localhost/api/folders/12", {
        method: "PATCH",
        body: JSON.stringify({ name: "Lineups" }),
      }),
      { params: Promise.resolve({ folderId: "12" }) },
    );

    expect(backendUrl()).toBe(`${API_URL}/folders/12`);
    expect(backendOptions()).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ name: "Lineups" }),
    });
  });

  it("rejects folder patches without a body", async () => {
    const response = await updateFolder(
      createRequest("http://localhost/api/folders/12", {
        method: "PATCH",
        body: "null",
      }),
      { params: Promise.resolve({ folderId: "12" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "No request body" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("forwards strategy ids and patch bodies", async () => {
    await deleteStrategy(createRequest(), {
      params: Promise.resolve({ strategyId: "31" }),
    });
    expect(backendUrl()).toBe(`${API_URL}/strategies/31`);
    expect(backendOptions().method).toBe("DELETE");

    mockFetch.mockClear();
    await updateStrategy(
      createRequest("http://localhost/api/strategies/31", {
        method: "PATCH",
        body: JSON.stringify({ name: "Retake", folderId: 2 }),
      }),
      { params: Promise.resolve({ strategyId: "31" }) },
    );

    expect(backendUrl()).toBe(`${API_URL}/strategies/31`);
    expect(backendOptions()).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ name: "Retake", folderId: 2 }),
    });
  });

  it("forwards strategy library search and tag requests", async () => {
    await searchStrategies(
      createRequest(
        "http://localhost/api/strategies/library?q=b%20site&tags=a-site&limit=50",
      ),
    );

    expect(backendUrl()).toBe(
      `${API_URL}/strategies/library?q=b%20site&tags=a-site&limit=50`,
    );
    expect(backendOptions().method).toBe("GET");

    mockFetch.mockClear();
    await getStrategyTags(createRequest("http://localhost/api/strategies/tags"));

    expect(backendUrl()).toBe(`${API_URL}/strategies/tags`);
    expect(backendOptions().method).toBe("GET");
  });

  it("forwards bulk strategy updates and deletes", async () => {
    const updateBody = { ids: [1, 2], isFavorite: true, addTags: ["a-site"] };
    await bulkUpdateStrategies(
      createRequest("http://localhost/api/strategies/bulk", {
        method: "PATCH",
        body: JSON.stringify(updateBody),
      }),
    );

    expect(backendUrl()).toBe(`${API_URL}/strategies/bulk`);
    expect(backendOptions()).toMatchObject({
      method: "PATCH",
      body: JSON.stringify(updateBody),
    });

    mockFetch.mockClear();
    const deleteBody = { ids: [1, 2] };
    await bulkDeleteStrategies(
      createRequest("http://localhost/api/strategies/bulk-delete", {
        method: "POST",
        body: JSON.stringify(deleteBody),
      }),
    );

    expect(backendUrl()).toBe(`${API_URL}/strategies/bulk-delete`);
    expect(backendOptions()).toMatchObject({
      method: "POST",
      body: JSON.stringify(deleteBody),
    });
  });

  it("forwards strategy duplicate ids", async () => {
    await duplicateStrategy(createRequest(), {
      params: Promise.resolve({ strategyId: "31" }),
    });

    expect(backendUrl()).toBe(`${API_URL}/strategies/31/duplicate`);
    expect(backendOptions().method).toBe("POST");
  });

  it("rejects strategy patches without a body", async () => {
    const response = await updateStrategy(
      createRequest("http://localhost/api/strategies/31", {
        method: "PATCH",
        body: "null",
      }),
      { params: Promise.resolve({ strategyId: "31" }) },
    );

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("forwards lobby codes", async () => {
    await getLobby(
      new Request("http://localhost/api/lobbies/ABCD"),
      { params: Promise.resolve({ lobbyCode: "ABCD" }) },
    );

    expect(backendUrl()).toBe(`${API_URL}/lobbies/ABCD`);
    expect(backendOptions().method).toBe("GET");
    expect(backendOptions().headers.Authorization).toBeUndefined();

    mockFetch.mockClear();
    await updateLobby(
      new Request("http://localhost/api/lobbies/ABCD", {
        method: "PATCH",
        body: JSON.stringify({ canvasState: { phases: [] } }),
      }),
      { params: Promise.resolve({ lobbyCode: "ABCD" }) },
    );

    expect(backendUrl()).toBe(`${API_URL}/lobbies/ABCD`);
    expect(backendOptions()).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ canvasState: { phases: [] } }),
    });
  });

  it("rejects lobby patches without a body", async () => {
    const response = await updateLobby(
      new Request("http://localhost/api/lobbies/ABCD", {
        method: "PATCH",
        body: "null",
      }),
      { params: Promise.resolve({ lobbyCode: "ABCD" }) },
    );

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("billing request bodies", () => {
  it("forwards a checkout session body", async () => {
    const request = withTextBody(
      createRequest("http://localhost/api/billing/checkout-session", {
        method: "POST",
      }),
      JSON.stringify({ plan: "yearly", returnTo: "/profile" }),
    );

    await createCheckoutSession(request);

    expect(backendUrl()).toBe(`${API_URL}/billing/checkout-session`);
    expect(backendOptions().body).toBe(
      JSON.stringify({ plan: "yearly", returnTo: "/profile" }),
    );
  });

  it("omits the body when checkout is started without options", async () => {
    const request = withTextBody(
      createRequest("http://localhost/api/billing/checkout-session", {
        method: "POST",
      }),
      "",
    );

    await createCheckoutSession(request);

    expect(backendOptions()).not.toHaveProperty("body");
  });

  it("rejects malformed checkout bodies", async () => {
    const request = withTextBody(
      createRequest("http://localhost/api/billing/checkout-session", {
        method: "POST",
      }),
      "{not-json",
    );

    const response = await createCheckoutSession(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Invalid request body" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("forwards stack invite bodies", async () => {
    const request = withTextBody(
      createRequest("http://localhost/api/billing/stack/invite", {
        method: "POST",
      }),
      JSON.stringify({ firebaseUid: "uid-1" }),
    );

    await inviteStackMember(request);

    expect(backendUrl()).toBe(`${API_URL}/billing/stack/invite`);
    expect(backendOptions().body).toBe(
      JSON.stringify({ firebaseUid: "uid-1" }),
    );
  });

  it("rejects malformed stack invite bodies", async () => {
    const request = withTextBody(
      createRequest("http://localhost/api/billing/stack/invite", {
        method: "POST",
      }),
      "not-json",
    );

    const response = await inviteStackMember(request);

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("users/me routes", () => {
  it("gets the current user", async () => {
    await getUser(createRequest("http://localhost/api/users/me"));

    expect(backendUrl()).toBe(`${API_URL}/users/me`);
    expect(backendOptions().method).toBe("GET");
  });

  it("updates the current user", async () => {
    await updateUser(
      createRequest("http://localhost/api/users/me", {
        method: "PUT",
        body: JSON.stringify({ name: "New Name" }),
      }),
    );

    expect(backendUrl()).toBe(`${API_URL}/users/me`);
    expect(backendOptions()).toMatchObject({
      method: "PUT",
      body: JSON.stringify({ name: "New Name" }),
    });
  });

  it("rejects user updates without a body", async () => {
    const response = await updateUser(
      createRequest("http://localhost/api/users/me", {
        method: "PUT",
        body: "null",
      }),
    );

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("deletes the current user", async () => {
    await deleteUser(createRequest("http://localhost/api/users/me"));

    expect(backendUrl()).toBe(`${API_URL}/users/me`);
    expect(backendOptions().method).toBe("DELETE");
  });

  it("requires authorization for users/me", async () => {
    const response = await getUser(
      new Request("http://localhost/api/users/me"),
    );

    expect(response.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("matches routes", () => {
  it("forwards pagination parameters", async () => {
    await getMatches(
      createRequest(
        "http://localhost/api/matches?start=20&limit=5&ignored=true",
      ),
    );

    expect(backendUrl()).toBe(`${API_URL}/matches?start=20&limit=5`);
    expect(backendOptions()).toMatchObject({ method: "GET" });
  });

  it("omits the query string when no pagination is provided", async () => {
    await getMatches(createRequest("http://localhost/api/matches"));

    expect(backendUrl()).toBe(`${API_URL}/matches`);
  });

  it("forwards encoded match ids and summary query params", async () => {
    await getMatchSummary(
      createRequest(
        "http://localhost/api/matches/match%2F1/summary?includeReplayTelemetry=true",
      ),
      { params: Promise.resolve({ matchId: "match/1" }) },
    );

    expect(backendUrl()).toBe(
      `${API_URL}/matches/match%2F1/summary?includeReplayTelemetry=true`,
    );
    expect(backendOptions().headers.Authorization).toBe("Bearer test-token");
  });

  it("rejects an empty match id", async () => {
    const response = await getMatchSummary(
      createRequest("http://localhost/api/matches//summary"),
      { params: Promise.resolve({ matchId: "" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "matchId is required" });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
