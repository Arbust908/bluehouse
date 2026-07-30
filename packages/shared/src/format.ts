import {
  AMBITO_DOLAR_BASE_URL,
  AMBITO_SERIES_BY_HOUSE,
  AMBITO_TIME_ZONE,
  CURRENCY_NAMES,
  HOUSE_DISPLAY_NAMES,
  type HouseName,
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

export function datesToRangeString(startDate: string, endDate: string): string {
  if (!validateDateRange(startDate, endDate)) {
    throw new Error(
      `Invalid date range: ${startDate} to ${endDate}. Start date must be before or equal to end date.`,
    );
  }
  return `${startDate} to ${endDate}`;
}
export function rangeStringToDates(range: string): { startDate: string; endDate: string } {
  const [startDate, endDate] = range.split(" to ");
  if (!startDate || !endDate) {
    throw new Error(`Invalid range string: ${range}. Expected format: "YYYY-MM-DD to YYYY-MM-DD".`);
  }
  if (!validateDateRange(startDate, endDate)) {
    throw new Error(
      `Invalid date range: ${startDate} to ${endDate}. Start date must be before or equal to end date.`,
    );
  }
  return { startDate, endDate };
}
/**
 * 
 * @param currentStartDate 
 * @param currentEndDate 
 * @param direction "forward" add one month to the current range, "backward" subtract one month from the current range
 * @returns 
 */
export type NextDateDirection = "forward" | "backward";
export function getNextDateRange(currentStartDate: string, currentEndDate: string, direction: NextDateDirection = "forward"): { nextStartDate: string; nextEndDate: string } {
  const startDate = new Date(currentStartDate);
  const endDate = new Date(currentEndDate);

  if (!validateDateRange(currentStartDate, currentEndDate)) {
    throw new Error(
      `Invalid date range: ${currentStartDate} to ${currentEndDate}. Start date must be before or equal to end date.`,
    );
  }

  const monthOffset = direction === "forward" ? 1 : -1;
  const nextStartDate = new Date(startDate);
  nextStartDate.setMonth(nextStartDate.getMonth() + monthOffset);

  const nextEndDate = new Date(endDate);
  nextEndDate.setMonth(nextEndDate.getMonth() + monthOffset);

  return {
    nextStartDate: nextStartDate.toISOString(),
    nextEndDate: nextEndDate.toISOString(),
  };
}
export function getNextDateRangeFromRangeString(currentRange: string, direction: NextDateDirection = "forward"): string {
  const { startDate, endDate } = rangeStringToDates(currentRange);
  const { nextStartDate, nextEndDate } = getNextDateRange(startDate, endDate, direction);
  return datesToRangeString(nextStartDate, nextEndDate);
}

export function getAmbitoDolarUrl(
  casa: HouseName,
  startDate: string,
  endDate: string,
): string {
  const parsedCasa = houseNameSchema.parse(casa);
  // Parsed dates should be on day/month/year format, as expected by Ambito's API.
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
  casa: HouseName,
): DolarApiResponse {
  const [, ...rows] = ambitoHistoricalResponseSchema.parse(ambitoData);
  const parsedCasa = houseNameSchema.parse(casa);

  return dolarApiResponseSchema.parse(
    rows.map(([fecha, compra, venta]) => ({
      moneda: CURRENCY_NAMES.USD,
      casa: parsedCasa,
      nombre: HOUSE_DISPLAY_NAMES[parsedCasa],
      compra: parseLocalizedNumber(compra),
      venta: parseLocalizedNumber(venta),
      fechaActualizacion: toBuenosAiresMidnightIso(fecha),
    })),
  );
}
