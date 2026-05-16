type LogoProps = {
  compact?: boolean;
};

export function Logo({ compact = false }: LogoProps) {
  return (
    <div className={`logo ${compact ? "logo--compact" : ""}`} aria-label="Coramoy">
      <div className="logo__heart" aria-hidden="true">
        <span />
      </div>
      {!compact && (
        <div>
          <strong>Coramoy</strong>
          <small>Donar con amor verificable</small>
        </div>
      )}
    </div>
  );
}
