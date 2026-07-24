import { AMBITO_SERIES_BY_HOUSE, CURRENCY_NAME, HOUSE_NAMES } from "./constants";

export type HouseName = (typeof HOUSE_NAMES)[keyof typeof HOUSE_NAMES];
export type CurrencyName = (typeof CURRENCY_NAME)[keyof typeof CURRENCY_NAME];
export type AmbitoSeries =
  (typeof AMBITO_SERIES_BY_HOUSE)[keyof typeof AMBITO_SERIES_BY_HOUSE];
