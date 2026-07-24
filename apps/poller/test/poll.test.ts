import { describe, expect, test } from "bun:test";
import fixture from "./fixtures/dolar-api.json";
import { dolarApiResponseSchema } from "@bluehouse/shared/validators";
import { createObservationFingerprint } from "../src/fingerprint";

const [rate] = dolarApiResponseSchema.parse(fixture);

describe("observation fingerprints", () => {
  test("returns the same fingerprint for identical observations", () => {
    expect(createObservationFingerprint(rate!)).toBe(
      createObservationFingerprint({ ...rate! }),
    );
  });

  test("changes when an observed rate changes", () => {
    expect(createObservationFingerprint(rate!)).not.toBe(
      createObservationFingerprint({ ...rate!, venta: rate!.venta! + 1 }),
    );
  });
});
