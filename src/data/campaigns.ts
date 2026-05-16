import type { Campaign, UserProfile } from "../types";

export const ECUADOR_STAR_RATE = 100;
export const OWNER_COMMISSION_RATE = 0.3;

const ownerPaymentMethods = [
  {
    kind: "bank" as const,
    label: "Banco Pichincha - Ahorros",
    details: "Cuenta 2200457810 · Cedula/RUC 1790012345001",
    helper: "Transferencia bancaria directa al fondo institucional Coramoy.",
  },
  {
    kind: "mobile" as const,
    label: "Pago por celular",
    details: "099 400 2200",
    helper: "Usa pagos interbancarios por numero movil del recaudador.",
  },
  {
    kind: "paypal" as const,
    label: "PayPal",
    details: "donaciones@coramoy.ec",
    helper: "Boton dinamico para donantes internacionales.",
  },
  {
    kind: "deuna" as const,
    label: "Deuna",
    details: "QR de cobro asociado a 099 400 2200",
    helper: "Espacio reservado para QR o celular Deuna.",
  },
];

export const seedCampaigns: Campaign[] = [
  {
    id: "owner-abuelitos",
    title: "Abrigo y comida para abuelitos de la calle",
    description: "Campana maestra del propietario para adultos mayores sin red familiar.",
    story:
      "Coramoy coordina entregas semanales de kits alimenticios, cobijas y controles medicos para abuelitos y abuelitas en situacion de calle en Quito y Santo Domingo.",
    category: "abuelitos",
    mediaUrl:
      "https://images.unsplash.com/photo-1581579438747-104c53d7fbc4?auto=format&fit=crop&w=1200&q=80",
    goalUsd: 12000,
    raisedStars: 745000,
    likes: 1482,
    comments: 264,
    shares: 118,
    isPinnedByOwner: true,
    creator: {
      name: "Fondo Coramoy",
      city: "Ecuador",
      isKycVerified: true,
      cedulaUploaded: true,
    },
    paymentMethods: ownerPaymentMethods,
    evidences: [
      {
        id: "e1",
        title: "Entrega de alimentos en Quito",
        description: "Fotografias de kits alimenticios entregados y facturas de compra.",
        mediaUrl:
          "https://images.unsplash.com/photo-1593113616828-6f22bca04804?auto=format&fit=crop&w=900&q=80",
        type: "foto",
      },
    ],
  },
  {
    id: "owner-refugios",
    title: "Alimentos para refugios de animales abandonados",
    description: "Causa fija para rescate, esterilizacion y alimentacion animal.",
    story:
      "La comunidad financia alimento balanceado, vacunas y urgencias veterinarias para perros y gatos rescatados de las calles de Manabi, Guayas y Pichincha.",
    category: "animales",
    mediaUrl:
      "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=1200&q=80",
    goalUsd: 9000,
    raisedStars: 512000,
    likes: 2104,
    comments: 391,
    shares: 222,
    isPinnedByOwner: true,
    creator: {
      name: "Red Animal Coramoy",
      city: "Manta",
      isKycVerified: true,
      cedulaUploaded: true,
    },
    paymentMethods: ownerPaymentMethods,
    evidences: [
      {
        id: "e2",
        title: "Factura veterinaria validada",
        description: "Gastos de vacunas y desparasitacion publicados para auditoria social.",
        mediaUrl:
          "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=900&q=80",
        type: "foto",
      },
    ],
  },
  {
    id: "owner-medicinas",
    title: "Medicinas para personas de escasos recursos",
    description: "Fondo institucional para recetas urgentes y tratamientos cronicos.",
    story:
      "Aliados locales verifican recetas, compran medicamentos y publican evidencias en Historias de Exito para sostener transparencia con cada donante.",
    category: "salud",
    mediaUrl:
      "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80",
    goalUsd: 15000,
    raisedStars: 936000,
    likes: 1758,
    comments: 338,
    shares: 146,
    isPinnedByOwner: true,
    creator: {
      name: "Salud Solidaria Coramoy",
      city: "Guayaquil",
      isKycVerified: true,
      cedulaUploaded: true,
    },
    paymentMethods: ownerPaymentMethods,
    evidences: [
      {
        id: "e3",
        title: "Compra de medicinas",
        description: "Comprobantes y fotos cortas de entrega a familias verificadas.",
        mediaUrl:
          "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80",
        type: "foto",
      },
    ],
  },
  {
    id: "user-lola",
    title: "Cirugia urgente para Dona Lola",
    description: "Vecinos de Cuenca recolectan fondos para una operacion de cadera.",
    story:
      "Dona Lola vive sola y necesita cubrir medicinas, rehabilitacion y transporte. Sus familiares y vecinos suben evidencias de cada compra al finalizar la ayuda.",
    category: "salud",
    mediaUrl:
      "https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&w=1200&q=80",
    goalUsd: 4800,
    raisedStars: 198000,
    likes: 689,
    comments: 84,
    shares: 51,
    isPinnedByOwner: false,
    creator: {
      name: "Vecinos Unidos Cuenca",
      city: "Cuenca",
      isKycVerified: true,
      cedulaUploaded: true,
    },
    paymentMethods: [
      {
        kind: "bank",
        label: "Banco Guayaquil - Corriente",
        details: "Cuenta 0134578900 · Cedula 0102456789",
        helper: "La cuenta pertenece al representante verificado por KYC.",
      },
      {
        kind: "mobile",
        label: "Transferencia por celular",
        details: "098 701 4580",
        helper: "Compatible con pagos rapidos interbancarios.",
      },
      {
        kind: "paypal",
        label: "PayPal",
        details: "vecinoscuenca@example.com",
        helper: "Correo de PayPal asociado a la causa.",
      },
      {
        kind: "deuna",
        label: "Deuna",
        details: "QR Deuna cargado por el recaudador",
        helper: "Muestra QR o celular al donante.",
      },
    ],
    evidences: [
      {
        id: "e4",
        title: "Cotizacion del hospital",
        description: "Documento fotografiado y validado por la comunidad.",
        mediaUrl:
          "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80",
        type: "foto",
      },
    ],
  },
  {
    id: "adopt-michi",
    title: "Adopcion responsable para Michi",
    description: "Gatito rescatado busca un hogar definitivo sin costo de publicacion.",
    story:
      "Michi fue rescatado en Portoviejo. La publicacion permite fotos, videos y entrevista responsable para una familia adoptante.",
    category: "adopcion",
    mediaUrl:
      "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=80",
    goalUsd: 500,
    raisedStars: 32400,
    likes: 904,
    comments: 137,
    shares: 78,
    isPinnedByOwner: false,
    creator: {
      name: "Rescate Patitas",
      city: "Portoviejo",
      isKycVerified: true,
      cedulaUploaded: true,
    },
    paymentMethods: [
      {
        kind: "mobile",
        label: "Contacto movil del refugio",
        details: "096 320 8891",
        helper: "Para coordinar visita o apoyo directo.",
      },
      {
        kind: "deuna",
        label: "Deuna",
        details: "096 320 8891",
        helper: "Aporte opcional para alimento y vacunas.",
      },
    ],
    evidences: [
      {
        id: "e5",
        title: "Control veterinario inicial",
        description: "Foto del chequeo y carnet de vacunas.",
        mediaUrl:
          "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?auto=format&fit=crop&w=900&q=80",
        type: "foto",
      },
    ],
  },
];

export const demoProfile: UserProfile = {
  name: "Andrea Morales",
  email: "andrea@coramoy.ec",
  publicBadge: "Plata",
  starsBalance: 18500,
  kycStatus: "pendiente",
  bankAccountVerified: false,
  ownedCampaignIds: ["user-lola", "adopt-michi"],
  withdrawalAlerts: [],
};
