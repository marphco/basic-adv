import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBullhorn,
  faPaperPlane,
  faLock,
  faImage,
  faPlay,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import useNoindex from "../../hooks/useNoindex";
import { categoryColor } from "../dashboard/editorial/mockData";
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

// slug = "<clientId 24 hex>-<yyyy><mm>"  →  { clientId, year, month }
function parseSlug(slug) {
  const m = String(slug || "").match(/^([a-f0-9]{24})-(\d{4})(\d{2})$/i);
  if (!m) return null;
  return { clientId: m[1], year: Number(m[2]), month: Number(m[3]) };
}

// Vista pubblica del piano editoriale: il cliente sblocca con la sua email,
// vede i post del mese in sola lettura e può lasciare note. Nessun dato interno
// (duplicati/stato) viene esposto: arriva già sanitizzato dal backend.
export default function PublicPlan() {
  useNoindex(); // mai indicizzata
  const { slug } = useParams();
  const parsed = useMemo(() => parseSlug(slug), [slug]);

  const [email, setEmail] = useState("");
  const [data, setData] = useState(null); // { client, pages, year, month }
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // stato note: quale post ha il form aperto, testo, invio
  const [noteFor, setNoteFor] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [noteSending, setNoteSending] = useState(false);

  const submitAccess = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const r = await axios.post(`${API_URL}/api/public/plan/access`, {
        clientId: parsed.clientId,
        year: parsed.year,
        month: parsed.month,
        email: email.trim(),
      });
      setData(r.data);
      setPosts(r.data.posts || []);
    } catch (err) {
      setError(err?.response?.data?.error || "Accesso non riuscito. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  const sendNote = async (postId) => {
    if (!noteText.trim()) return;
    setNoteSending(true);
    try {
      const r = await axios.post(`${API_URL}/api/public/plan/note`, {
        clientId: parsed.clientId,
        year: parsed.year,
        month: parsed.month,
        email: email.trim(),
        postId,
        text: noteText.trim(),
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, notes: r.data.notes } : p))
      );
      setNoteText("");
      setNoteFor(null);
    } catch (err) {
      window.alert(err?.response?.data?.error || "Invio nota non riuscito.");
    } finally {
      setNoteSending(false);
    }
  };

  const showPage = (data?.pages?.length || 0) > 1;
  const postsByDay = useMemo(() => {
    const map = {};
    for (const p of posts) (map[p.day] ||= []).push(p);
    return map;
  }, [posts]);
  const days = useMemo(
    () =>
      Object.keys(postsByDay)
        .map(Number)
        .sort((a, b) => a - b),
    [postsByDay]
  );

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

  // --- Gate email ---
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

  // --- Vista piano (sola lettura + note) ---
  return (
    <div className="pp-wrap">
      {header}
      <div className="pp-intro">
        Ciao {data.client?.contactName || data.client?.name}, ecco i contenuti
        del mese. Tocca <strong>“Lascia una nota”</strong> su un post per darci
        un feedback.
      </div>

      {days.length === 0 && (
        <div className="pp-card">Nessun post pubblicato per questo mese.</div>
      )}

      {days.map((day) => {
        const wd =
          WEEKDAYS_IT[
            (new Date(data.year, data.month - 1, day).getDay() + 6) % 7
          ];
        return (
          <section key={day} className="pp-day">
            <div className="pp-day-head">
              <span className="pp-day-num">{day}</span>
              <span className="pp-day-wd">{wd}</span>
            </div>
            {postsByDay[day].map((p) => (
              <article
                key={p.id}
                className="pp-post"
                style={
                  p.category ? { borderLeftColor: categoryColor(p.category) } : undefined
                }
              >
                <div className="pp-post-top">
                  {showPage && p.pageName && (
                    <span className="pp-page">{p.pageName}</span>
                  )}
                  {p.category && (
                    <span
                      className="pp-cat"
                      style={{ color: categoryColor(p.category) }}
                    >
                      {p.category}
                    </span>
                  )}
                  {p.sponsored && (
                    <span className="pp-spons">
                      <FontAwesomeIcon icon={faBullhorn} /> Sponsorizzato
                    </span>
                  )}
                </div>

                {p.media && p.media.length > 0 && (
                  <div className="pp-media">
                    {p.media.map((m, i) => (
                      <a
                        key={i}
                        className="pp-thumb"
                        href={m.url || m.thumbUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {m.url || m.thumbUrl ? (
                          <img
                            src={m.kind === "video" ? m.thumbUrl || m.url : m.url}
                            alt=""
                          />
                        ) : (
                          <FontAwesomeIcon icon={faImage} />
                        )}
                        {m.kind === "video" && (
                          <span className="pp-play">
                            <FontAwesomeIcon icon={faPlay} />
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                )}

                {p.caption && <p className="pp-caption">{p.caption}</p>}

                {/* Note esistenti */}
                {p.notes && p.notes.length > 0 && (
                  <div className="pp-notes">
                    {p.notes.map((n, i) => (
                      <div key={i} className={`pp-note ${n.resolved ? "done" : ""}`}>
                        {n.resolved && <FontAwesomeIcon icon={faCheck} />}
                        <span>{n.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Aggiungi nota */}
                {noteFor === p.id ? (
                  <div className="pp-note-form">
                    <textarea
                      className="pp-input"
                      rows={3}
                      value={noteText}
                      placeholder="Scrivi qui la tua nota…"
                      onChange={(e) => setNoteText(e.target.value)}
                      autoFocus
                    />
                    <div className="pp-note-actions">
                      <button
                        className="pp-btn pp-btn--ghost"
                        onClick={() => {
                          setNoteFor(null);
                          setNoteText("");
                        }}
                      >
                        Annulla
                      </button>
                      <button
                        className="pp-btn"
                        onClick={() => sendNote(p.id)}
                        disabled={noteSending || !noteText.trim()}
                      >
                        <FontAwesomeIcon icon={faPaperPlane} />{" "}
                        {noteSending ? "Invio…" : "Invia nota"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="pp-note-add"
                    onClick={() => {
                      setNoteFor(p.id);
                      setNoteText("");
                    }}
                  >
                    Lascia una nota
                  </button>
                )}
              </article>
            ))}
          </section>
        );
      })}

      <div className="pp-footer">Basic Adv · Piano editoriale</div>
    </div>
  );
}
