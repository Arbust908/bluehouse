import { AMBITO_ROUTE_BY_HOUSE } from "./constants";

export type { CurrencyName, HouseName } from "./constants";
export type AmbitoRoute =
  (typeof AMBITO_ROUTE_BY_HOUSE)[keyof typeof AMBITO_ROUTE_BY_HOUSE];
