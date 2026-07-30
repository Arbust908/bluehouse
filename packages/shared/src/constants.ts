export const HOUSE_NAMES = {
  OFICIAL: "oficial",
  BLUE: "blue",
  BOLSA: "bolsa",
  CONTADO_CON_LIQUI: "contadoconliqui",
  MAYORISTA: "mayorista",
  CRIPTO: "cripto",
  TARJETA: "tarjeta",
} as const;

export type HouseName = (typeof HOUSE_NAMES)[keyof typeof HOUSE_NAMES];

export const HOUSE_DISPLAY_NAMES = {
  oficial: "Oficial",
  blue: "Blue",
  bolsa: "Bolsa",
  contadoconliqui: "Contado con liquidación",
  mayorista: "Mayorista",
  cripto: "Cripto",
  tarjeta: "Tarjeta",
} as const satisfies Record<HouseName, string>;

export const CURRENCY_NAMES = {
  USD: "USD",
  ARS: "ARS",
} as const;

export type CurrencyName =
  (typeof CURRENCY_NAMES)[keyof typeof CURRENCY_NAMES];

export const PROVIDER_NAMES = {
  DOLAR_API: "dolarapi",
  AMBITO: "ambito",
} as const;

export type ProviderName =
  (typeof PROVIDER_NAMES)[keyof typeof PROVIDER_NAMES];

export const DOLAR_API_URL = "https://dolarapi.com/v1/dolares";
export const AMBITO_DOLAR_BASE_URL = "https://mercados.ambito.com/dolar";
export const AMBITO_TIME_ZONE = "America/Argentina/Buenos_Aires";

export const AMBITO_SERIES_BY_HOUSE = {
  oficial: "oficial",
  blue: "informal",
  bolsa: "mep",
  contadoconliqui: "contadoconliqui",
  mayorista: "mayorista",
  cripto: "cripto",
  tarjeta: "turista",
} as const satisfies Record<HouseName, string>;

export const POLL_STATUS = {
  RUNNING: "running",
  SUCCESS: "success",
  FAILED: "failed",
  SKIPPED: "skipped",
} as const;

export type PollStatus = (typeof POLL_STATUS)[keyof typeof POLL_STATUS];

export const AMBITO_HISTORY_START_DATE = "2002-01-01";
