import { Heart, MessageCircle, Send, ShieldCheck, Sparkles } from "lucide-react";
import type { Campaign } from "../types";
import type { ParallaxTilt } from "../hooks/useParallax";
import { Progress3D } from "./Progress3D";

type CampaignCardProps = {
  campaign: Campaign;
  isSelected: boolean;
  tilt: ParallaxTilt;
  onSelect: (campaign: Campaign) => void;
};

const categoryLabel = {
  abuelitos: "Abuelitos",
  salud: "Salud",
  animales: "Animales",
  adopcion: "Adopcion",
};

export function CampaignCard({ campaign, isSelected, tilt, onSelect }: CampaignCardProps) {
  return (
    <article
      className={`campaign-card ${isSelected ? "campaign-card--selected" : ""}`}
      style={{
        transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateZ(${
          isSelected ? 18 : 0
        }px)`,
      }}
    >
      <button type="button" className="campaign-card__media" onClick={() => onSelect(campaign)}>
        <img src={campaign.mediaUrl} alt={campaign.title} />
        <span className="campaign-card__category">{categoryLabel[campaign.category]}</span>
        {campaign.isPinnedByOwner && (
          <span className="campaign-card__pinned">
            <Sparkles size={16} /> Causa maestra
          </span>
        )}
      </button>

      <div className="campaign-card__body">
        <div className="campaign-card__creator">
          <span>{campaign.creator.name}</span>
          <small>{campaign.creator.city}</small>
          {campaign.creator.isKycVerified && <ShieldCheck aria-label="KYC verificado" />}
        </div>
        <h2>{campaign.title}</h2>
        <p>{campaign.description}</p>
        <Progress3D raisedStars={campaign.raisedStars} goalUsd={campaign.goalUsd} />

        <div className="social-actions" aria-label="Interacciones sociales">
          <button type="button">
            <Heart /> {campaign.likes.toLocaleString("es-EC")}
          </button>
          <button type="button">
            <MessageCircle /> {campaign.comments.toLocaleString("es-EC")}
          </button>
          <button type="button">
            <Send /> {campaign.shares.toLocaleString("es-EC")}
          </button>
        </div>
      </div>
    </article>
  );
}
