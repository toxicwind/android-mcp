/**
 * android-mcp — device profiles registry (hard merge, not a shim).
 *
 * A profile is a named bundle of device facts (serial, adb target, model,
 * platform codename, notes) that resolves to a concrete ADB serial and carries
 * recognizable identity. This MCP is Android-generic: each device is one
 * profile, and the registry is the SSOT for "what device am I talking to".
 *
 * Index 0 is the default (active when no ANDROID_PROFILE is set).
 */

export interface DeviceProfile {
	/** Stable unique key — the device serial (ro.serialno). */
	id: string;
	/** Short recognizable name (derived from the id / product codename). */
	name: string;
	/** Display/manufacturer model. */
	model: string;
	/** Android release + SDK. */
	release: string;
	/** Platform identifiers (ro.product.*, ro.hardware). */
	platform: {
		product: string;
		board: string;
		hardware: string;
	};
	/** ADB serial that actually targets this device (serial == ip:port for wifi). */
	adbSerial: string;
	/** Role in the estate. */
	role: string;
	notes: string;
}

export const PROFILES: DeviceProfile[] = [
	{
		id: "0000dc9a7d3e0b65",
		name: "hisense-wuyishan",
		model: "SmartTV 4K FFM",
		release: "11 (SDK 30)",
		platform: { product: "wuyishan", board: "MT9900", hardware: "mt5895" },
		adbSerial: "10.0.0.225:5555",
		role: "living-room TV",
		notes: "Hisense SmartTV 4K FFM (downstairs), Android 11. Runs the redlight Kodi fork: package wizard.red.the v21.2.1 (NOT com.org.xbmc.kodi), JSON-RPC at http://10.0.0.225:8080/jsonrpc (no auth) — coreelec-mcp targets it via host param. AUDIO GOTCHA (2026-10-31): soundbar is eARC on HDMI port 3; Android routes STREAM_MUSIC to AUDIO_DEVICE_OUT_HDMI_ARC; if dumpsys hdmi_control shows mArcEstablished:false the frames flow into a dead circuit (video plays, no sound) — clear by soundbar power-cycle or TV reboot, not by app restart. Port 5555 is fixed (USB debugging), unlike the Pixel's rotating port.",
	},
	{
		id: "4C121FDAS0004Y",
		name: "pixel-9-pro-xl",
		model: "Pixel 9 Pro XL",
		release: "17 (SDK 37)",
		platform: { product: "komodo_beta", board: "komodo", hardware: "komodo" },
		adbSerial: "10.0.0.77:36993",
		role: "hardware auth SSOT",
		notes: "Pixel 9 Pro XL (architect's primary hardware authenticator). ADB port is volatile — when the recorded port expires, rediscover via `adb mdns services` / wireless-debugging pairing. DO NOT rely on Flotilla MCP (:25245) — it is DOWN as of 2026-10-31 (upstream connection refused); revive the flotilla-mcp pitchfork daemon first (products/estate-ops). ro.serialno verified 2026-10-31.",
	},
];

/** Resolve a profile by name, id, model, or adb serial (case-insensitive substring). */
export function resolveProfile(key?: string): DeviceProfile {
	if (!key) return PROFILES[0];
	const needle = key.trim().toLowerCase();
	const hit = PROFILES.find(
		(p) =>
			p.id === needle ||
			p.name.toLowerCase() === needle ||
			p.model.toLowerCase() === needle ||
			p.adbSerial === needle ||
			p.id.toLowerCase().includes(needle) ||
			p.name.toLowerCase().includes(needle) ||
			p.platform.product.toLowerCase().includes(needle) ||
			p.platform.board.toLowerCase().includes(needle) ||
			p.platform.hardware.toLowerCase().includes(needle) ||
			p.adbSerial.includes(needle),
	);
	return hit ?? PROFILES[0];
}

/**
 * Strict profile lookup — returns the profile ONLY when `key` matches a known
 * profile *identity* (id, name, model, platform codename). It deliberately
 * never matches an adb address (host:port) and never falls back to the
 * default profile, so callers can tell "that's a profile" apart from "that's
 * a raw adb target" and route accordingly without silently retargeting.
 */
export function lookupProfile(key?: string): DeviceProfile | undefined {
	if (!key) return undefined;
	const needle = key.trim().toLowerCase();
	return PROFILES.find(
		(p) =>
			p.id.toLowerCase() === needle ||
			p.name.toLowerCase() === needle ||
			p.model.toLowerCase() === needle ||
			p.name.toLowerCase().includes(needle) ||
			p.model.toLowerCase() === needle ||
			p.platform.product.toLowerCase() === needle ||
			p.platform.board.toLowerCase() === needle ||
			p.platform.hardware.toLowerCase() === needle ||
			p.id.toLowerCase().includes(needle),
	);
}