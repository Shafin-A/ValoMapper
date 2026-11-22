import "@testing-library/jest-dom";
import "jest-canvas-mock";
import React from "react";
import {
  DecompressionStream,
  ReadableStream,
  TransformStream,
} from "node:stream/web";
import { TextDecoder, TextEncoder } from "node:util";
import enUSMessages from "./src/i18n/messages/en-US.json";

const mockEnUSMessages = enUSMessages;

// jsdom lacks the stream/encoding globals the demo loader uses.
if (typeof globalThis.ReadableStream === "undefined") {
  Object.assign(globalThis, {
    ReadableStream,
    TransformStream,
    DecompressionStream,
    TextDecoder,
    TextEncoder,
  });
}

// fake-indexeddb clones values with structuredClone, which jsdom does not
// expose. Tests only store JSON-shaped matches, so a JSON round trip is exact.
if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value));
}

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

// Mock collaborative canvas hook
jest.mock("@/hooks/use-collaborative-canvas", () => ({
  useCollaborativeCanvas: jest.fn(() => ({
    syncCanvasItem: jest.fn(),
    syncCanvasItemDelete: jest.fn(),
    syncCanvasItemToggleAlly: jest.fn(),
    notifyAgentAdded: jest.fn(),
    notifyAgentMoved: jest.fn(),
    notifyAgentRemoved: jest.fn(),
    notifyAbilityAdded: jest.fn(),
    notifyAbilityMoved: jest.fn(),
    notifyAbilityRemoved: jest.fn(),
    notifyLineDrawn: jest.fn(),
    notifyLineRemoved: jest.fn(),
    notifyConnLineAdded: jest.fn(),
    notifyConnLineUpdated: jest.fn(),
    notifyConnLineRemoved: jest.fn(),
    notifyTextAdded: jest.fn(),
    notifyTextUpdated: jest.fn(),
    notifyTextRemoved: jest.fn(),
    notifyImageAdded: jest.fn(),
    notifyImageMoved: jest.fn(),
    notifyImageRemoved: jest.fn(),
    notifyToolIconAdded: jest.fn(),
    notifyToolIconMoved: jest.fn(),
    notifyToolIconRemoved: jest.fn(),
    notifyMapChanged: jest.fn(),
    notifySideChanged: jest.fn(),
    notifyPhaseChanged: jest.fn(),
  })),
}));

// Mock WebSocket context
jest.mock("@/contexts/websocket-context", () => ({
  useWebSocket: () => ({
    status: "connected",
    users: [],
    cursors: new Map(),
    sendCursorPosition: jest.fn(),
    broadcastAgentAdded: jest.fn(),
    broadcastAgentMoved: jest.fn(),
    broadcastAgentRemoved: jest.fn(),
    broadcastAbilityAdded: jest.fn(),
    broadcastAbilityMoved: jest.fn(),
    broadcastAbilityRemoved: jest.fn(),
    broadcastLineDrawn: jest.fn(),
    broadcastLineRemoved: jest.fn(),
    broadcastConnLineAdded: jest.fn(),
    broadcastConnLineUpdated: jest.fn(),
    broadcastConnLineRemoved: jest.fn(),
    broadcastTextAdded: jest.fn(),
    broadcastTextUpdated: jest.fn(),
    broadcastTextRemoved: jest.fn(),
    broadcastImageAdded: jest.fn(),
    broadcastImageMoved: jest.fn(),
    broadcastImageRemoved: jest.fn(),
    broadcastToolIconAdded: jest.fn(),
    broadcastToolIconMoved: jest.fn(),
    broadcastToolIconRemoved: jest.fn(),
    broadcastMapChanged: jest.fn(),
    broadcastSideChanged: jest.fn(),
    broadcastPhaseChanged: jest.fn(),
  }),
}));

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
        children,
      ),
    Layer: ({ children, ...props }: MockComponentProps) =>
      React.createElement(
        "div",
        { "data-testid": "konva-layer", ...props },
        children,
      ),
    Image: (props: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "konva-image", ...props }),
    Rect: (props: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "konva-rect", ...props }),
    Circle: (props: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "konva-circle", ...props }),
    Ellipse: (props: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "konva-ellipse", ...props }),
    Line: (props: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "konva-line", ...props }),
    Arrow: (props: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "konva-arrow", ...props }),
    Text: (props: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "konva-text", ...props }),
    Group: ({ children, ...props }: MockComponentProps) =>
      React.createElement(
        "div",
        { "data-testid": "konva-group", ...props },
        children,
      ),
    Label: ({ children, ...props }: MockComponentProps) =>
      React.createElement(
        "div",
        { "data-testid": "konva-label", ...props },
        children,
      ),
    Tag: (props: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "konva-tag", ...props }),
    Transformer: (props: Record<string, unknown>) =>
      React.createElement("div", {
        "data-testid": "konva-transformer",
        ...props,
      }),
  };
});

