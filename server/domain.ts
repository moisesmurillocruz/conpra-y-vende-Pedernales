import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomInt, randomUUID } from "node:crypto";

export const STAR_RATE = 100;
export const OWNER_COMMISSION_RATE = 0.3;
export const KYC_BLOCK_MESSAGE =
  "Para poder comprar, vender, donar o comentar dentro de la aplicación, es obligatorio que verifiques tu identidad subiendo tu cédula en tu perfil.";

export type Role = "user" | "owner";
export type KycStatus = "pending" | "verified" | "rejected";
export type Reaction = "like" | "love" | "angry";

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  displayName: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  city?: string;
  kycStatus: KycStatus;
  kycDocumentUrl?: string;
  starsBalance: number;
  donorBadge: "Bronce" | "Plata" | "Oro";
  isBanned: boolean;
  createdAt: string;
};

export type Campaign = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  tags: string[];
  mediaUrl?: string;
  goalUsd: number;
  raisedStars: number;
  createdAt: string;
};

export type Comment = {
  id: string;
  campaignId: string;
  userId: string;
  body: string;
  createdAt: string;
};

export type Transaction = {
  id: string;
  userId: string;
  campaignId?: string;
  type: "star_purchase" | "donation" | "withdrawal" | "commission";
  status: "pending" | "approved" | "blocked_review" | "settled" | "failed";
  stars: number;
  usdAmount: number;
  ownerCommissionStars: number;
  createdAt: string;
};

export type OtpChallenge = {
  id: string;
  userId: string;
  codeHash: string;
  expiresAt: number;
  consumedAt?: string;
};

export type Ticket = {
  id: string;
  userId: string;
  subject: string;
  body: string;
  status: "open" | "waiting_admin" | "resolved";
  createdAt: string;
};

export type AnalyticsSummary = {
  campaignId: string;
  likes: number;
  love: number;
  angry: number;
  comments: number;
  shares: number;
  reach: number;
};

export type Repository = {
  users: User[];
  campaigns: Campaign[];
  comments: Comment[];
  reactions: Array<{ id: string; campaignId: string; userId: string; reaction: Reaction; createdAt: string }>;
  transactions: Transaction[];
  otpChallenges: OtpChallenge[];
  tickets: Ticket[];
  friendships: Array<{ id: string; requesterId: string; receiverId: string; status: "pending" | "accepted" | "rejected" }>;
  stories: Array<{ id: string; userId: string; mediaUrl: string; caption?: string; expiresAt: string; createdAt: string }>;
  analytics: Array<{ id: string; userId?: string; campaignId?: string; eventName: string; metadata: unknown; createdAt: string }>;
};

export function createRepository(): Repository {
  return {
    users: [],
    campaigns: [],
    comments: [],
    reactions: [],
    transactions: [],
    otpChallenges: [],
    tickets: [],
    friendships: [],
    stories: [],
    analytics: [],
  };
}

export function usdToStars(usd: number) {
  if (!Number.isFinite(usd) || usd <= 0) {
    throw new Error("El monto debe ser mayor a cero.");
  }
  return Math.round(usd * STAR_RATE);
}

export function starsToUsd(stars: number) {
  if (!Number.isFinite(stars) || stars < 0) {
    throw new Error("Las estrellas no pueden ser negativas.");
  }
  return stars / STAR_RATE;
}

export function resolveDonorBadge(totalDonatedStars: number): User["donorBadge"] {
  if (totalDonatedStars >= 100000) return "Oro";
  if (totalDonatedStars >= 25000) return "Plata";
  return "Bronce";
}

export function assertKyc(user: User) {
  if (user.role === "owner") return;
  if (user.kycStatus !== "verified") {
    const error = new Error(KYC_BLOCK_MESSAGE);
    error.name = "KYC_REQUIRED";
    throw error;
  }
}

export function assertOwner(user: User) {
  if (user.role !== "owner") {
    const error = new Error("Acceso restringido al propietario verificado.");
    error.name = "OWNER_REQUIRED";
    throw error;
  }
}

export function scanForbiddenText(text: string, forbiddenWords: string[]) {
  const normalized = text.toLowerCase();
  return forbiddenWords.find((word) => normalized.includes(word.toLowerCase()));
}

export async function createUser(
  repo: Repository,
  input: { email: string; password: string; displayName: string },
  ownerConfig?: { email: string; passwordHash: string },
) {
  const exists = repo.users.some((user) => user.email.toLowerCase() === input.email.toLowerCase());
  if (exists) throw new Error("El correo ya está registrado.");

  const isOwner = ownerConfig?.email.toLowerCase() === input.email.toLowerCase();
  const user: User = {
    id: randomUUID(),
    email: input.email.toLowerCase(),
    passwordHash: isOwner ? ownerConfig.passwordHash : await bcrypt.hash(input.password, 12),
    role: isOwner ? "owner" : "user",
    displayName: input.displayName,
    kycStatus: isOwner ? "verified" : "pending",
    starsBalance: 0,
    donorBadge: "Bronce",
    isBanned: false,
    createdAt: new Date().toISOString(),
  };
  repo.users.push(user);
  return sanitizeUser(user);
}

export function sanitizeUser(user: User) {
  const { passwordHash, ...safe } = user;
  return safe;
}

export async function validateCredentials(repo: Repository, email: string, password: string) {
  const user = repo.users.find((candidate) => candidate.email === email.toLowerCase());
  if (!user || user.isBanned) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}

