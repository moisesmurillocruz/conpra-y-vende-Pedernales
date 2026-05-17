import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Bell,
  Camera,
  ChartNoAxesCombined,
  Heart,
  Home,
  IdCard,
  LockKeyhole,
  MessageCircle,
  Radio,
  Send,
  ShieldCheck,
  Star,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import { useParallax } from "./hooks/useParallax";
import { Logo } from "./components/Logo";
import { API_URL, ApiCampaign, ApiError, ApiUser, apiRequest, uploadFile } from "./api";
import "./styles.css";

type View = "feed" | "crear" | "perfil" | "soporte";
type AuthStep = "register" | "login" | "otp" | "app";

export default function App() {
  const [authStep, setAuthStep] = useState<AuthStep>("register");
  const [token, setToken] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [user, setUser] = useState<ApiUser | null>(null);
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([]);
  const [view, setView] = useState<View>("feed");
  const [notice, setNotice] = useState("Conectando con backend Koramoy...");
  const [blockedMessage, setBlockedMessage] = useState("");
  const [celebrating, setCelebrating] = useState(false);
  const tilt = useParallax();

  useEffect(() => {
    apiRequest<{ campaigns: ApiCampaign[] }>("/campaigns")
      .then((payload) => {
        setCampaigns(payload.campaigns);
        setNotice(payload.campaigns.length ? "Feed en tiempo real sincronizado." : "Aún no hay campañas reales publicadas.");
      })
      .catch(() => setNotice(`API no disponible en ${API_URL}. Inicia npm run dev:api para operar el sistema.`));
  }, []);

  const liveUsers = useMemo(() => (user ? [user.displayName, "Moderación", "Soporte"] : ["Esperando sesión"]), [user]);

  const handleApiError = (error: unknown) => {
    const message = error instanceof Error ? error.message : "Operación rechazada.";
    if (error instanceof ApiError && error.kycRequired) {
      setBlockedMessage(message);
      return;
    }
    setNotice(message);
  };

  const refreshCampaigns = async () => {
    const payload = await apiRequest<{ campaigns: ApiCampaign[] }>("/campaigns");
    setCampaigns(payload.campaigns);
  };

  if (authStep !== "app") {
    return (
      <div className="app-shell">
        <main className="phone-frame auth-frame">
          <div className="splash-card" aria-label="Pantalla de carga Koramoy">
            <Logo />
            <span>2FA obligatorio</span>
          </div>
          <header className="topbar">
            <Logo />
            <ShieldCheck />
          </header>
          <section className="hero-card">
            <div>
              <span>Koramoy seguro</span>
              <h1>Registro, login y verificación OTP antes de abrir la sesión.</h1>
            </div>
            <LockKeyhole />
          </section>
          {authStep === "register" && (
            <AuthForm
              title="Crear cuenta real"
              submitLabel="Registrarme"
              onSubmit={async (form) => {
                await apiRequest("/auth/register", {
                  method: "POST",
                  body: JSON.stringify({ email: form.email, password: form.password, displayName: form.displayName }),
                });
                setNotice("Cuenta creada. Inicia sesión para recibir tu OTP.");
                setAuthStep("login");
              }}
              onSwitch={() => setAuthStep("login")}
              switchLabel="Ya tengo cuenta"
              onError={handleApiError}
            />
          )}
          {authStep === "login" && (
            <AuthForm
              title="Iniciar sesión"
              submitLabel="Enviar OTP"
              hideName
              onSubmit={async (form) => {
                const payload = await apiRequest<{ challengeId: string; message: string }>("/auth/login", {
                  method: "POST",
                  body: JSON.stringify({ email: form.email, password: form.password }),
                });
                setChallengeId(payload.challengeId);
                setNotice(payload.message);
                setAuthStep("otp");
              }}
              onSwitch={() => setAuthStep("register")}
              switchLabel="Crear cuenta"
              onError={handleApiError}
            />
          )}
          {authStep === "otp" && (
            <OtpForm
              onSubmit={async (code) => {
                const payload = await apiRequest<{ token: string; user: ApiUser }>("/auth/verify-otp", {
                  method: "POST",
                  body: JSON.stringify({ challengeId, code }),
                });
                setToken(payload.token);
                setUser(payload.user);
                setAuthStep("app");
                setNotice("Sesión validada con 2FA.");
              }}
              onError={handleApiError}
            />
          )}
          <p className="system-notice">{notice}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="splash-card" aria-label="Pantalla de carga Koramoy">
        <Logo />
        <span>100 Estrellas = 1 USD</span>
      </div>

      <main className="phone-frame">
        <header className="topbar">
          <Logo />
          <button type="button" className="icon-button" aria-label="Notificaciones">
            <Bell />
          </button>
        </header>

        <section className="hero-card">
          <div>
            <span>Impacto social en Ecuador</span>
            <h1>Feed real conectado a backend, KYC, sockets y economía de estrellas.</h1>
          </div>
          <ShieldCheck />
        </section>

        <nav className="segment-nav" aria-label="Navegacion principal">
          <button type="button" className={view === "feed" ? "active" : ""} onClick={() => setView("feed")}>
            Inicio
          </button>
          <button
            type="button"
            className={view === "crear" ? "active" : ""}
            onClick={() => setView("crear")}
          >
            Crear
          </button>
          <button type="button" className={view === "perfil" ? "active" : ""} onClick={() => setView("perfil")}>
            Perfil
          </button>
          <button type="button" className={view === "soporte" ? "active" : ""} onClick={() => setView("soporte")}>
            Soporte
          </button>
        </nav>

        {blockedMessage && <KycModal message={blockedMessage} onClose={() => setBlockedMessage("")} />}
        <p className="system-notice">{notice}</p>

        {view === "feed" && (
          <div className="feed-view">
            <div className="section-heading">
              <span>Feed global en tiempo real</span>
              <h3>Campañas reales</h3>
            </div>
            <LiveDirectory users={liveUsers} />
            {campaigns.length === 0 && <EmptyState />}
            {campaigns.map((campaign) => (
              <RealCampaignCard
                key={campaign.id}
                campaign={campaign}
                tilt={tilt}
                celebrating={celebrating}
                onDonate={async () => {
                  try {
                    await apiRequest(`/campaigns/${campaign.id}/donate`, {
                      method: "POST",
                      body: JSON.stringify({ stars: 100 }),
                    }, token);
                    setCelebrating(true);
                    window.setTimeout(() => setCelebrating(false), 1200);
                    await refreshCampaigns();
                  } catch (error) {
                    handleApiError(error);
                  }
                }}
                onReact={async (reaction) => {
                  try {
                    await apiRequest(`/campaigns/${campaign.id}/reactions`, {
                      method: "POST",
                      body: JSON.stringify({ reaction }),
                    }, token);
                    setNotice("Reacción guardada y enviada por socket.");
                  } catch (error) {
                    handleApiError(error);
                  }
                }}
                onComment={async (body) => {
                  try {
                    await apiRequest(`/campaigns/${campaign.id}/comments`, {
                      method: "POST",
                      body: JSON.stringify({ body }),
                    }, token);
                    setNotice("Comentario publicado en tiempo real.");
                  } catch (error) {
                    handleApiError(error);
                  }
                }}
              />
            ))}
          </div>
        )}

        {view === "crear" && (
          <CreateCampaignPanel
            token={token}
            onCreated={async () => {
              await refreshCampaigns();
              setView("feed");
              setNotice("Campaña creada en la base de datos.");
            }}
            onError={handleApiError}
          />
        )}

        {view === "perfil" && user && (
          <ProfilePanelReal
            user={user}
            token={token}
            onKyc={async (file) => {
              const payload = await uploadFile<{ user: ApiUser; banner: string }>("/me/kyc", file, token);
              setUser(payload.user);
              setNotice(payload.banner);
            }}
            onError={handleApiError}
          />
        )}

        {view === "soporte" && <SupportPanel token={token} onError={handleApiError} />}

        <footer className="bottom-nav" aria-label="Barra de navegacion">
          <button type="button" className={view === "feed" ? "active" : ""} onClick={() => setView("feed")}>
            <Home /> Inicio
          </button>
          <button type="button" className={view === "perfil" ? "active" : ""} onClick={() => setView("perfil")}>
            <UserRound /> Perfil
          </button>
        </footer>
      </main>
    </div>
  );
}

function AuthForm({
  title,
  submitLabel,
  hideName,
  switchLabel,
  onSubmit,
  onSwitch,
  onError,
}: {
  title: string;
  submitLabel: string;
  hideName?: boolean;
  switchLabel: string;
  onSubmit: (form: { email: string; password: string; displayName: string }) => Promise<void>;
  onSwitch: () => void;
  onError: (error: unknown) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await onSubmit({ email, password, displayName });
    } catch (error) {
      onError(error);
    }
  };

  return (
    <form className="form-card" onSubmit={submit}>
      <h2>{title}</h2>
      {!hideName && <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Nombre público" />}
      <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Correo electrónico" type="email" />
      <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña segura" type="password" />
      <button className="donate-button" type="submit">{submitLabel}</button>
      <button className="ghost-button" type="button" onClick={onSwitch}>{switchLabel}</button>
    </form>
  );
}

function OtpForm({ onSubmit, onError }: { onSubmit: (code: string) => Promise<void>; onError: (error: unknown) => void }) {
  const [code, setCode] = useState("");
  return (
    <form
      className="form-card"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await onSubmit(code);
        } catch (error) {
          onError(error);
        }
      }}
    >
      <h2>Verificación 2FA</h2>
      <p>Ingresa el token OTP de 6 dígitos enviado por correo. En desarrollo aparece en la consola del backend.</p>
      <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Código OTP" inputMode="numeric" />
      <button className="donate-button" type="submit">Validar y entrar</button>
    </form>
  );
}