// Mock useImage hook
const mockImageElement = {
  src: "",
  onload: null as (() => void) | null,
  onerror: null as (() => void) | null,
} as unknown as HTMLImageElement;

jest.mock("use-image", () => ({
  __esModule: true,
  default: () => [mockImageElement, "loaded"],
}));

// Mock Next.js router (hooks are jest.fn() so tests can override return values)
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    pathname: "/",
    query: {},
    asPath: "/",
  })),
  useParams: jest.fn(() => ({})),
  usePathname: jest.fn(() => "/"),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Resolve namespaces from en-US so existing tests keep asserting English copy.
jest.mock("next-intl", () => {
  const messages = mockEnUSMessages;

  const resolvePath = (source: unknown, path: string): unknown =>
    path.split(".").reduce<unknown>((value, part) => {
      if (value && typeof value === "object") {
        return (value as Record<string, unknown>)[part];
      }
      return undefined;
    }, source);

  const interpolate = (value: string, values?: Record<string, unknown>) =>
    value.replace(/\{(\w+)\}/g, (match, name: string) => {
      const replacement = values?.[name];
      return replacement === undefined ? match : String(replacement);
    });

  const findClosingBrace = (value: string, start: number): number => {
    let depth = 0;
    for (let index = start; index < value.length; index++) {
      if (value[index] === "{") depth++;
      else if (value[index] === "}") {
        depth--;
        if (depth === 0) return index;
      }
    }
    return -1;
  };

  const parseIcUOptions = (value: string): Record<string, string> => {
    const options: Record<string, string> = {};
    let index = 0;
    while (index < value.length) {
      while (index < value.length && /\s/.test(value[index])) index++;
      const selectorStart = index;
      while (index < value.length && !/[\s{]/.test(value[index])) index++;
      const selector = value.slice(selectorStart, index);
      while (index < value.length && /\s/.test(value[index])) index++;
      if (!selector || value[index] !== "{") break;
      const end = findClosingBrace(value, index);
      if (end === -1) break;
      options[selector] = value.slice(index + 1, end);
      index = end + 1;
    }
    return options;
  };

  const formatIcu = (
    message: string,
    values?: Record<string, unknown>,
    locale = "en-US",
  ): string => {
    let result = "";
    let index = 0;
    while (index < message.length) {
      const char = message[index];
      if (char !== "{") {
        result += char;
        index++;
        continue;
      }
      const end = findClosingBrace(message, index);
      if (end === -1) {
        result += message.slice(index);
        break;
      }
      const token = message.slice(index + 1, end).trim();
      const firstComma = token.indexOf(",");
      if (firstComma === -1) {
        const name = token;
        result +=
          values?.[name] === undefined ? `{${token}}` : String(values[name]);
        index = end + 1;
        continue;
      }
      const name = token.slice(0, firstComma).trim();
      const rest = token.slice(firstComma + 1).trim();
      const typeComma = rest.indexOf(",");
      const type = (typeComma === -1 ? rest : rest.slice(0, typeComma)).trim();
      if (type === "plural" || type === "selectordinal" || type === "select") {
        const options = parseIcUOptions(rest.slice(typeComma + 1));
        let branch: string | undefined;
        if (type === "select") {
          branch = options[String(values?.[name] ?? "")] ?? options.other;
        } else {
          const count = Number(values?.[name] ?? 0);
          const category = new Intl.PluralRules(locale).select(count);
          branch = options[category] ?? options.other;
          if (branch != null) {
            branch = formatIcu(branch, values, locale).replace(
              /#/g,
              String(count),
            );
          }
        }
        result += branch ?? `{${token}}`;
      } else {
        const value = values?.[name];
        result += value === undefined ? `{${token}}` : String(value);
      }
      index = end + 1;
    }
    return result;
  };

  // Production formatting is handled by next-intl; this keeps the test
  // formatter ICU-aware so plural messages behave like production.
  const formatMessage = (
    value: string,
    values?: Record<string, unknown>,
  ): string => {
    try {
      return formatIcu(value, values);
    } catch {
      return interpolate(value, values);
    }
  };

  type Translator = ((key: string, values?: Record<string, unknown>) => string) & {
    raw: (key: string) => unknown;
    has: (key: string) => boolean;
    rich: Translator;
    markup: Translator;
  };

  const translate = (namespace?: string): Translator => {
    const translator = ((
      key: string,
      values?: Record<string, unknown>,
    ): string => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      const value = resolvePath(messages, fullKey);
      return typeof value === "string" ? formatMessage(value, values) : fullKey;
    }) as Translator;

    translator.raw = (key: string): unknown => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      return resolvePath(messages, fullKey);
    };
    translator.has = (key: string): boolean => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      return resolvePath(messages, fullKey) !== undefined;
    };
    translator.rich = translator;
    translator.markup = translator;

    return translator;
  };

  return {
    NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
      children,
    useTranslations: (namespace?: string) => translate(namespace),
    useLocale: () => "en-US",
    useFormatter: () => ({
      dateTime: (value: Date | number, options?: Intl.DateTimeFormatOptions) =>
        new Intl.DateTimeFormat("en-US", options).format(value),
      number: (value: number, options?: Intl.NumberFormatOptions) =>
        new Intl.NumberFormat("en-US", options).format(value),
      relativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) =>
        new Intl.RelativeTimeFormat("en-US").format(value, unit),
    }),
  };
});

