import { type CSSProperties, useEffect, useMemo, useState } from 'react'

type Category = {
  title: string
  description: string
  items: string[]
  accent: string
  stats: string
}

type Listing = {
  title: string
  price: string
  location: string
  tags: string[]
  seller: string
  reputation: number
  media: 'HD fotos' | 'Video vertical' | 'Tour 3D'
  image: string
}

type AdminState = 'idle' | 'granted' | 'denied'

type DepthStyle = CSSProperties & {
  '--rx': string
  '--ry': string
  '--mx': string
  '--my': string
}

const categories: Category[] = [
  {
    title: 'Bienes raices',
    description: 'Terrenos, fincas, mansiones y casas listas para compradores verificados.',
    items: ['Terrenos', 'Fincas', 'Mansiones', 'Casas'],
    accent: 'from-emerald',
    stats: '82 ofertas premium',
  },
  {
    title: 'Vehiculos',
    description: 'Carros, motos y bicicletas con reputacion visible del vendedor.',
    items: ['Carros', 'Motos', 'Bicicletas'],
    accent: 'from-gold',
    stats: '147 vehiculos activos',
  },
  {
    title: 'Accesorios',
    description: 'Repuestos, herramientas, cascos y componentes clasificados por categoria.',
    items: ['Repuestos', 'Herramientas', 'Cascos', 'Componentes'],
    accent: 'from-coral',
    stats: '316 productos',
  },
]

const listings: Listing[] = [
  {
    title: 'Finca panoramica con vista al mar',
    price: '$128,000',
    location: 'Cojimies - Pedernales',
    tags: ['finca', 'terreno', 'playa'],
    seller: 'Mariela Vera',
    reputation: 4.9,
    media: 'Tour 3D',
    image: 'radial-gradient(circle at 28% 22%, #d5fbe7, #49b587 25%, #135c49 56%, #08251f)',
  },
  {
    title: 'Moto adventure lista para ruta',
    price: '$4,850',
    location: 'Centro de Pedernales',
    tags: ['moto', 'casco', 'papeles'],
    seller: 'Jean Zambrano',
    reputation: 4.8,
    media: 'Video vertical',
    image: 'radial-gradient(circle at 24% 20%, #fff4bd, #d39b35 24%, #783b19 58%, #170c08)',
  },
  {
    title: 'Kit de herramientas profesional',
    price: '$320',
    location: 'La Chorrera',
    tags: ['herramientas', 'repuestos'],
    seller: 'Taller Norte',
    reputation: 4.7,
    media: 'HD fotos',
    image: 'radial-gradient(circle at 24% 24%, #ffe1d7, #eb7658 26%, #753132 58%, #16090d)',
  },
]

const reactions = [
  { label: 'Me gusta', value: '128k' },
  { label: 'Me encanta', value: '44k' },
  { label: 'Me enoja', value: '2k' },
]

const demoAdmin = {
  email: 'Colorin1992@gmail.com',
  password: 'Mundo2026',
}

function normalizeAdminEmail(value: string) {
  return value.trim().toLowerCase().replace(/\s+gmail\s+com$/, '@gmail.com')
}

function useDepthMotion() {
  const [style, setStyle] = useState<DepthStyle>({
    '--rx': '0deg',
    '--ry': '0deg',
    '--mx': '50%',
    '--my': '50%',
  })

  useEffect(() => {
    const updatePointer = (event: PointerEvent) => {
      const x = event.clientX / window.innerWidth
      const y = event.clientY / window.innerHeight

      setStyle({
        '--rx': `${(0.5 - y) * 14}deg`,
        '--ry': `${(x - 0.5) * 18}deg`,
        '--mx': `${x * 100}%`,
        '--my': `${y * 100}%`,
      })
    }

    const updateOrientation = (event: DeviceOrientationEvent) => {
      const gamma = Math.max(-35, Math.min(35, event.gamma ?? 0))
      const beta = Math.max(-35, Math.min(35, event.beta ?? 0))

      setStyle({
        '--rx': `${beta / -4}deg`,
        '--ry': `${gamma / 3}deg`,
        '--mx': `${50 + gamma}%`,
        '--my': `${50 + beta / 2}%`,
      })
    }

    window.addEventListener('pointermove', updatePointer)
    window.addEventListener('deviceorientation', updateOrientation)

    return () => {
      window.removeEventListener('pointermove', updatePointer)
      window.removeEventListener('deviceorientation', updateOrientation)
    }
  }, [])

  return style
}

