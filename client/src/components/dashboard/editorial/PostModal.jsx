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
  faChevronLeft,
  faChevronRight,
  faClock,
  faRotateLeft,
  faRotateRight,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { PLATFORMS, COMMON_CATEGORIES } from "./mockData";
import {
  creaCronologia,
  salvaBozza,
  leggiBozza,
  scartaBozza,
  quandoTempo,
} from "./cronologia";
import { confirmDialog, toastErr } from "./uiNotify";
import { api } from "./api";
import VersionsPanel from "./VersionsPanel";

const MONTHS_IT = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

// Etichetta derivata dal contenuto media (foto singola / carosello / video).
const mediaTypeLabel = (media) => {
  if (!media || media.length === 0) return "Nessun media";
  if (media.length > 1) {
    // Quanti sono video: in un carosello misto è l'informazione che serve
    // davvero, "9 elementi" da solo non dice niente.
    const video = media.filter((m) => m.kind === "video").length;
    return (
      `Carosello · ${media.length} elementi` +
      (video ? ` · ${video} video` : "")
    );
  }
  return media[0].kind === "video" ? "Video" : "Immagine singola";
};

// Modale per creare / modificare un singolo post del calendario.
const PostModal = ({ draft, client, onClose, onSave, onDelete, onRestored }) => {
  const [caption, setCaption] = useState(draft.caption || "");
  const [category, setCategory] = useState(draft.category || "");
  const [sponsored, setSponsored] = useState(!!draft.sponsored);
  const [publishStatus, setPublishStatus] = useState(
    draft.publishStatus || "none"
  );
  const [pageId, setPageId] = useState(draft.pageId || client.pages[0]?.id);
  const [day, setDay] = useState(draft.day);
  const [month, setMonth] = useState(Number(draft.month));
  const [year, setYear] = useState(Number(draft.year));
  const [media, setMedia] = useState(draft.media || []);
  const [uploading, setUploading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [notes, setNotes] = useState(draft.notes || []);
  const [lightbox, setLightbox] = useState(null); // { item, source: 'media'|'note' }
  const [captionCopied, setCaptionCopied] = useState(false);
  // Nota che l'agenzia lascia AL cliente (spiegazione o richiesta) OPPURE nota
  // INTERNA (solo agenzia, mai al cliente).
  const [agencyNoteText, setAgencyNoteText] = useState("");
  const [agencyNoteNeedsReply, setAgencyNoteNeedsReply] = useState(false);
  const [agencyNoteInternal, setAgencyNoteInternal] = useState(false);
  const [versioniAperte, setVersioniAperte] = useState(false);
  const fileRef = useRef(null);

  /* ============ ANNULLA / RIPRISTINA ============
     Tutto ciò che l'operatore può cambiare a mano sta in un unico oggetto:
     è quello che viene registrato a ogni passo e rimesso a posto tornando
     indietro. Fuori restano le cose che non sono "modifiche" (il riquadro
     foto aperto, l'indicatore di caricamento). */
  const modificabile = {
    caption, category, sponsored, publishStatus, pageId,
    day, month, year, media, notes,
    agencyNoteText, agencyNoteNeedsReply, agencyNoteInternal,
  };
  const serie = JSON.stringify(modificabile);

  const applica = (s) => {
    const v = JSON.parse(s);
    setCaption(v.caption);
    setCategory(v.category);
    setSponsored(v.sponsored);
    setPublishStatus(v.publishStatus);
    setPageId(v.pageId);
    setDay(v.day);
    setMonth(v.month);
    setYear(v.year);
    setMedia(v.media);
    setNotes(v.notes);
    setAgencyNoteText(v.agencyNoteText);
    setAgencyNoteNeedsReply(v.agencyNoteNeedsReply);
    setAgencyNoteInternal(v.agencyNoteInternal);
  };

  const cronologia = useRef(creaCronologia());
  const daCronologia = useRef(false); // un annulla non deve creare un passo
  const attesa = useRef(null);
  const [passi, setPassi] = useState(0); // solo per ridisegnare i pulsanti
  const [bozza, setBozza] = useState(null); // modifiche non salvate ritrovate

  // Alla prima apertura: registro lo stato di partenza e guardo se c'è del
  // lavoro non salvato rimasto da una sessione precedente.
  useEffect(() => {
    cronologia.current.registra(serie);
    const b = leggiBozza(draft.id);
    if (b && b.stato !== serie) setBozza(b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Un passo per ogni modifica, ma non uno per ogni tasto premuto: si aspetta
  // mezzo secondo di pausa, così "scrivo una frase" resta un solo annulla.
  useEffect(() => {
    if (daCronologia.current) {
      daCronologia.current = false;
      return;
    }
    clearTimeout(attesa.current);
    attesa.current = setTimeout(() => {
      if (cronologia.current.registra(serie)) {
        setPassi((n) => n + 1);
        salvaBozza(draft.id, serie); // sopravvive a chiusura e crash
      }
    }, 500);
    return () => clearTimeout(attesa.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serie]);

  // Quello che si sta scrivendo in questo momento non è ancora un passo:
  // aspetta la pausa di mezzo secondo. Se si preme annulla PRIMA della pausa,
  // va fissato subito, altrimenti l'ultima frase scritta verrebbe saltata e
  // l'annulla sembrerebbe non fare niente.
  const fissaPassoInCorso = () => {
    clearTimeout(attesa.current);
    if (cronologia.current.registra(serie)) salvaBozza(draft.id, serie);
  };

  const vaiA = (s) => {
    if (s == null) return;
    daCronologia.current = true;
    applica(s);
    setPassi((n) => n + 1);
  };
  const annulla = () => {
    fissaPassoInCorso();
    vaiA(cronologia.current.indietro());
  };
  const ripristina = () => {
    clearTimeout(attesa.current);
    vaiA(cronologia.current.avanti());
  };

  // Scorciatoie da tastiera: chi scrive tutto il giorno usa quelle.
  useEffect(() => {
    const suTasto = (e) => {
      const tasto = e.key?.toLowerCase();
      if (!(e.metaKey || e.ctrlKey) || tasto !== "z") return;
      e.preventDefault();
      if (e.shiftKey) ripristina();
      else annulla();
    };
    window.addEventListener("keydown", suTasto);
    return () => window.removeEventListener("keydown", suTasto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    publishStatus: draft.publishStatus || "none",
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
    publishStatus !== initialRef.current.publishStatus ||
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

  // Carosello del lightbox (più media): precedente/successivo ciclici + swipe.
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

  // Riferimento sempre aggiornato così il listener ESC usa lo stato corrente.
  const closeRef = useRef(requestClose);
  useEffect(() => {
    closeRef.current = requestClose;
  });
  // ref per sapere se il lightbox è aperto (così ESC chiude prima il lightbox)
  const lightboxRef = useRef(null);
  useEffect(() => {
    lightboxRef.current = lightbox;
  });
  useEffect(() => {
    const onKey = (e) => {
      // se il lightbox è aperto: ESC lo chiude, ←/→ navigano (niente chiusura modale)
      if (lightboxRef.current) {
        if (e.key === "Escape") setLightbox(null);
        else if (e.key === "ArrowLeft") lightboxPrev();
        else if (e.key === "ArrowRight") lightboxNext();
        return;
      }
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Carica uno o più file (foto/video) sul server → URL persistenti.
  //
  // Il caricamento in corso viene tenuto da parte: se si clicca "Salva" mentre
  // è ancora in volo, il salvataggio lo aspetta. Senza, il post veniva salvato
  // con l'elenco media di PRIMA — il file finiva comunque sul server, ma nel
  // post non entrava e restava lì senza che nessuno lo citasse.
  const inVolo = useRef(null);

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) =>
      /^(image|video)\//.test(f.type)
    );
    if (!files.length) return;
    setUploading(true);
    const lavoro = api
      .uploadMedia(files)
      .then((items) => {
        setMedia((prev) => [...prev, ...items]);
        return items;
      })
      .catch((err) => {
        toastErr(err?.response?.data?.error || "Caricamento media non riuscito.");
        return [];
      })
      .finally(() => setUploading(false));
    inVolo.current = lavoro;
    await lavoro;
  };
  const handleFiles = (e) => {
    uploadFiles(e.target.files);
    e.target.value = ""; // consente di riselezionare lo stesso file
  };

  // Drag & drop dei file sull'area media.
  const [dragOver, setDragOver] = useState(false);
  const onMediaDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) uploadFiles(e.dataTransfer.files);
  };
  const onMediaDragOver = (e) => {
    e.preventDefault();
    if (!dragOver) setDragOver(true);
  };
  const onMediaDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
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

  const handleSave = async () => {
    // Stessa filosofia dell'auto-aggiunta della nota: quello che l'utente ha
    // fatto non si perde per una questione di tempismo. Se un caricamento è
    // ancora in volo lo aspetto, invece di salvare senza quel file.
    let mediaFinale = media;
    if (inVolo.current) {
      setSalvando(true);
      const arrivati = await inVolo.current;
      inVolo.current = null;
      // Nel frattempo `setMedia` potrebbe già averli aggiunti: unisco senza
      // creare doppioni.
      mediaFinale = [...media];
      (arrivati || []).forEach((it) => {
        if (!mediaFinale.some((m) => m.url === it.url)) mediaFinale.push(it);
      });
      setSalvando(false);
    }

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
        publishStatus,
        pageId,
        day: Number(day),
        month: Number(month),
        year: Number(year),
        media: mediaFinale,
        notes: finalNotes,
      },
      hasChanges() // se true e il post era un duplicato → flag rimosso
    );
    scartaBozza(draft.id); // salvato: il lavoro non salvato non esiste più
  };

  return (
    <div className="ep-modal-overlay" onClick={requestClose}>
      <div className="ep-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ep-modal-head">
          <h3>{isNew ? "Nuovo post" : "Modifica post"}</h3>
          <div className="ep-head-tools">
            <button
              className="ep-icon-btn"
              onClick={annulla}
              disabled={!cronologia.current.puoIndietro()}
              title="Annulla (Ctrl+Z)"
              aria-label="Annulla l'ultima modifica"
            >
              <FontAwesomeIcon icon={faRotateLeft} />
            </button>
            <button
              className="ep-icon-btn"
              onClick={ripristina}
              disabled={!cronologia.current.puoAvanti()}
              title="Ripristina (Ctrl+Shift+Z)"
              aria-label="Ripristina la modifica annullata"
            >
              <FontAwesomeIcon icon={faRotateRight} />
            </button>
            {/* Lo storico esiste solo per un post già salvato: su uno nuovo
                non ci sarebbe niente da mostrare. */}
            {!isNew && (
              <button
                className="ep-icon-btn"
                onClick={() => setVersioniAperte(true)}
                title="Versioni precedenti"
                aria-label="Versioni precedenti del post"
              >
                <FontAwesomeIcon icon={faClockRotateLeft} />
              </button>
            )}
            <button className="ep-icon-btn" onClick={requestClose} aria-label="Chiudi">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>

        <div className="ep-modal-body">
          {/* Lavoro rimasto da una sessione chiusa male: si offre di
              riprenderlo, non lo si rimette da soli — potrebbe essere roba
              vecchia che non interessa più. */}
          {bozza && (
            <div className="ep-bozza">
              <div>
                <strong>Modifiche non salvate</strong> di {quandoTempo(bozza.at)}
                <div className="ep-inv-sub">
                  Sono rimaste su questo dispositivo quando il post è stato
                  chiuso senza salvare.
                </div>
              </div>
              <div className="ep-bozza-azioni">
                <button
                  className="ep-btn ep-btn--ghost"
                  onClick={() => {
                    scartaBozza(draft.id);
                    setBozza(null);
                  }}
                >
                  Ignora
                </button>
                <button
                  className="ep-btn ep-btn--primary"
                  onClick={() => {
                    applica(bozza.stato);
                    setBozza(null);
                  }}
                >
                  <FontAwesomeIcon icon={faClockRotateLeft} /> Riprendi
                </button>
              </div>
            </div>
          )}

          {/* Media: foto singola, carosello (più foto/video) o video */}
          <div className="ep-field-head">
            <label className="ep-field-label">Media</label>
            <span className="ep-media-type">{mediaTypeLabel(media)}</span>
          </div>
          <div
            className={`ep-media-grid ${dragOver ? "is-dragover" : ""}`}
            onDragOver={onMediaDragOver}
            onDragLeave={onMediaDragLeave}
            onDrop={onMediaDrop}
          >
            {media.map((m, i) => (
              <div key={i} className="ep-media-tile">
                <button
                  type="button"
                  className="ep-media-open"
                  onClick={() =>
                    setLightbox({ list: media, index: i, source: "media" })
                  }
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

          {/* Stato di lavorazione interno (giallo = schedulato, verde =
              pubblicato). Non visibile al cliente. */}
          <div className="ep-status-field">
            <span className="ep-status-field-label">Stato di lavorazione</span>
            <div className="ep-status-seg">
              <button
                type="button"
                className={`ep-status-opt ${
                  publishStatus === "none" ? "is-on" : ""
                }`}
                onClick={() => setPublishStatus("none")}
              >
                Nessuno
              </button>
              <button
                type="button"
                className={`ep-status-opt ep-status-opt--sched ${
                  publishStatus === "schedulato" ? "is-on" : ""
                }`}
                onClick={() => setPublishStatus("schedulato")}
              >
                <FontAwesomeIcon icon={faClock} /> Schedulato
              </button>
              <button
                type="button"
                className={`ep-status-opt ep-status-opt--pub ${
                  publishStatus === "pubblicato" ? "is-on" : ""
                }`}
                onClick={() => setPublishStatus("pubblicato")}
              >
                <FontAwesomeIcon icon={faCheck} /> Pubblicato
              </button>
            </div>
          </div>

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
                          onClick={() =>
                            setLightbox({ list: n.media, index: j, source: "note" })
                          }
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
            <button
              className="ep-btn ep-btn--primary"
              onClick={handleSave}
              disabled={salvando}
            >
              {salvando ? "Attendo il caricamento…" : "Salva"}
            </button>
          </div>
        </div>

        {/* Lightbox: ingrandisci/scarica/aggiungi ai media, con carosello
            (frecce + swipe + ←/→) quando ci sono più media. */}
        {lightbox?.list?.[lightbox.index] &&
          (() => {
            const item = lightbox.list[lightbox.index];
            const multi = lightbox.list.length > 1;
            return (
              <div className="ep-lightbox" onClick={() => setLightbox(null)}>
                {multi && (
                  <button
                    className="ep-lightbox-nav ep-lightbox-nav--prev"
                    onClick={(e) => {
                      e.stopPropagation();
                      lightboxPrev();
                    }}
                    aria-label="Precedente"
                  >
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </button>
                )}
                <div
                  className="ep-lightbox-inner"
                  onClick={(e) => e.stopPropagation()}
                  onTouchStart={onLbTouchStart}
                  onTouchEnd={onLbTouchEnd}
                >
                  <button
                    className="ep-lightbox-close"
                    onClick={() => setLightbox(null)}
                    aria-label="Chiudi"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                  {item.kind === "video" && item.url ? (
                    <video src={item.url} controls />
                  ) : (
                    <img
                      src={item.kind === "video" ? item.thumbUrl : item.url}
                      alt=""
                    />
                  )}
                  <div className="ep-lightbox-actions">
                    <a
                      className="ep-btn ep-btn--ghost"
                      href={item.url || item.thumbUrl}
                      download
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FontAwesomeIcon icon={faDownload} /> Scarica
                    </a>
                    {lightbox.source === "note" && (
                      <button
                        className="ep-btn ep-btn--primary"
                        onClick={() => addMediaFromNote(item)}
                      >
                        <FontAwesomeIcon icon={faPlus} /> Aggiungi ai media del
                        post
                      </button>
                    )}
                  </div>
                  {multi && (
                    <div className="ep-lightbox-count">
                      {lightbox.index + 1} / {lightbox.list.length}
                    </div>
                  )}
                </div>
                {multi && (
                  <button
                    className="ep-lightbox-nav ep-lightbox-nav--next"
                    onClick={(e) => {
                      e.stopPropagation();
                      lightboxNext();
                    }}
                    aria-label="Successivo"
                  >
                    <FontAwesomeIcon icon={faChevronRight} />
                  </button>
                )}
              </div>
            );
          })()}
      </div>

      {/* Storico delle versioni: si apre sopra al post, e se si ripristina il
          calendario lo rilegge dal server (il post è già cambiato lì). */}
      {versioniAperte && (
        <VersionsPanel
          postId={draft.id}
          modificato={hasChanges()}
          onClose={() => setVersioniAperte(false)}
          onRestored={(post) => {
            setVersioniAperte(false);
            scartaBozza(draft.id); // la bozza locale è di un'altra storia ormai
            (onRestored || onClose)(post);
          }}
        />
      )}
    </div>
  );
};

PostModal.propTypes = {
  draft: PropTypes.object.isRequired,
  client: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  // chiamata dopo il ripristino di una versione: il post è già cambiato sul
  // server, il calendario deve rileggerlo
  onRestored: PropTypes.func,
};

export default PostModal;
