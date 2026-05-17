import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import morgan from "morgan";
import multer from "multer";
import nodemailer from "nodemailer";
import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { z } from "zod";
import { randomUUID } from "node:crypto";
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
  sanitizeUser,
  validateCredentials,
  verifyOtp,
  type Repository,
  type User,
} from "./domain";

const uploadsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../uploads");
mkdirSync(uploadsDir, { recursive: true });

const repo = createRepository();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
});

const jwtSecret = process.env.JWT_SECRET ?? "dev-only-change-me";
const otpTtlMinutes = Number(process.env.OTP_TTL_MINUTES ?? 5);
const forbiddenWords = (process.env.FORBIDDEN_WORDS ?? "insulto,racismo,acoso,bulling,bullying").split(",");
const upload = multer({ dest: uploadsDir, limits: { fileSize: 8 * 1024 * 1024 } });

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use("/uploads", express.static(uploadsDir));

const ownerConfig = {
  email: process.env.OWNER_EMAIL ?? "owner@koramoy.ec",
  passwordHash: process.env.OWNER_PASSWORD_HASH ?? "",
};

async function sendOtpEmail(email: string, code: string) {
  if (!process.env.SMTP_HOST) {
    console.info(`[Koramoy 2FA DEV] OTP para ${email}: ${code}`);
    return;
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "Koramoy <no-reply@koramoy.ec>",
    to: email,
    subject: "Tu código 2FA de Koramoy",
    text: `Tu código de verificación Koramoy es ${code}. Expira en 5 minutos.`,
  });
}

function getUserFromToken(repository: Repository, token?: string): User | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token.replace("Bearer ", ""), jwtSecret) as { sub: string };
    return repository.users.find((user) => user.id === payload.sub) ?? null;
  } catch {
    return null;
  }
}

function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getUserFromToken(repo, req.header("authorization"));
  if (!user) {
    res.status(401).json({ message: "Sesión inválida o expirada." });
    return;
  }
  if (user.isBanned) {
    res.status(403).json({ message: "Cuenta suspendida por incumplimiento de políticas." });
    return;
  }
  res.locals.user = user;
  next();
}

function handleError(res: express.Response, error: unknown) {
  const err = error instanceof Error ? error : new Error("Error inesperado.");
  const status = err.name === "KYC_REQUIRED" ? 403 : err.name === "OWNER_REQUIRED" ? 403 : err.name === "MODERATION_BLOCKED" ? 422 : 400;
  res.status(status).json({ message: err.message, kycRequired: err.name === "KYC_REQUIRED" });
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, name: "Koramoy", starRate: "100 estrellas = 1 USD" });
});

