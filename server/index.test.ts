import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app, repo } from "./index";
import { KYC_BLOCK_MESSAGE } from "./domain";

const jwtSecret = process.env.JWT_SECRET ?? "dev-only-change-me";

beforeEach(() => {
  repo.users.length = 0;
  repo.campaigns.length = 0;
  repo.comments.length = 0;
  repo.reactions.length = 0;
  repo.transactions.length = 0;
  repo.otpChallenges.length = 0;
});

describe("Koramoy API", () => {
  it("registra usuarios y protege mutaciones con KYC", async () => {
    const registration = await request(app)
      .post("/auth/register")
      .send({ email: "api@koramoy.ec", password: "password123", displayName: "API User" })
      .expect(201);

    const userId = registration.body.user.id;
    const token = jwt.sign({ sub: userId, role: "user" }, jwtSecret, { expiresIn: "1h" });

    const blocked = await request(app)
      .post("/campaigns")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Campaña real API",
        description: "Campaña creada desde una prueba de integración.",
        tags: ["api"],
        goalUsd: 100,
      })
      .expect(403);

    expect(blocked.body.message).toBe(KYC_BLOCK_MESSAGE);
    repo.users[0].kycStatus = "verified";

    const created = await request(app)
      .post("/campaigns")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Campaña real API",
        description: "Campaña creada desde una prueba de integración.",
        tags: ["api"],
        goalUsd: 100,
      })
      .expect(201);

    expect(created.body.campaign.title).toBe("Campaña real API");
  });
});
