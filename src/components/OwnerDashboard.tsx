import { BellRing, CircleDollarSign, ShieldAlert } from "lucide-react";
import type { WithdrawalAlert } from "../types";
import { starsToUsd } from "../services/stars";

type OwnerDashboardProps = {
  alerts: WithdrawalAlert[];
};

export function OwnerDashboard({ alerts }: OwnerDashboardProps) {
  return (
    <section className="owner-panel">
      <div className="section-heading">
        <span>Panel del propietario</span>
        <h3>Retiros bloqueados para revision manual</h3>
      </div>

      <div className="owner-stats">
        <article>
          <BellRing />
          <strong>{alerts.length}</strong>
          <span>alertas push listas</span>
        </article>
        <article>
          <ShieldAlert />
          <strong>30%</strong>
          <span>comision fija Koramoy</span>
        </article>
        <article>
          <CircleDollarSign />
          <strong>Manual</strong>
          <span>intercambio de estrellas por USD</span>
        </article>
      </div>

      {alerts.length === 0 ? (
        <p className="empty-alert">Sin retiros pendientes en esta sesion demo.</p>
      ) : (
        <div className="alerts-list">
          {alerts.map((alert) => (
            <article key={alert.id} className="alert-card">
              <strong>{alert.campaignId}</strong>
              <span>
                Solicitado ${starsToUsd(alert.requestedStars).toLocaleString("es-EC")} · Neto $
                {starsToUsd(alert.netStars).toLocaleString("es-EC")}
              </span>
              <small>Comision Koramoy: {alert.ownerCommissionStars.toLocaleString("es-EC")} estrellas</small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