// Server-side next-intl APIs are ESM-only; page tests import modules that use
// them for generateMetadata, so provide the same en-US catalog here.
jest.mock("next-intl/server", () => {
  const messages = mockEnUSMessages;

  const resolvePath = (source: unknown, path: string): unknown =>
    path.split(".").reduce<unknown>((value, part) => {
      if (value && typeof value === "object") {
        return (value as Record<string, unknown>)[part];
      }
      return undefined;
    }, source);

  const translate =
    (namespace?: string) =>
    (key: string, values?: Record<string, unknown>): string => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      const value = resolvePath(messages, fullKey);
      if (typeof value !== "string") return fullKey;

      return value.replace(/\{(\w+)\}/g, (match, name: string) => {
        const replacement = values?.[name];
        return replacement === undefined ? match : String(replacement);
      });
    };

  return {
    getTranslations: async (namespace?: string) => translate(namespace),
    getLocale: async () => "en-US",
    getMessages: async () => messages,
    getFormatter: async () => ({
      dateTime: (value: Date | number, options?: Intl.DateTimeFormatOptions) =>
        new Intl.DateTimeFormat("en-US", options).format(value),
      number: (value: number, options?: Intl.NumberFormatOptions) =>
        new Intl.NumberFormat("en-US", options).format(value),
      relativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) =>
        new Intl.RelativeTimeFormat("en-US").format(value, unit),
    }),
  };
});

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
