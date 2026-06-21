import { useState, useMemo, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faPlus,
  faTimes,
  faShareNodes,
  faComment,
  faLink,
  faCheck,
  faCalendarDay,
  faClone,
  faTriangleExclamation,
  faUsers,
  faFileImport,
  faAddressBook,
  faPaperPlane,
  faBroom,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import { api } from "./api";
import PostChip from "./PostChip";
import PostModal from "./PostModal";
import ClientModal from "./ClientModal";
import DuplicateModal from "./DuplicateModal";
import UserManagementModal from "./UserManagementModal";
import ImportModal from "./ImportModal";
import ChannelIcon from "./ChannelIcon";
import useCalendarDnD from "./useCalendarDnD";
import { toast, toastErr, confirmDialog } from "./uiNotify";
import UiHost from "./UiHost";
import "./EditorialPlans.css";

const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const WEEKDAYS_IT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

// Data + ora dell'approvazione, sempre in fuso ITALIANO (Europe/Rome).
const fmtApprovalDate = (d) =>
  new Date(d).toLocaleString("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const now = new Date();
const TODAY = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };

// Settimane del mese (lun→dom) con celle (numero giorno o null)
function buildMonthMatrix(year, month) {
  const first = new Date(year, month - 1, 1);
  const startOffset = (first.getDay() + 6) % 7; // lun=0 … dom=6
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// Legge ruolo/userId dal JWT (solo per mostrare/nascondere funzioni admin lato UI;
// l'autorizzazione vera resta sul server).
function readToken() {
  try {
    return JSON.parse(atob((localStorage.getItem("token") || "").split(".")[1]));
  } catch {
    return {};
  }
}

const EditorialPlans = () => {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pageFilter, setPageFilter] = useState("all"); // "all" o id pagina
  const [view, setView] = useState({ year: TODAY.year, month: TODAY.month });
  const [modal, setModal] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [sharingAdmin, setSharingAdmin] = useState(false);
  const [shareAdminMsg, setShareAdminMsg] = useState("");
  const [approval, setApproval] = useState(null); // approvazione cliente del mese

  const me = useMemo(readToken, []);
  const isAdmin = me.role === "admin";
  const currentUserId = me.userId;

  // Carica i clienti all'avvio
  useEffect(() => {
    let alive = true;
    api
      .listClients()
      .then((cs) => {
        if (!alive) return;
        setClients(cs);
        setClientId((cur) => cur || cs[0]?.id || "");
      })
      .catch(() =>
        alive &&
        setError(
          "Impossibile caricare i piani editoriali. Verifica di aver effettuato l'accesso."
        )
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // Carica gli utenti (solo admin)
  useEffect(() => {
    if (isAdmin) api.listUsers().then(setUsers).catch(() => {});
  }, [isAdmin]);

  // Ricarica i post del cliente/mese corrente
  const reloadPosts = useCallback(() => {
    if (!clientId) {
      setPosts([]);
      return;
    }
    api
      .listPosts(clientId, view.year, view.month)
      .then(setPosts)
      .catch(() => {});
  }, [clientId, view.year, view.month]);

  useEffect(() => {
    reloadPosts();
  }, [reloadPosts]);

  // Stato approvazione del piano (cliente) per il cliente/mese corrente.
  useEffect(() => {
    if (!clientId) {
      setApproval(null);
      return;
    }
    api
      .getApproval(clientId, view.year, view.month)
      .then(setApproval)
      .catch(() => setApproval(null));
  }, [clientId, view.year, view.month]);

  const visiblePosts = useMemo(
    () =>
      posts.filter(
        (p) =>
          p.clientId === clientId &&
          p.year === view.year &&
          p.month === view.month &&
          (pageFilter === "all" || p.pageId === pageFilter)
      ),
    [posts, clientId, view, pageFilter]
  );

  const postsByDay = useMemo(() => {
    const map = {};
    for (const p of visiblePosts) (map[p.day] ||= []).push(p);
    return map;
  }, [visiblePosts]);

  const weeks = useMemo(() => buildMonthMatrix(view.year, view.month), [view]);

  // Drag & drop mouse+touch (movePost è definito più sotto: wrapper per l'ordine).
  const dnd = useCalendarDnD((post, day, pageId) => movePost(post, day, pageId));

  // Su schermi stretti (telefono) il calendario a 7 colonne diventa "vista
  // agenda" (giorni in elenco verticale): niente scroll orizzontale.
  const [isNarrow, setIsNarrow] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = (e) => setIsNarrow(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // ===== da qui in giù niente più hook =====
  const client = clients.find((c) => c.id === clientId);

  const handleClientChange = (id) => {
    setClientId(id);
    setPageFilter("all");
  };
  const goMonth = (delta) =>
    setView((v) => {
      const m = v.month + delta;
      if (m < 1) return { year: v.year - 1, month: 12 };
      if (m > 12) return { year: v.year + 1, month: 1 };
      return { ...v, month: m };
    });
  const goToday = () => setView({ year: TODAY.year, month: TODAY.month });

  const isMatrix = pageFilter === "all" && (client?.pages?.length || 0) > 1;
  const isToday = (day) =>
    !!day &&
    view.year === TODAY.year &&
    view.month === TODAY.month &&
    day === TODAY.day;
  // Conteggi "da rivedere": elementi aperti = note cliente non risolte o
  // richieste dell'agenzia non risolte (le spiegazioni non contano).
  const unresolvedCount = (p) =>
    (p.notes || []).filter(
      (n) => !n.resolved && (!n.fromAgency || n.needsReply)
    ).length;
  const notesOnDay = (day) =>
    visiblePosts
      .filter((p) => p.day === day)
      .reduce((n, p) => n + unresolvedCount(p), 0);
  const postsFor = (pageId, day) =>
    visiblePosts.filter((p) => p.pageId === pageId && p.day === day);
  const renderChannels = (pg) =>
    (pg.channels || []).map((ch) => <ChannelIcon key={ch} channel={ch} />);
  const pageName = (id) => client?.pages.find((p) => p.id === id)?.name || "";

  // mappa il post della UI (notes) nel payload del backend (clientNotes)
  const toPayload = (d) => ({
    pageId: d.pageId,
    year: d.year,
    month: d.month,
    day: d.day,
    caption: d.caption,
    category: d.category,
    media: d.media,
    sponsored: d.sponsored,
    status: d.status,
    clientNotes: d.notes || [],
  });

  const savePost = async (data, changed) => {
    try {
      if (data.id) {
        await api.updatePost(data.id, {
          ...toPayload(data),
          isDuplicate: data.isDuplicate && !changed,
        });
      } else {
        await api.createPost({ ...toPayload(data), clientId });
      }
      setModal(null);
      // se il post è stato spostato in un altro mese/anno, vai a quel mese così
      // lo vedi atterrare (altrimenti sparirebbe dalla vista corrente).
      if (Number(data.year) !== view.year || Number(data.month) !== view.month) {
        setView({ year: Number(data.year), month: Number(data.month) });
      } else {
        reloadPosts();
      }
    } catch {
      toastErr("Errore nel salvataggio del post.");
    }
  };

  const deletePost = async (id) => {
    try {
      await api.deletePost(id);
      setModal(null);
      reloadPosts();
    } catch {
      toastErr("Errore nell'eliminazione del post.");
    }
  };

  // ----- Drag & drop (mouse + touch): sposta un post su un altro giorno (e,
  // nella matrice, anche su un'altra pagina). Aggiornamento ottimistico. -----
  const movePost = async (post, day, pageId) => {
    if (!post) return;
    const newPageId = pageId || post.pageId;
    if (post.day === day && post.pageId === newPageId) return; // nessuno spostamento
    const updated = { ...post, day, pageId: newPageId };
    setPosts((prev) => prev.map((p) => (p.id === post.id ? updated : p))); // ottimistico
    try {
      await api.updatePost(post.id, {
        ...toPayload(updated),
        isDuplicate: post.isDuplicate, // spostare non è "revisionare": preserva il flag
      });
    } catch {
      toastErr("Spostamento del post non riuscito.");
      reloadPosts();
    }
  };

  const prevMonth =
    view.month === 1
      ? { year: view.year - 1, month: 12 }
      : { year: view.year, month: view.month - 1 };

  const duplicateFrom = async (fromYear, fromMonth) => {
    if (
      posts.length > 0 &&
      !(await confirmDialog(
        `${MONTHS_IT[view.month - 1]} ${view.year} contiene già dei post. Aggiungere comunque i duplicati da ${MONTHS_IT[fromMonth - 1]} ${fromYear}?`
      ))
    )
      return;
    try {
      await api.duplicateMonth({
        clientId,
        fromYear,
        fromMonth,
        toYear: view.year,
        toMonth: view.month,
      });
      reloadPosts();
    } catch (e) {
      if (e?.response?.status === 404)
        toastErr(
          `Nessun post da duplicare in ${MONTHS_IT[fromMonth - 1]} ${fromYear}.`
        );
      else toastErr("Errore nella duplicazione del mese.");
    }
  };
  const handleDuplicatePrev = () =>
    duplicateFrom(prevMonth.year, prevMonth.month);

  const importPosts = async (parsed, onProgress) => {
    // IDEMPOTENTE: carico i post già esistenti dei mesi coinvolti e salto quelli
    // identici (stessa pagina/giorno/caption) → reimportare non crea duplicati.
    const keyOf = (pageId, day, caption) =>
      `${pageId}|${day}|${String(caption || "").trim()}`;
    const existing = new Set();
    const months = [...new Set(parsed.map((p) => `${p.year}-${p.month}`))];
    for (const ym of months) {
      const [y, m] = ym.split("-").map(Number);
      try {
        const ps = await api.listPosts(clientId, y, m);
        ps.forEach((p) => existing.add(keyOf(p.pageId, p.day, p.caption)));
      } catch {
        /* se non riesco a leggere, proseguo comunque */
      }
    }

    let ok = 0;
    let skipped = 0;
    const failed = [];
    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i];
      const pageId = p.pageId || client.pages[0]?.id;
      const key = keyOf(pageId, p.day, p.caption);
      if (existing.has(key)) {
        skipped++;
        onProgress?.(i + 1, parsed.length);
        continue; // già presente → non duplico
      }
      try {
        await api.createPost({
          clientId,
          pageId,
          year: p.year,
          month: p.month,
          day: p.day,
          category: p.category || "",
          caption: p.caption || "",
          media: [],
          sponsored: !!p.sponsored,
          status: "approved", // importati = post effettivi, non bozze
        });
        existing.add(key); // evita duplicati anche all'interno dello stesso file
        ok++;
      } catch (e) {
        // non interrompo l'intero import per un singolo post: registro e proseguo
        console.error(
          "Import post fallito:",
          e?.response?.status,
          e?.response?.data || e?.message
        );
        failed.push(p);
      }
      onProgress?.(i + 1, parsed.length);
    }
    setImportOpen(false);
    // gli import possono coprire più mesi: vai sul mese del primo post importato
    const first = parsed[0];
    if (
      first &&
      (Number(first.year) !== view.year || Number(first.month) !== view.month)
    ) {
      setView({ year: Number(first.year), month: Number(first.month) });
    } else {
      reloadPosts();
    }
    const parts = [`Importati ${ok} post`];
    if (skipped) parts.push(`${skipped} già presenti (saltati)`);
    if (failed.length) parts.push(`${failed.length} non importati (vedi console)`);
    toast(parts.join(" · ") + ".", failed.length ? "error" : "success");
  };

  // Pulizia: rimuove i post duplicati del mese corrente (admin).
  const removeDuplicates = async () => {
    if (!client) return;
    if (
      !(await confirmDialog(
        `Rimuovere i post duplicati di ${MONTHS_IT[view.month - 1]} ${view.year}? Resta una copia per ogni post (i post con note non vengono toccati).`,
        { danger: true, confirmLabel: "Rimuovi" }
      ))
    )
      return;
    try {
      const r = await api.dedupeMonth({
        clientId,
        year: view.year,
        month: view.month,
      });
      toast(
        r.removed
          ? `Rimossi ${r.removed} post duplicati.`
          : "Nessun duplicato trovato in questo mese.",
        r.removed ? "success" : "info"
      );
      reloadPosts();
    } catch {
      toastErr("Errore nella rimozione dei duplicati.");
    }
  };

  const openNew = (day, pageId) =>
    setModal({
      clientId,
      pageId: pageId || (pageFilter === "all" ? client.pages[0].id : pageFilter),
      year: view.year,
      month: view.month,
      day,
      category: "",
      caption: "",
      sponsored: false,
      media: [],
      notes: [],
    });

  const shareUrl = client
    ? `https://basicadv.com/p/${client.id}-${view.year}${String(view.month).padStart(2, "0")}`
    : "";
  const copyLink = () => {
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Destinatari del cliente (emails[] + email primario), dedotti e deduplicati.
  const clientEmails = client
    ? [
        ...new Map(
          [...(client.emails || []), client.email]
            .map((e) => String(e || "").trim())
            .filter(Boolean)
            .map((e) => [e.toLowerCase(), e])
        ).values(),
      ]
    : [];

  // Admin assegnati a questo cliente, risolti a oggetto utente quando possibile
  // (la lista utenti è disponibile solo agli admin; gli operatori vedono solo
  // il conteggio, ma possono comunque inviare → il backend risolve le email).
  const assignedAdmins = client
    ? (client.admins || [])
        .map(String)
        .map((id) => users.find((u) => String(u.id) === id))
        .filter(Boolean)
    : [];
  const hasAdmins = (client?.admins || []).length > 0;

  const openShare = () => {
    setShareMsg("");
    setShareAdminMsg("");
    setShareOpen(true);
  };
  const closeShare = () => {
    setShareOpen(false);
    setShareMsg("");
    setShareAdminMsg("");
  };
  const sendShareAdmin = async () => {
    setSharingAdmin(true);
    setShareAdminMsg("");
    try {
      const r = await api.shareAdmin({
        clientId,
        year: view.year,
        month: view.month,
      });
      const n = r.sent?.length || 0;
      setShareAdminMsg(
        `Inviato a ${n} admin` +
          (r.failed?.length ? ` · ${r.failed.length} non riusciti` : "")
      );
    } catch (e) {
      const msg = e?.response?.data?.error;
      toastErr(msg ? `Invio non riuscito: ${msg}` : "Invio all'admin non riuscito.");
    } finally {
      setSharingAdmin(false);
    }
  };
  const sendShare = async () => {
    setSharing(true);
    setShareMsg("");
    try {
      const r = await api.shareMonth({
        clientId,
        year: view.year,
        month: view.month,
      });
      const n = r.sent?.length || 0;
      setShareMsg(
        `Inviato a ${n} ${n === 1 ? "destinatario" : "destinatari"}` +
          (r.failed?.length ? ` · ${r.failed.length} non riusciti` : "")
      );
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.error;
      console.error("Errore invio piano:", status, e?.response?.data || e?.message);
      toastErr(
        msg
          ? `Invio non riuscito: ${msg}`
          : status === 404
          ? "Invio non riuscito (HTTP 404): la rotta /share non esiste sul server in esecuzione. Riavvia il server per applicare le ultime modifiche."
          : status
          ? `Invio non riuscito (HTTP ${status}).`
          : "Invio non riuscito: nessuna risposta dal server. Verifica che il server sia avviato."
      );
    } finally {
      setSharing(false);
    }
  };

  const totalNotes = visiblePosts.reduce((n, p) => n + unresolvedCount(p), 0);
  const duplicateCount = visiblePosts.filter((p) => p.isDuplicate).length;

  if (loading) {
    return (
      <div className="editorial-plans">
        <p className="ep-loading">Caricamento dei piani editoriali…</p>
      </div>
    );
  }

  return (
    <div className="editorial-plans">
      <UiHost />
      {error && (
        <div className="ep-dup-banner ep-error-banner">
          <FontAwesomeIcon icon={faTriangleExclamation} /> {error}
        </div>
      )}

      {/* ---- Intestazione + toolbar ---- */}
      <div className="ep-header">
        <div className="ep-header-left">
          <select
            className="ep-client-select"
            value={clientId}
            onChange={(e) => handleClientChange(e.target.value)}
          >
            {clients.length === 0 && <option value="">Nessun cliente</option>}
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {isAdmin && (
            <button className="ep-btn ep-btn--ghost" onClick={() => setClientModalOpen(true)}>
              <FontAwesomeIcon icon={faAddressBook} /> Clienti
            </button>
          )}
          {isAdmin && (
            <button className="ep-btn ep-btn--ghost" onClick={() => setUsersModalOpen(true)}>
              <FontAwesomeIcon icon={faUsers} /> Utenti
            </button>
          )}
          {client && (
            <button className="ep-btn ep-btn--ghost" onClick={() => setImportOpen(true)}>
              <FontAwesomeIcon icon={faFileImport} /> Importa Excel
            </button>
          )}
        </div>
        {client && (
          <button className="ep-btn ep-btn--primary" onClick={openShare}>
            <FontAwesomeIcon icon={faShareNodes} /> Condividi mese
          </button>
        )}
      </div>

      {!client ? (
        <div className="ep-empty">
          {isAdmin
            ? 'Nessun cliente ancora. Aprilo da "Clienti" e creane uno.'
            : "Non hai ancora clienti assegnati. Chiedi all'amministratore di assegnartene."}
        </div>
      ) : (
        <>
          {/* ---- Tab pagine ---- */}
          <div className="ep-pages">
            <button
              className={`ep-page-tab ${pageFilter === "all" ? "active" : ""}`}
              onClick={() => setPageFilter("all")}
            >
              Tutte le pagine
            </button>
            {client.pages.map((pg) => (
              <button
                key={pg.id}
                className={`ep-page-tab ${pageFilter === pg.id ? "active" : ""}`}
                onClick={() => setPageFilter(pg.id)}
              >
                <span className="ep-tab-dots">{renderChannels(pg)}</span>
                {pg.name}
              </button>
            ))}
          </div>

          {/* ---- Navigazione mese + legenda ---- */}
          <div className="ep-subbar">
            <div className="ep-month-nav">
              <button className="ep-icon-btn" onClick={() => goMonth(-1)} aria-label="Mese precedente">
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <h2 className="ep-month-title">
                {MONTHS_IT[view.month - 1]} {view.year}
              </h2>
              <button className="ep-icon-btn" onClick={() => goMonth(1)} aria-label="Mese successivo">
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
              <button className="ep-today-btn" onClick={goToday}>
                <FontAwesomeIcon icon={faCalendarDay} /> Oggi
              </button>
              <button className="ep-dup-btn" onClick={handleDuplicatePrev}>
                <FontAwesomeIcon icon={faClone} /> Duplica dal mese precedente
              </button>
              <button className="ep-dup-btn" onClick={() => setDupModalOpen(true)}>
                <FontAwesomeIcon icon={faClone} /> Duplica da…
              </button>
              {isAdmin && (
                <button className="ep-dup-btn" onClick={removeDuplicates}>
                  <FontAwesomeIcon icon={faBroom} /> Rimuovi duplicati
                </button>
              )}
            </div>
            <div className="ep-legend">
              <span className="ep-legend-item">
                <span className="ep-legend-swatch sponsored" />
                Sponsorizzato
              </span>
              <span className="ep-legend-item">
                <span className="ep-legend-swatch note" />
                Note del cliente
              </span>
              {totalNotes > 0 && (
                <span className="ep-legend-item ep-legend-count">
                  <FontAwesomeIcon icon={faComment} /> {totalNotes} da rivedere
                </span>
              )}
            </div>
          </div>

          {/* ---- Banner: piano approvato dal cliente ---- */}
          {approval && (
            <div
              className="ep-approved-banner"
              title={
                approval.count > 1 && approval.history
                  ? "Approvazioni: " +
                    approval.history.map((h) => fmtApprovalDate(h.at)).join(" · ")
                  : undefined
              }
            >
              <FontAwesomeIcon icon={faCheck} /> Piano approvato dal cliente
              {approval.by ? ` (${approval.by})` : ""}
              {approval.at ? ` il ${fmtApprovalDate(approval.at)}` : ""}
              {approval.count > 1
                ? ` · ${approval.count} approvazioni (passa il mouse per le date)`
                : "."}
            </div>
          )}

          {/* ---- Banner duplicati da rivedere ---- */}
          {duplicateCount > 0 && (
            <div className="ep-dup-banner">
              <FontAwesomeIcon icon={faClone} />
              {duplicateCount}{" "}
              {duplicateCount === 1
                ? "post duplicato dal mese scorso ancora da rivedere"
                : "post duplicati dal mese scorso ancora da rivedere"}{" "}
              — aprili e salva (o modificali) per confermarli prima di condividere.
            </div>
          )}

          {/* ---- Vista AGENDA (mobile): giorni in elenco verticale ---- */}
          {isNarrow ? (
            <div className="ep-agenda">
              {Array.from(
                { length: new Date(view.year, view.month, 0).getDate() },
                (_, i) => i + 1
              ).map((day) => {
                const dayPosts = postsByDay[day] || [];
                const wd =
                  WEEKDAYS_IT[
                    (new Date(view.year, view.month - 1, day).getDay() + 6) % 7
                  ];
                const dayNotes = notesOnDay(day);
                const showPage =
                  pageFilter === "all" && (client.pages?.length || 0) > 1;
                return (
                  <div
                    key={day}
                    className={`ep-agenda-day ${isToday(day) ? "is-today" : ""} ${
                      dayPosts.length === 0 ? "is-empty" : ""
                    } ${dnd.overKey === `d${day}` ? "ep-drop-over" : ""}`}
                    data-dropcell={`d${day}`}
                    data-day={day}
                  >
                    <div className="ep-agenda-head">
                      <span className="ep-agenda-date">
                        <b>{day}</b> {wd}
                      </span>
                      {dayNotes > 0 && (
                        <span
                          className="ep-day-note-badge"
                          title={`${dayNotes} note del cliente`}
                        >
                          <FontAwesomeIcon icon={faComment} />
                          {dayNotes}
                        </span>
                      )}
                      <button
                        className="ep-agenda-add"
                        onClick={() => openNew(day)}
                        aria-label="Aggiungi post"
                      >
                        <FontAwesomeIcon icon={faPlus} />
                      </button>
                    </div>
                    {dayPosts.length > 0 && (
                      <div className="ep-agenda-posts">
                        {dayPosts.map((p) => (
                          <div key={p.id} className="ep-agenda-post">
                            {showPage && (
                              <span className="ep-agenda-page">
                                {pageName(p.pageId)}
                              </span>
                            )}
                            <PostChip
                              post={p}
                              onClick={dnd.guardClick(() => setModal(p))}
                              movable
                              dndHandlers={dnd.handlers(p)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : isMatrix ? (
            <div className="ep-matrix">
              {weeks.map((week, wi) => (
                <div key={wi} className="ep-matrix-week">
                  <div className="ep-matrix-row ep-matrix-headrow">
                    <div className="ep-matrix-corner" />
                    {week.map((day, di) => (
                      <div
                        key={di}
                        className={`ep-matrix-dayhead ${isToday(day) ? "is-today" : ""}`}
                      >
                        {day && (
                          <>
                            <span className="ep-mh-wd">{WEEKDAYS_IT[di]}</span>
                            <span className="ep-mh-day">{day}</span>
                            {notesOnDay(day) > 0 && (
                              <span className="ep-mh-note" title="Note del cliente" />
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {client.pages.map((pg) => (
                    <div key={pg.id} className="ep-matrix-row">
                      <div className="ep-matrix-pagelabel">
                        <span className="ep-tab-dots">{renderChannels(pg)}</span>
                        <span className="ep-mp-name">{pg.name}</span>
                      </div>
                      {week.map((day, di) => {
                        if (!day)
                          return <div key={di} className="ep-matrix-cell is-empty" />;
                        const cps = postsFor(pg.id, day);
                        return (
                          <div
                            key={di}
                            className={`ep-matrix-cell ${
                              dnd.overKey === `m${pg.id}-${day}` ? "ep-drop-over" : ""
                            }`}
                            data-dropcell={`m${pg.id}-${day}`}
                            data-day={day}
                            data-page={pg.id}
                          >
                            {cps.map((p) => (
                              <PostChip
                                key={p.id}
                                post={p}
                                compact
                                onClick={dnd.guardClick(() => setModal(p))}
                                movable
                                dndHandlers={dnd.handlers(p)}
                              />
                            ))}
                            <button
                              className="ep-cell-add"
                              onClick={() => openNew(day, pg.id)}
                              aria-label="Aggiungi post"
                            >
                              <FontAwesomeIcon icon={faPlus} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            /* ---- Calendario classico (singola pagina) ---- */
            <div className="ep-calendar">
              <div className="ep-weekrow ep-weekdays">
                {WEEKDAYS_IT.map((w) => (
                  <div key={w} className="ep-weekday">
                    {w}
                  </div>
                ))}
              </div>

              {weeks.map((week, wi) => (
                <div key={wi} className="ep-weekrow">
                  {week.map((day, di) => {
                    if (!day)
                      return <div key={di} className="ep-day ep-day--empty" />;
                    const dayPosts = postsByDay[day] || [];
                    const dayNotes = notesOnDay(day);
                    return (
                      <div
                        key={di}
                        className={`ep-day ${isToday(day) ? "ep-day--today" : ""} ${
                          dnd.overKey === `d${day}` ? "ep-drop-over" : ""
                        }`}
                        data-dropcell={`d${day}`}
                        data-day={day}
                      >
                        <div className="ep-day-head">
                          <span className="ep-day-num">{day}</span>
                          <div className="ep-day-head-right">
                            {dayNotes > 0 && (
                              <span
                                className="ep-day-note-badge"
                                title={`${dayNotes} note del cliente`}
                              >
                                <FontAwesomeIcon icon={faComment} />
                                {dayNotes}
                              </span>
                            )}
                            <button
                              className="ep-day-add"
                              onClick={() => openNew(day)}
                              aria-label="Aggiungi post"
                            >
                              <FontAwesomeIcon icon={faPlus} />
                            </button>
                          </div>
                        </div>
                        <div className="ep-day-posts">
                          {dayPosts.map((p) => (
                            <PostChip
                              key={p.id}
                              post={p}
                              onClick={dnd.guardClick(() => setModal(p))}
                              movable
                              dndHandlers={dnd.handlers(p)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ---- Modale post ---- */}
      {modal && client && (
        <PostModal
          draft={modal}
          client={client}
          onClose={() => setModal(null)}
          onSave={savePost}
          onDelete={deletePost}
        />
      )}

      {/* ---- Modale gestione clienti (admin) ---- */}
      {clientModalOpen && (
        <ClientModal
          clients={clients}
          adminUsers={users.filter((u) => u.role === "admin")}
          onClose={() => setClientModalOpen(false)}
          onCreate={async (data) => {
            try {
              const created = await api.createClient(data);
              setClients(await api.listClients());
              setClientId(created.id);
              setPageFilter("all");
            } catch {
              toastErr("Errore nella creazione del cliente.");
            }
          }}
          onUpdate={async (id, data) => {
            try {
              await api.updateClient(id, data);
              setClients(await api.listClients());
              // le pagine potrebbero essere cambiate: riallinea il filtro
              if (id === clientId) setPageFilter("all");
            } catch {
              toastErr("Errore nell'aggiornamento del cliente.");
            }
          }}
          onDelete={async (id) => {
            try {
              await api.deleteClient(id);
              const list = await api.listClients();
              setClients(list);
              if (id === clientId) {
                setClientId(list[0]?.id || "");
                setPageFilter("all");
              }
            } catch {
              toastErr("Errore nell'eliminazione del cliente.");
            }
          }}
        />
      )}

      {/* ---- Modale "Duplica da…" ---- */}
      {dupModalOpen && client && (
        <DuplicateModal
          defaultYear={prevMonth.year}
          defaultMonth={prevMonth.month}
          targetLabel={`${MONTHS_IT[view.month - 1]} ${view.year}`}
          onClose={() => setDupModalOpen(false)}
          onConfirm={async (y, m) => {
            await duplicateFrom(y, m);
            setDupModalOpen(false);
          }}
        />
      )}

      {/* ---- Modale gestione utenti (admin) ---- */}
      {usersModalOpen && (
        <UserManagementModal
          users={users}
          clients={clients}
          currentUserId={currentUserId}
          onClose={() => setUsersModalOpen(false)}
          onCreate={async (u) => {
            try {
              await api.createUser(u);
              setUsers(await api.listUsers());
            } catch (e) {
              toastErr(
                e?.response?.data?.error || "Errore nella creazione dell'utente."
              );
            }
          }}
          onUpdate={async (id, data) => {
            try {
              await api.updateUser(id, data);
              setUsers(await api.listUsers());
            } catch (e) {
              toastErr(
                e?.response?.data?.error ||
                  "Errore nell'aggiornamento dell'utente."
              );
            }
          }}
          onDelete={async (id) => {
            try {
              await api.deleteUser(id);
              setUsers(await api.listUsers());
            } catch (e) {
              toastErr(
                e?.response?.data?.error || "Errore nell'eliminazione dell'utente."
              );
            }
          }}
        />
      )}

      {/* ---- Modale import Excel ---- */}
      {importOpen && client && (
        <ImportModal
          client={client}
          view={view}
          onClose={() => setImportOpen(false)}
          onConfirm={importPosts}
        />
      )}

      {/* ---- Modale condivisione (invia email al cliente) ---- */}
      {shareOpen && client && (
        <div className="ep-modal-overlay" onClick={closeShare}>
          <div className="ep-modal ep-modal--share" onClick={(e) => e.stopPropagation()}>
            <div className="ep-modal-head">
              <h3>Invia il piano al cliente</h3>
              <button className="ep-icon-btn" onClick={closeShare} aria-label="Chiudi">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="ep-modal-body">
              {duplicateCount > 0 && (
                <div className="ep-share-warning">
                  <FontAwesomeIcon icon={faTriangleExclamation} /> Attenzione:{" "}
                  {duplicateCount} post sono ancora duplicati dal mese scorso e non
                  rivisti. Controllali prima di inviare al cliente.
                </div>
              )}
              <p className="ep-share-desc">
                Invia a <strong>{client.name}</strong> il piano di{" "}
                {MONTHS_IT[view.month - 1]} {view.year}. Riceverà un'email con il
                link per vedere i post e lasciare le sue note.
              </p>

              {clientEmails.length ? (
                <>
                  <label className="ep-field-label">Destinatari</label>
                  <div className="ep-user-clients">
                    {clientEmails.map((e) => (
                      <span key={e} className="ep-client-chip">
                        {e}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="ep-share-warning">
                  <FontAwesomeIcon icon={faTriangleExclamation} /> Questo cliente non
                  ha email. Aggiungine almeno una da “Clienti”.
                </div>
              )}

              {shareMsg && (
                <div className="ep-share-ok">
                  <FontAwesomeIcon icon={faCheck} /> {shareMsg}
                </div>
              )}

              <div className="ep-foot-right ep-share-actions">
                <button
                  className="ep-btn ep-btn--primary"
                  onClick={sendShare}
                  disabled={!clientEmails.length || sharing}
                >
                  <FontAwesomeIcon icon={faPaperPlane} />{" "}
                  {sharing ? "Invio in corso…" : "Invia al cliente"}
                </button>
              </div>

              <p className="ep-share-hint">
                Oppure copia il link e invialo a mano:
              </p>
              <div className="ep-share-link">
                <FontAwesomeIcon icon={faLink} className="ep-share-link-icon" />
                <input readOnly value={shareUrl} />
                <button className="ep-btn ep-btn--ghost" onClick={copyLink}>
                  <FontAwesomeIcon icon={copied ? faCheck : faShareNodes} />
                  {copied ? "Copiato" : "Copia"}
                </button>
              </div>

              {/* Revisione interna: invio agli admin assegnati (link dashboard) */}
              <div className="ep-share-admin">
                <div className="ep-share-admin-head">
                  <FontAwesomeIcon icon={faUserShield} /> Revisione interna (admin)
                </div>
                <p className="ep-share-desc">
                  Manda il piano agli admin assegnati per una revisione prima del
                  cliente: lo aprono in dashboard per modificarlo e lasciare note
                  interne (mai visibili al cliente).
                </p>
                {hasAdmins ? (
                  assignedAdmins.length > 0 ? (
                    <div className="ep-user-clients">
                      {assignedAdmins.map((a) => (
                        <span key={a.id} className="ep-client-chip">
                          {a.name || a.username}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="ep-share-hint">
                      {client.admins.length} admin assegnati a questo cliente.
                    </p>
                  )
                ) : (
                  <div className="ep-share-warning">
                    <FontAwesomeIcon icon={faTriangleExclamation} /> Nessun admin
                    assegnato.
                    {isAdmin
                      ? " Assegnalo dalla scheda “Clienti”."
                      : " Chiedi a un admin di assegnarlo."}
                  </div>
                )}
                {shareAdminMsg && (
                  <div className="ep-share-ok">
                    <FontAwesomeIcon icon={faCheck} /> {shareAdminMsg}
                  </div>
                )}
                <div className="ep-foot-right ep-share-actions">
                  <button
                    className="ep-btn ep-btn--ghost"
                    onClick={sendShareAdmin}
                    disabled={!hasAdmins || sharingAdmin}
                  >
                    <FontAwesomeIcon icon={faUserShield} />{" "}
                    {sharingAdmin ? "Invio in corso…" : "Invia all'admin"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Ghost del post in trascinamento (segue il puntatore) ---- */}
      {dnd.dragPost && (
        <div className="ep-drag-ghost" ref={dnd.ghostRef}>
          {dnd.dragPost.category && (
            <span className="ep-drag-ghost-cat">{dnd.dragPost.category}</span>
          )}
          <span className="ep-drag-ghost-cap">
            {(dnd.dragPost.caption || "Post").slice(0, 60)}
          </span>
        </div>
      )}
    </div>
  );
};

export default EditorialPlans;
