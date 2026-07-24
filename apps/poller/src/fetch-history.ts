import type { HouseName } from "@bluehouse/shared/domain";
import {
  formatAmbitoHistoricalDataToDolarApiFormat,
  getAmbitoDolarUrl,
} from "@bluehouse/shared/format";
import type { DolarApiRate } from "@bluehouse/shared/validators";

const REQUEST_TIMEOUT_MS = 10_000;

export async function fetchHistory(
  house: HouseName,
  startDate: string,
  endDate: string,
): Promise<DolarApiRate[]> {
  const response = await fetch(getAmbitoDolarUrl(house, startDate, endDate), {
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
  return formatAmbitoHistoricalDataToDolarApiFormat(payload, house);
}
