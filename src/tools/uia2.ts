import { adb, adbShell, adbRawBuffer, type AdbOptions } from "../adb.js";

/**
 * uia2.ts — appium UiAutomator2-server-backed display-aware UI automation.
 *
 * Why: stock `uiautomator dump` and `screencap` are bound to the default
 * display (display 0). The fleet architect order (2026-11-05) makes DISPLAY 2
 * the permanent default for ALL android work — the transparent full-control
 * overlay — so every UI read/write must target it. The UiAutomator2 server
 * (installed on-device, :6790) is the only reliable multi-display API:
 *   - `currentDisplayId` setting scopes element lookup, page source, AND
 *     coordinate gestures to the chosen display (server >= 7.0.1).
 *   - W3C `/actions` pointer events follow `currentDisplayId`.
 *
 * `adb input -d 2 tap` is NOT used: rc=0 but no effect (silently lands on
 * display 0 — dangerous, it taps the user's main screen).
 */

const UIA2_PORT = 6790;

interface Uia2Session {
  sessionId: string;
}

let cachedSession: Uia2Session | null = null;

async function ensureForward(opts?: AdbOptions): Promise<void> {
  // Idempotent per-device forward; adb tolerates duplicate forwards.
  await adb(["forward", `tcp:${UIA2_PORT}`, `tcp:${UIA2_PORT}`], opts);
}

async function uia2Fetch(
  path: string,
  init: { method?: string; body?: unknown } = {},
  timeoutMs = 20_000,
): Promise<{ status: number; value: unknown }> {
  const res = await fetch(`http://127.0.0.1:${UIA2_PORT}/wd/hub${path}`, {
    method: init.method ?? "GET",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json: { value?: unknown; sessionId?: string } = {};
  try {
    json = JSON.parse(text);
  } catch {
    return { status: res.status, value: text };
  }
  return { status: res.status, value: json.value ?? json };
}

/** Create (or reuse) a uia2 session scoped to `displayId`. */
export async function uia2Session(displayId: number, opts?: AdbOptions): Promise<string> {
  await ensureForward(opts);
  if (cachedSession) {
    // Verify the cached session is still valid.
    const ping = await uia2Fetch(`/session/${cachedSession.sessionId}`);
    if (ping.status === 200) return cachedSession.sessionId;
    cachedSession = null;
  }
  const created = await uia2Fetch("/session", {
    method: "POST",
    body: {
      capabilities: {
        alwaysMatch: {
          platformName: "android",
          "appium:automationName": "UiAutomator2",
          "appium:displayId": displayId,
        },
      },
    },
  });
  const value = created.value as { sessionId?: string } | string | undefined;
  const sid = typeof value === "object" && value !== null ? value.sessionId : undefined;
  if (!sid) throw new Error(`uia2 session creation failed: ${JSON.stringify(created).slice(0, 200)}`);
  cachedSession = { sessionId: sid };
  // Scope everything to the requested display.
  await uia2Fetch(`/session/${sid}/appium/settings`, {
    method: "POST",
    body: { settings: { currentDisplayId: displayId, enableMultiWindows: true } },
  });
  return sid;
}

/** Display-aware page source (XML hierarchy of `displayId`). */
export async function uia2Source(displayId: number, opts?: AdbOptions): Promise<string> {
  const sid = await uia2Session(displayId, opts);
  const res = await uia2Fetch(`/session/${sid}/source`);
  const value = res.value;
  if (typeof value === "string") return value;
  throw new Error(`uia2 source failed: ${JSON.stringify(res).slice(0, 200)}`);
}

/** Display-aware tap via W3C actions (follows currentDisplayId). */
export async function uia2Tap(x: number, y: number, displayId: number, opts?: AdbOptions): Promise<void> {
  const sid = await uia2Session(displayId, opts);
  const res = await uia2Fetch(`/session/${sid}/actions`, {
    method: "POST",
    body: {
      actions: [
        {
          type: "pointer",
          id: "estate-finger",
          parameters: { pointerType: "touch" },
          actions: [
            { type: "pointerMove", duration: 0, x, y },
            { type: "pointerDown", button: 0 },
            { type: "pause", duration: 80 },
            { type: "pointerUp", button: 0 },
          ],
        },
      ],
    },
  });
  // W3C actions return value:null on success; an error object means failure.
  if (res.value !== null && typeof res.value === "object" && "error" in (res.value as object)) {
    throw new Error(`uia2 tap failed: ${JSON.stringify(res.value).slice(0, 200)}`);
  }
}

/** Display-aware screenshot. Virtual displays (overlay:*) are NOT capturable
 * via stock `screencap -d N` ("Display Id is not valid") — falls back to the
 * uia2 server's screenshot endpoint, which follows currentDisplayId. */
export async function displayScreenshot(displayId: number, opts?: AdbOptions): Promise<Buffer> {
  if (displayId === 0) {
    return adbRawBuffer(["exec-out", "screencap", "-p"], opts);
  }
  const direct = await adbRawBuffer(["exec-out", "screencap", "-d", String(displayId), "-p"], opts);
  if (direct.length > 1024) return direct; // real PNG
  // Virtual-display fallback: uia2 screenshot (base64 PNG).
  const sid = await uia2Session(displayId, opts);
  const res = await uia2Fetch(`/session/${sid}/screenshot`);
  const value = res.value;
  if (typeof value === "string" && value.length > 1024) {
    return Buffer.from(value, "base64");
  }
  throw new Error(`display ${displayId} screenshot failed via screencap and uia2`);
}

/** List displays via uia2 (mobile: listDisplays). */
export async function uia2ListDisplays(opts?: AdbOptions): Promise<unknown> {
  const sid = await uia2Session(0, opts);
  const res = await uia2Fetch(`/session/${sid}/execute/sync`, {
    method: "POST",
    body: { script: "mobile: listDisplays", args: [] },
  });
  return res.value;
}