function EmptyState() {
  return (
    <section className="empty-state">
      <Radio />
      <h2>Sin contenido falso</h2>
      <p>El feed inicia vacío hasta que un usuario verificado cree una campaña real desde el backend.</p>
    </section>
  );
}

function LiveDirectory({ users }: { users: string[] }) {
  return (
    <section className="live-directory">
      <strong><Users /> Actividad en vivo</strong>
      <div>{users.map((name) => <span key={name}>{name}</span>)}</div>
    </section>
  );
}

function RealCampaignCard({
  campaign,
  tilt,
  celebrating,
  onDonate,
  onReact,
  onComment,
}: {
  campaign: ApiCampaign;
  tilt: { rotateX: number; rotateY: number };
  celebrating: boolean;
  onDonate: () => void;
  onReact: (reaction: "like" | "love" | "angry") => void;
  onComment: (body: string) => void;
}) {
  const [comment, setComment] = useState("");
  const percentage = Math.min(100, Math.round((campaign.raisedStars / 100 / campaign.goalUsd) * 100));
  return (
    <article className="campaign-card" style={{ transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateZ(16px)` }}>
      {campaign.mediaUrl ? (
        <button className="campaign-card__media" type="button">
          <img src={campaign.mediaUrl} alt={campaign.title} />
          <span className="campaign-card__category">Real</span>
        </button>
      ) : (
        <div className="campaign-placeholder"><Camera /> Multimedia pendiente</div>
      )}
      <div className="campaign-card__body">
        <div className="ticker">{campaign.tags.map((tag) => `#${tag}`).join("   •   ") || "#koramoy #ecuador #solidaridad"}</div>
        <h2>{campaign.title}</h2>
        <p>{campaign.description}</p>
        <div className="progress3d">
          <div className="progress3d__meta"><span>${(campaign.raisedStars / 100).toLocaleString("es-EC")}</span><span>Meta ${campaign.goalUsd}</span></div>
          <div className="progress3d__track"><span style={{ width: `${percentage}%` }} /></div>
          <div className="progress3d__footer"><strong>{percentage}%</strong><small>{campaign.raisedStars.toLocaleString("es-EC")} estrellas</small></div>
        </div>
        <div className="social-actions">
          <button type="button" onClick={() => onReact("like")}><Heart /> Like</button>
          <button type="button" onClick={() => onReact("love")}>😍 Me encanta</button>
          <button type="button" onClick={() => onReact("angry")}>😡 Me enoja</button>
        </div>
        <div className="comment-box">
          <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Comentar con moderación automática" />
          <button type="button" onClick={() => { onComment(comment); setComment(""); }}><MessageCircle /></button>
        </div>
        <button className="donate-button" type="button" onClick={onDonate}><Star fill="currentColor" /> Donar 100 estrellas</button>
      </div>
      <div className={`celebration ${celebrating ? "celebration--active" : ""}`} aria-hidden="true"><span>★</span><span>★</span><span>★</span></div>
    </article>
  );
}

function CreateCampaignPanel({ token, onCreated, onError }: { token: string; onCreated: () => Promise<void>; onError: (error: unknown) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalUsd, setGoalUsd] = useState(100);
  const [tags, setTags] = useState("");
  return (
    <form
      className="form-card"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await apiRequest("/campaigns", {
            method: "POST",
            body: JSON.stringify({ title, description, goalUsd, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean) }),
          }, token);
          await onCreated();
        } catch (error) {
          onError(error);
        }
      }}
    >
      <h2>Crear recaudación verificada</h2>
      <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título de la causa" />
      <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descripción detallada" />
      <input value={goalUsd} onChange={(event) => setGoalUsd(Number(event.target.value))} type="number" min="1" />
      <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="etiquetas separadas por coma" />
      <button className="donate-button" type="submit">Publicar en base de datos</button>
    </form>
  );
}

