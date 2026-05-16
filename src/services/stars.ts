import { ECUADOR_STAR_RATE, OWNER_COMMISSION_RATE } from "../data/campaigns";
import type { UserProfile, WithdrawalAlert } from "../types";

export function usdToStars(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) {
    throw new Error("El monto debe ser mayor a cero.");
  }

  return Math.round(usd * ECUADOR_STAR_RATE);
}

export function starsToUsd(stars: number): number {
  if (!Number.isFinite(stars) || stars < 0) {
    throw new Error("Las estrellas no pueden ser negativas.");
  }

  return stars / ECUADOR_STAR_RATE;
}

export function calculateDonationProgress(raisedStars: number, goalUsd: number) {
  const raisedUsd = starsToUsd(raisedStars);
  const percentage = Math.min(100, Math.round((raisedUsd / goalUsd) * 100));

  return {
    raisedUsd,
    percentage,
    label: `${raisedStars.toLocaleString("es-EC")} estrellas`,
  };
}

export function calculateOwnerCommission(requestedStars: number) {
  if (!Number.isFinite(requestedStars) || requestedStars <= 0) {
    throw new Error("El retiro debe tener estrellas acumuladas.");
  }

  const ownerCommissionStars = Math.round(requestedStars * OWNER_COMMISSION_RATE);
  return {
    requestedStars,
    ownerCommissionStars,
    netStars: requestedStars - ownerCommissionStars,
  };
}

export function createWithdrawalAlert(
  profile: UserProfile,
  campaignId: string,
  requestedStars: number,
): WithdrawalAlert {
  if (profile.kycStatus !== "verificado") {
    throw new Error("Sube la fotografia de tu cedula ecuatoriana para solicitar retiros.");
  }

  if (!profile.bankAccountVerified) {
    throw new Error("Verifica tus datos bancarios antes de solicitar un retiro.");
  }

  const commission = calculateOwnerCommission(requestedStars);
  return {
    id: `alert-${campaignId}-${Date.now()}`,
    campaignId,
    status: "bloqueado_revision",
    createdAt: new Date().toISOString(),
    ...commission,
  };
}

export function resolveDonorBadge(totalDonatedStars: number): UserProfile["publicBadge"] {
  if (totalDonatedStars >= 100000) {
    return "Oro";
  }

  if (totalDonatedStars >= 25000) {
    return "Plata";
  }

  return "Bronce";
}
