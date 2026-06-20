// Dati FINTI per il prototipo dei Piani Editoriali.
// In produzione questi verranno sostituiti da chiamate API (clienti / post dal backend).

// Canali social. Una "pagina" può pubblicare su più canali insieme (es. FB/IG).
export const PLATFORMS = {
  instagram: { label: "Instagram", color: "#E1306C", short: "IG" },
  facebook: { label: "Facebook", color: "#1877F2", short: "FB" },
  tiktok: { label: "TikTok", color: "#111111", short: "TT" },
  linkedin: { label: "LinkedIn", color: "#0A66C2", short: "IN" },
};

// Rubriche/pilastri di contenuto più comuni (per il datalist nel modale).
export const COMMON_CATEGORIES = [
  "WE ARE GREEN",
  "BRAND IDENTITY",
  "YOUR SHOT",
  "NAPOLART",
  "DISCOVER NAPLES",
  "WORKSMART",
  "DICONO DI NOI",
  "INTERAZIONI",
  "ABOUT US",
  "RICORRENZA",
  "PROMO",
  "EVENTO",
];

// Colore deterministico per una rubrica (stesso nome → stesso colore).
export const categoryColor = (cat = "") => {
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) % 360;
  return `hsl(${h}, 60%, 50%)`;
};

// Clienti del prototipo.
// - "Ristorante Da Mario": 2 pagine (IG e FB separati)
// - "Studio Dentistico Bianchi": 1 sola pagina
// - "Boutique Aurora": 2 pagine (IG + TikTok)
// - "Dioniso's Hotels": 1 cliente, 5 pagine (4 strutture su FB/IG + LinkedIn gruppo)
export const mockClients = [
  {
    id: "c1",
    name: "Ristorante Da Mario",
    contactName: "Mario Rossi",
    email: "mario@ristorantedamario.it",
    pages: [
      { id: "p1", name: "Da Mario", channels: ["instagram"] },
      { id: "p2", name: "Da Mario", channels: ["facebook"] },
    ],
  },
  {
    id: "c2",
    name: "Studio Dentistico Bianchi",
    contactName: "Dott. Bianchi",
    email: "info@studiobianchi.it",
    pages: [{ id: "p3", name: "Studio Bianchi", channels: ["instagram"] }],
  },
  {
    id: "c3",
    name: "Boutique Aurora",
    contactName: "Aurora Verdi",
    email: "aurora@boutiqueaurora.it",
    pages: [
      { id: "p4", name: "Aurora", channels: ["instagram"] },
      { id: "p5", name: "Aurora", channels: ["tiktok"] },
    ],
  },
  {
    id: "c4",
    name: "Dioniso's Hotels",
    contactName: "Sofia Greco",
    email: "marketing@dionisoshotels.com",
    pages: [
      { id: "d1", name: "Palazzo Salgar", channels: ["facebook", "instagram"] },
      { id: "d2", name: "Hotel Cristina", channels: ["facebook", "instagram"] },
      { id: "d3", name: "Villa Piedimonte", channels: ["facebook", "instagram"] },
      { id: "d4", name: "Dioniso's Apartments", channels: ["facebook", "instagram"] },
      { id: "d5", name: "Dioniso's Hotels", channels: ["linkedin"] },
    ],
  },
];

// Utenti finti per il prototipo (admin + operatore con clienti assegnati).
export const mockUsers = [
  {
    id: "u1",
    name: "Marco",
    username: "marco",
    email: "marco@basicadv.com",
    role: "admin",
    assignedClients: [],
  },
  {
    id: "u2",
    name: "Giulia",
    username: "giulia",
    email: "giulia@basicadv.com",
    role: "member",
    assignedClients: ["c1", "c4"],
  },
];

const url = (seed) => `https://picsum.photos/seed/${seed}/600/600`;
// Helper media: foto e video. I post hanno un array `media` ordinato:
//   1 immagine = foto singola · più elementi = carosello · video = kind 'video'
const pic = (seed) => ({ kind: "image", url: url(seed) });
const vid = (seed) => ({ kind: "video", url: "", thumbUrl: url(seed) });

