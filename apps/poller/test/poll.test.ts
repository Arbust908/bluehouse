import { describe, expect, test } from "bun:test";
import fixture from "./fixtures/dolar-api.json";
import { dolarApiResponseSchema } from "@bluehouse/shared/validators";
import { createObservationFingerprint } from "../src/fingerprint";
import { PROVIDER_NAMES } from "@bluehouse/shared/constants";

const [rate] = dolarApiResponseSchema.parse(fixture);

describe("observation fingerprints", () => {
  test("returns the same fingerprint for identical observations", () => {
    expect(
      createObservationFingerprint(PROVIDER_NAMES.DOLAR_API, rate!),
    ).toBe(
      createObservationFingerprint(PROVIDER_NAMES.DOLAR_API, { ...rate! }),
    );
  });

  test("changes when an observed rate changes", () => {
    expect(
      createObservationFingerprint(PROVIDER_NAMES.DOLAR_API, rate!),
    ).not.toBe(
      createObservationFingerprint(PROVIDER_NAMES.DOLAR_API, {
        ...rate!,
        venta: rate!.venta! + 1,
      }),
    );
  });

  test("changes between providers", () => {
    expect(
      createObservationFingerprint(PROVIDER_NAMES.DOLAR_API, rate!),
    ).not.toBe(createObservationFingerprint(PROVIDER_NAMES.AMBITO, rate!));
  });
});
