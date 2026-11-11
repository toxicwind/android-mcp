import { adbShell, type AdbOptions } from "../adb.js";

/**
 * ui-a11y-recovery.ts — the UiAutomation a11y-lock conflict fix.
 *
 * Root cause (verified live 2026-11-05): stock `uiautomator dump` and the
 * appium UiAutomator2 server BOTH bind the device's single UiAutomation
 * connection. While the uia2 instrumentation runs, stock uiautomator is
 * SIGKILLed: rc=137, stderr "Killed", no XML written.
 *
 * Recovery: force-stop the uia2 server (releases the lock), retry the dump.
 * Trade-off: the uia2 session dies — callers needing display-2 work re-create
 * it via uia2Session() (which re-establishes everything).
 */

export const UIA2_SERVER_PKG = "io.appium.uiautomator2.server";

/** Detect the a11y-lock SIGKILL: rc 137 with no dump output. */
export function isA11yLockKill(rc: number, out: string): boolean {
  return rc === 137 && !out.includes("dumped");
}

export interface DumpRunner {
  shell(cmd: string): Promise<{ rc: number; out: string }>;
}

/**
 * Auto-recover: force-stop the uia2 server, then retry the dump once.
 * Returns the retry's rc.
 */
export async function recoverA11yLock(runner: DumpRunner, dumpPath: string): Promise<number> {
  await runner.shell(`am force-stop ${UIA2_SERVER_PKG}`);
  const retry = await runner.shell(`uiautomator dump ${dumpPath}`);
  return retry.rc;
}

/** Real-device helper: dump with auto-recovery wired to adb. */
export async function dumpWithRecovery(
  dumpPath: string,
  opts?: AdbOptions,
): Promise<{ rc: number; out: string }> {
  const first = await adbShell(`uiautomator dump ${dumpPath}; echo RC=$?`, opts);
  const rc = Number(first.match(/RC=(\d+)/)?.[1] ?? 1);
  if (!isA11yLockKill(rc, first)) return { rc, out: first };
  const recovered = await recoverA11yLock(
    { shell: async (cmd) => ({ rc: 0, out: await adbShell(cmd, opts) }) },
    dumpPath,
  );
  return { rc: recovered, out: `recovered: ${recovered}` };
}
