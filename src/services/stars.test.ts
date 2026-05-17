import { describe, expect, it } from "vitest";
import {
  calculateDonationProgress,
  calculateOwnerCommission,
  createWithdrawalAlert,
  resolveDonorBadge,
  starsToUsd,
  usdToStars,
} from "./stars";
import type { UserProfile } from "../types";

const demoProfile: UserProfile = {
  name: "Andrea Morales",
  email: "andrea@koramoy.ec",
  publicBadge: "Plata",
  starsBalance: 18500,
  kycStatus: "pendiente",
  bankAccountVerified: false,
  ownedCampaignIds: [],
  withdrawalAlerts: [],
};

describe("sistema de estrellas Koramoy", () => {
  it("convierte 100 estrellas en 1 dolar exacto", () => {
    expect(usdToStars(1)).toBe(100);
    expect(usdToStars(25.5)).toBe(2550);
    expect(starsToUsd(100)).toBe(1);
  });

  it("calcula progreso numerico de recaudacion", () => {
    expect(calculateDonationProgress(50000, 1000)).toEqual({
      raisedUsd: 500,
      percentage: 50,
      label: "50.000 estrellas",
    });
  });

  it("retiene 30% de comision al solicitar cobro", () => {
    expect(calculateOwnerCommission(10000)).toEqual({
      requestedStars: 10000,
      ownerCommissionStars: 3000,
      netStars: 7000,
    });
  });

  it("bloquea retiros sin KYC y datos bancarios", () => {
    expect(() => createWithdrawalAlert(demoProfile, "campana", 10000)).toThrow(
      "Sube la fotografia de tu cedula ecuatoriana",
    );
  });

  it("crea alerta administrativa para retiros verificados", () => {
    const alert = createWithdrawalAlert(
      { ...demoProfile, kycStatus: "verificado", bankAccountVerified: true },
      "campana",
      10000,
    );

    expect(alert).toMatchObject({
      campaignId: "campana",
      ownerCommissionStars: 3000,
      netStars: 7000,
      status: "bloqueado_revision",
    });
  });

  it("asigna insignias de donante por estrellas acumuladas", () => {
    expect(resolveDonorBadge(1000)).toBe("Bronce");
    expect(resolveDonorBadge(25000)).toBe("Plata");
    expect(resolveDonorBadge(100000)).toBe("Oro");
  });
});
