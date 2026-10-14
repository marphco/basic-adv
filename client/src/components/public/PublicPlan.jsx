import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBullhorn,
  faPaperPlane,
  faLock,
  faPlay,
  faCheck,
  faComment,
  faTimes,
  faImage,
  faSpinner,
  faChevronLeft,
  faChevronRight,
  faFilePdf,
  faUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import useNoindex from "../../hooks/useNoindex";
import { categoryColor } from "../dashboard/editorial/mockData";
import PostChip from "../dashboard/editorial/PostChip";
import ChannelIcon from "../dashboard/editorial/ChannelIcon";
import {
  toastErr,
  confirmDialog,
  promptDialog,
} from "../dashboard/editorial/uiNotify";
import UiHost from "../dashboard/editorial/UiHost";
import "../dashboard/editorial/EditorialPlans.css";
import LogoIcon from "../../assets/icon-white.svg";
import "./PublicPlan.css";
import { TESTI, LINGUE, erroreServer, fmtDataOra } from "./testiPiano";
import useLingua from "./useLingua";
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(
  /\/$/,
  ""
);

// Frase con parti in grassetto: le stringhe sono testo, gli elenchi annidati
// grassetto (vedi testiPiano.js).
const Testo = ({ parti }) =>
  parti.map((x, i) =>
    Array.isArray(x) ? <strong key={i}>{x.join("")}</strong> : <span key={i}>{x}</span>
  );

function parseSlug(slug) {
  const m = String(slug || "").match(/^([a-f0-9]{24})-(\d{4})(\d{2})$/i);
  if (!m) return null;
  return { clientId: m[1], year: Number(m[2]), month: Number(m[3]) };
}

