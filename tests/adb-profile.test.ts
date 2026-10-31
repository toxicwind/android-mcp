import { describe, it, expect } from "vitest";
import { lookupProfile, resolveProfile } from "../src/profiles.js";

// The adb chokepoint (buildArgs) uses lookupProfile — the STRICT resolver —
// so a `serial` arg doubles as a device profile key. Contract:
//  - a profile identity (name/id/model/platform) resolves to that profile's adbSerial
//  - a raw adb address (host:port) is NOT a profile key → passes through verbatim
//    (never silently retargeted to the default Hisense profile)
describe("profile → adb serial chokepoint (lookupProfile)", () => {
	it("profile identities resolve to their adbSerial", () => {
		expect(lookupProfile("pixel-9-pro-xl")?.adbSerial).toBe("10.0.0.77:36993");
		expect(lookupProfile("4C121FDAS0004Y")?.adbSerial).toBe("10.0.0.77:36993");
		expect(lookupProfile("komodo")?.adbSerial).toBe("10.0.0.77:36993");
		expect(lookupProfile("hisense-wuyishan")?.adbSerial).toBe("10.0.0.225:5555");
		expect(lookupProfile("SmartTV 4K FFM")?.adbSerial).toBe("10.0.0.225:5555");
	});

	it("raw adb addresses are NOT profile keys → pass through verbatim", () => {
		expect(lookupProfile("10.0.0.225:5555")).toBeUndefined();
		expect(lookupProfile("10.0.0.77:36993")).toBeUndefined();
	});

	it("unknown keys are not profiles (no fallback) → pass through verbatim", () => {
		expect(lookupProfile("random-serial")).toBeUndefined();
		expect(lookupProfile("")).toBeUndefined();
		expect(lookupProfile(undefined)).toBeUndefined();
	});

	it("resolveProfile remains the lenient active-profile accessor with Hisense default", () => {
		// buildArgs must NOT use resolveProfile (its fallback would retarget);
		// this test documents that lookupProfile/resolveProfile are distinct.
		expect(resolveProfile().name).toBe("hisense-wuyishan");
		expect(resolveProfile("garbage").name).toBe("hisense-wuyishan");
	});
});