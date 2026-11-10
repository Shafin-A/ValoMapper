# Canvas performance harness

Automates the manual Profiler checklist: drives the lobby canvas with real mouse
input, records frame timings and long tasks, and reads dev-only commit counters
from `window.__canvasPerf`.

The app must be running in development mode (`npm run dev`) so the commit
counters exist. They are compiled out of production builds.

## Recommended: connect to your logged-in Chrome (CDP)

Start a Chrome instance with remote debugging, log in, and open the lobby:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="$env:TEMP\valomapper-perf" `
  http://localhost:3000
```

Then run the harness against that browser:

```powershell
$env:PERF_LOBBY_URL = "http://localhost:3000/ABCD123"
$env:PERF_CDP_URL = "http://localhost:9222"
npm run perf:canvas
```

CDP mode reuses the existing session, so Firebase auth and the open lobby are
preserved. The harness does not close that browser.

## Launch mode (no CDP)

If the lobby is reachable without an authenticated session:

```powershell
$env:PERF_LOBBY_URL = "http://localhost:3000/ABCD123"
npm run perf:canvas
```

This launches installed Google Chrome (Playwright `channel: "chrome"`) and opens
a fresh context. A fresh context has no Firebase session, so the lobby must be
publicly reachable.

## Environment variables

| Variable            | Default              | Purpose                                      |
| ------------------- | -------------------- | -------------------------------------------- |
| `PERF_LOBBY_URL`    | required             | Lobby URL to profile                         |
| `PERF_CDP_URL`      | unset                | Connect to an existing Chrome instance       |
| `PERF_WS_URL`       | `ws://localhost:8080`| Backend WebSocket URL for the cursor bot     |
| `PERF_CURSOR_MS`    | `3000`               | Duration of the cursor scenario              |
| `PERF_CHROME_PATH`  | unset                | Explicit Chrome executable for launch mode   |
| `PERF_HEADLESS`     | unset (`1` = on)     | Run launch mode headless                     |

## Scenarios

| Scenario | What it does | Expected commit scope |
| -------- | ------------ | --------------------- |
| `cursor` | Opens a raw WebSocket bot and streams `cursor_move` at 20 Hz | `RemoteCursors` only |
| `draw`   | Enables pencil mode and draws a 30-point stroke | `CanvasDrawLines` only |
| `marquee`| Right-drag marquee selection | `CanvasSelectionOverlay` only |
| `pan`    | Left-drag the stage | no canvas commits |
| `zoom`   | Wheel zoom | `CanvasSelectionOverlay` only |

The harness also reports average/p95/max frame time, long-task count, and the
number of `POST /canvas-patches` requests per scenario. Timing numbers are
informational (dev builds distort them); the commit-scope checks are the
regression signal and cause a non-zero exit code on failure.

## Output

Each run writes a JSON report to `perf/results/` (gitignored) containing frame
stats, commit counters, checks, viewport, and DPR.

## Notes

- The cursor scenario adds a temporary `PerfBot` presence entry; it disconnects
  at the end of the scenario.
- If `window.__canvasPerf` is missing, the harness prints a warning and skips
  commit-scope validation (likely a production build).
- Wall-clock timings vary by machine; compare runs on the same machine.
