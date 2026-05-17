export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export type ApiUser = {
  id: string;
  email: string;
  role: "user" | "owner";
  displayName: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  city?: string;
  kycStatus: "pending" | "verified" | "rejected";
  starsBalance: number;
  donorBadge: "Bronce" | "Plata" | "Oro";
};

export type ApiCampaign = {
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

export class ApiError extends Error {
  kycRequired: boolean;

  constructor(message: string, kycRequired = false) {
    super(message);
    this.kycRequired = kycRequired;
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.message ?? "Error de API Koramoy.", Boolean(payload.kycRequired));
  }
  return payload as T;
}

export async function uploadFile<T>(path: string, file: File, token: string, field = "document"): Promise<T> {
  const body = new FormData();
  body.append(field, file);
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.message ?? "Error subiendo archivo.", Boolean(payload.kycRequired));
  }
  return payload as T;
}
