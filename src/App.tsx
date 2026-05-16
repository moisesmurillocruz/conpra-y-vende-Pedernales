import { type CSSProperties, useEffect, useMemo, useState } from 'react'

type Role = 'user' | 'owner'
type FeedTab = 'inicio' | 'perfil' | 'configuracion' | 'soporte'
type Reaction = 'Me gusta' | 'Me encanta' | 'Me enoja'
type Recommendation = 'recommended' | 'notRecommended'
type AuctionCategory = 'Vehiculos' | 'Bienes Raices' | 'Accesorios'

type DepthStyle = CSSProperties & {
  '--rx': string
  '--ry': string
  '--mx': string
  '--my': string
}

type Session = {
  email: string
  role: Role
}

type Category = {
  title: string
  description: string
  icon: string
  visualClass: string
  stats: string
}

type Seller = {
  id: string
  name: string
  initials: string
  active: string
  recommendations: Recommendation[]
  verified: boolean
}

type Listing = {
  id: string
  title: string
  price: number
  location: string
  description: string
  tags: string[]
  sellerId: string
  mediaType: 'Foto HD' | 'Video vertical' | 'Tour 3D'
  visual: string
  createdAt: string
}

type ModerationEvent = {
  id: number
  surface: 'comentario' | 'chat' | 'soporte'
  text: string
  reason: string
  at: string
}

type SupportTicket = {
  id: number
  number: string
  category: string
  contact: string
  message: string
  autoReply: string
  status: 'Recibido' | 'En revision' | 'Contactado'
  createdAt: string
}

type StatusPost = {
  id: string
  author: string
  text: string
  mediaType: 'Foto' | 'Video'
  reach: 50 | 100
  highlighted: boolean
  visual: string
}

type Auction = {
  id: string
  title: string
  category: AuctionCategory
  entryPrice: number
  directBuyPrice: number
  currentBid: number
  bids: { bidder: string; amount: number }[]
  endsAt: string
  visual: string
}

type PaidAd = {
  id: string
  brand: string
  country: string
  placement: 'Fotos' | 'Videos'
  budget: number
  status: 'Moderada' | 'Activa'
  visual: string
}

const APP_NAME = 'Compra y venta pedernales'
const KYC_WARNING =
  'Para poder comprar, vender o comentar dentro de la aplicación, es obligatorio que verifiques tu identidad subiendo tu cédula en tu perfil.'
const SUPPORT_AUTO_REPLY =
  'Gracias por informar el problema. En cuanto un agente vea su mensaje se pondrá en contacto con la persona para ayudarle, especialmente si tiene problemas al verificarse.'

const categories: Category[] = [
  {
    title: 'Vehiculos',
    description: 'Carros, motos y bicicletas con contacto inmediato al vendedor.',
    icon: 'auto',
    visualClass: 'vehicle-visual',
    stats: '147 activos',
  },
  {
    title: 'Bienes Raices',
    description: 'Casas, terrenos, fincas y propiedades premium en Pedernales.',
    icon: 'casa',
    visualClass: 'realestate-visual',
    stats: '82 ofertas',
  },
  {
    title: 'Accesorios',
    description: 'Repuestos, cascos, herramientas y componentes por categoria.',
    icon: 'repuesto',
    visualClass: 'accessory-visual',
    stats: '316 productos',
  },
]

const initialSellers: Seller[] = [
  {
    id: 'mariela',
    name: 'Mariela Vera',
    initials: 'MV',
    active: 'Vendiendo finca en vivo',
    recommendations: ['recommended', 'recommended', 'recommended', 'notRecommended'],
    verified: true,
  },
  {
    id: 'jean',
    name: 'Jean Zambrano',
    initials: 'JZ',
    active: 'Responde llamadas HD',
    recommendations: ['recommended', 'recommended', 'recommended'],
    verified: true,
  },
  {
    id: 'taller',
    name: 'Taller Norte',
    initials: 'TN',
    active: 'Publicando repuestos',
    recommendations: ['recommended', 'notRecommended', 'recommended'],
    verified: true,
  },
  {
    id: 'rosa',
    name: 'Rosa Cevallos',
    initials: 'RC',
    active: 'Buscando casa',
    recommendations: ['recommended', 'recommended'],
    verified: false,
  },
]

const initialListings: Listing[] = [
  {
    id: 'finca-mar',
    title: 'Finca panoramica con vista al mar',
    price: 128000,
    location: 'Cojimies - Pedernales',
    description: 'Tour 3D, escritura al dia, agua propia y acceso para proyecto turistico.',
    tags: ['finca', 'terreno', 'playa', 'inversion'],
    sellerId: 'mariela',
    mediaType: 'Tour 3D',
    visual: 'radial-gradient(circle at 28% 22%, #d5fbe7, #49b587 25%, #135c49 56%, #08251f)',
    createdAt: 'Hace 4 min',
  },
  {
    id: 'moto-ruta',
    title: 'Moto adventure lista para ruta',
    price: 4850,
    location: 'Centro de Pedernales',
    description: 'Video vertical del motor, papeles al dia, casco incluido y entrega inmediata.',
    tags: ['moto', 'casco', 'papeles', 'pedernales'],
    sellerId: 'jean',
    mediaType: 'Video vertical',
    visual: 'radial-gradient(circle at 24% 20%, #fff4bd, #d39b35 24%, #783b19 58%, #170c08)',
    createdAt: 'Hace 18 min',
  },
  {
    id: 'kit-herramientas',
    title: 'Kit de herramientas profesional',
    price: 320,
    location: 'La Chorrera',
    description: 'Set completo con fotos HD, ideal para taller, mecanica y mantenimiento de motos.',
    tags: ['herramientas', 'repuestos', 'taller'],
    sellerId: 'taller',
    mediaType: 'Foto HD',
    visual: 'radial-gradient(circle at 24% 24%, #ffe1d7, #eb7658 26%, #753132 58%, #16090d)',
    createdAt: 'Hace 41 min',
  },
]

