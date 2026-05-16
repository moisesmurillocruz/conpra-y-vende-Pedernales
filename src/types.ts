export type BeneficiaryCategory = "abuelitos" | "salud" | "animales" | "adopcion";

export type PaymentMethod = {
  kind: "bank" | "mobile" | "paypal" | "deuna";
  label: string;
  details: string;
  helper: string;
};

export type Evidence = {
  id: string;
  title: string;
  description: string;
  mediaUrl: string;
  type: "foto" | "video";
};

export type Campaign = {
  id: string;
  title: string;
  description: string;
  story: string;
  category: BeneficiaryCategory;
  mediaUrl: string;
  goalUsd: number;
  raisedStars: number;
  likes: number;
  comments: number;
  shares: number;
  isPinnedByOwner: boolean;
  creator: {
    name: string;
    city: string;
    isKycVerified: boolean;
    cedulaUploaded: boolean;
  };
  paymentMethods: PaymentMethod[];
  evidences: Evidence[];
};

export type UserProfile = {
  name: string;
  email: string;
  publicBadge: "Bronce" | "Plata" | "Oro";
  starsBalance: number;
  kycStatus: "pendiente" | "verificado";
  bankAccountVerified: boolean;
  ownedCampaignIds: string[];
  withdrawalAlerts: WithdrawalAlert[];
};

export type WithdrawalAlert = {
  id: string;
  campaignId: string;
  requestedStars: number;
  ownerCommissionStars: number;
  netStars: number;
  status: "bloqueado_revision";
  createdAt: string;
};
