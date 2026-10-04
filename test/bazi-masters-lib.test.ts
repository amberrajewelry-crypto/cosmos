import { describe, it, expect } from "vitest";
import { masterRows } from "../src/bazi/masters";
describe("библиотека карт мастеров", () => {
  it("302 карты, совпадение 用神 как в сверке (44%), в 用+喜 ≥ 60%", async () => {
    const r = await masterRows();
    expect(r).toHaveLength(302);
    const yes = r.filter((x) => x.hit === "yes").length / r.length, soft = r.filter((x) => x.hit !== "no").length / r.length;
    expect(yes).toBeGreaterThanOrEqual(0.42); expect(yes).toBeLessThan(0.5);
    expect(soft).toBeGreaterThanOrEqual(0.6);
  });
});
