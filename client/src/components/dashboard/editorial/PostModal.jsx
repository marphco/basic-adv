import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faBullhorn,
  faTrash,
  faComment,
  faPlus,
  faPlay,
  faCheck,
  faDownload,
  faCopy,
  faLock,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { PLATFORMS, COMMON_CATEGORIES } from "./mockData";
import { confirmDialog, toastErr } from "./uiNotify";
import { api } from "./api";

const MONTHS_IT = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

// Etichetta derivata dal contenuto media (foto singola / carosello / video).
const mediaTypeLabel = (media) => {
  if (!media || media.length === 0) return "Nessun media";
  if (media.length > 1) return `Carosello · ${media.length} elementi`;
  return media[0].kind === "video" ? "Video" : "Immagine singola";
};

// Modale per creare / modificare un singolo post del calendario.
const PostModal = ({ draft, client, onClose, onSave, onDelete }) => {
  const [caption, setCaption] = useState(draft.caption || "");
  const [category, setCategory] = useState(draft.category || "");
  const [sponsored, setSponsored] = useState(!!draft.sponsored);
  const [pageId, setPageId] = useState(draft.pageId || client.pages[0]?.id);
  const [day, setDay] = useState(draft.day);
  const [month, setMonth] = useState(Number(draft.month));
  const [year, setYear] = useState(Number(draft.year));
  const [media, setMedia] = useState(draft.media || []);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState(draft.notes || []);
  const [lightbox, setLightbox] = useState(null); // { item, source: 'media'|'note' }
  const [captionCopied, setCaptionCopied] = useState(false);
  // Nota che l'agenzia lascia AL cliente (spiegazione o richiesta) OPPURE nota
  // INTERNA (solo agenzia, mai al cliente).
  const [agencyNoteText, setAgencyNoteText] = useState("");
  const [agencyNoteNeedsReply, setAgencyNoteNeedsReply] = useState(false);
  const [agencyNoteInternal, setAgencyNoteInternal] = useState(false);
  const fileRef = useRef(null);

  const copyCaption = () => {
    navigator.clipboard?.writeText(caption).catch(() => {});
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 1500);
  };

  const toggleResolved = (i) =>
    setNotes((prev) =>
      prev.map((n, idx) => (idx === i ? { ...n, resolved: !n.resolved } : n))
    );

  // Costruisce la nota dell'agenzia dal testo in bozza (null se vuoto).
  // internal=true → nota SOLO agenzia (mai al cliente); altrimenti nota per il
  // cliente (eventualmente con richiesta di risposta).
  const buildPendingNote = () => {
    const t = agencyNoteText.trim();
    if (!t) return null;
    if (agencyNoteInternal)
      return {
        text: t,
        author: "Basic (interna)",
        fromAgency: true,
        internal: true,
        needsReply: false,
        resolved: false,
        media: [],
        createdAt: new Date().toISOString(),
      };
    return {
      text: t,
      author: "Basic",
      fromAgency: true,
      needsReply: agencyNoteNeedsReply,
      resolved: false,
      media: [],
      createdAt: new Date().toISOString(),
    };
  };

  // Aggiunge la nota in bozza (per il cliente o interna).
  const addAgencyNote = () => {
    const note = buildPendingNote();
    if (!note) return;
    setNotes((prev) => [...prev, note]);
    setAgencyNoteText("");
    setAgencyNoteNeedsReply(false);
    setAgencyNoteInternal(false);
  };

  // Elimina una nota (cliente o agenzia). Persistita al salvataggio del post.
  const deleteNote = async (i) => {
    if (
      !(await confirmDialog("Eliminare questa nota?", {
        danger: true,
        confirmLabel: "Elimina",
      }))
    )
      return;
    setNotes((prev) => prev.filter((_, idx) => idx !== i));
  };

  const isNew = !draft.id;
  // Giorni del mese in base a mese/anno SELEZIONATI (così cambiando mese si
  // aggiorna il numero di giorni, es. febbraio).
  const daysInMonth = new Date(year, month, 0).getDate();
  // Anni selezionabili: una finestra intorno all'anno di partenza.
  const baseYear = Number(draft.year);
  const yearOptions = [
    baseYear - 2, baseYear - 1, baseYear, baseYear + 1, baseYear + 2,
  ];
  // Cambio mese/anno: se il giorno corrente non esiste nel nuovo mese, lo riduce.
  const changeMonth = (m) => {
    const mm = Number(m);
    setMonth(mm);
    const dim = new Date(year, mm, 0).getDate();
    if (Number(day) > dim) setDay(dim);
  };
  const changeYear = (y) => {
    const yy = Number(y);
    setYear(yy);
    const dim = new Date(yy, month, 0).getDate();
    if (Number(day) > dim) setDay(dim);
  };

  // Snapshot iniziale per rilevare modifiche non salvate.
  const initialRef = useRef({
    caption: draft.caption || "",
    category: draft.category || "",
    sponsored: !!draft.sponsored,
    pageId: draft.pageId || client.pages[0]?.id,
    day: Number(draft.day),
    month: Number(draft.month),
    year: Number(draft.year),
    media: JSON.stringify(draft.media || []),
    notes: JSON.stringify(draft.notes || []),
  });
  const hasChanges = () =>
    caption !== initialRef.current.caption ||
    category !== initialRef.current.category ||
    sponsored !== initialRef.current.sponsored ||
    pageId !== initialRef.current.pageId ||
    Number(day) !== initialRef.current.day ||
    Number(month) !== initialRef.current.month ||
    Number(year) !== initialRef.current.year ||
    JSON.stringify(media) !== initialRef.current.media ||
    JSON.stringify(notes) !== initialRef.current.notes ||
    // anche una nota scritta ma non ancora "aggiunta" conta come modifica:
    // così la chiusura protetta non la perde silenziosamente.
    agencyNoteText.trim() !== "";

  // Chiusura protetta: se ci sono modifiche non salvate, chiede conferma.
  const requestClose = async () => {
    if (
      hasChanges() &&
      !(await confirmDialog("Hai modifiche non salvate. Chiudere senza salvare?", {
        danger: true,
        confirmLabel: "Chiudi",
      }))
    )
      return;
    onClose();
  };

  // Riferimento sempre aggiornato così il listener ESC usa lo stato corrente.
  const closeRef = useRef(requestClose);
  useEffect(() => {
    closeRef.current = requestClose;
  });
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Carica uno o più file (foto/video) sul server → URL persistenti.
  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // consente di riselezionare lo stesso file
    if (!files.length) return;
    setUploading(true);
    try {
      const items = await api.uploadMedia(files);
      setMedia((prev) => [...prev, ...items]);
    } catch (err) {
      toastErr(err?.response?.data?.error || "Caricamento media non riuscito.");
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (i) =>
    setMedia((prev) => prev.filter((_, idx) => idx !== i));

  // Inserisce un allegato del cliente tra i media del post (senza duplicati).
  // Per "sostituire": aggiungi e poi togli il vecchio con la ✕ nella griglia media.
  const addMediaFromNote = (item) => {
    setMedia((prev) =>
      prev.some((x) => x.url === item.url && x.thumbUrl === item.thumbUrl)
        ? prev
        : [
            ...prev,
            { kind: item.kind, url: item.url, thumbUrl: item.thumbUrl || "" },
          ]
    );
    setLightbox(null);
  };

  const handleSave = () => {
    // Auto-aggiunta: se c'è una nota scritta ma non "aggiunta" col pulsante, la
    // includo comunque → non si perde per il classico errore "Salva senza
    // cliccare Aggiungi nota".
    const pending = buildPendingNote();
    const finalNotes = pending ? [...notes, pending] : notes;
    onSave(
      {
        ...draft,
        caption: caption.trim(),
        category: category.trim(),
        sponsored,
        pageId,
        day: Number(day),
        month: Number(month),
        year: Number(year),
        media,
        notes: finalNotes,
      },
      hasChanges() // se true e il post era un duplicato → flag rimosso
    );
  };

  return (
    <div className="ep-modal-overlay" onClick={requestClose}>
      <div className="ep-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ep-modal-head">
          <h3>{isNew ? "Nuovo post" : "Modifica post"}</h3>
          <button className="ep-icon-btn" onClick={requestClose} aria-label="Chiudi">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="ep-modal-body">
          {/* Media: foto singola, carosello (più foto/video) o video */}
          <div className="ep-field-head">
            <label className="ep-field-label">Media</label>
            <span className="ep-media-type">{mediaTypeLabel(media)}</span>
          </div>
          <div className="ep-media-grid">
            {media.map((m, i) => (
              <div key={i} className="ep-media-tile">
                <button
                  type="button"
                  className="ep-media-open"
                  onClick={() => setLightbox({ item: m, source: "media" })}
                  title="Ingrandisci"
                >
                  {m.kind === "video" ? (
                    m.thumbUrl ? (
                      <img src={m.thumbUrl} alt="" />
                    ) : (
                      <video src={m.url} muted />
                    )
                  ) : (
                    <img src={m.url} alt="" />
                  )}
                  {m.kind === "video" && (
                    <span className="ep-media-play">
                      <FontAwesomeIcon icon={faPlay} />
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className="ep-media-remove"
                  onClick={() => removeMedia(i)}
                  aria-label="Rimuovi media"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="ep-media-add"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <FontAwesomeIcon icon={uploading ? faSpinner : faPlus} spin={uploading} />
              <span>{uploading ? "Carico…" : "Aggiungi"}</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFiles}
              hidden
            />
          </div>

          {/* Rubrica / categoria di contenuto */}
          <label className="ep-field-label">Rubrica</label>
          <input
            className="ep-input"
            list="ep-cat-list"
            value={category}
            placeholder="Es. WE ARE GREEN, BRAND IDENTITY…"
            onChange={(e) => setCategory(e.target.value.toUpperCase())}
          />
          <datalist id="ep-cat-list">
            {COMMON_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>

          {/* Caption */}
          <div className="ep-field-head">
            <label className="ep-field-label">Caption</label>
            <button type="button" className="ep-copy-btn" onClick={copyCaption}>
              <FontAwesomeIcon icon={captionCopied ? faCheck : faCopy} />{" "}
              {captionCopied ? "Copiata" : "Copia"}
            </button>
          </div>
          <textarea
            className="ep-textarea"
            rows={4}
            value={caption}
            placeholder="Scrivi il testo del post…"
            onChange={(e) => setCaption(e.target.value)}
          />

          {/* Pagina */}
          <label className="ep-field-label">Pagina</label>
          <select
            className="ep-select"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
          >
            {client.pages.map((pg) => (
              <option key={pg.id} value={pg.id}>
                {pg.name} ·{" "}
                {(pg.channels || [])
                  .map((c) => PLATFORMS[c]?.short || c)
                  .join("/")}
              </option>
            ))}
          </select>

          {/* Data: giorno + mese + anno → si può spostare il post anche su un
              altro mese/anno (es. da fine mese al mese successivo) */}
          <label className="ep-field-label">Data</label>
          <div className="ep-field-row">
            <div className="ep-field">
              <select
                className="ep-select"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                aria-label="Giorno"
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="ep-field">
              <select
                className="ep-select"
                value={month}
                onChange={(e) => changeMonth(e.target.value)}
                aria-label="Mese"
              >
                {MONTHS_IT.map((nm, i) => (
                  <option key={i + 1} value={i + 1}>
                    {nm.charAt(0).toUpperCase() + nm.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="ep-field">
              <select
                className="ep-select"
                value={year}
                onChange={(e) => changeYear(e.target.value)}
                aria-label="Anno"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sponsorizzato */}
          <button
            type="button"
            className={`ep-sponsor-toggle ${sponsored ? "on" : ""}`}
            onClick={() => setSponsored((s) => !s)}
          >
            <FontAwesomeIcon icon={faBullhorn} />
            <span>Post sponsorizzato</span>
            <span className={`ep-switch ${sponsored ? "on" : ""}`}>
              <span className="ep-switch-knob" />
            </span>
          </button>

          {/* Note del post: del CLIENTE (con "risolvi") + dell'AGENZIA per il
              cliente (spiegazione, oppure richiesta che richiede risposta). */}
          <div className="ep-notes-box">
            <div className="ep-notes-title">
              <FontAwesomeIcon icon={faComment} />
              Note ({notes.length})
            </div>
            {notes.map((n, i) => {
              // interne e richieste sono "risolvibili"; le spiegazioni no
              const resolvable = n.internal || !n.fromAgency || n.needsReply;
              const kind = n.internal ? "internal" : n.fromAgency ? "agency" : "";
              return (
                <div
                  key={i}
                  className={`ep-note-item ${n.resolved ? "resolved" : ""} ${kind}`}
                >
                  <span className={`ep-note-tag ${kind}`}>
                    {n.internal ? (
                      <>
                        <FontAwesomeIcon icon={faLock} /> Interna · solo Basic
                      </>
                    ) : n.fromAgency ? (
                      n.needsReply ? (
                        "Basic · Richiesta"
                      ) : (
                        "Basic · Nota"
                      )
                    ) : (
                      "Cliente"
                    )}
                  </span>
                  <p>{n.text}</p>
                  {n.media && n.media.length > 0 && (
                    <div className="ep-note-media">
                      {n.media.map((m, j) => (
                        <button
                          key={j}
                          type="button"
                          className="ep-note-thumb"
                          onClick={() => setLightbox({ item: m, source: "note" })}
                          title="Ingrandisci"
                        >
                          {m.kind === "video" && !m.thumbUrl ? (
                            <video
                              src={`${m.url}#t=0.1`}
                              muted
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={m.kind === "video" ? m.thumbUrl : m.url}
                              alt=""
                            />
                          )}
                          {m.kind === "video" && (
                            <span className="ep-thumb-play">
                              <FontAwesomeIcon icon={faPlay} />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="ep-note-foot">
                    <span className="ep-note-meta">{n.author}</span>
                    <div className="ep-note-actions">
                      {resolvable && (
                        <button
                          type="button"
                          className={`ep-note-resolve ${n.resolved ? "on" : ""}`}
                          onClick={() => toggleResolved(i)}
                        >
                          <FontAwesomeIcon icon={faCheck} />
                          {n.resolved ? "Risolta" : "Segna risolta"}
                        </button>
                      )}
                      <button
                        type="button"
                        className="ep-note-del"
                        onClick={() => deleteNote(i)}
                        title="Elimina nota"
                        aria-label="Elimina nota"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* L'agenzia lascia una nota: per il CLIENTE oppure INTERNA */}
            <div
              className={`ep-agency-note-form ${
                agencyNoteInternal ? "is-internal" : ""
              }`}
            >
              <div className="ep-note-target">
                <button
                  type="button"
                  className={`ep-note-target-btn ${
                    !agencyNoteInternal ? "on" : ""
                  }`}
                  onClick={() => setAgencyNoteInternal(false)}
                >
                  <FontAwesomeIcon icon={faComment} /> Per il cliente
                </button>
                <button
                  type="button"
                  className={`ep-note-target-btn internal ${
                    agencyNoteInternal ? "on" : ""
                  }`}
                  onClick={() => setAgencyNoteInternal(true)}
                >
                  <FontAwesomeIcon icon={faLock} /> Interna (solo Basic)
                </button>
              </div>
              <textarea
                className="ep-textarea"
                rows={2}
                value={agencyNoteText}
                placeholder={
                  agencyNoteInternal
                    ? "Nota interna (es. istruzioni dell'admin per l'operatore)…"
                    : "Nota per il cliente (es. perché questa foto, oppure richiedi una foto specifica)…"
                }
                onChange={(e) => setAgencyNoteText(e.target.value)}
              />
              <div className="ep-agency-note-foot">
                {agencyNoteInternal ? (
                  <span className="ep-note-internal-tag">
                    <FontAwesomeIcon icon={faLock} /> Mai visibile al cliente
                  </span>
                ) : (
                  <label className="ep-agency-note-check">
                    <input
                      type="checkbox"
                      checked={agencyNoteNeedsReply}
                      onChange={(e) => setAgencyNoteNeedsReply(e.target.checked)}
                    />
                    Richiede una risposta dal cliente
                  </label>
                )}
                <button
                  type="button"
                  className="ep-btn ep-btn--ghost"
                  onClick={addAgencyNote}
                  disabled={!agencyNoteText.trim()}
                >
                  <FontAwesomeIcon icon={faPlus} />{" "}
                  {agencyNoteInternal
                    ? "Aggiungi nota interna"
                    : "Aggiungi nota per il cliente"}
                </button>
              </div>
              {agencyNoteText.trim() && (
                <p className="ep-agency-note-hint">
                  <FontAwesomeIcon icon={faCheck} /> Verrà aggiunta
                  automaticamente quando salvi il post.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="ep-modal-foot">
          {!isNew && (
            <button
              className="ep-btn ep-btn--danger"
              onClick={() => onDelete(draft.id)}
            >
              <FontAwesomeIcon icon={faTrash} /> Elimina
            </button>
          )}
          <div className="ep-foot-right">
            <button className="ep-btn ep-btn--ghost" onClick={requestClose}>
              Annulla
            </button>
            <button className="ep-btn ep-btn--primary" onClick={handleSave}>
              Salva
            </button>
          </div>
        </div>

        {/* Lightbox allegato nota: ingrandisci, scarica, aggiungi ai media */}
        {lightbox && (
          <div className="ep-lightbox" onClick={() => setLightbox(null)}>
            <div
              className="ep-lightbox-inner"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="ep-lightbox-close"
                onClick={() => setLightbox(null)}
                aria-label="Chiudi"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
              {lightbox.item.kind === "video" && lightbox.item.url ? (
                <video src={lightbox.item.url} controls />
              ) : (
                <img
                  src={
                    lightbox.item.kind === "video"
                      ? lightbox.item.thumbUrl
                      : lightbox.item.url
                  }
                  alt=""
                />
              )}
              <div className="ep-lightbox-actions">
                <a
                  className="ep-btn ep-btn--ghost"
                  href={lightbox.item.url || lightbox.item.thumbUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                >
                  <FontAwesomeIcon icon={faDownload} /> Scarica
                </a>
                {lightbox.source === "note" && (
                  <button
                    className="ep-btn ep-btn--primary"
                    onClick={() => addMediaFromNote(lightbox.item)}
                  >
                    <FontAwesomeIcon icon={faPlus} /> Aggiungi ai media del post
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

PostModal.propTypes = {
  draft: PropTypes.object.isRequired,
  client: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default PostModal;
