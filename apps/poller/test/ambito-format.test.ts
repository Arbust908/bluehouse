import { describe, expect, test } from "bun:test";
import {
  AMBITO_DOLAR_BASE_URL,
  HOUSE_DISPLAY_NAMES,
  HOUSE_NAMES,
} from "@bluehouse/shared/constants";
import {
  formatAmbitoHistoricalDataToDolarApiFormat,
  getAmbitoDolarUrl,
  getLastCompleteCalendarMonthRange,
  getPreviousCalendarMonthRange,
  toAmbitoRequestDate,
} from "@bluehouse/shared/format";
import {
  ambitoHistoricalResponseSchema,
  dolarApiResponseSchema,
} from "@bluehouse/shared/validators";
import fixture from "./fixtures/ambito-api.json";

function payloadWithRow(index: number, row: unknown): unknown[] {
  const payload: unknown[] = structuredClone(fixture);
  payload[index] = row;
  return payload;
}

describe("Ámbito historical response formatting", () => {
  test("accepts and formats the captured response", () => {
    expect(ambitoHistoricalResponseSchema.safeParse(fixture).success).toBe(true);

    const result = formatAmbitoHistoricalDataToDolarApiFormat(
      fixture,
      HOUSE_NAMES.BLUE,
    );

    expect(result).toHaveLength(fixture.length - 1);
    expect(result[0]).toEqual({
      moneda: "USD",
      casa: "blue",
      nombre: HOUSE_DISPLAY_NAMES.blue,
      compra: 1401.62,
      venta: 1452.55,
      fechaActualizacion: "2026-06-12T03:00:00.000Z",
    });
    expect(dolarApiResponseSchema.safeParse(result).success).toBe(true);
  });

  test("keeps exact duplicates available for persistence deduplication", () => {
    const result = formatAmbitoHistoricalDataToDolarApiFormat(
      fixture,
      HOUSE_NAMES.BLUE,
    );
    const duplicates = result.filter(
      ({ fechaActualizacion, compra, venta }) =>
        fechaActualizacion === "2026-06-03T03:00:00.000Z" &&
        compra === 1408.76 &&
        venta === 1459.69,
    );

    expect(duplicates).toHaveLength(2);
  });

  test("preserves distinct observations on the same date", () => {
    const result = formatAmbitoHistoricalDataToDolarApiFormat(
      fixture,
      HOUSE_NAMES.BLUE,
    );
    const sameDay = result.filter(
      ({ fechaActualizacion }) =>
        fechaActualizacion === "2026-06-03T03:00:00.000Z",
    );

    expect(sameDay.map(({ compra, venta }) => [compra, venta])).toEqual([
      [1408.76, 1459.69],
      [1408.76, 1459.69],
      [1403.7, 1454.37],
      [1400, 1451.06],
    ]);
  });

  test("uses the historical Buenos Aires offset", () => {
    const result = formatAmbitoHistoricalDataToDolarApiFormat(
      [["Fecha", "Compra", "Venta"], ["15/12/2008", "1,00", "2,00"]],
      HOUSE_NAMES.BLUE,
    );

    expect(result[0]!.fechaActualizacion).toBe("2008-12-15T02:00:00.000Z");
  });

  test("parses correctly grouped thousands", () => {
    const result = formatAmbitoHistoricalDataToDolarApiFormat(
      [["Fecha", "Compra", "Venta"], ["12/06/2026", "1.401,62", "1.452,55"]],
      HOUSE_NAMES.BLUE,
    );

    expect(result[0]!.compra).toBe(1401.62);
    expect(result[0]!.venta).toBe(1452.55);
  });

  test.each([
    ["wrong header order", payloadWithRow(0, ["Fecha", "Venta", "Compra"])],
    ["missing header field", payloadWithRow(0, ["Fecha", "Compra"])],
    ["extra header field", payloadWithRow(0, ["Fecha", "Compra", "Venta", "Otro"])],
    ["missing row field", payloadWithRow(1, ["12/06/2026", "1401,62"])],
    [
      "extra row field",
      payloadWithRow(1, ["12/06/2026", "1401,62", "1452,55", "Otro"]),
    ],
    ["impossible date", payloadWithRow(1, ["31/02/2026", "1401,62", "1452,55"])],
    ["wrong date format", payloadWithRow(1, ["2026-06-12", "1401,62", "1452,55"])],
    ["negative price", payloadWithRow(1, ["12/06/2026", "-1,20", "1452,55"])],
    ["dot decimal", payloadWithRow(1, ["12/06/2026", "1401.62", "1452,55"])],
    ["malformed grouping", payloadWithRow(1, ["12/06/2026", "1.40,20", "1452,55"])],
    ["non-numeric price", payloadWithRow(1, ["12/06/2026", "N/A", "1452,55"])],
  ])("rejects a %s", (_description, payload) => {
    expect(() =>
      formatAmbitoHistoricalDataToDolarApiFormat(payload, HOUSE_NAMES.BLUE),
    ).toThrow();
  });

  test("rejects an unsupported house", () => {
    expect(() =>
      formatAmbitoHistoricalDataToDolarApiFormat(fixture, "informal" as never),
    ).toThrow();
  });

  test("accepts a header-only response as an empty historical result", () => {
    expect(
      formatAmbitoHistoricalDataToDolarApiFormat(
        [["Fecha", "Compra", "Venta"]],
        HOUSE_NAMES.BLUE,
      ),
    ).toEqual([]);
  });
});

