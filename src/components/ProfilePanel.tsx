import { BadgeCheck, Cat, FileImage, IdCard, LockKeyhole, PencilLine, PlusCircle } from "lucide-react";
import type { UserProfile } from "../types";

type ProfilePanelProps = {
  profile: UserProfile;
};

export function ProfilePanel({ profile }: ProfilePanelProps) {
  const kycBlocked = profile.kycStatus !== "verificado";

  return (
    <section className="profile-panel" id="perfil">
      <div className="section-heading">
        <span>Perfil ciudadano</span>
        <h3>{profile.name}</h3>
      </div>

      <div className="profile-hero">
        <div className="avatar">AM</div>
        <div>
          <p>{profile.email}</p>
          <strong>Top Donante {profile.publicBadge}</strong>
          <small>{profile.starsBalance.toLocaleString("es-EC")} estrellas disponibles</small>
        </div>
      </div>

      <div className="profile-grid">
        <article className={`profile-action ${kycBlocked ? "profile-action--locked" : ""}`}>
          <IdCard />
          <strong>Verificacion KYC con cedula</strong>
          <p>
            Obligatoria para publicar campanas o solicitar retiros. Sube foto frontal y posterior de
            cedula ecuatoriana.
          </p>
          <button type="button">{kycBlocked ? "Subir cedula" : "Verificado"}</button>
        </article>

        <article className="profile-action">
          <PencilLine />
          <strong>Editar cuenta personal</strong>
          <p>Administra datos personales, correo, seguridad y notificaciones push.</p>
          <button type="button">Configurar</button>
        </article>

        <article className={`profile-action ${kycBlocked ? "profile-action--locked" : ""}`}>
          {kycBlocked ? <LockKeyhole /> : <PlusCircle />}
          <strong>Creador de causas</strong>
          <p>Sube fotos, videos HD y texto detallado de por que necesitas fondos.</p>
          <button type="button">{kycBlocked ? "Bloqueado por KYC" : "Crear campana"}</button>
        </article>

        <article className="profile-action profile-action--adoption">
          <Cat />
          <strong>Adopciones responsables</strong>
          <p>Publica mascotas en adopcion sin costo con fotos, videos y formulario responsable.</p>
          <button type="button">Poner mascota en adopcion</button>
        </article>

        <article className="profile-action">
          <BadgeCheck />
          <strong>Datos bancarios verificados</strong>
          <p>Banco, tipo de cuenta, numero, cedula, PayPal, celular y Deuna.</p>
          <button type="button">Agregar cuentas</button>
        </article>

        <article className="profile-action">
          <FileImage />
          <strong>Evidencias de impacto</strong>
          <p>Gestiona Historias de Exito con facturas, compras y entregas publicas.</p>
          <button type="button">Subir evidencia</button>
        </article>
      </div>
    </section>
  );
}
