import { afterEach, describe, expect, test } from "bun:test";
import { HOUSE_NAMES } from "@bluehouse/shared/constants";
import { fetchHistory } from "../src/fetch-history";

const originalFetch = globalThis.fetch;

function fetchResponse(response: Response): typeof fetch {
  return Object.assign(() => Promise.resolve(response), {
    preconnect: originalFetch.preconnect,
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("historical upstream errors", () => {
  test("reports request and response details for an HTTP error", async () => {
    globalThis.fetch = fetchResponse(
      new Response('{"message":"invalid date range"}', {
        status: 400,
        statusText: "Bad Request",
        headers: { "content-type": "application/json" },
      }),
    );

    const request = fetchHistory(
      HOUSE_NAMES.BOLSA,
      "2025-08-01",
      "2025-08-31",
    );

    await expect(request).rejects.toThrow(
      /GET https:\/\/.*\/dolarrava\/mep\/historico-general\/2025-08-01\/2025-08-31 returned HTTP 400 Bad Request; content-type=application\/json; body="\{\\"message\\":\\"invalid date range\\"\}"/,
    );
  });

  test("bounds large upstream response bodies", async () => {
    globalThis.fetch = fetchResponse(
      new Response("x".repeat(2_001), { status: 500 }),
    );

    await expect(
      fetchHistory(HOUSE_NAMES.BLUE, "2025-08-01", "2025-08-31"),
    ).rejects.toThrow(`body="${"x".repeat(2_000)}" (truncated)`);
  });
});
