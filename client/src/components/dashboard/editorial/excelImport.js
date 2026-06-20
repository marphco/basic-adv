// Import Excel dei piani editoriali. Riconosce più formati e più fogli:
//  1) Template a colonne: una riga per post con intestazioni
//     (Pagina, Data, Rubrica/Binario/Pilastro, Caption/Testo, Hashtag, Sponsor).
//     Le intestazioni sono riconosciute in modo "tollerante" (per contenuto).
//  2) Griglia "PED" (tipo Dioniso): blocchi settimanali, righe = pagina,
//     colonne = giorni, celle = "RUBRICA testo".
// Scorre TUTTI i fogli del file e sceglie quello che produce più post (così
// funziona anche se il calendario non è il primo foglio).
// Restituisce post candidati che l'utente conferma prima dell'inserimento.
// Solo testo: le immagini NON vengono importate.

const norm = (s) => String(s ?? "").trim().toLowerCase();

// Nomi giorno (inizio stringa) per riconoscere le righe-intestazione della griglia.
const DAY_PREFIXES = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];

// "RUBRICA testo" → { category, caption }. La rubrica = parole iniziali in
// MAIUSCOLO; il resto è la caption.
export function splitRubric(text) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return { category: "", caption: "" };
  const words = t.split(" ");
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    const letters = w.replace(/[^A-Za-zÀ-ÿ]/g, "");
    if (letters && w === w.toUpperCase() && /[A-ZÀ-Ý]/.test(w)) i++;
    else break;
  }
  if (i === 0) return { category: "", caption: t };
  return { category: words.slice(0, i).join(" "), caption: words.slice(i).join(" ") };
}

// Converte un valore cella in Date (Date nativa, seriale Excel o stringa ISO/lunga).
export function toDate(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === "number" && v > 59) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string" && v.trim()) {
    // YYYY-MM-DD interpretato in locale (evita lo slittamento di fuso)
    const m = v.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// Estrae giorno/mese (e anno, se presente) da stringhe tipo "Mar 16/6",
