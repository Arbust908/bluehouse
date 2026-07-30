import type { DolarApiRate } from "@bluehouse/shared/validators";
import type { ProviderName } from "@bluehouse/shared/constants";

export function createObservationFingerprint(
  provider: ProviderName,
  rate: DolarApiRate,
): string {
  return new Bun.CryptoHasher("sha256")
    .update(
      JSON.stringify([
        provider,
        rate.moneda,
        rate.casa,
        rate.fechaActualizacion,
        rate.compra,
        rate.venta,
      ]),
    )
    .digest("hex");
}
