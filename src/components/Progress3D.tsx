import { calculateDonationProgress } from "../services/stars";

type Progress3DProps = {
  raisedStars: number;
  goalUsd: number;
};

export function Progress3D({ raisedStars, goalUsd }: Progress3DProps) {
  const progress = calculateDonationProgress(raisedStars, goalUsd);

  return (
    <div className="progress3d" aria-label={`Recaudado ${progress.percentage}%`}>
      <div className="progress3d__meta">
        <span>${progress.raisedUsd.toLocaleString("es-EC")} USD</span>
        <span>Meta ${goalUsd.toLocaleString("es-EC")}</span>
      </div>
      <div className="progress3d__track">
        <span style={{ width: `${progress.percentage}%` }} />
      </div>
      <div className="progress3d__footer">
        <strong>{progress.percentage}%</strong>
        <small>{progress.label}</small>
      </div>
    </div>
  );
}