describe("Ámbito historical URLs", () => {
  test.each([
    [HOUSE_NAMES.OFICIAL, "oficial"],
    [HOUSE_NAMES.BLUE, "informal"],
    [HOUSE_NAMES.BOLSA, "mep"],
    [HOUSE_NAMES.CONTADO_CON_LIQUI, "contadoconliqui"],
    [HOUSE_NAMES.MAYORISTA, "mayorista"],
    [HOUSE_NAMES.CRIPTO, "cripto"],
    [HOUSE_NAMES.TARJETA, "turista"],
  ] as const)("maps %s to the %s series", (house, series) => {
    expect(getAmbitoDolarUrl(house, "2026-06-01", "2026-06-12")).toBe(
      `${AMBITO_DOLAR_BASE_URL}/${series}/historico-general/01-06-2026/12-06-2026`,
    );
  });

  test.each([
    ["unknown", "2026-06-01", "2026-06-12"],
    [HOUSE_NAMES.BLUE, "01-06-2026", "2026-06-12"],
    [HOUSE_NAMES.BLUE, "2026-02-31", "2026-06-12"],
    [HOUSE_NAMES.BLUE, "2026-06-12", "2026-06-01"],
  ])("rejects invalid URL input %#", (house, startDate, endDate) => {
    expect(() =>
      getAmbitoDolarUrl(house as never, startDate, endDate),
    ).toThrow();
  });
});

describe("historical date windows", () => {
  test("uses the last month completed in Buenos Aires", () => {
    expect(
      getLastCompleteCalendarMonthRange(new Date("2026-07-01T01:00:00Z")),
    ).toEqual({ startDate: "2026-05-01", endDate: "2026-05-31" });
    expect(
      getLastCompleteCalendarMonthRange(new Date("2026-07-01T04:00:00Z")),
    ).toEqual({ startDate: "2026-06-01", endDate: "2026-06-30" });
  });

  test("moves backward by complete calendar months", () => {
    expect(getPreviousCalendarMonthRange("2026-03-01")).toEqual({
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });
    expect(getPreviousCalendarMonthRange("2024-03-31")).toEqual({
      startDate: "2024-02-01",
      endDate: "2024-02-29",
    });
    expect(getPreviousCalendarMonthRange("2026-01-01")).toEqual({
      startDate: "2025-12-01",
      endDate: "2025-12-31",
    });
  });

  test("formats ISO dates only at the Ámbito request boundary", () => {
    expect(toAmbitoRequestDate("2002-01-11")).toBe("11-01-2002");
    expect(() => toAmbitoRequestDate("11-01-2002")).toThrow();
    expect(() => toAmbitoRequestDate("2026-02-31")).toThrow();
  });
});
