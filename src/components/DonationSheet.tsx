import { Banknote, CreditCard, QrCode, Smartphone, Star } from "lucide-react";
import type { Campaign } from "../types";
import { usdToStars } from "../services/stars";

type DonationSheetProps = {
  campaign: Campaign;
  amountUsd: number;
  onAmountChange: (amount: number) => void;
  onDonateStars: () => void;
  isCelebrating: boolean;
};

const methodIcon = {
  bank: Banknote,
  mobile: Smartphone,
  paypal: CreditCard,
  deuna: QrCode,
};

export function DonationSheet({
  campaign,
  amountUsd,
  onAmountChange,
  onDonateStars,
  isCelebrating,
}: DonationSheetProps) {
  const stars = amountUsd > 0 ? usdToStars(amountUsd) : 0;

  return (
    <section className="donation-sheet" aria-label="Opciones de donacion">
      <header>
        <p>Donacion por Estrellas</p>
        <h3>{campaign.title}</h3>
      </header>

      <label className="amount-box">
        <span>Monto a apoyar</span>
        <div>
          <strong>$</strong>
          <input
            type="number"
            min="1"
            value={amountUsd}
            onChange={(event) => onAmountChange(Number(event.target.value))}
            aria-label="Monto en dolares"
          />
        </div>
      </label>

      <div className="stars-exchange">
        <Star fill="currentColor" />
        <span>100 Estrellas = 1 USD</span>
        <strong>{stars.toLocaleString("es-EC")} estrellas</strong>
      </div>

      <button className="donate-button" type="button" onClick={onDonateStars}>
        <Star fill="currentColor" />
        Comprar y donar estrellas
      </button>

      <div className={`celebration ${isCelebrating ? "celebration--active" : ""}`} aria-hidden="true">
        <span>★</span>
        <span>★</span>
        <span>★</span>
      </div>

      <div className="direct-payments">
        <h4>Donacion directa banco a banco</h4>
        {campaign.paymentMethods.map((method) => {
          const Icon = methodIcon[method.kind];
          return (
            <article key={method.label} className="payment-card">
              <Icon />
              <div>
                <strong>{method.label}</strong>
                <p>{method.details}</p>
                <small>{method.helper}</small>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
