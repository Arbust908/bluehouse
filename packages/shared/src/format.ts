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
  dolarApiRateSchema,
  houseNameSchema,
  type DolarApiRate,
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

export interface DateRange {
  startDate: string;
  endDate: string;
}

function parseIsoDate(date: string): [year: number, month: number, day: number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Invalid ISO date: ${date}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid ISO date: ${date}`);
  }

  return [year, month, day];
}

function calendarMonthRange(year: number, month: number): DateRange {
  const normalized = new Date(Date.UTC(year, month - 1, 1));
  const normalizedYear = normalized.getUTCFullYear();
  const normalizedMonth = normalized.getUTCMonth() + 1;
  const lastDay = new Date(
    Date.UTC(normalizedYear, normalizedMonth, 0),
  ).getUTCDate();
  const yearPart = String(normalizedYear).padStart(4, "0");
  const monthPart = String(normalizedMonth).padStart(2, "0");

  return {
    startDate: `${yearPart}-${monthPart}-01`,
    endDate: `${yearPart}-${monthPart}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function getLastCompleteCalendarMonthRange(
  now: Date = new Date(),
): DateRange {
  const parts = buenosAiresDateTime.formatToParts(now);
  const valueOf = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)!.value);

  return calendarMonthRange(valueOf("year"), valueOf("month") - 1);
}

export function getPreviousCalendarMonthRange(
  currentStartDate: string,
): DateRange {
  const [year, month] = parseIsoDate(currentStartDate);
  return calendarMonthRange(year, month - 1);
}

export function toAmbitoRequestDate(date: string): string {
  const [year, month, day] = parseIsoDate(date);
  return `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${String(year).padStart(4, "0")}`;
}

export function getAmbitoDolarUrl(
  casa: HouseName,
  startDate: string,
  endDate: string,
): string {
  const parsedCasa = houseNameSchema.parse(casa);
  // Parsed dates should be on day/month/year format, as expected by Ambito's API.
  const parsedStartDate = ambitoRequestDateSchema.parse(
    toAmbitoRequestDate(startDate),
  );
  const parsedEndDate = ambitoRequestDateSchema.parse(
    toAmbitoRequestDate(endDate),
  );

  if (startDate > endDate) {
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
): DolarApiRate[] {
  const [, ...rows] = ambitoHistoricalResponseSchema.parse(ambitoData);
  const parsedCasa = houseNameSchema.parse(casa);

  return dolarApiRateSchema.array().parse(
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