// "16/6", "1/7/2026". L'anno, se assente, è dedotto altrove.
export function parseDayMonth(v) {
  const s = String(v ?? "").trim();
  const m = s.match(/(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  let year = m[3] ? Number(m[3]) : null;
  if (year && year < 100) year += 2000;
  return { day, month, year };
}

const matchPage = (pages, name) => {
  const n = norm(name);
  if (!n) return null;
  return (
    pages.find((p) => norm(p.name) === n) ||
    pages.find((p) => n.includes(norm(p.name)) || norm(p.name).includes(n)) ||
    null
  );
};

const truthy = (v) => /^(s|si|sì|y|yes|true|1|x|✓)$/i.test(String(v ?? "").trim());

// Rileva le colonne in una riga di intestazione, in modo tollerante: per ogni
// campo prova un elenco ORDINATO di parole chiave (la prima vince) e cerca per
// contenuto, non solo per uguaglianza. Ogni colonna è assegnata a un solo campo.
const FIELD_KEYWORDS = [
  ["date", ["data", "date", "giorno"]],
  // "caption pronta" deve battere "testo nel post": "caption" ha priorità.
  ["caption", ["caption", "didascalia", "contenuto", "testo del post", "testo nel post", "testo", "text", "copy", "post"]],
  // "binario"/"pilastro" prima di "categoria" generica per i piani tipo eenvee.
  ["category", ["rubrica", "binario", "pilastro", "categoria", "category", "tema", "tipo"]],
  ["page", ["pagina", "profilo", "account", "canale", "page"]],
  ["hashtags", ["hashtag", "hashtags", "tag"]],
  ["sponsored", ["sponsorizzato", "sponsor", "adv", "ads"]],
];

function detectColumns(headerCells) {
  const used = new Set();
  const col = {};
  for (const [field, kws] of FIELD_KEYWORDS) {
    let best = { ci: -1, rank: Infinity };
    headerCells.forEach((cell, ci) => {
      if (used.has(ci)) return;
      const c = norm(cell);
      if (!c) return;
      for (let k = 0; k < kws.length; k++) {
        const kw = kws[k];
        const match = c === kw ? 0 : c.startsWith(kw) ? 1 : c.includes(kw) ? 2 : -1;
        if (match >= 0) {
          // la priorità della parola chiave domina sul tipo di match
          const rank = k * 10 + match;
          if (rank < best.rank) best = { ci, rank };
          break; // prima keyword che combacia per questo campo in questa cella
        }
      }
    });
    if (best.ci !== -1) {
      col[field] = best.ci;
      used.add(best.ci);
    }
  }
  return col;
}

// --- Formato 1: template a colonne ---
export function parseTemplate(rows, client, view) {
  let headerRow = -1;
  let col = {};
  for (let r = 0; r < Math.min(rows.length, 12); r++) {
    const map = detectColumns(rows[r] || []);
    // serve almeno data + (caption o categoria) per dire "è un'intestazione"
    if (map.date !== undefined && (map.caption !== undefined || map.category !== undefined)) {
      headerRow = r;
      col = map;
      break;
    }
  }
  if (headerRow === -1) return null;

  // Anno di riferimento: cercato nelle righe sopra l'intestazione (es. nel
  // titolo "… al 15 luglio 2026"); altrimenti l'anno della vista corrente.
  let baseYear = view.year;
  for (let r = 0; r <= headerRow; r++) {
    for (const cell of rows[r] || []) {
      const ym = String(cell ?? "").match(/\b(20\d{2})\b/);
      if (ym) {
        baseYear = Number(ym[1]);
        break;
      }
    }
  }

  const posts = [];
  let prevMonth = null;
  let year = baseYear;
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const capRaw = col.caption !== undefined ? String(row[col.caption] ?? "").trim() : "";
    const dateRaw = col.date !== undefined ? row[col.date] : null;
    const catRaw = col.category !== undefined ? String(row[col.category] ?? "").trim() : "";
    if (!capRaw && !dateRaw && !catRaw) continue;

    // Data: per le stringhe gg/mm il parser dedicato ha priorità (evita che
    // "Mar 16/6" venga interpretato a caso da new Date); Date/seriali/ISO via toDate.
    let day, month;
    if (dateRaw instanceof Date || typeof dateRaw === "number") {
      const full = toDate(dateRaw);
      if (full) {
        day = full.getDate();
        month = full.getMonth() + 1;
        year = full.getFullYear();
      }
    } else {
      const s = String(dateRaw ?? "");
      const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (iso) {
        year = Number(iso[1]);
        month = Number(iso[2]);
        day = Number(iso[3]);
      } else {
        const dm = parseDayMonth(s);
        if (dm) {
          day = dm.day;
          month = dm.month;
          if (dm.year) year = dm.year;
          else if (prevMonth !== null && month < prevMonth) year = year + 1; // es. dic→gen
        } else {
          const full = toDate(s);
          if (full) {
            day = full.getDate();
            month = full.getMonth() + 1;
            year = full.getFullYear();
          }
        }
      }
    }
    if (day === undefined) {
      if (!capRaw) continue; // né data né testo utile
      day = 1;
      month = view.month;
    }
    prevMonth = month;

    // Caption = testo pronto (+ hashtag, se in colonna a parte).
    let caption = capRaw;
    if (col.hashtags !== undefined) {
      const tags = String(row[col.hashtags] ?? "").trim();
      if (tags) caption = caption ? `${caption}\n\n${tags}` : tags;
    }

    const pageName = col.page !== undefined ? String(row[col.page] ?? "").trim() : "";
    const page = matchPage(client.pages, pageName);
    posts.push({
      pageId: (page || client.pages[0])?.id,
      pageName: page ? page.name : pageName,
      matched: !!page || !pageName, // singola pagina: nessun nome da abbinare
      year,
      month,
      day,
      category: catRaw,
      caption,
      sponsored: col.sponsored !== undefined ? truthy(row[col.sponsored]) : false,
    });
  }
  return posts;
}

// --- Formato 2: griglia PED (settimane a blocchi, righe = pagina) ---
export function parseGrid(rows, client) {
  const isDayHeader = (row) =>
    (row || []).filter((c) => DAY_PREFIXES.some((d) => norm(c).startsWith(d)))
      .length >= 3;

  const posts = [];
  for (let r = 0; r < rows.length; r++) {
    if (!isDayHeader(rows[r])) continue;
    const headerRow = rows[r];
    const dayCols = [];
    headerRow.forEach((c, ci) => {
      if (DAY_PREFIXES.some((d) => norm(c).startsWith(d))) dayCols.push(ci);
    });
    const minDayCol = Math.min(...dayCols);

    // riga successiva = date
    const dateRow = rows[r + 1] || [];
    const colDate = {};
    dayCols.forEach((ci) => {
      const d = toDate(dateRow[ci]);
      if (d) colDate[ci] = d;
    });

    // righe-pagina fino al prossimo header giorno
    let pr = r + 2;
    for (; pr < rows.length && !isDayHeader(rows[pr]); pr++) {
      const prow = rows[pr] || [];
      let pageName = "";
      for (let ci = 0; ci < minDayCol; ci++) {
        if (norm(prow[ci])) {
          pageName = String(prow[ci]).trim();
          break;
        }
      }
      if (!pageName) continue;
      const page = matchPage(client.pages, pageName);
      dayCols.forEach((ci) => {
        const content = String(prow[ci] ?? "").trim();
        if (!content || !colDate[ci]) return;
        const { category, caption } = splitRubric(content);
        const d = colDate[ci];
        posts.push({
          pageId: (page || client.pages[0])?.id,
          pageName: page ? page.name : pageName,
          matched: !!page,
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          day: d.getDate(),
          category,
          caption,
          sponsored: false,
        });
      });
    }
    r = pr - 1;
  }
  return posts;
}

// Punto d'ingresso: legge il file, prova ogni foglio con entrambi i parser e
// sceglie il risultato con più post. SheetJS caricato on-demand.
export async function parseExcel(file, client, view) {
  const XLSX = await import("xlsx");
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: "array", cellDates: true });

  let best = { format: null, posts: [], sheet: null };
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      cellDates: true,
      defval: "",
    });

    const template = parseTemplate(rows, client, view);
    if (template && template.length > best.posts.length)
      best = { format: "template", posts: template, sheet: sheetName };

    const grid = parseGrid(rows, client);
    if (grid && grid.length > best.posts.length)
      best = { format: "grid", posts: grid, sheet: sheetName };
  }

  return best;
}
