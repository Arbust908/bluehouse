export const HOUSE_NAMES = {
  OFICIAL: "oficial",
  BLUE: "blue",
  BOLSA: "bolsa",
  CONTADO_CON_LIQUI: "contadoconliqui",
  MAYORISTA: "mayorista",
  CRIPTO: "cripto",
  TARJETA: "tarjeta",
} as const;

export const HOUSE_NAMES_ARRAY = Object.values(HOUSE_NAMES);

export const HOUSE_DISPLAY_NAMES = {
  oficial: "Oficial",
  blue: "Blue",
  bolsa: "Bolsa",
  contadoconliqui: "Contado con liquidación",
  mayorista: "Mayorista",
  cripto: "Cripto",
  tarjeta: "Tarjeta",
} as const satisfies Record<(typeof HOUSE_NAMES_ARRAY)[number], string>;

export const CURRENCY_NAME = {
  USD: "USD",
} as const;

export const CURRENCY_NAME_ARRAY = Object.values(CURRENCY_NAME);

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
} as const satisfies Record<(typeof HOUSE_NAMES_ARRAY)[number], string>;
