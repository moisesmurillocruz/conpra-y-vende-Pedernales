import { Camera, FileCheck2 } from "lucide-react";
import type { Campaign } from "../types";

type EvidencePanelProps = {
  campaign: Campaign;
};

export function EvidencePanel({ campaign }: EvidencePanelProps) {
  return (
    <section className="evidence-panel">
      <div className="section-heading">
        <span>Historias de Exito / Evidencias</span>
        <h3>Transparencia obligatoria del impacto</h3>
      </div>
      <p>
        Cada creador debe subir fotos, videos cortos, facturas o comprobantes que demuestren como se
        usaron los fondos entregados.
      </p>

      <div className="evidence-list">
        {campaign.evidences.map((evidence) => (
          <article key={evidence.id} className="evidence-card">
            <img src={evidence.mediaUrl} alt={evidence.title} />
            <div>
              <small>
                {evidence.type === "foto" ? <Camera size={14} /> : <FileCheck2 size={14} />}
                {evidence.type}
              </small>
              <strong>{evidence.title}</strong>
              <p>{evidence.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
