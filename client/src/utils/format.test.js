import { describe, expect, it } from "vitest";
import { formatCurrency, safeNumber } from "./format";

describe("format utils", () => {
  it("coerces invalid numbers to zero", () => {
    expect(safeNumber("nope")).toBe(0);
  });

  it("formats currency without decimals", () => {
    expect(formatCurrency(1200)).toBe("$1,200");
  });
});
