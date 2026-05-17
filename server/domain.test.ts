import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import {
  KYC_BLOCK_MESSAGE,
  addReaction,
  commentOnCampaign,
  createCampaign,
  createOtp,
  createRepository,
  createUser,
  donateStars,
  getCampaignAnalytics,
  purchaseStars,
  requestWithdrawal,
  validateCredentials,
  verifyOtp,
} from "./domain";

describe("backend Koramoy", () => {
  it("registra usuarios, valida credenciales y exige OTP antes de sesión", async () => {
    const repo = createRepository();
    await createUser(repo, { email: "ana@koramoy.ec", password: "password123", displayName: "Ana" });

    const user = await validateCredentials(repo, "ana@koramoy.ec", "password123");
    expect(user?.email).toBe("ana@koramoy.ec");

    const { challenge, code } = await createOtp(repo, user!.id, 5);
    const token = await verifyOtp(repo, "secret", challenge.id, code);
    expect(token).toContain(".");
  });

  it("bloquea mutaciones sin KYC con el mensaje obligatorio", async () => {
    const repo = createRepository();
    await createUser(repo, { email: "luis@koramoy.ec", password: "password123", displayName: "Luis" });
    const user = repo.users[0];

    expect(() =>
      createCampaign(repo, user, {
        title: "Ayuda real para medicinas",
        description: "Necesitamos apoyo verificado para comprar medicinas.",
        tags: ["salud"],
        goalUsd: 100,
      }),
    ).toThrow(KYC_BLOCK_MESSAGE);
  });

  it("crea campañas, dona estrellas y actualiza progreso real", async () => {
    const repo = createRepository();
    await createUser(repo, { email: "maria@koramoy.ec", password: "password123", displayName: "Maria" });
    await createUser(repo, { email: "donante@koramoy.ec", password: "password123", displayName: "Donante" });
    const creator = repo.users[0];
    const donor = repo.users[1];
    creator.kycStatus = "verified";
    donor.kycStatus = "verified";

    const campaign = createCampaign(repo, creator, {
      title: "Alimentos para refugio",
      description: "Campaña real para comprar alimento de animales rescatados.",
      tags: ["animales", "ecuador"],
      goalUsd: 50,
    });
    purchaseStars(repo, donor, 10);
    const result = donateStars(repo, donor, campaign.id, 500);

    expect(result.campaign.raisedStars).toBe(500);
    expect(donor.starsBalance).toBe(500);
  });

  it("retiene 30% y congela retiro para revisión del propietario", async () => {
    const repo = createRepository();
    await createUser(repo, { email: "creador@koramoy.ec", password: "password123", displayName: "Creador" });
    const creator = repo.users[0];
    creator.kycStatus = "verified";
    const campaign = createCampaign(repo, creator, {
      title: "Cirugía urgente",
      description: "Campaña verificada para una cirugía urgente.",
      tags: ["salud"],
      goalUsd: 100,
    });
    campaign.raisedStars = 10000;
    const withdrawal = requestWithdrawal(repo, creator, campaign.id);

    expect(withdrawal.status).toBe("blocked_review");
    expect(withdrawal.ownerCommissionStars).toBe(3000);
    expect(withdrawal.stars).toBe(7000);
  });

  it("bloquea textos prohibidos y expone analíticas solo al propietario", async () => {
    const repo = createRepository();
    const ownerHash = await bcrypt.hash("OwnerPass123", 12);
    await createUser(repo, { email: "owner@koramoy.ec", password: "OwnerPass123", displayName: "Owner" }, { email: "owner@koramoy.ec", passwordHash: ownerHash });
    await createUser(repo, { email: "user@koramoy.ec", password: "password123", displayName: "User" });
    const owner = repo.users[0];
    const user = repo.users[1];
    user.kycStatus = "verified";
    const campaign = createCampaign(repo, owner, {
      title: "Fondo solidario",
      description: "Campaña creada por propietario verificado.",
      tags: ["koramoy"],
      goalUsd: 100,
    });

    expect(() => commentOnCampaign(repo, user, campaign.id, "mensaje con racismo", ["racismo"])).toThrow("moderación automática");
    commentOnCampaign(repo, user, campaign.id, "comentario permitido", ["racismo"]);
    addReaction(repo, user, campaign.id, "love");

    expect(getCampaignAnalytics(repo, owner, campaign.id)).toMatchObject({ comments: 1, love: 1 });
  });
});