export async function createOtp(repo: Repository, userId: string, ttlMinutes: number) {
  const code = String(randomInt(100000, 999999));
  const challenge: OtpChallenge = {
    id: randomUUID(),
    userId,
    codeHash: await bcrypt.hash(code, 10),
    expiresAt: Date.now() + ttlMinutes * 60_000,
  };
  repo.otpChallenges.push(challenge);
  return { challenge, code };
}

export async function verifyOtp(repo: Repository, jwtSecret: string, challengeId: string, code: string) {
  const challenge = repo.otpChallenges.find((candidate) => candidate.id === challengeId);
  if (!challenge || challenge.consumedAt || challenge.expiresAt < Date.now()) {
    throw new Error("OTP expirado o inválido.");
  }
  const valid = await bcrypt.compare(code, challenge.codeHash);
  if (!valid) throw new Error("OTP inválido.");

  challenge.consumedAt = new Date().toISOString();
  const user = repo.users.find((candidate) => candidate.id === challenge.userId);
  if (!user) throw new Error("Usuario no encontrado.");

  return jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: "7d" });
}

export function createCampaign(repo: Repository, user: User, input: Omit<Campaign, "id" | "ownerId" | "raisedStars" | "createdAt">) {
  assertKyc(user);
  const campaign: Campaign = {
    id: randomUUID(),
    ownerId: user.id,
    raisedStars: 0,
    createdAt: new Date().toISOString(),
    ...input,
  };
  repo.campaigns.unshift(campaign);
  return campaign;
}

export function donateStars(repo: Repository, user: User, campaignId: string, stars: number) {
  assertKyc(user);
  const campaign = repo.campaigns.find((candidate) => candidate.id === campaignId);
  if (!campaign) throw new Error("Campaña no encontrada.");
  if (user.starsBalance < stars) throw new Error("Saldo de estrellas insuficiente.");

  campaign.raisedStars += stars;
  user.starsBalance -= stars;
  user.donorBadge = resolveDonorBadge(repo.transactions.filter((tx) => tx.userId === user.id && tx.type === "donation").reduce((sum, tx) => sum + tx.stars, stars));

  const transaction: Transaction = {
    id: randomUUID(),
    userId: user.id,
    campaignId,
    type: "donation",
    status: "approved",
    stars,
    usdAmount: starsToUsd(stars),
    ownerCommissionStars: 0,
    createdAt: new Date().toISOString(),
  };
  repo.transactions.push(transaction);
  return { campaign, transaction };
}

export function purchaseStars(repo: Repository, user: User, usdAmount: number) {
  const stars = usdToStars(usdAmount);
  user.starsBalance += stars;
  const transaction: Transaction = {
    id: randomUUID(),
    userId: user.id,
    type: "star_purchase",
    status: "approved",
    stars,
    usdAmount,
    ownerCommissionStars: 0,
    createdAt: new Date().toISOString(),
  };
  repo.transactions.push(transaction);
  return transaction;
}

export function requestWithdrawal(repo: Repository, user: User, campaignId: string) {
  assertKyc(user);
  const campaign = repo.campaigns.find((candidate) => candidate.id === campaignId && candidate.ownerId === user.id);
  if (!campaign) throw new Error("Campaña no encontrada o no pertenece al usuario.");
  const ownerCommissionStars = Math.round(campaign.raisedStars * OWNER_COMMISSION_RATE);
  const netStars = campaign.raisedStars - ownerCommissionStars;

  const withdrawal: Transaction = {
    id: randomUUID(),
    userId: user.id,
    campaignId,
    type: "withdrawal",
    status: "blocked_review",
    stars: netStars,
    usdAmount: starsToUsd(netStars),
    ownerCommissionStars,
    createdAt: new Date().toISOString(),
  };
  repo.transactions.push(withdrawal);
  return withdrawal;
}

export function commentOnCampaign(repo: Repository, user: User, campaignId: string, body: string, forbiddenWords: string[]) {
  assertKyc(user);
  const forbidden = scanForbiddenText(body, forbiddenWords);
  if (forbidden) {
    const error = new Error(`Mensaje bloqueado por moderación automática: "${forbidden}".`);
    error.name = "MODERATION_BLOCKED";
    throw error;
  }
  const comment: Comment = {
    id: randomUUID(),
    campaignId,
    userId: user.id,
    body,
    createdAt: new Date().toISOString(),
  };
  repo.comments.push(comment);
  return comment;
}

export function addReaction(repo: Repository, user: User, campaignId: string, reaction: Reaction) {
  assertKyc(user);
  const exists = repo.reactions.find((item) => item.campaignId === campaignId && item.userId === user.id && item.reaction === reaction);
  if (exists) return exists;
  const row = { id: randomUUID(), campaignId, userId: user.id, reaction, createdAt: new Date().toISOString() };
  repo.reactions.push(row);
  return row;
}

export function getCampaignAnalytics(repo: Repository, owner: User, campaignId: string): AnalyticsSummary {
  assertOwner(owner);
  return {
    campaignId,
    likes: repo.reactions.filter((r) => r.campaignId === campaignId && r.reaction === "like").length,
    love: repo.reactions.filter((r) => r.campaignId === campaignId && r.reaction === "love").length,
    angry: repo.reactions.filter((r) => r.campaignId === campaignId && r.reaction === "angry").length,
    comments: repo.comments.filter((comment) => comment.campaignId === campaignId).length,
    shares: repo.analytics.filter((event) => event.campaignId === campaignId && event.eventName === "share").length,
    reach: repo.analytics.filter((event) => event.campaignId === campaignId && event.eventName === "view").length,
  };
}
