import { useState, useMemo, useEffect } from "react";
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
} from "@fortawesome/free-solid-svg-icons";
import useNoindex from "../../hooks/useNoindex";
import { categoryColor } from "../dashboard/editorial/mockData";
import PostChip from "../dashboard/editorial/PostChip";
import ChannelIcon from "../dashboard/editorial/ChannelIcon";
import "../dashboard/editorial/EditorialPlans.css";
import LogoIcon from "../../assets/icon-white.svg";
import "./PublicPlan.css";

const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const WEEKDAYS_IT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(
  /\/$/,
  ""
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
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null); // post aperto nel modale
  const [noteText, setNoteText] = useState(""); // nuova nota
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
    setError("");
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
      const status = err?.response?.status;
      setError(
        err?.response?.data?.error ||
          (status === 404
            ? "Servizio non ancora disponibile (404). Riprova tra poco."
            : status
            ? `Accesso non riuscito (HTTP ${status}).`
            : "Impossibile contattare il server. Riprova.")
      );
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

  const createNote = async () => {
    if (!selected || !noteText.trim()) return;
    setNoteSending(true);
    try {
      const r = await axios.post(`${API_URL}/api/public/plan/note`, {
        ...base,
        postId: selected.id,
        text: noteText.trim(),
      });
      applyNotes(selected.id, r.data.notes);
      setNoteText("");
    } catch (err) {
      window.alert(err?.response?.data?.error || "Invio nota non riuscito.");
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
      window.alert(err?.response?.data?.error || "Modifica non riuscita.");
    }
  };

  const deleteNote = async (noteId) => {
    if (!window.confirm("Eliminare questa nota?")) return;
    try {
      const r = await axios.delete(`${API_URL}/api/public/plan/note`, {
        data: { ...base, postId: selected.id, noteId },
      });
      applyNotes(selected.id, r.data.notes);
    } catch (err) {
      window.alert(err?.response?.data?.error || "Eliminazione non riuscita.");
    }
  };

  const submitFeedback = async () => {
    setFeedbackSending(true);
    try {
      await axios.post(`${API_URL}/api/public/plan/notify`, { ...base });
      setFeedbackSent(true);
    } catch (err) {
      window.alert(err?.response?.data?.error || "Invio feedback non riuscito.");
    } finally {
      setFeedbackSending(false);
    }
  };

  const approvePlan = async () => {
    if (!window.confirm("Sei sicuro di voler approvare il piano editoriale?"))
      return;
    setApproving(true);
    try {
      const r = await axios.post(`${API_URL}/api/public/plan/approve`, { ...base });
      setApproval(r.data.approval || { at: new Date().toISOString() });
    } catch (err) {
      window.alert(err?.response?.data?.error || "Approvazione non riuscita.");
    } finally {
      setApproving(false);
    }
  };

  const openPost = (p) => {
    setSelected(p);
    setNoteText("");
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
            {MONTHS_IT[data.month - 1]} {data.year}
          </span>
          <span className="pp-client">{data.client?.name}</span>
        </div>
      )}
    </div>
  );

  if (!parsed) {
    return (
      <div className="pp-wrap">
        {header}
        <div className="pp-card pp-gate">
          <p>Il link non è valido.</p>
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
            <p>Caricamento del piano…</p>
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
          <h1>Il tuo piano editoriale</h1>
          <p>Inserisci la tua email per vedere il piano e lasciare le tue note.</p>
          <input
            className="pp-input"
            type="email"
            value={email}
            placeholder="latua@email.it"
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          {error && <div className="pp-error">{error}</div>}
          <button className="pp-btn" type="submit" disabled={loading}>
            {loading ? "Verifica…" : "Accedi al piano"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="pp-wrap pp-wrap--plan">
      {header}
      <div className="pp-intro">
        Ciao {data.client?.contactName || data.client?.name}, ecco i contenuti del
        mese. Clicca un post per leggerlo e lasciare una nota.
      </div>

      {/* Una sola azione alla volta: approvato → conferma; note in sospeso →
          invia feedback; altrimenti → approva. (Approva e Feedback non
          coesistono: chi chiede modifiche non approva.) */}
      {approval ? (
        <div className="pp-feedback-bar">
          <span className="pp-feedback-ok">
            <FontAwesomeIcon icon={faCheck} /> Piano approvato
            {approval.at
              ? ` il ${new Date(approval.at).toLocaleDateString("it-IT")}`
              : ""}
            .
          </span>
        </div>
      ) : pendingNotes > 0 ? (
        <div className="pp-feedback-bar">
          <span className="pp-feedback-info">
            {feedbackSent
              ? "Feedback inviato: l'agenzia applicherà le modifiche."
              : `Hai lasciato ${pendingNotes} ${
                  pendingNotes === 1 ? "nota" : "note"
                }: inviale all'agenzia per le modifiche.`}
          </span>
          <button
            className="pp-btn"
            onClick={submitFeedback}
            disabled={feedbackSending || feedbackSent}
          >
            <FontAwesomeIcon icon={faPaperPlane} />{" "}
            {feedbackSending
              ? "Invio…"
              : feedbackSent
              ? "Feedback inviato"
              : "Invia il feedback all'agenzia"}
          </button>
        </div>
      ) : (
        <div className="pp-feedback-bar">
          <span className="pp-feedback-info">
            Se è tutto a posto, conferma il piano editoriale.
          </span>
          <button
            className="pp-btn pp-btn--approve"
            onClick={approvePlan}
            disabled={approving}
          >
            <FontAwesomeIcon icon={faCheck} />{" "}
            {approving ? "Approvazione…" : "Approva piano editoriale"}
          </button>
        </div>
      )}

      {daysWithPosts.length === 0 ? (
        <div className="pp-card">Nessun post pubblicato per questo mese.</div>
      ) : (
        <div className="editorial-plans pp-plan">
          {isNarrow ? (
            <div className="ep-agenda">
              {daysWithPosts.map((day) => {
                const wd =
                  WEEKDAYS_IT[(new Date(year, month - 1, day).getDay() + 6) % 7];
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
                          <PostChip post={p} onClick={() => openPost(p)} />
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
                            <span className="ep-mh-wd">{WEEKDAYS_IT[di]}</span>
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

      <div className="pp-footer">Basic Adv · Piano editoriale</div>

      {/* ---- Modale dettaglio post + note ---- */}
      {selected && (
        <div className="pp-modal-overlay" onClick={closeModal}>
          <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="pp-modal-close"
              onClick={closeModal}
              aria-label="Chiudi"
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
                  <FontAwesomeIcon icon={faBullhorn} /> Sponsorizzato
                </span>
              )}
            </div>

            {selected.media && selected.media.length > 0 && (
              <div className="pp-media">
                {selected.media.map((m, i) => (
                  <a
                    key={i}
                    className="pp-thumb"
                    href={m.url || m.thumbUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={m.kind === "video" ? m.thumbUrl || m.url : m.url}
                      alt=""
                    />
                    {m.kind === "video" && (
                      <span className="pp-play">
                        <FontAwesomeIcon icon={faPlay} />
                      </span>
                    )}
                  </a>
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
                            Annulla
                          </button>
                          <button
                            className="pp-note-mini"
                            onClick={() => saveEdit(n.id)}
                          >
                            Salva
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {n.fromAgency && (
                          <span className="pp-note-tag">
                            {n.needsReply
                              ? "Richiesta dell'agenzia"
                              : "Dall'agenzia"}
                          </span>
                        )}
                        <div className="pp-note-row">
                          {n.resolved && <FontAwesomeIcon icon={faCheck} />}
                          <span>{n.text}</span>
                        </div>
                        {n.mine && !n.resolved && (
                          <div className="pp-note-mine-actions">
                            <button
                              className="pp-note-mini"
                              onClick={() => {
                                setEditingNote(n.id);
                                setEditText(n.text);
                              }}
                            >
                              Modifica
                            </button>
                            <button
                              className="pp-note-mini"
                              onClick={() => deleteNote(n.id)}
                            >
                              Elimina
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pp-note-form">
              <textarea
                className="pp-input"
                rows={3}
                value={noteText}
                placeholder="Aggiungi una nota su questo post…"
                onChange={(e) => setNoteText(e.target.value)}
              />
              <div className="pp-note-actions">
                <button
                  className="pp-btn"
                  onClick={createNote}
                  disabled={noteSending || !noteText.trim()}
                >
                  <FontAwesomeIcon icon={faPaperPlane} />{" "}
                  {noteSending ? "Invio…" : "Aggiungi nota"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