const initialStatuses: StatusPost[] = [
  {
    id: 'estado-vehiculo',
    author: 'Jean Zambrano',
    text: 'Hoy muestro motos y accesorios con entrega inmediata.',
    mediaType: 'Video',
    reach: 50,
    highlighted: false,
    visual: 'linear-gradient(145deg, #ffdc8a, #943c22 58%, #16080a)',
  },
  {
    id: 'estado-finca',
    author: 'Mariela Vera',
    text: 'Tour rapido de finca con vista al mar disponible para visitas.',
    mediaType: 'Foto',
    reach: 100,
    highlighted: true,
    visual: 'linear-gradient(145deg, #8cf0c8, #14634f 58%, #061b17)',
  },
]

const initialAuctions: Auction[] = [
  {
    id: 'subasta-camioneta',
    title: 'Camioneta 4x4 lista para trabajo',
    category: 'Vehiculos',
    entryPrice: 500,
    directBuyPrice: 18500,
    currentBid: 14200,
    bids: [
      { bidder: 'Jean Zambrano', amount: 14200 },
      { bidder: 'Rosa Cevallos', amount: 13750 },
    ],
    endsAt: 'Cierra hoy 20:30',
    visual: 'radial-gradient(circle at 34% 28%, #fff2c7, #d67b32 34%, #2d1110 72%)',
  },
  {
    id: 'subasta-terreno',
    title: 'Terreno esquinero cerca al malecon',
    category: 'Bienes Raices',
    entryPrice: 1000,
    directBuyPrice: 52000,
    currentBid: 43500,
    bids: [{ bidder: 'Mariela Vera', amount: 43500 }],
    endsAt: 'Cierra manana 18:00',
    visual: 'radial-gradient(circle at 35% 25%, #d7ffe9, #3aaa7d 34%, #0d322a 72%)',
  },
  {
    id: 'subasta-repuestos',
    title: 'Lote de repuestos premium para motos',
    category: 'Accesorios',
    entryPrice: 80,
    directBuyPrice: 980,
    currentBid: 640,
    bids: [{ bidder: 'Taller Norte', amount: 640 }],
    endsAt: 'Cierra en 3 horas',
    visual: 'radial-gradient(circle at 32% 24%, #ffe4d8, #e36d54 34%, #321018 72%)',
  },
]

const initialPaidAds: PaidAd[] = [
  {
    id: 'ad-panama',
    brand: 'Panama Motors Export',
    country: 'Panama',
    placement: 'Videos',
    budget: 420,
    status: 'Activa',
    visual: 'linear-gradient(145deg, #2ec8ff, #17376f 62%, #080b19)',
  },
  {
    id: 'ad-colombia',
    brand: 'Colombia Repuestos Pro',
    country: 'Colombia',
    placement: 'Fotos',
    budget: 360,
    status: 'Moderada',
    visual: 'linear-gradient(145deg, #ffe071, #bf5d2b 58%, #1b0b09)',
  },
  {
    id: 'ad-usa',
    brand: 'US Real Estate Leads',
    country: 'Estados Unidos',
    placement: 'Videos',
    budget: 720,
    status: 'Activa',
    visual: 'linear-gradient(145deg, #d6ecff, #1263be 56%, #070f22)',
  },
]

