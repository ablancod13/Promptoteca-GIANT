import { describe, expect, it } from "vitest";
import { buildCcByCitation, getLicenseUrl } from "@/lib/license";
import { seedPrompts } from "@/lib/seed-data";

describe("license", () => {
  it("builds a CC BY 4.0 attribution string", () => {
    const citation = buildCcByCitation(seedPrompts[0], new Date("2026-06-28T00:00:00.000Z"));

    expect(citation).toContain("Promptoteca GIANT-SEIMC");
    expect(citation).toContain("CC BY 4.0");
    expect(citation).toContain("2026-06-28");
  });

  it("uses the canonical CC BY 4.0 URL", () => {
    expect(getLicenseUrl()).toBe("https://creativecommons.org/licenses/by/4.0/");
  });
});
