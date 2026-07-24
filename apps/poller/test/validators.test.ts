import { describe, expect, test } from "bun:test";
import fixture from "./fixtures/dolar-api.json";
import { dolarApiResponseSchema } from "@bluehouse/shared/validators";

function payloadWith(overrides: Record<string, unknown>): unknown[] {
  return [{ ...fixture[0]!, ...overrides }, ...fixture.slice(1)];
}

describe("DolarAPI response validation", () => {
  test("accepts the sanitized live response", () => {
    expect(dolarApiResponseSchema.safeParse(fixture).success).toBe(true);
  });

  test("rejects an empty response", () => {
    expect(dolarApiResponseSchema.safeParse([]).success).toBe(false);
  });

  test("rejects missing fields", () => {
    for (const field of Object.keys(fixture[0]!)) {
      const rate: Record<string, unknown> = { ...fixture[0]! };
      delete rate[field];

      expect(dolarApiResponseSchema.safeParse([rate]).success).toBe(false);
    }
  });

  test("rejects an unknown casa", () => {
    expect(
      dolarApiResponseSchema.safeParse(payloadWith({ casa: "unknown" })).success,
    ).toBe(false);
  });

  test.each([
    ["compra", -1],
    ["compra", Number.NaN],
    ["compra", Number.POSITIVE_INFINITY],
    ["compra", Number.NEGATIVE_INFINITY],
    ["venta", -1],
    ["venta", Number.NaN],
    ["venta", Number.POSITIVE_INFINITY],
    ["venta", Number.NEGATIVE_INFINITY],
  ] as const)("rejects %s value %s", (field, value) => {
    expect(
      dolarApiResponseSchema.safeParse(payloadWith({ [field]: value })).success,
    ).toBe(false);
  });

  test("allows null buy and sell rates", () => {
    expect(
      dolarApiResponseSchema.safeParse(
        payloadWith({ compra: null, venta: null }),
      ).success,
    ).toBe(true);
  });

  test("rejects the entire array when one member is invalid", () => {
    const payload = fixture.map((rate) => ({ ...rate }));
    payload[3]!.nombre = "";

    expect(dolarApiResponseSchema.safeParse(payload).success).toBe(false);
  });
});