const blockedWords = [
  'idiota',
  'imbecil',
  'estupido',
  'racista',
  'discriminacion',
  'acoso',
  'bullying',
  'difamacion',
  'insulto',
]

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
        '--rx': `${(0.5 - y) * 10}deg`,
        '--ry': `${(x - 0.5) * 14}deg`,
        '--mx': `${x * 100}%`,
        '--my': `${y * 100}%`,
      })
    }

    const updateOrientation = (event: DeviceOrientationEvent) => {
      const gamma = Math.max(-28, Math.min(28, event.gamma ?? 0))
      const beta = Math.max(-28, Math.min(28, event.beta ?? 0))

      setStyle({
        '--rx': `${beta / -5}deg`,
        '--ry': `${gamma / 4}deg`,
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

function formatMoney(value: number) {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

function getTrustScore(recommendations: Recommendation[]) {
  if (recommendations.length === 0) {
    return 0
  }

  const positives = recommendations.filter((recommendation) => recommendation === 'recommended').length
  return Math.round((positives / recommendations.length) * 100)
}

function findBlockedWord(text: string) {
  const normalized = text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

  return blockedWords.find((word) => normalized.includes(word))
}

function getSeller(sellers: Seller[], listing: Listing) {
  return sellers.find((seller) => seller.id === listing.sellerId) ?? sellers[0]
}

async function authenticate(email: string, password: string): Promise<Role> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      return 'user'
    }

    const data = (await response.json()) as { role?: Role }
    return data.role === 'owner' ? 'owner' : 'user'
  } catch {
    return 'user'
  }
}

function App() {
  const depthStyle = useDepthMotion()
  const [activeTab, setActiveTab] = useState<FeedTab>('inicio')
  const [session, setSession] = useState<Session | null>(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [kycFile, setKycFile] = useState<File | null>(null)
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null)
  const [alert, setAlert] = useState<string | null>(null)
  const [sellers, setSellers] = useState(initialSellers)
  const [comments, setComments] = useState<Record<string, string[]>>({
    'finca-mar': ['Se puede coordinar visita esta tarde?'],
    'moto-ruta': ['Tiene garantia del motor?'],
  })
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [privateMessage, setPrivateMessage] = useState('')
  const [moderationEvents, setModerationEvents] = useState<ModerationEvent[]>([])
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([])
  const [supportContact, setSupportContact] = useState('')
  const [supportCategory, setSupportCategory] = useState('Problemas al verificarse')
  const [supportMessage, setSupportMessage] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [statusPosts, setStatusPosts] = useState(initialStatuses)
  const [auctions, setAuctions] = useState(initialAuctions)
  const [paidAds, setPaidAds] = useState(initialPaidAds)
  const [withdrawnAdRevenue, setWithdrawnAdRevenue] = useState(0)
  const [bidDrafts, setBidDrafts] = useState<Record<string, string>>({})
  const [closedDeals, setClosedDeals] = useState<Record<string, boolean>>({})
  const [listingTitle, setListingTitle] = useState('Terreno esquinero cerca al malecon')
  const [listingPrice, setListingPrice] = useState('45000')
  const [listingDescription, setListingDescription] = useState(
    'Lote alto con documentos al dia, acceso principal y espacio para proyecto turistico.',
  )
  const [listingTags, setListingTags] = useState('terreno playa inversion')

  const verified = Boolean(kycFile)
  const isOwner = session?.role === 'owner'
  const effectiveVerified = verified || isOwner
  const verificationLabel = isOwner
    ? 'Propietario verificado'
    : effectiveVerified
      ? 'Visto azul activo'
      : 'KYC pendiente'
  const canOperate = effectiveVerified

  const commission = useMemo(() => {
    const parsed = Number(listingPrice)
    return Number.isFinite(parsed) ? parsed * 0.2 : 0
  }, [listingPrice])

  const adRevenue = useMemo(() => paidAds.reduce((total, ad) => total + ad.budget, 0), [paidAds])
  const availableAdRevenue = adRevenue - withdrawnAdRevenue
  const userTrustScore = useMemo(() => getTrustScore(['recommended', 'recommended', 'recommended']), [])

  const showAlert = (message: string) => {
    setAlert(message)
    window.setTimeout(() => setAlert(null), 5200)
  }

  const requireLogin = () => {
    if (session) {
      return true
    }

    showAlert('Inicia sesion con correo y contraseña para entrar a la aplicacion.')
    return false
  }

  const requireKyc = () => {
    if (!requireLogin()) {
      return false
    }

    if (canOperate) {
      return true
    }

    showAlert(KYC_WARNING)
    setActiveTab('perfil')
    return false
  }

  const interceptText = (text: string, surface: ModerationEvent['surface']) => {
    const blockedWord = findBlockedWord(text)
    if (!blockedWord) {
      return true
    }

    const event: ModerationEvent = {
      id: Date.now(),
      surface,
      text,
      reason: `Palabra prohibida detectada: ${blockedWord}`,
      at: new Date().toLocaleString('es-EC'),
    }

    setModerationEvents((current) => [event, ...current])
    showAlert('Mensaje bloqueado por las politicas de convivencia. El evento fue registrado para revision.')
    return false
  }

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const email = loginEmail.trim()

    if (!email || !loginPassword) {
      showAlert('Ingresa correo y contraseña para continuar.')
      return
    }

    const role = await authenticate(email, loginPassword)
    setSession({ email, role })
    setSupportContact(email)
    setActiveTab('inicio')
    showAlert(
      role === 'owner'
        ? 'Sesion iniciada como propietario principal. Verificacion activada por rol.'
        : 'Acceso inmediato activado.',
    )
  }

  const handleKycUpload = (file: File | null) => {
    setKycFile(file)
    if (file) {
      showAlert('Cedula cargada correctamente. Visto azul asignado automaticamente.')
    }
  }

  const handleProtectedAction = (action: string, listing?: Listing) => {
    if (!requireKyc()) {
      return
    }

    if (action === 'comprar' && listing) {
      setClosedDeals((current) => ({ ...current, [listing.id]: true }))
      showAlert('Compra directa iniciada. Al concretar el negocio podras calificar al comerciante.')
      return
    }

    showAlert(`${action} habilitado para usuario verificado.`)
  }

  const addComment = (event: React.FormEvent<HTMLFormElement>, listingId: string) => {
    event.preventDefault()

    if (!requireKyc()) {
      return
    }

    const draft = commentDrafts[listingId]?.trim() ?? ''
    if (!draft) {
      return
    }

    if (!interceptText(draft, 'comentario')) {
      return
    }

    setComments((current) => ({
      ...current,
      [listingId]: [draft, ...(current[listingId] ?? [])],
    }))
    setCommentDrafts((current) => ({ ...current, [listingId]: '' }))
  }

  const sendPrivateMessage = () => {
    if (!requireKyc()) {
      return
    }

    if (!privateMessage.trim()) {
      return
    }

    if (!interceptText(privateMessage, 'chat')) {
      return
    }

    showAlert('Mensaje privado enviado al vendedor.')
    setPrivateMessage('')
  }

  const recommendSeller = (sellerId: string, recommendation: Recommendation) => {
    setSellers((current) =>
      current.map((seller) =>
        seller.id === sellerId
          ? { ...seller, recommendations: [recommendation, ...seller.recommendations] }
          : seller,
      ),
    )
    showAlert(
      recommendation === 'recommended'
        ? 'Recomendacion positiva registrada.'
        : 'No recomendado registrado para auditoria de confianza.',
    )
  }

  const submitListing = () => {
    if (!requireKyc()) {
      return
    }

    if (!listingTitle.trim() || !listingPrice.trim()) {
      showAlert('Completa titulo y precio antes de publicar.')
      return
    }

    if (!interceptText(`${listingTitle} ${listingDescription} ${listingTags}`, 'comentario')) {
      return
    }

    showAlert('Publicacion creada en el feed cronologico.')
    setActiveTab('inicio')
  }

  const submitSupportTicket = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const contact = (supportContact || session?.email || '').trim()
    const message = supportMessage.trim()

    if (!contact || !message) {
      showAlert('Escribe un contacto y describe el error para crear el reporte de soporte.')
      return
    }

    if (!interceptText(message, 'soporte')) {
      return
    }

    const ticketNumber = `SUP-${String(supportTickets.length + 1).padStart(3, '0')}`
    const ticket: SupportTicket = {
      id: Date.now(),
      number: ticketNumber,
      category: supportCategory,
      contact,
      message,
      autoReply: SUPPORT_AUTO_REPLY,
      status: 'Recibido',
      createdAt: new Date().toLocaleString('es-EC'),
    }

    setSupportTickets((current) => [...current, ticket])
    setSupportMessage('')
    showAlert(`Reporte ${ticketNumber} recibido. ${SUPPORT_AUTO_REPLY}`)
  }

  const boostStatus = (statusId: string) => {
    if (!requireKyc()) {
      return
    }

    setStatusPosts((current) =>
      current.map((status) =>
        status.id === statusId ? { ...status, highlighted: true, reach: 100 } : status,
      ),
    )
    setPaidAds((current) => [
      ...current,
      {
        id: `boost-${Date.now()}`,
        brand: session?.email ?? 'Usuario verificado',
        country: 'Ecuador',
        placement: 'Fotos',
        budget: 25,
        status: 'Activa',
        visual: 'linear-gradient(145deg, #8ee8cb, #1f8a72 58%, #071c1b)',
      },
    ])
    showAlert('Estado destacado al 100%. El pago de publicidad se suma a ingresos del propietario.')
  }

  const placeAuctionBid = (auctionId: string) => {
    if (!requireKyc()) {
      return
    }

    const amount = Number(bidDrafts[auctionId])
    const auction = auctions.find((item) => item.id === auctionId)

    if (!auction || !Number.isFinite(amount) || amount <= auction.currentBid) {
      showAlert('La puja debe ser mayor a la puja actual de la subasta.')
      return
    }

    setAuctions((current) =>
      current.map((item) =>
        item.id === auctionId
          ? {
              ...item,
              currentBid: amount,
              bids: [{ bidder: session?.email ?? 'Usuario verificado', amount }, ...item.bids],
            }
          : item,
      ),
    )
    setBidDrafts((current) => ({ ...current, [auctionId]: '' }))
    showAlert('Puja registrada correctamente en la subasta.')
  }

  const directBuyAuction = (auction: Auction) => {
    if (!requireKyc()) {
      return
    }

    showAlert(`Compra directa iniciada por ${formatMoney(auction.directBuyPrice)} en ${auction.title}.`)
  }

  const withdrawAdRevenue = () => {
    if (!isOwner) {
      showAlert('Solo el propietario principal verificado puede retirar ingresos publicitarios.')
      return
    }

    if (availableAdRevenue <= 0) {
      showAlert('No hay saldo publicitario disponible para retirar.')
      return
    }

    setWithdrawnAdRevenue((current) => current + availableAdRevenue)
    showAlert(`Retiro solicitado por ${formatMoney(availableAdRevenue)} de publicidad pagada.`)
  }

  return (
    <main className="app-shell" style={depthStyle}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      {alert && <div className="system-alert" role="alert">{alert}</div>}

      <nav className="top-nav glass-card">
        <a className="brand" href="#inicio" onClick={() => setActiveTab('inicio')} aria-label="Inicio">
          <span className="brand-mark">CV</span>
          <span>
            {APP_NAME}
            <strong className="brand-status">
              {session ? session.email : 'Registro rapido'}
              {session && effectiveVerified && (
                <span className="blue-check verified-tiny" aria-label={verificationLabel} title={verificationLabel} />
              )}
            </strong>
          </span>
        </a>
        <div className="nav-links" aria-label="Secciones principales">
          <button type="button" className={activeTab === 'inicio' ? 'is-active' : ''} onClick={() => setActiveTab('inicio')}>
            Inicio
          </button>
          <button type="button" className={activeTab === 'perfil' ? 'is-active' : ''} onClick={() => setActiveTab('perfil')}>
            Perfil
          </button>
          <button
            type="button"
            className={activeTab === 'configuracion' ? 'is-active' : ''}
            onClick={() => setActiveTab('configuracion')}
          >
            Configuracion
          </button>
          <button type="button" className={activeTab === 'soporte' ? 'is-active' : ''} onClick={() => setActiveTab('soporte')}>
            Soporte
          </button>
        </div>
      </nav>

      <section id="inicio" className="hero depth-stage">
        <div className="hero-copy">
          <p className="eyebrow">Marketplace premium de alta gama</p>
          <h1>{APP_NAME}: feed social para comprar y vender con visto azul.</h1>
          <p className="hero-text">
            Registro rapido con correo y contraseña, navegacion inmediata y bloqueo profesional
            de compras, ventas y comentarios hasta subir la cedula ecuatoriana en el perfil.
            El propietario aparece verificado automaticamente por su rol seguro.
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => setActiveTab('perfil')}>
              Verificar identidad
            </button>
            <button className="secondary-button" type="button" onClick={() => handleProtectedAction('comprar')}>
              Probar compra protegida
            </button>
          </div>
          <div className="trust-row" aria-label="Indicadores de confianza">
            <span><strong>20%</strong> comision fija</span>
            <span><strong>{verificationLabel}</strong> estado</span>
            <span><strong>{userTrustScore}%</strong> confianza</span>
          </div>
        </div>

        <div className="phone-frame floating-card" aria-label="Vista movil premium">
          <div className="phone-notch" />
          <div className="live-badge">LIVE</div>
          <div className="product-orb" />
          <div className="phone-content">
            <p>Feed cronologico</p>
            <h2>3D + KYC</h2>
            <span className="verified-chip">{effectiveVerified ? verificationLabel : 'Sube tu cedula'}</span>
          </div>
          <div className="reaction-stack">
            <span>Compra directa</span>
            <span>Video llamada HD</span>
            <span>Chat filtrado</span>
          </div>
        </div>
      </section>

      {!session && (
        <section className="auth-section glass-card">
          <div>
            <p className="eyebrow">Registro inicial simplificado</p>
            <h2>Entra solo con correo y contraseña.</h2>
            <p>
              El acceso inicial es inmediato. Para comprar, vender o comentar deberas verificarte
              despues desde tu perfil subiendo la foto de tu cedula de Ecuador.
            </p>
          </div>
          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              Correo
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="usuario@correo.com"
                autoComplete="email"
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Minimo 6 caracteres"
                autoComplete="current-password"
              />
            </label>
            <button className="primary-button" type="submit">Entrar a la app</button>
          </form>
        </section>
      )}

      {activeTab === 'inicio' ? (
        <>
          <section className="section-grid category-showcase" aria-label="Categorias principales">
            {categories.map((category) => (
              <article className="category-card glass-card" key={category.title}>
                <div className={`category-visual ${category.visualClass}`} aria-hidden="true">
                  <span>{category.icon}</span>
                </div>
                <span className="card-stat">{category.stats}</span>
                <h2>{category.title}</h2>
                <p>{category.description}</p>
              </article>
            ))}
          </section>

          <section className="status-section glass-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Estados en inicio</p>
                <h2>Estados con alcance 50% y destacado pagado al 100%.</h2>
              </div>
              <span className="reach-policy">Organico 50% · Publicidad 100%</span>
            </div>
            <div className="status-grid">
              {statusPosts.map((status) => (
                <article className="status-card" key={status.id}>
                  <div className="status-media" style={{ background: status.visual }}>
                    <span>{status.mediaType}</span>
                  </div>
                  <div>
                    <strong>{status.author}</strong>
                    <p>{status.text}</p>
                    <div className="reach-meter" aria-label={`Alcance ${status.reach}%`}>
                      <span style={{ width: `${status.reach}%` }} />
                    </div>
                    <div className="status-actions">
                      <span>{status.highlighted ? 'Destacado premium' : 'Alcance organico 50%'}</span>
                      <button type="button" onClick={() => boostStatus(status.id)}>
                        Pagar publicidad 100%
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="media-ads-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Fotos y videos con publicidad</p>
                <h2>Anuncios internacionales de mayor presupuesto para monetizar la app.</h2>
              </div>
              <span className="reach-policy">Ingresos: {formatMoney(adRevenue)}</span>
            </div>
            <div className="paid-ad-grid">
              {paidAds
                .slice()
                .sort((a, b) => b.budget - a.budget)
                .map((ad) => (
                  <article className="paid-ad-card glass-card" key={ad.id}>
                    <div className="paid-ad-art" style={{ background: ad.visual }}>
                      <span>{ad.placement}</span>
                    </div>
                    <div>
                      <strong>{ad.brand}</strong>
                      <p>{ad.country} · {ad.status} · presupuesto {formatMoney(ad.budget)}</p>
                    </div>
                  </article>
                ))}
            </div>
          </section>

          <section className="auction-section glass-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Subastas ordenadas por categoria</p>
                <h2>Pujas, entrada de subasta y compra directa.</h2>
              </div>
              <span className="reach-policy">{auctions.length} subastas activas</span>
            </div>
            <div className="auction-grid">
              {auctions
                .slice()
                .sort((a, b) => a.category.localeCompare(b.category))
                .map((auction) => (
                  <article className="auction-card" key={auction.id}>
                    <div className="auction-art" style={{ background: auction.visual }}>
                      <span>{auction.category}</span>
                    </div>
                    <div className="auction-body">
                      <h3>{auction.title}</h3>
                      <p>{auction.endsAt}</p>
                      <div className="auction-prices">
                        <span>Entrada <strong>{formatMoney(auction.entryPrice)}</strong></span>
                        <span>Puja actual <strong>{formatMoney(auction.currentBid)}</strong></span>
                        <span>Compra directa <strong>{formatMoney(auction.directBuyPrice)}</strong></span>
                      </div>
                      <div className="bid-row">
                        <input
                          inputMode="decimal"
                          value={bidDrafts[auction.id] ?? ''}
                          onChange={(event) =>
                            setBidDrafts((current) => ({ ...current, [auction.id]: event.target.value }))
                          }
                          placeholder={`Puja mayor a ${formatMoney(auction.currentBid)}`}
                        />
                        <button type="button" onClick={() => placeAuctionBid(auction.id)}>Pujar</button>
                      </div>
                      <button className="primary-button" type="button" onClick={() => directBuyAuction(auction)}>
                        Compra directa de subasta
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          </section>

          <section className="home-layout">
            <div className="feed-column">
              <p className="eyebrow">Inicio - interaccion global</p>
              <h2>Publicaciones cronologicas de compra y venta.</h2>
              {initialListings.map((listing) => {
                const seller = getSeller(sellers, listing)
                const score = getTrustScore(seller.recommendations)
                const listingComments = comments[listing.id] ?? []

                return (
                  <article className="feed-card glass-card" key={listing.id}>
                    <div className="feed-media" style={{ background: listing.visual }}>
                      <span>{listing.mediaType}</span>
                      <strong>{listing.createdAt}</strong>
                    </div>
                    <div className="feed-body">
                      <div className="seller-row">
                        <span className="avatar">{seller.initials}</span>
                        <div>
                          <strong>{seller.name}</strong>
                          <p>{score}% recomendaciones positivas</p>
                        </div>
                        {seller.verified && <span className="blue-check" aria-label="Vendedor verificado" />}
                      </div>
                      <h3>{listing.title}</h3>
                      <p>{listing.description}</p>
                      <div className="listing-meta">
                        <strong>{formatMoney(listing.price)}</strong>
                        <span>{listing.location}</span>
                      </div>
                      <div className="pill-row compact">
                        {listing.tags.map((tag) => (
                          <span className="pill" key={tag}>#{tag}</span>
                        ))}
                      </div>
                      <div className="action-grid">
                        <button type="button" onClick={() => handleProtectedAction('comprar', listing)}>Compra directa</button>
                        <button type="button" onClick={() => handleProtectedAction('llamar')}>Llamar</button>
                        <button type="button" onClick={() => handleProtectedAction('video llamada HD')}>Videollamada HD</button>
                        <button type="button" onClick={() => handleProtectedAction('mensaje privado')}>Mensaje privado</button>
                      </div>
                      <div className="reaction-row" aria-label="Reacciones">
                        {(['Me gusta', 'Me encanta', 'Me enoja'] as Reaction[]).map((reaction) => (
                          <button type="button" key={reaction} onClick={() => showAlert(`${reaction} registrado.`)}>
                            {reaction}
                          </button>
                        ))}
                      </div>
                      <form className="comment-box inline" onSubmit={(event) => addComment(event, listing.id)}>
                        <input
                          value={commentDrafts[listing.id] ?? ''}
                          onChange={(event) =>
                            setCommentDrafts((current) => ({ ...current, [listing.id]: event.target.value }))
                          }
                          placeholder="Comentar solo con visto azul..."
                        />
                        <button type="submit">Comentar</button>
                      </form>
                      <div className="comment-list">
                        {listingComments.map((comment) => (
                          <p key={comment}>{comment}</p>
                        ))}
                      </div>
                      {closedDeals[listing.id] && (
                        <div className="recommendation-panel">
                          <span>Negocio concretado: califica al comerciante</span>
                          <button type="button" onClick={() => recommendSeller(seller.id, 'recommended')}>Recomendado</button>
                          <button type="button" onClick={() => recommendSeller(seller.id, 'notRecommended')}>No Recomendado</button>
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>

            <aside className="directory-card glass-card">
              <p className="eyebrow">Directorio comercial</p>
              <h3>Usuarios activos en tiempo real</h3>
              {sellers.map((seller) => (
                <div className="directory-user" key={seller.id}>
                  <span className="avatar">{seller.initials}</span>
                  <div>
                    <strong>{seller.name}</strong>
                    <p>{seller.active}</p>
                  </div>
                  <span>{getTrustScore(seller.recommendations)}%</span>
                </div>
              ))}
              <div className="private-chat">
                <label>
                  Mensaje privado filtrado
                  <textarea
                    value={privateMessage}
                    onChange={(event) => setPrivateMessage(event.target.value)}
                    placeholder="Escribe al vendedor..."
                  />
                </label>
                <button className="primary-button" type="button" onClick={sendPrivateMessage}>Enviar mensaje</button>
              </div>
            </aside>
          </section>
        </>
      ) : activeTab === 'perfil' ? (
        <section className="profile-layout">
          <div className="profile-card">
            <div className="cover-preview">
              {coverPhoto ? coverPhoto.name : 'Foto de portada premium'}
            </div>
            <div className="profile-body">
              <label className="mini-upload">
                Subir portada
                <input type="file" accept="image/*" onChange={(event) => setCoverPhoto(event.target.files?.[0] ?? null)} />
              </label>
              <label className="mini-upload">
                Foto perfil
                <input type="file" accept="image/*" onChange={(event) => setProfilePhoto(event.target.files?.[0] ?? null)} />
              </label>
              <div className="profile-avatar">{profilePhoto ? 'OK' : 'PV'}</div>
              <div className="profile-title-row">
                <div>
                  <h2>
                    Perfil del usuario
                    {effectiveVerified && (
                      <span className="blue-check profile-check" aria-label={verificationLabel} title={verificationLabel} />
                    )}
                  </h2>
                  <p>{session?.email ?? 'Visitante sin sesion'} · {isOwner ? 'Propietario principal' : 'Cliente marketplace'}</p>
                </div>
                <button className="secondary-button" type="button">Editar perfil</button>
              </div>
              <div className={`verification-panel ${effectiveVerified ? 'is-verified' : ''}`}>
                <span className="blue-check large" />
                <div>
                  <strong>{verificationLabel}</strong>
                  <p>
                    {isOwner
                      ? 'Tu cuenta de propietario principal aparece verificada automaticamente y no necesita subir cedula.'
                      : verified
                        ? 'Cedula registrada para operar.'
                        : KYC_WARNING}
                  </p>
                </div>
              </div>
              {isOwner ? (
                <div className="owner-verified-note">
                  <strong>Verificacion del propietario</strong>
                  <p>Rol validado por el servidor mediante variables de entorno seguras.</p>
                </div>
              ) : (
                <label className="file-drop">
                  <span>{kycFile ? kycFile.name : 'Subir fotografia de cedula de Ecuador'}</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(event) => handleKycUpload(event.target.files?.[0] ?? null)}
                  />
                </label>
              )}
              <div className="score-board">
                <span><strong>{userTrustScore}%</strong> confianza publica</span>
                <span><strong>3</strong> recomendaciones</span>
                <span><strong>{effectiveVerified ? 'Si' : 'No'}</strong> verificado</span>
              </div>
            </div>
          </div>

          <div className="profile-tools">
            <section className="publisher-card glass-card">
              <p className="eyebrow">Herramientas de creacion</p>
              <h2>Publicaciones, historias y transmisiones verticales.</h2>
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
                  Etiquetas corridas
                  <input value={listingTags} onChange={(event) => setListingTags(event.target.value)} />
                </label>
                <label className="file-drop wide">
                  <span>Subir fotos HD, texto o video vertical</span>
                  <input type="file" accept="image/*,video/*" multiple />
                </label>
              </div>
              <div className="commission-box">
                <span>Comision fija 20%</span>
                <strong>{formatMoney(commission)}</strong>
              </div>
              <div className="tool-row">
                <button className="primary-button" type="button" onClick={submitListing}>Subir publicacion</button>
                <button className="secondary-button" type="button" onClick={() => handleProtectedAction('subir historia temporal')}>Subir historia</button>
                <button className="secondary-button" type="button" onClick={() => handleProtectedAction('transmision en vivo vertical')}>Iniciar live</button>
              </div>
            </section>

            <section className="friends-card glass-card">
              <p className="eyebrow">Red social</p>
              <h3>Amigos y solicitudes</h3>
              <div className="friend-tabs">
                <span>Amigos: 24</span>
                <span>Solicitudes recibidas: 5</span>
                <span>Solicitudes enviadas: 8</span>
              </div>
              <button type="button" className="secondary-button">Administrar amigos</button>
            </section>

            {isOwner && (
              <section className="owner-panel glass-card">
                <p className="eyebrow">Panel integrado del propietario</p>
                <h2>Auditoria silenciosa y moderacion total.</h2>
                <p>
                  Este acceso solo aparece cuando el servidor valida variables de entorno seguras.
                  El propietario navega como usuario normal y revisa perfiles, publicaciones,
                  historias, chats, transmisiones y recomendaciones sin mostrarse publicamente.
                </p>
                <div className="audit-grid">
                  <span>Perfiles: {sellers.length}</span>
                  <span>Publicaciones: {initialListings.length}</span>
                  <span>Historias: 12</span>
                  <span>Chats revisables: 36</span>
                  <span>Lives activos: 3</span>
                  <span>Eventos filtro: {moderationEvents.length}</span>
                  <span>Soporte: {supportTickets.length}</span>
                  <span>Publicidad total: {formatMoney(adRevenue)}</span>
                  <span>Saldo para retirar: {formatMoney(availableAdRevenue)}</span>
                </div>
                <button className="primary-button owner-withdraw" type="button" onClick={withdrawAdRevenue}>
                  Retirar dinero de publicidad
                </button>
                <div className="support-admin-list">
                  <h3>Reportes de soporte en orden</h3>
                  {supportTickets.length === 0 ? (
                    <p>No hay reportes de soporte pendientes.</p>
                  ) : (
                    supportTickets.map((ticket) => (
                      <article key={ticket.id}>
                        <strong>{ticket.number} · {ticket.category}</strong>
                        <span>{ticket.status} · {ticket.createdAt}</span>
                        <p>{ticket.message}</p>
                        <small>Contacto: {ticket.contact}</small>
                      </article>
                    ))
                  )}
                </div>
                <div className="moderation-log">
                  {moderationEvents.length === 0 ? (
                    <p>No hay infracciones registradas.</p>
                  ) : (
                    moderationEvents.map((event) => (
                      <article key={event.id}>
                        <strong>{event.reason}</strong>
                        <span>{event.surface} · {event.at}</span>
                        <p>{event.text}</p>
                        <div>
                          <button type="button">Corregir texto</button>
                          <button type="button">Banear usuario</button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            )}
          </div>
        </section>
      ) : activeTab === 'configuracion' ? (
        <section className="settings-layout">
          <div className="settings-card glass-card">
            <p className="eyebrow">Configuraciones profesionales</p>
            <h2>Notificaciones, alcance, publicidad y monetizacion.</h2>
            <div className="settings-grid">
              <article>
                <strong>Notificaciones</strong>
                <p>Alertas de pujas, compras, soporte, verificacion, lives y pagos publicitarios.</p>
                <button
                  type="button"
                  className={notificationsEnabled ? 'toggle is-on' : 'toggle'}
                  onClick={() => setNotificationsEnabled((current) => !current)}
                >
                  {notificationsEnabled ? 'Activadas' : 'Desactivadas'}
                </button>
              </article>
              <article>
                <strong>Estados</strong>
                <p>Todo estado inicia con alcance del 50%. Si el usuario paga publicidad, sube al 100%.</p>
                <span className="settings-metric">50% gratis · 100% pagado</span>
              </article>
              <article>
                <strong>Subastas</strong>
                <p>Ordenadas por categoria con entrada, puja superior obligatoria y compra directa.</p>
                <span className="settings-metric">{auctions.length} activas</span>
              </article>
              <article>
                <strong>Publicidad en fotos y videos</strong>
                <p>Anuncios de empresas con mayor presupuesto, visibles en el inicio y registrados para pago.</p>
                <span className="settings-metric">{paidAds.length} campanas</span>
              </article>
            </div>
          </div>

          <aside className="wallet-card glass-card">
            <p className="eyebrow">Billetera del propietario</p>
            <h3>Ingresos por publicidad</h3>
            <div className="wallet-balance">
              <span>Recaudado</span>
              <strong>{formatMoney(adRevenue)}</strong>
            </div>
            <div className="wallet-balance">
              <span>Retirado</span>
              <strong>{formatMoney(withdrawnAdRevenue)}</strong>
            </div>
            <div className="wallet-balance is-available">
              <span>Disponible</span>
              <strong>{formatMoney(availableAdRevenue)}</strong>
            </div>
            <button className="primary-button" type="button" onClick={withdrawAdRevenue}>
              Retirar como propietario
            </button>
            {!isOwner && <p>El retiro se habilita solo al iniciar sesion como propietario verificado.</p>}
          </aside>
        </section>
      ) : (
        <section className="support-layout">
          <div className="support-card glass-card">
            <p className="eyebrow">Soporte y reportes</p>
            <h2>Informa errores de la app o problemas al verificarte.</h2>
            <p>
              Los reportes se agregan en orden con numero de caso para que soporte pueda atenderlos
              correctamente. Puedes enviar un problema de verificacion aunque aun no tengas visto azul.
            </p>
            <form className="support-form" onSubmit={submitSupportTicket}>
              <label>
                Contacto
                <input
                  value={supportContact}
                  onChange={(event) => setSupportContact(event.target.value)}
                  placeholder="Correo o telefono para responderte"
                />
              </label>
              <label>
                Tipo de problema
                <select value={supportCategory} onChange={(event) => setSupportCategory(event.target.value)}>
                  <option>Problemas al verificarse</option>
                  <option>Error en la app</option>
                  <option>Problema al comprar</option>
                  <option>Problema al vender</option>
                  <option>Reporte de seguridad</option>
                </select>
              </label>
              <label>
                Describe el problema
                <textarea
                  value={supportMessage}
                  onChange={(event) => setSupportMessage(event.target.value)}
                  placeholder="Cuéntanos que ocurre y en qué pantalla pasa..."
                />
              </label>
              <button className="primary-button" type="submit">Enviar reporte</button>
            </form>
          </div>

          <aside className="support-queue glass-card">
            <p className="eyebrow">Orden de atencion</p>
            <h3>Reportes recibidos</h3>
            {supportTickets.length === 0 ? (
              <p>Aun no hay reportes. El primer mensaje creara el caso SUP-001.</p>
            ) : (
              supportTickets.map((ticket) => (
                <article key={ticket.id}>
                  <strong>{ticket.number}</strong>
                  <span>{ticket.category} · {ticket.status}</span>
                  <p>{ticket.message}</p>
                  <div className="auto-reply">{ticket.autoReply}</div>
                </article>
              ))
            )}
          </aside>
        </section>
      )}
    </main>
  )
}

export default App
