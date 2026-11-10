import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const LOBBY_URL = process.env.PERF_LOBBY_URL;
const CDP_URL = process.env.PERF_CDP_URL;
const WS_URL = process.env.PERF_WS_URL ?? "ws://localhost:8080";
const CHROME_PATH = process.env.PERF_CHROME_PATH;
const HEADLESS = process.env.PERF_HEADLESS === "1";
const CURSOR_MS = Number(process.env.PERF_CURSOR_MS ?? 3000);
const SETTLE_MS = 800;
const NO_NAVIGATE = process.env.PERF_NO_NAVIGATE === "1";

if (!LOBBY_URL) {
  console.error(
    "PERF_LOBBY_URL is required, e.g. PERF_LOBBY_URL=http://localhost:3000/ABCD123",
  );
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const stats = (values) => {
  if (values.length === 0) {
    return { count: 0, avg: 0, p95: 0, max: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((total, value) => total + value, 0);

  return {
    count: sorted.length,
    avg: Number((sum / sorted.length).toFixed(2)),
    p95: Number(sorted[Math.floor(0.95 * (sorted.length - 1))].toFixed(2)),
    max: Number(sorted[sorted.length - 1].toFixed(2)),
  };
};

const openBrowser = async () => {
  if (CDP_URL) {
    const browser = await chromium.connectOverCDP(CDP_URL);
    const context = browser.contexts()[0];
    if (!context) {
      throw new Error("No browser context found over CDP");
    }

    const targetPath = new URL(LOBBY_URL).pathname;
    let page =
      context
        .pages()
        .find((candidate) => candidate.url().includes(targetPath)) ??
      context.pages()[0];

    if (!page) {
      page = await context.newPage();
    }

    await page.bringToFront();

    if (!NO_NAVIGATE) {
      await page.goto(LOBBY_URL, { waitUntil: "domcontentloaded" });
    }

    return { page, close: async () => {} };
  }

  const browser = await chromium.launch({
    headless: HEADLESS,
    executablePath: CHROME_PATH,
    channel: CHROME_PATH ? undefined : "chrome",
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(LOBBY_URL, { waitUntil: "domcontentloaded" });

  return { page, close: async () => browser.close() };
};

const installMetrics = async (page) => {
  await page.evaluate(() => {
    if (window.__canvasMetrics) {
      return;
    }

    const frames = [];
    const longTasks = [];
    let running = false;
    let last = 0;
    let raf = 0;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTasks.push(entry.duration);
        }
      });
      observer.observe({ type: "longtask", buffered: false });
    } catch {
      // longtask is unsupported in some environments
    }

    const loop = (time) => {
      if (!running) return;
      if (last) frames.push(time - last);
      last = time;
      raf = requestAnimationFrame(loop);
    };

    window.__canvasMetrics = {
      reset() {
        frames.length = 0;
        longTasks.length = 0;
      },
      start() {
        frames.length = 0;
        longTasks.length = 0;
        last = 0;
        running = true;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      },
      stop() {
        running = false;
        cancelAnimationFrame(raf);
        return { frames: [...frames], longTasks: [...longTasks] };
      },
    };
  });
};

const resetCounters = (page) =>
  page.evaluate(() => window.__canvasPerf?.reset?.());

const readCounters = (page) =>
  page.evaluate(() => window.__canvasPerf?.snapshot?.() ?? null);

const startMetrics = (page) =>
  page.evaluate(() => window.__canvasMetrics.start());

const stopMetrics = (page) =>
  page.evaluate(() => window.__canvasMetrics.stop());

const canvasBox = async (page) => {
  const box = await page
    .locator('[data-tour="map-canvas"] .konvajs-content')
    .first()
    .boundingBox();

  if (!box) {
    throw new Error("Map canvas is not visible");
  }

  return box;
};

const ensureDrawMode = async (page, enabled) => {
  const pencil = page
    .locator('[data-tour="tools-section"] button:has(svg.lucide-pencil)')
    .first();

  if ((await pencil.count()) === 0) {
    throw new Error("Pencil toggle not found in the tools sidebar");
  }

  const state = await pencil.getAttribute("data-state");
  const isOn = state === "on";

  if (isOn !== enabled) {
    await pencil.click();
    await sleep(250);
  }
};

const startCursorBot = async (page, lobbyCode) => {
  await page.evaluate(
    ({ wsUrl, code }) => {
      window.__perfBot?.stop?.();

      const socket = new WebSocket(
        `${wsUrl}/ws/lobbies/${code}?username=PerfBot&color=%23FF6B6B`,
      );
      let timer = 0;

      socket.onopen = () => {
        timer = window.setInterval(() => {
          socket.send(
            JSON.stringify({
              type: "cursor_move",
              data: {
                x: 780 + Math.random() * 1000,
                y: 250 + Math.random() * 900,
              },
              timestamp: Date.now(),
            }),
          );
        }, 50);
      };

      window.__perfBot = {
        stop() {
          window.clearInterval(timer);
          try {
            socket.close(1000, "done");
          } catch {
            // already closed
          }
        },
      };
    },
    { wsUrl: WS_URL, code: lobbyCode },
  );
};

const stopCursorBot = (page) => page.evaluate(() => window.__perfBot?.stop?.());

const describeCommits = (counters) => {
  if (!counters) return "unavailable (dev build only)";
  const entries = Object.entries(counters).filter(([, count]) => count > 0);
  if (entries.length === 0) return "none";
  return entries.map(([name, count]) => `${name}=${count}`).join(", ");
};

const checkScenario = (name, counters, required, allowed) => {
  if (!counters) {
    return { name, unexpected: [], missing: [], ok: true };
  }

  const present = Object.entries(counters)
    .filter(([, count]) => count > 0)
    .map(([key]) => key);

  const unexpected = present.filter((key) => !allowed.includes(key));
  const missing = required.filter((key) => !present.includes(key));

  return {
    name,
    unexpected,
    missing,
    ok: unexpected.length === 0 && missing.length === 0,
  };
};

const run = async () => {
  const scenarios = [];
  const patchRequests = [];
  const { page, close } = await openBrowser();

  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().includes("/canvas-patches")
    ) {
      patchRequests.push({ at: Date.now() });
    }
  });

  await page.waitForSelector('[data-tour="map-canvas"]', { timeout: 60_000 });
  await page.waitForSelector('[data-tour="map-canvas"] .konvajs-content', {
    timeout: 60_000,
  });
  await sleep(2_000);

  await installMetrics(page);

  if (!(await page.evaluate(() => Boolean(window.__canvasPerf)))) {
    console.warn(
      "Commit counters unavailable. Run the app in development mode (`npm run dev`).",
    );
  }

  const lobbyCode = new URL(page.url()).pathname
    .split("/")
    .filter(Boolean)[0]
    ?.toUpperCase();

  if (!lobbyCode) {
    throw new Error("Could not read the lobby code from the current URL");
  }

  const box = await canvasBox(page);
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  const measure = async (
    name,
    { setup = async () => {}, action, teardown = async () => {} },
  ) => {
    await setup();
    await sleep(150);

    const requestsBefore = patchRequests.length;
    await resetCounters(page);
    await startMetrics(page);

    const extra = (await action()) ?? {};

    const metrics = await stopMetrics(page);
    await sleep(120);
    const counters = await readCounters(page);

    await teardown();
    await sleep(SETTLE_MS);

    scenarios.push({
      name,
      frame: stats(metrics.frames),
      longTasks: metrics.longTasks.length,
      longestTask: Number(
        (Math.max(0, ...metrics.longTasks) || 0).toFixed(2),
      ),
      counters,
      requests: patchRequests.length - requestsBefore,
      ...extra,
    });
  };

  await startCursorBot(page, lobbyCode);
  await sleep(600);
  await measure("cursor", { action: () => sleep(CURSOR_MS) });
  await stopCursorBot(page);
  await sleep(SETTLE_MS);

  await measure("draw", {
    setup: async () => {
      await ensureDrawMode(page, true);
      await page.mouse.move(centerX - 140, centerY - 40);
      await page.mouse.down();
      await sleep(120);
    },
    action: async () => {
      for (let index = 1; index <= 30; index += 1) {
        await page.mouse.move(
          centerX - 140 + (index * 280) / 30,
          centerY - 40 + Math.sin(index / 4) * 50,
        );
        await sleep(16);
      }
      await sleep(60);
    },
    teardown: async () => {
      await page.mouse.up();
    },
  });

  await measure("marquee", {
    setup: async () => {
      await ensureDrawMode(page, false);
      await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.3);
      await page.mouse.down({ button: "right" });
      await sleep(80);
    },
    action: async () => {
      const startX = box.x + box.width * 0.25;
      const startY = box.y + box.height * 0.3;
      for (let index = 1; index <= 24; index += 1) {
        await page.mouse.move(
          startX + (index * 320) / 24,
          startY + (index * 220) / 24,
        );
        await sleep(16);
      }
      await sleep(60);
    },
    teardown: async () => {
      await page.mouse.up({ button: "right" });
    },
  });

  await measure("pan", {
    setup: async () => {
      await ensureDrawMode(page, false);
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await sleep(80);
    },
    action: async () => {
      for (let index = 1; index <= 20; index += 1) {
        await page.mouse.move(centerX + index * 8, centerY + index * 4);
        await sleep(16);
      }
    },
    teardown: async () => {
      await page.mouse.up();
    },
  });

  await measure("zoom", {
    setup: async () => {
      await ensureDrawMode(page, false);
      await page.mouse.move(centerX, centerY);
    },
    action: async () => {
      for (let index = 0; index < 6; index += 1) {
        await page.mouse.wheel(0, -120);
        await sleep(80);
      }
      await sleep(200);
    },
  });

  const byName = (name) => scenarios.find((entry) => entry.name === name);

  const checks = [
    checkScenario("cursor", byName("cursor")?.counters, ["RemoteCursors"], [
      "RemoteCursors",
    ]),
    checkScenario("draw", byName("draw")?.counters, ["CanvasDrawLines"], [
      "CanvasDrawLines",
    ]),
    checkScenario(
      "marquee drag",
      byName("marquee")?.counters,
      ["CanvasSelectionOverlay"],
      ["CanvasSelectionOverlay"],
    ),
    checkScenario("pan", byName("pan")?.counters, [], []),
    checkScenario("zoom", byName("zoom")?.counters, [], [
      "CanvasSelectionOverlay",
    ]),
  ];

  console.log("\nCanvas perf results");
  console.log("=".repeat(100));

  for (const entry of scenarios) {
    console.log(
      `${entry.name.padEnd(9)} frames=${String(entry.frame.count).padEnd(4)} ` +
        `avg=${String(entry.frame.avg).padEnd(6)} p95=${String(entry.frame.p95).padEnd(6)} ` +
        `max=${String(entry.frame.max).padEnd(7)} longTasks=${String(entry.longTasks).padEnd(3)} ` +
        `patches=${String(entry.requests).padEnd(2)} commits: ${describeCommits(entry.counters)}`,
    );
  }

  console.log("\nCommit scope checks");
  for (const check of checks) {
    if (check.ok) {
      console.log(`  OK    ${check.name}`);
    } else {
      console.log(
        `  FAIL  ${check.name}` +
          (check.unexpected.length
            ? ` -> unexpected: ${check.unexpected.join(", ")}`
            : "") +
          (check.missing.length
            ? ` -> missing: ${check.missing.join(", ")}`
            : ""),
      );
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    lobbyUrl: page.url(),
    userAgent: await page.evaluate(() => navigator.userAgent),
    devicePixelRatio: await page.evaluate(() => window.devicePixelRatio),
    viewport: await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    })),
    scenarios,
    checks,
  };

  const resultsDir = path.join(process.cwd(), "perf", "results");
  await fs.mkdir(resultsDir, { recursive: true });
  const file = path.join(
    resultsDir,
    `canvas-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  await fs.writeFile(file, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nReport written to ${path.relative(process.cwd(), file)}`);

  if (checks.some((check) => !check.ok)) {
    process.exitCode = 1;
  }

  await close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