function ProfilePanelReal({ user, token, onKyc, onError }: { user: ApiUser; token: string; onKyc: (file: File) => Promise<void>; onError: (error: unknown) => void }) {
  return (
    <section className="profile-panel" id="perfil">
      <div className="section-heading"><span>Perfil autónomo</span><h3>{user.displayName}</h3></div>
      <div className="profile-hero">
        <div className="avatar">{user.displayName.slice(0, 2).toUpperCase()}</div>
        <div><p>{user.email}</p><strong>Top Donante {user.donorBadge}</strong><small>{user.starsBalance.toLocaleString("es-EC")} estrellas</small></div>
      </div>
      <div className="profile-grid">
        <label className="profile-action">
          <IdCard />
          <strong>{user.kycStatus === "verified" ? "KYC verificado con visto azul" : "Subir cédula ecuatoriana"}</strong>
          <p>Imagen o PDF guardado por el backend. Al completarse desbloquea compras, donaciones y comentarios.</p>
          <input type="file" accept="image/*,application/pdf" onChange={(event) => event.target.files?.[0] && onKyc(event.target.files[0]).catch(onError)} />
        </label>
        <ProfileFeature icon={<Camera />} title="Publicaciones multimedia" body="Fotos, videos HD y publicaciones del perfil conectadas por API." />
        <ProfileFeature icon={<Radio />} title="Transmisiones 9:16" body="Módulo preparado para lives verticales con chat superpuesto vía sockets." />
        <ProfileFeature icon={<Users />} title="Red social y amigos" body="Solicitudes de amistad, aceptación y lista de contactos." />
        <ProfileFeature icon={<Ticket />} title="Soporte técnico" body="Tickets integrados al panel del administrador." />
        {user.role === "owner" && <OwnerControls token={token} />}
      </div>
    </section>
  );
}

