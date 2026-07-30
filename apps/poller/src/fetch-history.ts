import type { HouseName } from "@bluehouse/shared/domain";
import {
  formatAmbitoHistoricalDataToDolarApiFormat,
  getAmbitoDolarUrl,
} from "@bluehouse/shared/format";
import type { DolarApiRate } from "@bluehouse/shared/validators";

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ERROR_BODY_LENGTH = 2_000;

export async function fetchHistory(
  house: HouseName,
  startDate: string,
  endDate: string,
): Promise<DolarApiRate[]> {
  const url = getAmbitoDolarUrl(house, startDate, endDate);
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "bluehouse-poller/1.0",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    let body: string;
    try {
      const responseBody = await response.text();
      body = responseBody
        ? JSON.stringify(responseBody.slice(0, MAX_ERROR_BODY_LENGTH))
        : "<empty>";
      if (responseBody.length > MAX_ERROR_BODY_LENGTH) body += " (truncated)";
    } catch (error) {
      body = `<unavailable: ${error instanceof Error ? error.message : String(error)}>`;
    }

    const status = [response.status, response.statusText]
      .filter(Boolean)
      .join(" ");
    const contentType = response.headers.get("content-type") ?? "unknown";
    throw new Error(
      `Upstream request GET ${url} returned HTTP ${status}; content-type=${contentType}; body=${body}`,
    );
  }

  const payload: unknown = await response.json();
  return formatAmbitoHistoricalDataToDolarApiFormat(payload, house);
}
