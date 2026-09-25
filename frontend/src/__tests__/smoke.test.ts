import { describe, expect, it } from "vitest";
import { plural } from "../plural";

describe("smoke", () => {
  it("plural works", () => {
    expect(plural(1, ["качок", "качка", "качков"])).toBe("качок");
    expect(plural(2, ["качок", "качка", "качков"])).toBe("качка");
    expect(plural(5, ["качок", "качка", "качков"])).toBe("качков");
  });
});