function App() {
  const depthStyle = useDepthMotion()
  const [kycFile, setKycFile] = useState<File | null>(null)
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminState, setAdminState] = useState<AdminState>('idle')
  const [comments, setComments] = useState(['Disponible para entrega hoy en Pedernales?'])
  const [commentDraft, setCommentDraft] = useState('')
  const [listingTitle, setListingTitle] = useState('Terreno esquinero cerca al malecon')
  const [listingPrice, setListingPrice] = useState('45000')
  const [listingDescription, setListingDescription] = useState(
    'Lote alto con documentos al dia, acceso principal y espacio para proyecto turistico.',
  )
  const [tags, setTags] = useState('terreno playa inversion')

  const commission = useMemo(() => {
    const parsed = Number(listingPrice)
    return Number.isFinite(parsed) ? parsed * 0.2 : 0
  }, [listingPrice])

  const verified = Boolean(kycFile)
  const canPublish = verified && listingTitle.trim() && listingPrice.trim()

  const submitAdmin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const emailMatches = normalizeAdminEmail(adminEmail) === demoAdmin.email.toLowerCase()
    const passwordMatches = adminPassword === demoAdmin.password
    setAdminState(emailMatches && passwordMatches ? 'granted' : 'denied')
  }

  const addComment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!commentDraft.trim()) {
      return
    }

    setComments((current) => [commentDraft.trim(), ...current])
    setCommentDraft('')
  }

  return (
    <main className="app-shell" style={depthStyle}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <nav className="top-nav glass-card">
        <a className="brand" href="#inicio" aria-label="Inicio">
          <span className="brand-mark">CV</span>
          <span>
            Compra y venta
            <strong>Pedernales Ecuador</strong>
          </span>
        </a>
        <div className="nav-links" aria-label="Secciones principales">
          <a href="#kyc">KYC</a>
          <a href="#live">Live</a>
          <a href="#publicar">Publicar</a>
          <a href="#admin">Admin</a>
        </div>
      </nav>

      <section id="inicio" className="hero depth-stage">
        <div className="hero-copy">
          <p className="eyebrow">Marketplace premium de alta gama</p>
          <h1>Compra y vende en Pedernales con identidad verificada y experiencia 3D.</h1>
          <p className="hero-text">
            Interfaz con volumen profundo, texturas realistas, publicaciones HD, reputacion,
            transmisiones verticales, llamadas integradas y comision fija del 20%.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#publicar">Publicar producto</a>
            <a className="secondary-button" href="#live">Ver live shopping</a>
          </div>
          <div className="trust-row" aria-label="Indicadores de confianza">
            <span><strong>20%</strong> comision fija</span>
            <span><strong>HD</strong> fotos y video</span>
            <span><strong>KYC</strong> cedula Ecuador</span>
          </div>
        </div>

        <div className="phone-frame floating-card" aria-label="Vista movil premium">
          <div className="phone-notch" />
          <div className="live-badge">EN VIVO</div>
          <div className="product-orb" />
          <div className="phone-content">
            <p>Finca frente al mar</p>
            <h2>$128,000</h2>
            <span className="verified-chip">Visto azul verificado</span>
          </div>
          <div className="reaction-stack">
            {reactions.map((reaction) => (
              <span key={reaction.label}>{reaction.label}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="section-grid">
        {categories.map((category) => (
          <article className={`category-card glass-card ${category.accent}`} key={category.title}>
            <span className="card-stat">{category.stats}</span>
            <h2>{category.title}</h2>
            <p>{category.description}</p>
            <div className="pill-row">
              {category.items.map((item) => (
                <span className="pill" key={item}>{item}</span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="market-layout">
        <div>
          <p className="eyebrow">Catalogo inteligente</p>
          <h2>Publicaciones destacadas con busqueda por etiquetas corridas.</h2>
        </div>
        <div className="listing-grid">
          {listings.map((listing) => (
            <article className="listing-card" key={listing.title}>
              <div className="listing-art" style={{ background: listing.image }}>
                <span>{listing.media}</span>
              </div>
              <div className="listing-body">
                <h3>{listing.title}</h3>
                <p>{listing.location}</p>
                <div className="listing-meta">
                  <strong>{listing.price}</strong>
                  <span>{listing.reputation.toFixed(1)} reputacion</span>
                </div>
                <div className="seller-row">
                  <span className="avatar">{listing.seller.slice(0, 2)}</span>
                  <span>{listing.seller}</span>
                  <span className="blue-check" aria-label="Vendedor verificado" />
                </div>
                <div className="pill-row compact">
                  {listing.tags.map((tag) => (
                    <span className="pill" key={tag}>#{tag}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="kyc" className="split-section">
        <div className="glass-card form-card">
          <p className="eyebrow">Seguridad y registro KYC</p>
          <h2>Registro con datos reales y foto obligatoria de cedula.</h2>
          <label>
            Nombre legal completo
            <input placeholder="Ej. Ana Maria Zambrano" />
          </label>
          <label>
            Numero de cedula Ecuador
            <input inputMode="numeric" placeholder="1312345678" maxLength={10} />
          </label>
          <label className="file-drop">
            <span>{kycFile ? kycFile.name : 'Cargar foto frontal de cedula'}</span>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(event) => setKycFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <div className={`verification-panel ${verified ? 'is-verified' : ''}`}>
            <span className="blue-check large" />
            <div>
              <strong>{verified ? 'Verificacion automatica aprobada' : 'Pendiente de documento'}</strong>
              <p>
                {verified
                  ? 'El sistema activa visto azul al cargar el documento para este prototipo.'
                  : 'La foto de cedula es requerida para publicar, comentar y vender.'}
              </p>
            </div>
          </div>
        </div>

        <div className="profile-card">
          <div className="cover-preview">
            {coverPhoto ? coverPhoto.name : 'Foto de portada premium'}
          </div>
          <div className="profile-body">
            <label className="mini-upload">
              Portada
              <input type="file" accept="image/*" onChange={(event) => setCoverPhoto(event.target.files?.[0] ?? null)} />
            </label>
            <label className="mini-upload">
              Perfil
              <input type="file" accept="image/*" onChange={(event) => setProfilePhoto(event.target.files?.[0] ?? null)} />
            </label>
            <div className="profile-avatar">{profilePhoto ? 'OK' : 'PV'}</div>
            <h3>Perfil reputacional</h3>
            <p>Foto de perfil, portada, visto azul, ventas finalizadas y confianza publica.</p>
            <div className="score-board">
              <span><strong>4.9</strong> reputacion</span>
              <span><strong>98%</strong> entregas</span>
              <span><strong>23</strong> ventas</span>
            </div>
          </div>
        </div>
      </section>

      <section id="live" className="live-section">
        <div className="live-phone">
          <div className="stream-surface">
            <div className="stream-product" />
            <div className="stream-host">
              <span className="avatar">CM</span>
              <div>
                <strong>Colorin Market</strong>
                <p>Mostrando productos en vivo</p>
              </div>
            </div>
            <div className="stream-chat">
              <span>Cuanto cuesta el envio?</span>
              <span>Se ve nitido el producto.</span>
              <span>Tiene papeles al dia?</span>
            </div>
          </div>
        </div>
        <div className="live-copy">
          <p className="eyebrow">Comunicacion en tiempo real</p>
          <h2>Transmisiones verticales con chat, reacciones, llamadas y videollamadas HD.</h2>
          <p>
            El flujo esta preparado para conectar servicios WebRTC o proveedores de streaming:
            sala vertical, chat superpuesto, boton de llamada y video llamada dentro de la app.
          </p>
          <div className="call-panel glass-card">
            <button type="button">Iniciar llamada HD</button>
            <button type="button">Video llamada</button>
            <button type="button">Compartir live</button>
          </div>
        </div>
      </section>

      <section id="publicar" className="publisher-section">
        <div className="publisher-card glass-card">
          <p className="eyebrow">Motor de publicacion y social</p>
          <h2>Sube fotos HD, videos verticales, precio, descripcion y etiquetas.</h2>
          <div className="publisher-grid">
            <label>
              Titulo
              <input value={listingTitle} onChange={(event) => setListingTitle(event.target.value)} />
            </label>
            <label>
              Precio total
              <input
                inputMode="decimal"
                value={listingPrice}
                onChange={(event) => setListingPrice(event.target.value)}
              />
            </label>
            <label className="wide">
              Descripcion
              <textarea value={listingDescription} onChange={(event) => setListingDescription(event.target.value)} />
            </label>
            <label className="wide">
              Etiquetas corridas para busqueda
              <input value={tags} onChange={(event) => setTags(event.target.value)} />
            </label>
            <label className="file-drop wide">
              <span>Subir fotos HD o video vertical</span>
              <input type="file" accept="image/*,video/*" multiple />
            </label>
          </div>
          <div className="commission-box">
            <span>Comision fija 20%</span>
            <strong>${commission.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong>
          </div>
          <button className="primary-button publish-button" type="button" disabled={!canPublish}>
            {canPublish ? 'Publicar con visto azul' : 'Verifica KYC para publicar'}
          </button>
        </div>

        <aside className="social-card">
          <div className="share-strip">
            <button type="button">Compartir</button>
            {reactions.map((reaction) => (
              <button type="button" key={reaction.label}>
                {reaction.label}
                <span>{reaction.value}</span>
              </button>
            ))}
          </div>
          <form onSubmit={addComment} className="comment-box">
            <label htmlFor="comment">Caja de comentarios</label>
            <div>
              <input
                id="comment"
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder="Escribe una pregunta..."
              />
              <button type="submit">Enviar</button>
            </div>
          </form>
          <div className="comment-list">
            {comments.map((comment) => (
              <p key={comment}>{comment}</p>
            ))}
          </div>
        </aside>
      </section>

      <section id="admin" className="admin-section glass-card">
        <div>
          <p className="eyebrow">Acceso maestro super admin</p>
          <h2>Panel de control para auditoria, comisiones y moderacion.</h2>
          <p>
            Credenciales demo: usuario Colorin1992@gmail.com. En produccion debe migrarse a
            autenticacion de servidor, hash de claves, MFA y auditoria.
          </p>
        </div>
        <form className="admin-form" onSubmit={submitAdmin}>
          <label>
            Usuario
            <input
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
              placeholder="Colorin1992@gmail.com"
            />
          </label>
          <label>
            Clave
            <input
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              placeholder="Mundo2026"
            />
          </label>
          <button className="primary-button" type="submit">Entrar como super admin</button>
          {adminState === 'granted' && (
            <div className="admin-console">
              <strong>Acceso concedido</strong>
              <span>Ventas: $284,220</span>
              <span>Comisiones 20%: $56,844</span>
              <span>KYC automaticos: 1,284</span>
            </div>
          )}
          {adminState === 'denied' && <p className="error-text">Usuario o clave incorrectos.</p>}
        </form>
      </section>
    </main>
  )
}

export default App
