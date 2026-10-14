import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faImage,
  faImages,
  faPlay,
  faBullhorn,
  faComment,
  faClone,
  faCheck,
  faLock,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import { categoryColor } from "./mockData";

// Le parole scritte sulla card. Sono quelle del pannello admin e restano le
// predefinite: solo la pagina pubblica del piano (il cliente, magari in
// inglese) ne passa altre con `etichette`. Senza, la card è identica a prima.
const ETICHETTE = {
  daRivedere: "Da rivedere",
  schedulato: "Schedulato",
  pubblicato: "Pubblicato",
  sponsor: "Sponsor",
  video: (quanti, carosello) => (carosello ? `${quanti} video` : "Video"),
  cliente: (n) => `Cliente${n > 1 ? ` ${n}` : ""}`,
  note: (n) => `Note${n > 1 ? ` ${n}` : ""}`,
  interna: (n) => `Interna${n > 1 ? ` ${n}` : ""}`,
};

// Card di un post. `compact` = versione testuale per la vista a matrice
// (pagine × giorni), senza miniatura, come nel PED a griglia.
const PostChip = ({ post, compact, onClick, movable, dndHandlers, etichette }) => {
  const E = { ...ETICHETTE, ...(etichette || {}) };
  const cover = post.media?.[0];
  const mediaCount = post.media?.length || 0;
  // `isVideo` riguarda solo la COPERTINA (serve alla miniatura). Per capire se
  // nel post c'è del video serve guardare tutto il carosello: la copertina può
  // essere una foto e i video stare in fondo, e in quel caso senza un segno
  // sulla card si scoprono solo aprendo i post uno per uno.
  const isVideo = cover?.kind === "video";
  const videoCount = (post.media || []).filter((m) => m.kind === "video").length;
  const notes = post.notes || [];
  // Badge distinti per ORIGINE della nota:
  //  • Cliente = note lasciate DAL cliente (l'operatore ci lavora) → ambra se da
  //    gestire, verde se risolta;
  //  • Agenzia = note dell'agenzia PER il cliente (informative, nessuno stato
  //    "risolta": una spiegazione non si "risolve");
  //  • Interna = solo agenzia, il cliente non le vede MAI.
  const clientNotes = notes.filter((n) => !n.fromAgency && !n.internal);
  const agencyNotes = notes.filter((n) => n.fromAgency && !n.internal);
  const internalNotes = notes.filter((n) => n.internal);
  // sfondo giallo SOLO se c'è una nota del cliente non risolta (da gestire).
  const clientPending = clientNotes.some((n) => !n.resolved);
  const internalPending = internalNotes.some((n) => !n.resolved);
  // Ogni post con una nota ha uno SFONDO (così risalta). Un solo colore, per
  // stato/origine dominante: cliente da gestire (giallo) → interna da gestire
  // (blu) → nota per il cliente (arancione) → tutto risolto (verde).
  const bgClass = clientPending
    ? "ep-post--client-note"
    : internalPending
    ? "ep-post--internal"
    : agencyNotes.length
    ? "ep-post--agency-note"
    : clientNotes.length || internalNotes.length
    ? "ep-post--note-done"
    : "";
  // Colore del bordo laterale = colore della categoria (come nel prototipo).
  const catColor = post.category ? categoryColor(post.category) : null;
  // Stato di lavorazione interno: schedulato (giallo) / pubblicato (verde).
  // L'anello + badge ci sono SEMPRE; lo SFONDO colorato dello stato si mette solo
  // se il post non ha già uno sfondo-nota o di duplicato (che hanno priorità), per
  // non confondere il giallo stato con l'ocra delle note cliente né il verde stato
  // col verde "risolta".
  const ps = post.publishStatus;
  const statusClass =
    ps === "pubblicato"
      ? "ep-post--pub"
      : ps === "schedulato"
      ? "ep-post--sched"
      : "";
  // Lo sfondo può raccontare UNA cosa sola, quindi va a quella che conta di
  // più. Una nota già risolta non chiede niente a nessuno: cede lo sfondo
  // allo stato di lavorazione (il verde di "pubblicato" è l'informazione che
  // l'operatore cerca a colpo d'occhio) e resta segnalata dalla barretta
  // grigia e dal badge. Se invece non c'è nessuno stato, lo sfondo grigio
  // resta suo — altrimenti la nota risolta sparirebbe.
  const risolteCedono = bgClass === "ep-post--note-done";
  const noOtherBg = (!bgClass || risolteCedono) && !post.isDuplicate;
  const statusBgClass =
    noOtherBg && ps === "pubblicato"
      ? "ep-post--pub-bg"
      : noOtherBg && ps === "schedulato"
      ? "ep-post--sched-bg"
      : "";

  return (
    <button
      className={[
        "ep-post",
        compact ? "ep-post--compact" : "",
        post.sponsored ? "ep-post--sponsored" : "",
        bgClass,
        statusClass,
        statusBgClass,
        post.isDuplicate ? "ep-post--dup" : "",
        movable ? "ep-post--draggable" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={catColor ? { "--cat-color": catColor } : undefined}
      onClick={onClick}
      {...(dndHandlers || {})}
    >
      {!compact && (
        <div className="ep-post-thumb">
          {cover ? (
            isVideo && !cover.thumbUrl ? (
              // video senza poster → <video> mostra il primo fotogramma
              // (#t=0.1 forza il render del frame anche con preload=metadata;
              // un <img> con l'URL del video darebbe immagine rotta)
              <video src={`${cover.url}#t=0.1`} muted preload="metadata" />
            ) : (
              <img
                src={isVideo ? cover.thumbUrl : cover.url}
                alt=""
                loading="lazy"
              />
            )
          ) : (
            <FontAwesomeIcon icon={faImage} />
          )}
          {isVideo && (
            <span className="ep-thumb-play">
              <FontAwesomeIcon icon={faPlay} />
            </span>
          )}
        </div>
      )}

      <div className="ep-post-body">
        {post.isDuplicate && (
          <span className="ep-dup-flag">
            <FontAwesomeIcon icon={faClone} /> {E.daRivedere}
          </span>
        )}
        {post.category && (
          <span
            className="ep-cat-tag"
            style={{ color: categoryColor(post.category) }}
          >
            {post.category}
          </span>
        )}
        <span className="ep-post-caption">{post.caption}</span>
        <div className="ep-post-badges">
          {ps === "schedulato" && (
            <span className="ep-badge ep-badge--sched">
              <FontAwesomeIcon icon={faClock} /> {E.schedulato}
            </span>
          )}
          {ps === "pubblicato" && (
            <span className="ep-badge ep-badge--pub">
              <FontAwesomeIcon icon={faCheck} /> {E.pubblicato}
            </span>
          )}
          {post.sponsored && (
            <span className="ep-badge ep-badge--sponsored">
              <FontAwesomeIcon icon={faBullhorn} /> {E.sponsor}
            </span>
          )}
          {mediaCount > 1 && (
            <span className="ep-badge ep-badge--carousel">
              <FontAwesomeIcon icon={faImages} /> {mediaCount}
            </span>
          )}
          {/* Quanti video ci sono dentro: in un carosello misto è l'unico modo
              per saperlo senza aprire il post. */}
          {videoCount > 0 && (
            <span className="ep-badge ep-badge--video">
              <FontAwesomeIcon icon={faPlay} />{" "}
              {E.video(videoCount, mediaCount > 1)}
            </span>
          )}
          {clientNotes.length > 0 && (
            <span
              className={`ep-badge ${
                clientPending ? "ep-badge--note" : "ep-badge--note-done"
              }`}
            >
              <FontAwesomeIcon icon={clientPending ? faComment : faCheck} />{" "}
              {E.cliente(clientNotes.length)}
            </span>
          )}
          {agencyNotes.length > 0 && (
            <span className="ep-badge ep-badge--agency">
              <FontAwesomeIcon icon={faComment} />{" "}
              {E.note(agencyNotes.length)}
            </span>
          )}
          {internalNotes.length > 0 && (
            <span className="ep-badge ep-badge--internal">
              <FontAwesomeIcon icon={internalPending ? faLock : faCheck} />{" "}
              {E.interna(internalNotes.length)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

PostChip.propTypes = {
  post: PropTypes.object.isRequired,
  compact: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  movable: PropTypes.bool,
  dndHandlers: PropTypes.object,
  // parole della card in un'altra lingua (solo pagina pubblica del piano)
  etichette: PropTypes.object,
};

export default PostChip;
