import { describe, expect, test } from "bun:test";
import { getHistoricalRange } from "../src/historical-range";

describe("historical backfill range", () => {
  test("starts with the last complete calendar month", () => {
    expect(getHistoricalRange(null, new Date("2026-07-15T12:00:00Z"))).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });
  });

  test("derives the previous month from the successful start", () => {
    expect(getHistoricalRange("2026-03-01")).toEqual({
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });
  });

  test("clamps the final window to the history floor", () => {
    expect(getHistoricalRange("2002-02-01")).toEqual({
      startDate: "2002-01-11",
      endDate: "2002-01-31",
    });
  });

  test("stops after the history floor is complete", () => {
    expect(getHistoricalRange("2002-01-11")).toBeNull();
  });
});
