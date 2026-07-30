import { AMBITO_HISTORY_START_DATE } from "@bluehouse/shared/constants";
import {
  getLastCompleteCalendarMonthRange,
  getPreviousCalendarMonthRange,
  type DateRange,
} from "@bluehouse/shared/format";

export function getHistoricalRange(
  lastSuccessfulStart: string | null,
  now: Date = new Date(),
): DateRange | null {
  const range = lastSuccessfulStart
    ? getPreviousCalendarMonthRange(lastSuccessfulStart)
    : getLastCompleteCalendarMonthRange(now);

  if (range.endDate < AMBITO_HISTORY_START_DATE) return null;
  return {
    startDate:
      range.startDate < AMBITO_HISTORY_START_DATE
        ? AMBITO_HISTORY_START_DATE
        : range.startDate,
    endDate: range.endDate,
  };
}
