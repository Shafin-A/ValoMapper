import { renderHook, act } from "@testing-library/react";
import { useLobbyWebSocket } from "@/hooks/use-lobby-websocket";

type CloseEventLike = {
  code: number;
};

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static instances: MockWebSocket[] = [];

  readonly url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: CloseEventLike) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  sentMessages: string[] = [];
  closeCalls: Array<{ code?: number; reason?: string }> = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(message: string) {
    this.sentMessages.push(message);
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSING;
    this.closeCalls.push({ code, reason });
  }

  emitOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  emitClose(event: CloseEventLike) {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(event);
  }
}

describe("useLobbyWebSocket", () => {
  const originalWebSocket = global.WebSocket;

  beforeEach(() => {
    MockWebSocket.instances = [];
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
  });

  it("keeps connected status when a replaced socket closes late", () => {
    const { result, rerender } = renderHook(
      ({ username }) =>
        useLobbyWebSocket({
          lobbyCode: "ABCD",
          username,
        }),
      {
        initialProps: { username: "Anonymous" },
        reactStrictMode: false,
      },
    );

    const firstSocket = MockWebSocket.instances[0];

    act(() => {
      firstSocket.emitOpen();
    });

    expect(result.current.status).toBe("connected");

    rerender({ username: "DesktopUser" });

    expect(firstSocket.closeCalls.length).toBeGreaterThan(0);
    expect(result.current.status).toBe("connecting");

    const secondSocket = MockWebSocket.instances[1];

    act(() => {
      secondSocket.emitOpen();
    });

    expect(result.current.status).toBe("connected");

    act(() => {
      firstSocket.emitClose({ code: 1000 });
    });

    expect(result.current.status).toBe("connected");

    act(() => {
      result.current.sendMessage("agent_added", { id: "agent-1" });
    });

    expect(secondSocket.sentMessages).toHaveLength(1);
    expect(firstSocket.sentMessages).toHaveLength(0);
  });
});
