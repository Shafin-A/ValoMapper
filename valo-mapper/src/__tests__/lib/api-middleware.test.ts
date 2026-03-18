import { withAuthRequired } from "@/lib/api-middleware";

describe("withAuthRequired handler dispatch", () => {
  it("keeps authHeader in static handlers when Next provides a context arg", async () => {
    const staticHandler = jest.fn(
      async (_request: Request, authHeader: string) => {
        return new Response(JSON.stringify({ authHeader }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    );

    const wrapped = withAuthRequired(staticHandler);

    const request = new Request("http://localhost/api/users/me", {
      method: "GET",
      headers: {
        Authorization: "Bearer test-token",
      },
    });

    const response = await (
      wrapped as unknown as (
        request: Request,
        param: unknown,
      ) => Promise<Response>
    )(request, { params: Promise.resolve({}) });

    const payload = await response.json();

    expect(staticHandler).toHaveBeenCalledWith(request, "Bearer test-token");
    expect(payload).toEqual({ authHeader: "Bearer test-token" });
  });

  it("passes param and authHeader to dynamic handlers", async () => {
    const dynamicHandler = jest.fn(
      async (
        _request: Request,
        param: { params: Promise<{ id: string }> },
        authHeader: string,
      ) => {
        const { id } = await param.params;
        return new Response(JSON.stringify({ id, authHeader }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    );

    const wrapped = withAuthRequired(dynamicHandler);

    const request = new Request("http://localhost/api/users/me", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer test-token",
      },
    });

    const param = { params: Promise.resolve({ id: "member-1" }) };
    const response = await wrapped(request, param);
    const payload = await response.json();

    expect(dynamicHandler).toHaveBeenCalledWith(
      request,
      param,
      "Bearer test-token",
    );
    expect(payload).toEqual({
      id: "member-1",
      authHeader: "Bearer test-token",
    });
  });
});
