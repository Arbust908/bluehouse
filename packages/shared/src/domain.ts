import { AMBITO_SERIES_BY_HOUSE } from "./constants";

export type { CurrencyName, HouseName } from "./constants";
export type AmbitoSeries =
  (typeof AMBITO_SERIES_BY_HOUSE)[keyof typeof AMBITO_SERIES_BY_HOUSE];
