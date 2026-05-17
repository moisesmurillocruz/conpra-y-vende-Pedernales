type LogoProps = {
  compact?: boolean;
};

export function Logo({ compact = false }: LogoProps) {
  return (
    <div className={`logo ${compact ? "logo--compact" : ""}`} aria-label="Koramoy">
      <img src={compact ? "/koramoy-icon.png" : "/koramoy-logo.png"} alt="Koramoy" />
    </div>
  );
}