app.post("/auth/register", async (req, res) => {
  try {
    const input = z.object({ email: z.string().email(), password: z.string().min(8), displayName: z.string().min(2) }).parse(req.body);
    const effectiveOwner = ownerConfig.passwordHash ? ownerConfig : undefined;
    const user = await createUser(repo, input, effectiveOwner);
    res.status(201).json({ user });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const input = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const user = await validateCredentials(repo, input.email, input.password);
    if (!user) {
      res.status(401).json({ message: "Credenciales inválidas." });
      return;
    }
    const { challenge, code } = await createOtp(repo, user.id, otpTtlMinutes);
    await sendOtpEmail(user.email, code);
    res.json({ challengeId: challenge.id, message: "OTP enviado al correo registrado." });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/auth/verify-otp", async (req, res) => {
  try {
    const input = z.object({ challengeId: z.string(), code: z.string().length(6) }).parse(req.body);
    const token = await verifyOtp(repo, jwtSecret, input.challengeId, input.code);
    const user = getUserFromToken(repo, token);
    res.json({ token, user: user ? sanitizeUser(user) : null });
  } catch (error) {
    handleError(res, error);
  }
});

app.get("/me", auth, (_req, res) => {
  res.json({ user: sanitizeUser(res.locals.user) });
});

app.put("/me", auth, (req, res) => {
  const user = res.locals.user as User;
  const input = z.object({ displayName: z.string().min(2).optional(), bio: z.string().max(280).optional(), city: z.string().optional() }).parse(req.body);
  Object.assign(user, input);
  io.emit("profile:update", sanitizeUser(user));
  res.json({ user: sanitizeUser(user) });
});

app.post("/me/kyc", auth, upload.single("document"), (req, res) => {
  const user = res.locals.user as User;
  if (!req.file) {
    res.status(400).json({ message: "Adjunta una imagen o PDF de tu cédula ecuatoriana." });
    return;
  }
  user.kycStatus = "verified";
  user.kycDocumentUrl = `/uploads/${req.file.filename}`;
  io.emit("kyc:verified", { userId: user.id });
  res.json({ user: sanitizeUser(user), banner: "Identidad verificada. Ya puedes comprar, vender, donar y comentar." });
});

app.get("/campaigns", (_req, res) => {
  res.json({ campaigns: repo.campaigns });
});

app.post("/campaigns", auth, (req, res) => {
  try {
    const input = z
      .object({
        title: z.string().min(5),
        description: z.string().min(12),
        tags: z.array(z.string()).default([]),
        mediaUrl: z.string().url().optional(),
        goalUsd: z.number().positive(),
      })
      .parse(req.body);
    const campaign = createCampaign(repo, res.locals.user, input);
    io.emit("campaign:create", campaign);
    res.status(201).json({ campaign });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/campaigns/:id/reactions", auth, (req, res) => {
  try {
    const input = z.object({ reaction: z.enum(["like", "love", "angry"]) }).parse(req.body);
    const reaction = addReaction(repo, res.locals.user, req.params.id, input.reaction);
    io.emit("campaign:reaction", reaction);
    res.json({ reaction });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/campaigns/:id/comments", auth, (req, res) => {
  try {
    const input = z.object({ body: z.string().min(1).max(500) }).parse(req.body);
    const comment = commentOnCampaign(repo, res.locals.user, req.params.id, input.body, forbiddenWords);
    io.emit("campaign:comment", comment);
    res.status(201).json({ comment });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/stars/purchase", auth, (req, res) => {
  try {
    const input = z.object({ usdAmount: z.number().positive() }).parse(req.body);
    const transaction = purchaseStars(repo, res.locals.user, input.usdAmount);
    io.emit("stars:purchase", { userId: res.locals.user.id, stars: transaction.stars });
    res.json({ transaction, ownerSettlement: getOwnerSettlementConfig() });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/campaigns/:id/donate", auth, (req, res) => {
  try {
    const input = z.object({ stars: z.number().int().positive() }).parse(req.body);
    const result = donateStars(repo, res.locals.user, req.params.id, input.stars);
    io.emit("campaign:donation", result);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/campaigns/:id/withdrawals", auth, (req, res) => {
  try {
    const withdrawal = requestWithdrawal(repo, res.locals.user, req.params.id);
    io.emit("owner:withdrawal-alert", withdrawal);
    res.status(202).json({ withdrawal, message: "Retiro bloqueado para revisión manual del propietario." });
  } catch (error) {
    handleError(res, error);
  }
});

app.get("/owner/campaigns/:id/analytics", auth, (req, res) => {
  try {
    res.json({ analytics: getCampaignAnalytics(repo, res.locals.user, req.params.id) });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/support/tickets", auth, (req, res) => {
  try {
    const input = z.object({ subject: z.string().min(3), body: z.string().min(8) }).parse(req.body);
    const ticket = { id: randomUUID(), userId: res.locals.user.id, status: "open" as const, createdAt: new Date().toISOString(), ...input };
    repo.tickets.push(ticket);
    io.emit("support:ticket", ticket);
    res.status(201).json({ ticket });
  } catch (error) {
    handleError(res, error);
  }
});

app.post("/friends/:receiverId", auth, (req, res) => {
  const row = { id: randomUUID(), requesterId: res.locals.user.id, receiverId: req.params.receiverId, status: "pending" as const };
  repo.friendships.push(row);
  io.emit("friends:request", row);
  res.status(201).json({ friendship: row });
});

app.post("/stories", auth, upload.single("media"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "Adjunta foto o video para la historia." });
    return;
  }
  const story = {
    id: randomUUID(),
    userId: res.locals.user.id,
    mediaUrl: `/uploads/${req.file.filename}`,
    caption: String(req.body.caption ?? ""),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
  };
  repo.stories.push(story);
  io.emit("story:create", story);
  res.status(201).json({ story });
});

io.on("connection", (socket) => {
  socket.emit("activity:online", { users: repo.users.filter((user) => !user.isBanned).map(sanitizeUser) });
});

function getOwnerSettlementConfig() {
  return {
    paypalEmail: process.env.OWNER_PAYPAL_EMAIL ?? "colorin1992@gmail.com",
    binanceEmail: process.env.OWNER_BINANCE_EMAIL ?? "colorin1992@gmail.com",
    binancePayId: process.env.OWNER_BINANCE_PAY_ID ?? "442217844",
    bank: {
      name: process.env.OWNER_BANK_NAME ?? "Banco Pichincha",
      accountType: process.env.OWNER_BANK_ACCOUNT_TYPE ?? "Ahorros",
      accountNumber: process.env.OWNER_BANK_ACCOUNT_NUMBER ?? "2211373650",
    },
  };
}

const port = Number(process.env.PORT ?? 8787);
if (process.env.NODE_ENV !== "test") {
  httpServer.listen(port, () => {
    console.info(`Koramoy API escuchando en http://localhost:${port}`);
    console.info(`KYC guard activo: ${KYC_BLOCK_MESSAGE}`);
  });
}

export { app, httpServer, repo };
