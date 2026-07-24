import {
  dolarApiResponseSchema,
  type DolarApiRate,
} from "@bluehouse/shared/validators";
import { DOLAR_API_URL } from "@bluehouse/shared/constants";
const REQUEST_TIMEOUT_MS = 10_000;

export async function fetchRates(): Promise<DolarApiRate[]> {
  const response = await fetch(process.env.DOLAR_API_URL ?? DOLAR_API_URL, {
    headers: {
      accept: "application/json",
      "user-agent": "bluehouse-poller/1.0",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Upstream returned HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  return dolarApiResponseSchema.parse(payload);
}