function ProfileFeature({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return <article className="profile-action">{icon}<strong>{title}</strong><p>{body}</p><button type="button">Abrir módulo</button></article>;
}

function OwnerControls({ token }: { token: string }) {
  return (
    <article className="profile-action owner-control">
      <ChartNoAxesCombined />
      <strong>Panel propietario integrado</strong>
      <p>Analíticas, alertas de retiro, moderación y sanciones solo aparecen con rol owner validado por backend.</p>
      <small>Token activo: {token.slice(0, 12)}...</small>
    </article>
  );
}

function SupportPanel({ token, onError }: { token: string; onError: (error: unknown) => void }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  return (
    <form
      className="form-card"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await apiRequest("/support/tickets", { method: "POST", body: JSON.stringify({ subject, body }) }, token);
          setSubject("");
          setBody("");
        } catch (error) {
          onError(error);
        }
      }}
    >
      <h2>Soporte técnico</h2>
      <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Asunto" />
      <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Reporte o consulta" />
      <button className="donate-button" type="submit"><Send /> Crear ticket</button>
    </form>
  );
}

function KycModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="kyc-modal" role="dialog" aria-modal="true">
      <div>
        <BadgeCheck />
        <h2>Verificación obligatoria</h2>
        <p>{message}</p>
        <button className="donate-button" type="button" onClick={onClose}>Entendido</button>
      </div>
    </div>
  );
}
