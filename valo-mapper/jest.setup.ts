import "@testing-library/jest-dom";
import "jest-canvas-mock";
import React from "react";

type MockComponentProps = {
  children?: React.ReactNode;
  [key: string]: unknown;
};

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

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: "/",
    query: {},
    asPath: "/",
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
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
global.Request = class Request {
  url: string;
  method: string;
  headers: { get: (name: string) => string | null };
  body: string | null;
  private _headerMap: Map<string, string>;

  constructor(url: string, options?: any) {
    this.url = url;
    this.method = options?.method || "GET";
    this._headerMap = new Map();
    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        this._headerMap.set(key.toLowerCase(), value as string);
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
} as any;

global.Response = class Response {
  body: any;
  status: number;
  statusText: string;
  headers: Map<string, string>;
  ok: boolean;

  constructor(body?: any, init?: { status?: number; statusText?: string }) {
    this.body = body;
    this.status = init?.status || 200;
    this.statusText = init?.statusText || "";
    this.headers = new Map();
    this.ok = this.status >= 200 && this.status < 300;
  }

  static json(data: any, init?: { status?: number }) {
    const response = new Response(JSON.stringify(data), init);
    return response;
  }

  async json() {
    return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
  }
} as any;

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