// Post del prototipo. Date come campi numerici (year/month 1-based/day) per
// evitare problemi di fuso orario nel filtro per mese.
export const mockPosts = [
  // --- Ristorante Da Mario / IG (p1) — Giugno 2026 ---
  {
    id: "post-1",
    clientId: "c1",
    pageId: "p1",
    year: 2026,
    month: 6,
    day: 3,
    category: "PROMO",
    caption: "🍝 Nuovo menù d'estate: scopri i nostri primi piatti di stagione!",
    media: [pic("damario-menu")],
    sponsored: true,
    status: "approved",
    notes: [],
  },
  {
    id: "post-2",
    clientId: "c1",
    pageId: "p1",
    year: 2026,
    month: 6,
    day: 10,
    category: "DIETRO LE QUINTE",
    caption: "Dietro le quinte: la nostra pasta fresca fatta a mano ogni mattina.",
    media: [pic("damario-pasta1"), pic("damario-pasta2"), pic("damario-pasta3")],
    sponsored: false,
    status: "approved",
    notes: [],
  },
  {
    id: "post-3",
    clientId: "c1",
    pageId: "p1",
    year: 2026,
    month: 6,
    day: 17,
    category: "EVENTO",
    caption: "Aperitivo al tramonto 🍹 Prenota il tuo tavolo per il weekend.",
    media: [vid("damario-aperitivo")],
    sponsored: false,
    status: "review",
    notes: [
      {
        author: "Cliente",
        text: "Cambiare la foto: preferiamo quella con la terrazza. Ve ne allego una di riferimento. E spostare il post a venerdì invece di mercoledì.",
        createdAt: "2026-06-12",
        media: [pic("terrazza-ref")],
      },
      {
        author: "Cliente",
        text: "Aggiungere anche l'orario (dalle 18:30).",
        createdAt: "2026-06-12",
      },
    ],
  },
  {
    id: "post-4",
    clientId: "c1",
    pageId: "p1",
    year: 2026,
    month: 6,
    day: 24,
    category: "",
    caption: "Bozza: post sulla nuova carta dei vini (da completare).",
    media: [],
    sponsored: false,
    status: "draft",
    notes: [],
  },

  // --- Ristorante Da Mario / FB (p2) — Giugno 2026 ---
  {
    id: "post-5",
    clientId: "c1",
    pageId: "p2",
    year: 2026,
    month: 6,
    day: 5,
    category: "INTERAZIONI",
    caption: "Siamo aperti anche a pranzo! Vi aspettiamo dal martedì alla domenica.",
    media: [pic("damario-pranzo")],
    sponsored: false,
    status: "approved",
    notes: [],
  },
  {
    id: "post-6",
    clientId: "c1",
    pageId: "p2",
    year: 2026,
    month: 6,
    day: 17,
    category: "PROMO",
    caption: "🎉 Promo estate: menù degustazione a prezzo speciale per tutto giugno.",
    media: [pic("damario-promo1"), pic("damario-promo2")],
    sponsored: true,
    status: "review",
    notes: [
      {
        author: "Cliente",
        text: "Il prezzo indicato non è corretto, sono 35€ non 30€.",
        createdAt: "2026-06-13",
      },
    ],
  },

  // --- Studio Dentistico Bianchi / IG (p3) — Giugno 2026 ---
  {
    id: "post-7",
    clientId: "c2",
    pageId: "p3",
    year: 2026,
    month: 6,
    day: 9,
    category: "CONSIGLI",
    caption: "Igiene orale: 5 consigli per un sorriso sano tutto l'anno.",
    media: [pic("dentista-tips")],
    sponsored: false,
    status: "approved",
    notes: [],
  },
  {
    id: "post-8",
    clientId: "c2",
    pageId: "p3",
    year: 2026,
    month: 6,
    day: 23,
    category: "PROMO",
    caption: "Prima visita gratuita per i nuovi pazienti. Prenota ora!",
    media: [vid("dentista-promo")],
    sponsored: true,
    status: "approved",
    notes: [],
  },

  // --- Boutique Aurora / IG (p4) — Giugno 2026 ---
  {
    id: "post-9",
    clientId: "c3",
    pageId: "p4",
    year: 2026,
    month: 6,
    day: 6,
    category: "EVENTO",
    caption: "Nuovi arrivi: la collezione estate è in negozio ☀️",
    media: [
      pic("aurora-coll1"),
      pic("aurora-coll2"),
      pic("aurora-coll3"),
      pic("aurora-coll4"),
    ],
    sponsored: false,
    status: "approved",
    notes: [],
  },
  {
    id: "post-10",
    clientId: "c3",
    pageId: "p4",
    year: 2026,
    month: 6,
    day: 19,
    category: "PROMO",
    caption: "Saldi in anteprima per le nostre clienti più affezionate 💛",
    media: [pic("aurora-saldi")],
    sponsored: true,
    status: "approved",
    notes: [],
  },

  // --- Archivio Da Mario: MAGGIO 2026 (punto 3: storico mese per mese) ---
  {
    id: "post-11",
    clientId: "c1",
    pageId: "p1",
    year: 2026,
    month: 5,
    day: 14,
    category: "RICORRENZA",
    caption: "Festa della mamma: menù speciale 💐 (pubblicato a maggio)",
    media: [pic("damario-maggio")],
    sponsored: true,
    status: "approved",
    notes: [],
  },
  {
    id: "post-12",
    clientId: "c1",
    pageId: "p1",
    year: 2026,
    month: 5,
    day: 28,
    category: "EVENTO",
    caption: "Grazie a tutti per una splendida serata di degustazione!",
    media: [vid("damario-serata")],
    sponsored: false,
    status: "approved",
    notes: [],
  },

  // ============================================================
  // Dioniso's Hotels (c4) — 5 pagine, GIUGNO 2026
  // Replica lo stile del PED reale: rubriche + più strutture.
  // ============================================================

  // Palazzo Salgar (d1)
  {
    id: "dio-1", clientId: "c4", pageId: "d1", year: 2026, month: 6, day: 2,
    category: "WE ARE GREEN",
    caption: "“La Terra è ciò che abbiamo tutti in comune.” Il nostro impegno per un'ospitalità sostenibile.",
    media: [pic("salgar-green1"), pic("salgar-green2")],
    sponsored: false, status: "approved", notes: [],
  },
  {
    id: "dio-2", clientId: "c4", pageId: "d1", year: 2026, month: 6, day: 9,
    category: "BRAND IDENTITY",
    caption: "Dalle Twin Classic alle Executive: ogni camera è pensata per il tuo comfort.",
    media: [pic("salgar-rooms")],
    sponsored: true, status: "approved", notes: [],
  },
  {
    id: "dio-3", clientId: "c4", pageId: "d1", year: 2026, month: 6, day: 19,
    category: "DISCOVER NAPLES",
    caption: "Nel cuore della Sanità, Palazzo Sanfelice mostra il suo scalone monumentale.",
    media: [vid("salgar-naples")],
    sponsored: false, status: "review",
    notes: [{ author: "Cliente", text: "Taggare il museo nella story.", createdAt: "2026-06-15" }],
  },

  // Hotel Cristina (d2)
  {
    id: "dio-4", clientId: "c4", pageId: "d2", year: 2026, month: 6, day: 3,
    category: "WORKSMART",
    caption: "Per incontri privati di lavoro, colloqui o meeting: spazi su misura.",
    media: [pic("cristina-work")],
    sponsored: false, status: "approved", notes: [],
  },
  {
    id: "dio-5", clientId: "c4", pageId: "d2", year: 2026, month: 6, day: 11,
    category: "YOUR SHOT",
    caption: "I nostri dolci per la colazione! 📸 (ph. @stelios1967)",
    media: [pic("cristina-shot1"), pic("cristina-shot2"), pic("cristina-shot3")],
    sponsored: false, status: "approved", notes: [],
  },
  {
    id: "dio-6", clientId: "c4", pageId: "d2", year: 2026, month: 6, day: 18,
    category: "NAPOLART",
    caption: "L'Ipogeo dei Cristallini è uno dei siti più straordinari della città.",
    media: [vid("cristina-art")],
    sponsored: true, status: "approved", notes: [],
  },

  // Villa Piedimonte (d3)
  {
    id: "dio-7", clientId: "c4", pageId: "d3", year: 2026, month: 6, day: 2,
    category: "THIS IS RAVELLO",
    caption: "Santa Maria a Gradillo è una piccola chiesa romanica nel borgo.",
    media: [pic("villa-ravello")],
    sponsored: false, status: "approved", notes: [],
  },
  {
    id: "dio-8", clientId: "c4", pageId: "d3", year: 2026, month: 6, day: 9,
    category: "BRAND IDENTITY",
    caption: "La piscina panoramica di Villa Piedimonte, sospesa sulla Costiera.",
    media: [pic("villa-pool1"), pic("villa-pool2")],
    sponsored: false, status: "approved", notes: [],
  },
  {
    id: "dio-9", clientId: "c4", pageId: "d3", year: 2026, month: 6, day: 20,
    category: "WE ARE GREEN",
    caption: "“The Earth is a museum of divine intent.” — Bill",
    media: [pic("villa-green")],
    sponsored: false, status: "draft", notes: [],
  },

  // Dioniso's Apartments (d4)
  {
    id: "dio-10", clientId: "c4", pageId: "d4", year: 2026, month: 6, day: 6,
    category: "WORKSMART",
    caption: "Per chi cerca flessibilità anche durante una trasferta di lavoro.",
    media: [pic("apt-work")],
    sponsored: false, status: "approved", notes: [],
  },
  {
    id: "dio-11", clientId: "c4", pageId: "d4", year: 2026, month: 6, day: 18,
    category: "NAPOLART",
    caption: "La Cappella Pappacoda: una presenza piccola ma intensa nel centro storico.",
    media: [pic("apt-art")],
    sponsored: false, status: "approved", notes: [],
  },

  // Dioniso's Hotels — LinkedIn gruppo (d5): cadenza più bassa
  {
    id: "dio-12", clientId: "c4", pageId: "d5", year: 2026, month: 6, day: 12,
    category: "ABOUT US",
    caption: "At Villa Piedimonte, every stay begins with a sense of quiet luxury.",
    media: [pic("group-linkedin")],
    sponsored: false, status: "approved", notes: [],
  },
];
