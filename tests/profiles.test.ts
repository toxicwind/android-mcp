import { describe, it, expect } from "vitest";
import { PROFILES, resolveProfile } from "../src/profiles.js";

describe("device profiles registry (hard merge)", () => {
	it("default profile (index 0) is the Hisense TV", () => {
		expect(PROFILES[0].name).toBe("hisense-wuyishan");
		expect(PROFILES[0].id).toBe("0000dc9a7d3e0b65");
		expect(PROFILES[0].adbSerial).toBe("10.0.0.225:5555");
		expect(PROFILES[0].role).toBe("living-room TV");
	});

	it("pixel profile is registered with its serial + product", () => {
		const px = resolveProfile("pixel");
		expect(px.id).toBe("4C121FDAS0004Y");
		expect(px.name).toBe("pixel-9-pro-xl");
		expect(px.model).toBe("Pixel 9 Pro XL");
		expect(px.platform.product).toBe("komodo_beta");
	});

	it("resolveProfile matches by name, model, id, or adb serial (substring)", () => {
		expect(resolveProfile("wuyishan").id).toBe("0000dc9a7d3e0b65");
		expect(resolveProfile("SmartTV").id).toBe("0000dc9a7d3e0b65");
		expect(resolveProfile("0000dc9a7d3e0b65").id).toBe("0000dc9a7d3e0b65");
		expect(resolveProfile("10.0.0.225:5555").id).toBe("0000dc9a7d3e0b65");
		expect(resolveProfile("pixel-9-pro-xl").id).toBe("4C121FDAS0004Y");
		expect(resolveProfile("10.0.0.77:36993").id).toBe("4C121FDAS0004Y");
		expect(resolveProfile("komodo").id).toBe("4C121FDAS0004Y");
	});

	it("falls back to the default (Hisense) profile on no match or empty key", () => {
		expect(resolveProfile().id).toBe("0000dc9a7d3e0b65");
		expect(resolveProfile("nonexistent-device").id).toBe("0000dc9a7d3e0b65");
	});
});