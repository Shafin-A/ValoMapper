import "@testing-library/jest-dom";
import "jest-canvas-mock";
import React from "react";

type MockComponentProps = {
  children?: React.ReactNode;
  [key: string]: unknown;
};

// Mock ResizeObserver (tests can override if needed)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: function MockImage({
    alt,
    src,
    ...rest
  }: {
    alt?: string;
    src?: string;
    [key: string]: unknown;
  }) {
    return React.createElement("span", {
      "data-testid": "mock-image",
      "data-alt": alt,
      "data-src": src,
      role: "img",
      "aria-label": alt,
      ...rest,
    });
  },
}));

// Mock Konva
jest.mock("react-konva", () => {
  return {
    Stage: ({ children, ...props }: MockComponentProps) =>
      React.createElement(
        "div",
        { "data-testid": "konva-stage", ...props },
        children
      ),
    Layer: ({ children, ...props }: MockComponentProps) =>
      React.createElement(
        "div",
        { "data-testid": "konva-layer", ...props },
        children
      ),
    Image: (props: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "konva-image", ...props }),
    Rect: (props: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "konva-rect", ...props }),
    Circle: (props: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "konva-circle", ...props }),
    Line: (props: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "konva-line", ...props }),
    Text: (props: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "konva-text", ...props }),
    Group: ({ children, ...props }: MockComponentProps) =>
      React.createElement(
        "div",
        { "data-testid": "konva-group", ...props },
        children
      ),
    Transformer: (props: Record<string, unknown>) =>
      React.createElement("div", {
        "data-testid": "konva-transformer",
        ...props,
      }),
  };
});

// Mock useImage hook
jest.mock("use-image", () => ({
  __esModule: true,
  default: () => [null, "loaded"],
}));

// Mock Next.js router (hooks are jest.fn() so tests can override return values)
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: "/",
    query: {},
    asPath: "/",
  })),
  usePathname: jest.fn(() => "/"),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock Firebase
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({})),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
}));

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Polyfill Request and Response for Node.js test environment
type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
};

type ResponseInit = {
  status?: number;
  statusText?: string;
};

global.Request = class Request {
  url: string;
  method: string;
  headers: { get: (name: string) => string | null };
  body: string | null;
  private _headerMap: Map<string, string>;

  constructor(url: string, options?: RequestOptions) {
    this.url = url;
    this.method = options?.method || "GET";
    this._headerMap = new Map();
    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        this._headerMap.set(key.toLowerCase(), value);
      });
    }
    this.body = options?.body || null;
    this.headers = {
      get: (name: string) => this._headerMap.get(name.toLowerCase()) || null,
    };
  }

  json() {
    return Promise.resolve(this.body ? JSON.parse(this.body) : null);
  }
} as unknown as typeof globalThis.Request;

global.Response = class Response {
  body: string | null;
  status: number;
  statusText: string;
  headers: Map<string, string>;
  ok: boolean;

  constructor(body?: string | null, init?: ResponseInit) {
    this.body = body ?? null;
    this.status = init?.status || 200;
    this.statusText = init?.statusText || "";
    this.headers = new Map();
    this.ok = this.status >= 200 && this.status < 300;
  }

  static json(data: unknown, init?: { status?: number }) {
    const response = new Response(JSON.stringify(data), init);
    return response;
  }

  async json() {
    return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
  }
} as unknown as typeof globalThis.Response;

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
