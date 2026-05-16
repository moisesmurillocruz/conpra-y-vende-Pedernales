import { useMemo, useState } from "react";
import { Bell, Home, ShieldCheck, UserRound } from "lucide-react";
import { seedCampaigns, demoProfile } from "./data/campaigns";
import type { Campaign, UserProfile } from "./types";
import { usdToStars, createWithdrawalAlert, resolveDonorBadge } from "./services/stars";
import { useParallax } from "./hooks/useParallax";
import { Logo } from "./components/Logo";
import { CampaignCard } from "./components/CampaignCard";
import { DonationSheet } from "./components/DonationSheet";
import { EvidencePanel } from "./components/EvidencePanel";
import { ProfilePanel } from "./components/ProfilePanel";
import { OwnerDashboard } from "./components/OwnerDashboard";
import "./styles.css";

type View = "feed" | "perfil" | "evidencias" | "admin";

export default function App() {
  const [view, setView] = useState<View>("feed");
  const [campaigns, setCampaigns] = useState(seedCampaigns);
  const [selectedCampaignId, setSelectedCampaignId] = useState(seedCampaigns[0].id);
  const [amountUsd, setAmountUsd] = useState(10);
  const [celebratingCampaignId, setCelebratingCampaignId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>(demoProfile);
  const tilt = useParallax();

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? campaigns[0],
    [campaigns, selectedCampaignId],
  );

  const orderedCampaigns = useMemo(
    () => [...campaigns].sort((a, b) => Number(b.isPinnedByOwner) - Number(a.isPinnedByOwner)),
    [campaigns],
  );

  const handleSelectCampaign = (campaign: Campaign) => {
    setSelectedCampaignId(campaign.id);
    setView("evidencias");
  };

  const handleDonateStars = () => {
    const stars = usdToStars(amountUsd);
    setCampaigns((currentCampaigns) =>
      currentCampaigns.map((campaign) =>
        campaign.id === selectedCampaign.id
          ? {
              ...campaign,
              raisedStars: campaign.raisedStars + stars,
              likes: campaign.likes + 1,
            }
          : campaign,
      ),
    );
    setProfile((currentProfile) => ({
      ...currentProfile,
      starsBalance: Math.max(0, currentProfile.starsBalance - stars),
      publicBadge: resolveDonorBadge(stars + currentProfile.starsBalance),
    }));
    setCelebratingCampaignId(selectedCampaign.id);
    window.setTimeout(() => setCelebratingCampaignId(null), 1400);
  };

  const simulateWithdrawalReview = () => {
    const verifiedProfile = {
      ...profile,
      kycStatus: "verificado" as const,
      bankAccountVerified: true,
    };
    const alert = createWithdrawalAlert(verifiedProfile, selectedCampaign.id, selectedCampaign.raisedStars);
    setProfile((currentProfile) => ({
      ...verifiedProfile,
      withdrawalAlerts: [alert, ...currentProfile.withdrawalAlerts],
    }));
    setView("admin");
  };

  return (
    <div className="app-shell">
      <div className="splash-card" aria-label="Pantalla de carga Coramoy">
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
            <h1>Apoya causas verificadas con estrellas, transferencias y evidencias publicas.</h1>
          </div>
          <ShieldCheck />
        </section>

        <nav className="segment-nav" aria-label="Navegacion principal">
          <button type="button" className={view === "feed" ? "active" : ""} onClick={() => setView("feed")}>
            Inicio
          </button>
          <button
            type="button"
            className={view === "evidencias" ? "active" : ""}
            onClick={() => setView("evidencias")}
          >
            Evidencias
          </button>
          <button type="button" className={view === "perfil" ? "active" : ""} onClick={() => setView("perfil")}>
            Perfil
          </button>
          <button type="button" className={view === "admin" ? "active" : ""} onClick={() => setView("admin")}>
            Admin
          </button>
        </nav>

        {view === "feed" && (
          <div className="feed-view">
            <div className="section-heading">
              <span>Feed nacional</span>
              <h3>Recaudaciones activas</h3>
            </div>
            {orderedCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                isSelected={campaign.id === selectedCampaign.id}
                tilt={tilt}
                onSelect={handleSelectCampaign}
              />
            ))}
          </div>
        )}

        {view === "evidencias" && (
          <div className="detail-view">
            <CampaignCard campaign={selectedCampaign} isSelected tilt={tilt} onSelect={handleSelectCampaign} />
            <DonationSheet
              campaign={selectedCampaign}
              amountUsd={amountUsd}
              onAmountChange={setAmountUsd}
              onDonateStars={handleDonateStars}
              isCelebrating={celebratingCampaignId === selectedCampaign.id}
            />
            <EvidencePanel campaign={selectedCampaign} />
            <button type="button" className="review-button" onClick={simulateWithdrawalReview}>
              Simular solicitud de retiro con revision del propietario
            </button>
          </div>
        )}

        {view === "perfil" && <ProfilePanel profile={profile} />}
        {view === "admin" && <OwnerDashboard alerts={profile.withdrawalAlerts} />}

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
