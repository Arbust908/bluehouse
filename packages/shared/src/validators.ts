import * as z from "zod";
import { CURRENCY_NAMES, HOUSE_NAMES } from "./constants";

export const houseNameSchema = z.enum(HOUSE_NAMES);

export const dolarApiRateSchema = z.strictObject({
  moneda: z.literal(CURRENCY_NAMES.USD),
  casa: houseNameSchema,
  nombre: z.string().min(1),
  compra: z.number().nonnegative().nullable(),
  venta: z.number().nonnegative().nullable(),
  fechaActualizacion: z.iso.datetime(),
});

export const dolarApiResponseSchema = z.array(dolarApiRateSchema).min(1);

export type DolarApiRate = z.infer<typeof dolarApiRateSchema>;
export type DolarApiResponse = z.infer<typeof dolarApiResponseSchema>;

export function validateDolarApiResponse(data: unknown): DolarApiResponse {
  return dolarApiResponseSchema.parse(data);
}

function isRealDate(date: string, separator: "-" | "/"): boolean {
  const parts = date.split(separator);
  if (parts.length !== 3) return false;

  const [day, month, year] = parts.map(Number) as [number, number, number];
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function validateValidDateFormat(date: string): boolean {
  return /^\d{2}-\d{2}-\d{4}$/.test(date) && isRealDate(date, "-");
}

/**
 * This should be used to validate dates that are sent to Ambito's API. Ambito expects dates in the format "dd-mm-yyyy", and this schema ensures that the date is in that format and represents a real calendar date.
 */
export const ambitoRequestDateSchema = z
  .string()
  .regex(/^\d{2}-\d{2}-\d{4}$/)
  .refine((date) => isRealDate(date, "-"), "Invalid calendar date");

export function validateDateRange(startDate: string, endDate: string): boolean {
  if (!validateValidDateFormat(startDate) || !validateValidDateFormat(endDate)) {
    return false;
  }

  const toSortableDate = (date: string) => {
    const [day, month, year] = date.split("-");
    return `${year}-${month}-${day}`;
  };

  return toSortableDate(startDate) <= toSortableDate(endDate);
}

const ambitoDateSchema = z
  .string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/)
  .refine((date) => isRealDate(date, "/"), "Invalid calendar date");

const localizedNonNegativeNumberSchema = z
  .string()
  .regex(
    /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/,
    "Expected a non-negative localized number",
  );

const ambitoHistoricalHeaderSchema = z.tuple([
  z.literal("Fecha"),
  z.literal("Compra"),
  z.literal("Venta"),
]);

const ambitoHistoricalRateRowSchema = z.tuple([
  ambitoDateSchema,
  localizedNonNegativeNumberSchema,
  localizedNonNegativeNumberSchema,
]);

export const ambitoHistoricalResponseSchema = z
  .tuple([ambitoHistoricalHeaderSchema])
  .rest(ambitoHistoricalRateRowSchema)
  .refine((response) => response.length > 1, "Expected at least one rate row");

export type AmbitoHistoricalResponse = z.infer<
  typeof ambitoHistoricalResponseSchema
>;
