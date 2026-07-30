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

const ambitoHistoricalThreeColumnHeaderSchema = z.tuple([
  z.string().min(1),
  z.string().min(1),
  z.string().min(1),
]);

const ambitoHistoricalTwoColumnHeaderSchema = z.tuple([
  z.string().min(1),
  z.string().min(1),
]);

const ambitoHistoricalRateRowSchema = z.tuple([
  ambitoDateSchema,
  localizedNonNegativeNumberSchema,
  localizedNonNegativeNumberSchema,
]);

const ambitoHistoricalSingleValueRowSchema = z.tuple([
  ambitoDateSchema,
  localizedNonNegativeNumberSchema,
]);

export const ambitoHistoricalResponseSchema = z.union([
  z
    .tuple([ambitoHistoricalThreeColumnHeaderSchema])
    .rest(ambitoHistoricalRateRowSchema),
  z
    .tuple([ambitoHistoricalTwoColumnHeaderSchema])
    .rest(ambitoHistoricalSingleValueRowSchema),
]);

export type AmbitoHistoricalResponse = z.infer<
  typeof ambitoHistoricalResponseSchema
>;
