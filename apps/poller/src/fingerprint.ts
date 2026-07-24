import type { DolarApiRate } from "@bluehouse/shared/validators";

export function createObservationFingerprint(rate: DolarApiRate): string {
  return new Bun.CryptoHasher("sha256")
    .update(
      JSON.stringify([
        "dolarapi",
        rate.moneda,
        rate.casa,
        rate.fechaActualizacion,
        rate.compra,
        rate.venta,
      ]),
    )
    .digest("hex");
}