function buildMonthMatrix(year, month) {
  const first = new Date(year, month - 1, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// Vista pubblica del piano editoriale (cliente): gate via email, sola lettura,
// calendario/matrice su desktop, agenda su mobile. Le note sono modificabili/
// eliminabili dal cliente; l'agenzia viene avvisata con UNA sola email quando il
// cliente clicca "Invia il feedback" (mai una email per nota).
export default function PublicPlan() {
  useNoindex();
  // Lingua del sito (Italia → italiano, altrove → inglese, o quella scelta).
  const [lingua, scegliLingua] = useLingua();
  const T = TESTI[lingua];
  // Guard definitivo anti scroll-orizzontale su mobile: blocca l'overflow-x a
  // livello di documento (html+body), cross-browser (anche iOS Safari dove
  // `overflow: clip` può non bastare). Solo mentre la vista pubblica è montata.
  useEffect(() => {
    document.documentElement.classList.add("pp-no-hscroll");
    document.body.classList.add("pp-no-hscroll");
    return () => {
      document.documentElement.classList.remove("pp-no-hscroll");
      document.body.classList.remove("pp-no-hscroll");
    };
  }, []);
  const { pathname } = useLocation();
  const parsed = useMemo(
    () => parseSlug(pathname.replace(/^\/p\//, "").replace(/\/$/, "")),
    [pathname]
  );

  // Persistenza accesso cliente: localStorage con scadenza 30 giorni. Sopravvive
  // a refresh e riapertura del link (stesso browser); dopo 30 gg richiede l'email.
  const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;
  const storeKey = parsed
    ? `pp:${parsed.clientId}-${parsed.year}${String(parsed.month).padStart(2, "0")}`
    : "";
  const readStoredEmail = () => {
    if (!storeKey) return "";
    try {
      const o = JSON.parse(localStorage.getItem(storeKey) || "null");
      if (!o || !o.email || !o.exp || Date.now() > o.exp) {
        localStorage.removeItem(storeKey);
        return "";
      }
      return o.email;
    } catch {
      return "";
    }
  };

  const [email, setEmail] = useState("");
  const [data, setData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // { server, stato } dell'ultimo accesso fallito

  const [selected, setSelected] = useState(null); // post aperto nel modale
  const [lightbox, setLightbox] = useState(null); // media aperto a tutto schermo
  const [noteText, setNoteText] = useState(""); // nuova nota
  const [noteMedia, setNoteMedia] = useState([]); // allegati della nuova nota
  const [noteUploading, setNoteUploading] = useState(false);
  const noteFileRef = useRef(null);
  const [noteSending, setNoteSending] = useState(false);
  const [editingNote, setEditingNote] = useState(null); // noteId in modifica
  const [editText, setEditText] = useState("");

  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [approval, setApproval] = useState(null); // { by, at } se approvato
  const [approving, setApproving] = useState(false);
  // true mentre si tenta il riaccesso automatico da email salvata (evita il
  // "lampo" del gate al refresh: mostro un caricamento finché non ho i dati).
  const [booting, setBooting] = useState(() => !!readStoredEmail());

  const [isNarrow, setIsNarrow] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const on = (e) => setIsNarrow(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // ESC chiude il lightbox media (se aperto).
  // Carosello del lightbox (più media): precedente/successivo ciclici.
  const lightboxPrev = () =>
    setLightbox(
      (lb) =>
        lb && {
          ...lb,
          index: (lb.index - 1 + lb.list.length) % lb.list.length,
        }
    );
  const lightboxNext = () =>
    setLightbox(
      (lb) => lb && { ...lb, index: (lb.index + 1) % lb.list.length }
    );
  const lbTouchX = useRef(null);
  const onLbTouchStart = (e) => {
    lbTouchX.current = e.touches[0]?.clientX ?? null;
  };
  const onLbTouchEnd = (e) => {
    if (lbTouchX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - lbTouchX.current;
    lbTouchX.current = null;
    if (Math.abs(dx) > 40) (dx < 0 ? lightboxNext : lightboxPrev)();
  };

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightbox(null);
      else if (e.key === "ArrowLeft") lightboxPrev();
      else if (e.key === "ArrowRight") lightboxNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const year = data?.year;
  const month = data?.month;
  const pages = data?.pages || [];
  const isMatrix = pages.length > 1;
  const weeks = useMemo(
    () => (data ? buildMonthMatrix(year, month) : []),
    [data, year, month]
  );
  const postsByDay = useMemo(() => {
    const map = {};
    for (const p of posts) (map[p.day] ||= []).push(p);
    return map;
  }, [posts]);
  const daysWithPosts = useMemo(
    () =>
      Object.keys(postsByDay)
        .map(Number)
        .sort((a, b) => a - b),
    [postsByDay]
  );
  // Note "in sospeso" = non ancora risolte dall'agenzia. Se ce ne sono, il
  // cliente sta chiedendo modifiche → non mostriamo "Approva".
  const pendingNotes = useMemo(
    () =>
      posts.reduce(
        (n, p) =>
          n +
          (p.notes || []).filter((x) => !x.fromAgency && !x.resolved).length,
        0
      ),
    [posts]
  );

  const doAccess = async (em) => {
    const val = String(em || "").trim();
    if (!val) return;
    setLoading(true);
    setError(null);
    try {
      const r = await axios.post(`${API_URL}/api/public/plan/access`, {
        clientId: parsed.clientId,
        year: parsed.year,
        month: parsed.month,
        email: val,
      });
      setData(r.data);
      setPosts(r.data.posts || []);
      setApproval(r.data.approval || null);
      try {
        localStorage.setItem(
          storeKey,
          JSON.stringify({ email: val, exp: Date.now() + SESSION_TTL })
        );
      } catch {
        /* localStorage non disponibile */
      }
    } catch (err) {
      // Si conserva com'è arrivato e si traduce quando si disegna: se il
      // cliente cambia lingua, cambia anche il messaggio.
      setError({
        server: err?.response?.data?.error || "",
        stato: err?.response?.status || 0,
      });
      try {
        localStorage.removeItem(storeKey);
      } catch {
        /* no-op */
      }
    } finally {
      setLoading(false);
      setBooting(false);
    }
  };
  const submitAccess = (e) => {
    e.preventDefault();
    doAccess(email);
  };

  // Auto-accesso al reload/riapertura se l'email salvata è valida e non scaduta.
  useEffect(() => {
    const stored = readStoredEmail();
    if (stored) {
      setEmail(stored);
      doAccess(stored);
    } else {
      setBooting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const base = { clientId: parsed?.clientId, year: parsed?.year, month: parsed?.month, email: email.trim() };
  const applyNotes = (postId, notes) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, notes } : p)));
    setSelected((s) => (s && s.id === postId ? { ...s, notes } : s));
    setFeedbackSent(false); // se cambio le note, potrei volerle re-inviare
  };

  // Carica foto/video da allegare alla nuova nota (gated lato server).
  const uploadNoteFilesList = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) =>
      /^(image|video)\//.test(f.type)
    );
    if (!files.length) return;
    setNoteUploading(true);
    try {
      const fd = new FormData();
      Object.entries(base).forEach(([k, v]) => fd.append(k, v));
      files.forEach((f) => fd.append("files", f));
      const r = await axios.post(`${API_URL}/api/public/plan/media`, fd);
      setNoteMedia((prev) => [...prev, ...(r.data.media || [])]);
    } catch (err) {
      toastErr(erroreServer(err?.response?.data?.error, lingua, T.erroreAllegati));
    } finally {
      setNoteUploading(false);
    }
  };
  const uploadNoteFiles = (e) => {
    uploadNoteFilesList(e.target.files);
    e.target.value = "";
  };
  const removeNoteMedia = (i) =>
    setNoteMedia((prev) => prev.filter((_, idx) => idx !== i));

  // Drag & drop allegati sul form nota.
  const [noteDragOver, setNoteDragOver] = useState(false);
  const onNoteDrop = (e) => {
    e.preventDefault();
    setNoteDragOver(false);
    if (e.dataTransfer?.files?.length) uploadNoteFilesList(e.dataTransfer.files);
  };
  const onNoteDragOver = (e) => {
    e.preventDefault();
    if (!noteDragOver) setNoteDragOver(true);
  };
  const onNoteDragLeave = (e) => {
    e.preventDefault();
    setNoteDragOver(false);
  };

  const createNote = async () => {
    if (!selected || (!noteText.trim() && !noteMedia.length)) return;
    setNoteSending(true);
    try {
      const r = await axios.post(`${API_URL}/api/public/plan/note`, {
        ...base,
        postId: selected.id,
        text: noteText.trim(),
        media: noteMedia,
      });
      applyNotes(selected.id, r.data.notes);
      setNoteText("");
      setNoteMedia([]);
    } catch (err) {
      toastErr(erroreServer(err?.response?.data?.error, lingua, T.erroreNota));
    } finally {
      setNoteSending(false);
    }
  };

  const saveEdit = async (noteId) => {
    if (!editText.trim()) return;
    try {
      const r = await axios.put(`${API_URL}/api/public/plan/note`, {
        ...base,
        postId: selected.id,
        noteId,
        text: editText.trim(),
      });
      applyNotes(selected.id, r.data.notes);
      setEditingNote(null);
      setEditText("");
    } catch (err) {
      toastErr(erroreServer(err?.response?.data?.error, lingua, T.erroreModifica));
    }
  };

  const deleteNote = async (noteId) => {
    if (
      !(await confirmDialog(T.eliminaNotaDomanda, {
        danger: true,
        confirmLabel: T.elimina,
        cancelLabel: T.annulla,
      }))
    )
      return;
    try {
      const r = await axios.delete(`${API_URL}/api/public/plan/note`, {
        data: { ...base, postId: selected.id, noteId },
      });
      applyNotes(selected.id, r.data.notes);
    } catch (err) {
      toastErr(erroreServer(err?.response?.data?.error, lingua, T.erroreElimina));
    }
  };

  const submitFeedback = async () => {
    const message = await promptDialog(T.inviaMessaggio, {
      title: T.inviaTitolo,
      confirmLabel: T.inviaConferma,
      cancelLabel: T.annulla,
      placeholder: T.inviaEsempio,
    });
    if (message === null) return; // annullato
    setFeedbackSending(true);
    try {
      await axios.post(`${API_URL}/api/public/plan/notify`, { ...base, message });
      setFeedbackSent(true);
    } catch (err) {
      toastErr(erroreServer(err?.response?.data?.error, lingua, T.erroreFeedback));
    } finally {
      setFeedbackSending(false);
    }
  };

  const approvePlan = async () => {
    const message = await promptDialog(T.approvaMessaggio, {
      title: T.approvaTitolo,
      confirmLabel: T.approvaConferma,
      cancelLabel: T.annulla,
      placeholder: T.approvaEsempio,
    });
    if (message === null) return; // annullato
    setApproving(true);
    try {
      const r = await axios.post(`${API_URL}/api/public/plan/approve`, {
        ...base,
        message,
      });
      setApproval({ ...(r.data.approval || {}), changedSince: false });
    } catch (err) {
      toastErr(erroreServer(err?.response?.data?.error, lingua, T.erroreApprova));
    } finally {
      setApproving(false);
    }
  };

  const openPost = (p) => {
    setSelected(p);
    setNoteText("");
    setNoteMedia([]);
    setEditingNote(null);
    setEditText("");
  };
  const closeModal = () => {
    setSelected(null);
    setEditingNote(null);
    setEditText("");
  };

  const pageName = (id) => pages.find((p) => p.id === id)?.name || "";
  const pageChannels = (id) => pages.find((p) => p.id === id)?.channels || [];
  const postsFor = (pageId, day) =>
    posts.filter((p) => p.pageId === pageId && p.day === day);
  const notesOnDay = (day) =>
    (postsByDay[day] || []).reduce(
      (n, p) =>
        n +
        (p.notes || []).filter(
          (x) => !x.resolved && (!x.fromAgency || x.needsReply)
        ).length,
      0
    );
  const today = new Date();
  const isToday = (day) =>
    !!day &&
    year === today.getFullYear() &&
    month === today.getMonth() + 1 &&
    day === today.getDate();
  const renderChannels = (id) =>
    pageChannels(id).map((ch) => <ChannelIcon key={ch} channel={ch} />);

  const header = (
    <div className="pp-header">
      <img src={LogoIcon} alt="Basic" className="pp-logo" />
      {data && (
        <div className="pp-title">
          <span className="pp-month">
            {T.mesi[data.month - 1]} {data.year}
          </span>
          <span className="pp-client">{data.client?.name}</span>
        </div>
      )}
      {/* La lingua la sceglie il sito da solo; questo è per chi la vuole
          diversa (un italiano all'estero, uno straniero in Italia). La
          scelta resta salvata per le prossime aperture. */}
      <div className="pp-lang" role="group" aria-label={T.cambiaLingua}>
        {LINGUE.map((l, i) => (
          <span key={l} className="pp-lang-item">
            {i > 0 && <span className="pp-lang-sep" aria-hidden="true">·</span>}
            <button
              type="button"
              className={`pp-lang-btn ${lingua === l ? "is-on" : ""}`}
              aria-pressed={lingua === l}
              onClick={() => scegliLingua(l)}
            >
              {l.toUpperCase()}
            </button>
          </span>
        ))}
      </div>
    </div>
  );

  // Messaggio dell'ultimo accesso fallito, nella lingua di adesso.
  const testoErrore = !error
    ? ""
    : erroreServer(
        error.server,
        lingua,
        error.stato === 404
          ? T.erroreServizio
          : error.stato
          ? T.erroreAccesso(error.stato)
          : T.erroreRete
      );

  if (!parsed) {
    return (
      <div className="pp-wrap">
        {header}
        <div className="pp-card pp-gate">
          <p>{T.linkNonValido}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    // riaccesso automatico in corso: mostro un caricamento, non il gate
    if (booting) {
      return (
        <div className="pp-wrap">
          {header}
          <div className="pp-card pp-gate">
            <p>{T.caricamento}</p>
          </div>
        </div>
      );
    }
    return (
      <div className="pp-wrap">
        {header}
        <form className="pp-card pp-gate" onSubmit={submitAccess}>
          <div className="pp-gate-icon">
            <FontAwesomeIcon icon={faLock} />
          </div>
          <h1>{T.accessoTitolo}</h1>
          <p>{T.accessoTesto}</p>
          <input
            className="pp-input"
            type="text"
            value={email}
            placeholder={T.accessoEsempio}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
          />
          {testoErrore && <div className="pp-error">{testoErrore}</div>}
          <button className="pp-btn" type="submit" disabled={loading}>
            {loading ? T.accessoVerifica : T.accessoEntra}
          </button>
        </form>
        <UiHost />
      </div>
    );
  }

  return (
    <div className="pp-wrap pp-wrap--plan">
      <UiHost />
      {header}
      <div className="pp-intro">
        {T.ciao(data.client?.contactName || data.client?.name)}
      </div>

      {!approval && (
        <div className="pp-guide">
          <div className="pp-guide-title">{T.guidaTitolo}</div>
          <ol className="pp-guide-steps">
            <li>
              <FontAwesomeIcon icon={faImage} />
              <span>
                <Testo parti={T.guida1} />
              </span>
            </li>
            <li>
              <FontAwesomeIcon icon={faComment} />
              <span>
                <Testo parti={T.guida2} />
              </span>
            </li>
            <li>
              <FontAwesomeIcon icon={faPaperPlane} />
              <span>
                <Testo parti={T.guida3} />
              </span>
            </li>
            <li>
              <FontAwesomeIcon icon={faCheck} />
              <span>
                <Testo parti={T.guida4} />
              </span>
            </li>
          </ol>
          <div className="pp-guide-legend">
            <span className="pp-legend-item">
              <span className="pp-legend-dot pp-legend-dot--you" /> {T.legendaTue}
            </span>
            <span className="pp-legend-item">
              <span className="pp-legend-dot pp-legend-dot--basic" /> {T.legendaBasic}
            </span>
          </div>
        </div>
      )}

      {/* Azione corrente. Note in sospeso → invia (riattivo anche dopo
          un'approvazione). Altrimenti, se mai approvato o aggiornato dopo
          l'ultima approvazione → approva. Lo storico è mostrato sotto. */}
      {pendingNotes > 0 ? (
        <div
          className={`pp-feedback-bar ${
            feedbackSent ? "pp-feedback-bar--sent" : ""
          }`}
        >
          {feedbackSent ? (
            <span className="pp-feedback-ok">
              <FontAwesomeIcon icon={faCheck} /> {T.noteInviate}
            </span>
          ) : (
            <span className="pp-feedback-info">
              {T.noteLasciate(pendingNotes)}
            </span>
          )}
          <button
            className={`pp-btn ${feedbackSent ? "pp-btn--approve" : ""}`}
            onClick={submitFeedback}
            disabled={feedbackSending || feedbackSent}
          >
            <FontAwesomeIcon icon={feedbackSent ? faCheck : faPaperPlane} />{" "}
            {feedbackSending
              ? T.invio
              : feedbackSent
              ? T.noteInviateBreve
              : T.inviaNote}
          </button>
        </div>
      ) : !approval || approval.changedSince ? (
        <div className="pp-feedback-bar">
          <span className="pp-feedback-info">
            {approval ? T.approvaDiNuovoInfo : T.approvaInfo}
          </span>
          <button
            className="pp-btn pp-btn--approve"
            onClick={approvePlan}
            disabled={approving}
          >
            <FontAwesomeIcon icon={faCheck} />{" "}
            {approving
              ? T.approvazioneInCorso
              : approval
              ? T.approvaDiNuovo
              : T.approvaPiano}
          </button>
        </div>
      ) : null}

      {/* Storico approvazioni: sempre visibile se c'è almeno un'approvazione.
          Verde = approvazione valida; neutro = aggiornato dopo (da riconfermare). */}
      {approval && (
        <div
          className={`pp-approval-history ${
            approval.changedSince ? "pp-approval-history--stale" : ""
          }`}
        >
          <div className="pp-approval-head">
            <FontAwesomeIcon icon={faCheck} />
            {approval.count > 1
              ? T.approvatoVolte(approval.count)
              : T.approvatoIl(fmtDataOra(approval.at, lingua))}
          </div>
          {approval.count > 1 && (
            <ul className="pp-approval-list">
              {approval.history
                .slice()
                .reverse()
                .map((h, i) => (
                  <li key={i}>
                    <span>{T.nApprovazione(approval.history.length - i)}</span>
                    <time>{fmtDataOra(h.at, lingua)}</time>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      {daysWithPosts.length === 0 ? (
        <div className="pp-card">{T.nessunPost}</div>
      ) : (
        <div className="editorial-plans pp-plan">
          {isNarrow ? (
            <div className="ep-agenda">
              {daysWithPosts.map((day) => {
                const wd =
                  T.giorni[(new Date(year, month - 1, day).getDay() + 6) % 7];
                return (
                  <div
                    key={day}
                    className={`ep-agenda-day ${isToday(day) ? "is-today" : ""}`}
                  >
                    <div className="ep-agenda-head">
                      <span className="ep-agenda-date">
                        <b>{day}</b> {wd}
                      </span>
                    </div>
                    <div className="ep-agenda-posts">
                      {(postsByDay[day] || []).map((p) => (
                        <div key={p.id} className="ep-agenda-post">
                          {isMatrix && (
                            <span className="ep-agenda-page">
                              {pageName(p.pageId)}
                            </span>
                          )}
                          <PostChip post={p} etichette={T.card} onClick={() => openPost(p)} />
                        </div>
                      ))}
                    </div>
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
                        className={`ep-matrix-dayhead ${
                          isToday(day) ? "is-today" : ""
                        }`}
                      >
                        {day && (
                          <>
                            <span className="ep-mh-wd">{T.giorni[di]}</span>
                            <span className="ep-mh-day">{day}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  {pages.map((pg) => (
                    <div key={pg.id} className="ep-matrix-row">
                      <div className="ep-matrix-pagelabel">
                        <span className="ep-tab-dots">{renderChannels(pg.id)}</span>
                        <span className="ep-mp-name">{pg.name}</span>
                      </div>
                      {week.map((day, di) => {
                        if (!day)
                          return (
                            <div key={di} className="ep-matrix-cell is-empty" />
                          );
                        return (
                          <div key={di} className="ep-matrix-cell">
                            {postsFor(pg.id, day).map((p) => (
                              <PostChip
                                key={p.id}
                                post={p}
                                compact
                                etichette={T.card}
                                onClick={() => openPost(p)}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="ep-calendar">
              <div className="ep-weekrow ep-weekdays">
                {T.giorni.map((w) => (
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
                    const dn = notesOnDay(day);
                    return (
                      <div
                        key={di}
                        className={`ep-day ${isToday(day) ? "ep-day--today" : ""}`}
                      >
                        <div className="ep-day-head">
                          <span className="ep-day-num">{day}</span>
                          {dn > 0 && (
                            <span className="ep-day-note-badge">
                              <FontAwesomeIcon icon={faComment} />
                              {dn}
                            </span>
                          )}
                        </div>
                        <div className="ep-day-posts">
                          {dayPosts.map((p) => (
                            <PostChip
                              key={p.id}
                              post={p}
                              etichette={T.card}
                              onClick={() => openPost(p)}
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
        </div>
      )}

      <div className="pp-footer">{T.piede}</div>

      {/* ---- Modale dettaglio post + note ---- */}
      {selected && (
        <div className="pp-modal-overlay" onClick={closeModal}>
          <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="pp-modal-close"
              onClick={closeModal}
              aria-label={T.chiudi}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>

            <div className="pp-post-top">
              {isMatrix && pageName(selected.pageId) && (
                <span className="pp-page">{pageName(selected.pageId)}</span>
              )}
              {selected.category && (
                <span
                  className="pp-cat"
                  style={{ color: categoryColor(selected.category) }}
                >
                  {selected.category}
                </span>
              )}
              {selected.sponsored && (
                <span className="pp-spons">
                  <FontAwesomeIcon icon={faBullhorn} /> {T.sponsorizzato}
                </span>
              )}
            </div>

            {selected.media && selected.media.length > 0 && (
              <div
                className={`pp-media ${
                  selected.media.length === 1 ? "pp-media--single" : ""
                }`}
              >
                {selected.media.map((m, i) => (
                  <button
                    key={i}
                    type="button"
                    className="pp-thumb"
                    onClick={() => setLightbox({ list: selected.media, index: i })}
                    aria-label={T.ingrandisci}
                  >
                    {m.kind === "pdf" ? (
                      // la prima pagina del PDF, o l'icona se manca
                      m.thumbUrl ? (
                        <img src={m.thumbUrl} alt="" />
                      ) : (
                        <span className="pp-pdf-icon">
                          <FontAwesomeIcon icon={faFilePdf} />
                        </span>
                      )
                    ) : m.kind === "video" && !m.thumbUrl ? (
                      <video src={`${m.url}#t=0.1`} muted preload="metadata" />
                    ) : (
                      <img
                        src={m.kind === "video" ? m.thumbUrl : m.url}
                        alt=""
                      />
                    )}
                    {m.kind === "video" && (
                      <span className="pp-play">
                        <FontAwesomeIcon icon={faPlay} />
                      </span>
                    )}
                    {m.kind === "pdf" && <span className="pp-pdf-badge">PDF</span>}
                  </button>
                ))}
              </div>
            )}

            {selected.caption && <p className="pp-caption">{selected.caption}</p>}

            {selected.notes && selected.notes.length > 0 && (
              <div className="pp-notes">
                {selected.notes.map((n) => (
                  <div key={n.id} className={`pp-note ${n.resolved ? "done" : ""}`}>
                    {editingNote === n.id ? (
                      <>
                        <textarea
                          className="pp-input"
                          rows={2}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                        />
                        <div className="pp-note-mine-actions">
                          <button
                            className="pp-note-mini"
                            onClick={() => {
                              setEditingNote(null);
                              setEditText("");
                            }}
                          >
                            {T.annulla}
                          </button>
                          <button
                            className="pp-note-mini"
                            onClick={() => saveEdit(n.id)}
                          >
                            {T.salva}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {n.fromAgency && (
                          <span className="pp-note-tag">
                            {n.needsReply ? T.richiestaBasic : T.notaBasic}
                          </span>
                        )}
                        {n.text && (
                          <div className="pp-note-row">
                            {n.resolved && <FontAwesomeIcon icon={faCheck} />}
                            <span>{n.text}</span>
                          </div>
                        )}
                        {n.media && n.media.length > 0 && (
                          <div className="pp-note-media">
                            {n.media.map((m, i) => (
                              <button
                                key={i}
                                type="button"
                                className="pp-note-thumb"
                                onClick={() => setLightbox({ list: n.media, index: i })}
                                aria-label={T.ingrandisci}
                              >
                                {m.kind === "video" && !m.thumbUrl ? (
                                  <video
                                    src={`${m.url}#t=0.1`}
                                    preload="metadata"
                                    muted
                                  />
                                ) : (
                                  <img
                                    src={m.kind === "video" ? m.thumbUrl : m.url}
                                    alt=""
                                  />
                                )}
                                {m.kind === "video" && (
                                  <span className="pp-play">
                                    <FontAwesomeIcon icon={faPlay} />
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                        {n.mine && !n.resolved && (
                          <div className="pp-note-mine-actions">
                            <button
                              className="pp-note-mini"
                              onClick={() => {
                                setEditingNote(n.id);
                                setEditText(n.text);
                              }}
                            >
                              {T.modifica}
                            </button>
                            <button
                              className="pp-note-mini"
                              onClick={() => deleteNote(n.id)}
                            >
                              {T.elimina}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div
              className={`pp-note-form ${noteDragOver ? "is-dragover" : ""}`}
              onDragOver={onNoteDragOver}
              onDragLeave={onNoteDragLeave}
              onDrop={onNoteDrop}
            >
              <textarea
                className="pp-input"
                rows={3}
                value={noteText}
                placeholder={T.notaEsempio}
                onChange={(e) => setNoteText(e.target.value)}
              />
              {noteMedia.length > 0 && (
                <div className="pp-note-media pp-note-media--draft">
                  {noteMedia.map((m, i) => (
                    <div key={i} className="pp-note-thumb-wrap">
                      <button
                        type="button"
                        className="pp-note-thumb"
                        onClick={() => setLightbox({ list: noteMedia, index: i })}
                        aria-label={T.ingrandisci}
                      >
                        {m.kind === "video" ? (
                          <video
                            src={`${m.url}#t=0.1`}
                            preload="metadata"
                            muted
                          />
                        ) : (
                          <img src={m.url} alt="" />
                        )}
                        {m.kind === "video" && (
                          <span className="pp-play">
                            <FontAwesomeIcon icon={faPlay} />
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        className="pp-note-thumb-x"
                        onClick={() => removeNoteMedia(i)}
                        aria-label={T.rimuoviAllegato}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="pp-note-actions">
                <button
                  type="button"
                  className="pp-btn pp-btn--ghost pp-note-attach"
                  onClick={() => noteFileRef.current?.click()}
                  disabled={noteUploading}
                >
                  <FontAwesomeIcon
                    icon={noteUploading ? faSpinner : faImage}
                    spin={noteUploading}
                  />{" "}
                  {noteUploading ? T.carico : T.fotoVideo}
                </button>
                <input
                  ref={noteFileRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  hidden
                  onChange={uploadNoteFiles}
                />
                <button
                  className="pp-btn"
                  onClick={createNote}
                  disabled={
                    noteSending || (!noteText.trim() && !noteMedia.length)
                  }
                >
                  <FontAwesomeIcon icon={faPaperPlane} />{" "}
                  {noteSending ? T.invio : T.aggiungiNota}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox media: ingrandisce foto/video in un overlay, con carosello
          (frecce + swipe + ←/→) quando il post ha più media. */}
      {lightbox?.list?.[lightbox.index] &&
        (() => {
          const item = lightbox.list[lightbox.index];
          const multi = lightbox.list.length > 1;
          return (
            <div className="pp-lightbox" onClick={() => setLightbox(null)}>
              <button
                className="pp-lightbox-close"
                onClick={() => setLightbox(null)}
                aria-label={T.chiudi}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
              {multi && (
                <button
                  className="pp-lightbox-nav pp-lightbox-nav--prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    lightboxPrev();
                  }}
                  aria-label={T.precedente}
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>
              )}
              <div
                className="pp-lightbox-inner"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={onLbTouchStart}
                onTouchEnd={onLbTouchEnd}
              >
                {item.kind === "pdf" ? (
                  // Il PDF si sfoglia nel lettore del dispositivo: dentro la
                  // pagina, su iPhone, se ne vedrebbe solo la prima pagina.
                  <div className="pp-lightbox-pdf">
                    {item.thumbUrl ? (
                      <img src={item.thumbUrl} alt="" />
                    ) : (
                      <span className="pp-pdf-icon pp-pdf-icon--grande">
                        <FontAwesomeIcon icon={faFilePdf} />
                      </span>
                    )}
                    <a
                      className="pp-btn"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FontAwesomeIcon icon={faUpRightFromSquare} /> {T.apriPdf}
                    </a>
                  </div>
                ) : item.kind === "video" ? (
                  <video src={item.url} controls autoPlay />
                ) : (
                  <img src={item.url || item.thumbUrl} alt="" />
                )}
              </div>
              {multi && (
                <button
                  className="pp-lightbox-nav pp-lightbox-nav--next"
                  onClick={(e) => {
                    e.stopPropagation();
                    lightboxNext();
                  }}
                  aria-label={T.successivo}
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              )}
              {multi && (
                <div className="pp-lightbox-count">
                  {lightbox.index + 1} / {lightbox.list.length}
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}
