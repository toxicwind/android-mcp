import { describe, test, expect } from "bun:test";

// The a11y-lock conflict: stock `uiautomator dump` and the appium uia2 server
// both bind UiAutomation — mutually exclusive on-device. When the uia2 server
// holds the lock, stock uiautomator is SIGKILLed (rc=137, "Killed", no XML).
// Contract: dumpUiHierarchy detects the 137 kill and auto-recovers by
// force-stopping the uia2 server, then retries once.

describe("uiautomator rc=137 auto-recovery", () => {
  test("detects the SIGKILL signature (rc 137 + no output file)", () => {
    const { isA11yLockKill } = require("../src/tools/ui-a11y-recovery.ts");
    expect(isA11yLockKill(137, "")).toBe(true);
    expect(isA11yLockKill(0, "UI hierchary dumped")).toBe(false);
    expect(isA11yLockKill(1, "some error")).toBe(false);
  });

  test("recovery sequence force-stops the uia2 server then retries the dump", async () => {
    const { recoverA11yLock } = require("../src/tools/ui-a11y-recovery.ts");
    const calls: string[] = [];
    const fake = {
      shell: async (cmd: string) => {
        calls.push(cmd);
        return cmd.includes("uiautomator dump") ? { rc: 0, out: "dumped" } : { rc: 0, out: "" };
      },
    };
    const rc = await recoverA11yLock(fake, "/sdcard/wd0.xml");
    expect(rc).toBe(0);
    expect(calls[0]).toContain("force-stop io.appium.uiautomator2.server");
    expect(calls[1]).toContain("uiautomator dump");
  });
});
