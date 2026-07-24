import {
  AMBITO_DOLAR_BASE_URL,
  AMBITO_SERIES_BY_HOUSE,
  AMBITO_TIME_ZONE,
  CURRENCY_NAME,
  HOUSE_DISPLAY_NAMES,
} from "./constants";
import {
  ambitoHistoricalResponseSchema,
  ambitoRequestDateSchema,
  dolarApiResponseSchema,
  houseNameSchema,
  type DolarApiResponse,
  validateDateRange,
} from "./validators";

const buenosAiresDateTime = new Intl.DateTimeFormat("en-CA", {
  timeZone: AMBITO_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function toBuenosAiresMidnightIso(date: string): string {
  const [day, month, year] = date.split("/").map(Number) as [
    number,
    number,
    number,
  ];
  const desiredWallTime = Date.UTC(year, month - 1, day);
  let candidate = desiredWallTime;

  // Iteratively adjust the UTC candidate until its Buenos Aires wall time is midnight.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = buenosAiresDateTime.formatToParts(new Date(candidate));
    const valueOf = (type: Intl.DateTimeFormatPartTypes): number =>
      Number(parts.find((part) => part.type === type)!.value);
    const wallTimeAsUtc = Date.UTC(
      valueOf("year"),
      valueOf("month") - 1,
      valueOf("day"),
      valueOf("hour"),
      valueOf("minute"),
      valueOf("second"),
    );
    const adjustment = desiredWallTime - wallTimeAsUtc;

    candidate += adjustment;
    if (adjustment === 0) break;
  }

  return new Date(candidate).toISOString();
}

function parseLocalizedNumber(value: string): number {
  return Number(value.replaceAll(".", "").replace(",", "."));
}

export function getAmbitoDolarUrl(
  casa: unknown,
  startDate: unknown,
  endDate: unknown,
): string {
  const parsedCasa = houseNameSchema.parse(casa);
  const parsedStartDate = ambitoRequestDateSchema.parse(startDate);
  const parsedEndDate = ambitoRequestDateSchema.parse(endDate);

  if (!validateDateRange(parsedStartDate, parsedEndDate)) {
    throw new Error(
      `Invalid date range: ${parsedStartDate} to ${parsedEndDate}. Start date must be before or equal to end date.`,
    );
  }

  const series = AMBITO_SERIES_BY_HOUSE[parsedCasa];
  return `${AMBITO_DOLAR_BASE_URL}/${series}/historico-general/${parsedStartDate}/${parsedEndDate}`;
}

export function formatAmbitoHistoricalDataToDolarApiFormat(
  ambitoData: unknown,
  casa: unknown,
): DolarApiResponse {
  const [, ...rows] = ambitoHistoricalResponseSchema.parse(ambitoData);
  const parsedCasa = houseNameSchema.parse(casa);

  return dolarApiResponseSchema.parse(
    rows.map(([fecha, compra, venta]) => ({
      moneda: CURRENCY_NAME.USD,
      casa: parsedCasa,
      nombre: HOUSE_DISPLAY_NAMES[parsedCasa],
      compra: parseLocalizedNumber(compra),
      venta: parseLocalizedNumber(venta),
      fechaActualizacion: toBuenosAiresMidnightIso(fecha),
    })),
  );
}
