import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "./config.js";
import { lookupProfile } from "./profiles.js";

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT = 30_000;

export interface AdbOptions {
  serial?: string;
  timeout?: number;
}

function buildArgs(args: string[], options?: AdbOptions): string[] {
  // The `serial` parameter doubles as a device profile key: a profile name,
  // id, model, or adb address all resolve to the concrete adb serial via the
  // profiles registry. Hard-merge plumbing — one chokepoint so EVERY tool that
  // takes `serial` becomes profile-aware.
  const key = options?.serial ?? config.serial;
  // The `serial` parameter doubles as a device profile key. Resolve only
  // genuine profile identities (name/id/model); otherwise the key is a raw
  // adb address and passes straight through. Never falls back to the default
  // profile here — a non-profile key must be used verbatim, not silently
  // retargeted to the Hisense.
  const serial = key ? lookupProfile(key)?.adbSerial ?? key : key;
  if (serial) {
    return ["-s", serial, ...args];
  }
  return args;
}

export async function adb(
  args: string[],
  options?: AdbOptions,
): Promise<string> {
  const fullArgs = buildArgs(args, options);
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

  const { stdout } = await execFileAsync(config.adbPath, fullArgs, {
    timeout,
    maxBuffer: 10 * 1024 * 1024,
  });

  return stdout.trim();
}

export async function adbShell(
  command: string,
  options?: AdbOptions,
): Promise<string> {
  return adb(["shell", command], options);
}

export async function adbRawBuffer(
  args: string[],
  options?: AdbOptions,
): Promise<Buffer> {
  const fullArgs = buildArgs(args, options);
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

  const { stdout } = await execFileAsync(config.adbPath, fullArgs, {
    timeout,
    maxBuffer: 10 * 1024 * 1024,
    encoding: "buffer",
  });

  return stdout;
}
