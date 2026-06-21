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
} from "@fortawesome/free-solid-svg-icons";
import { categoryColor } from "./mockData";

// Card di un post. `compact` = versione testuale per la vista a matrice
// (pagine × giorni), senza miniatura, come nel PED a griglia.
const PostChip = ({ post, compact, onClick, movable, dndHandlers }) => {
  const cover = post.media?.[0];
  const mediaCount = post.media?.length || 0;
  const isVideo = cover?.kind === "video";
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

  return (
    <button
      className={[
        "ep-post",
        compact ? "ep-post--compact" : "",
        post.sponsored ? "ep-post--sponsored" : "",
        bgClass,
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
            <FontAwesomeIcon icon={faClone} /> Da rivedere
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
          {post.sponsored && (
            <span className="ep-badge ep-badge--sponsored">
              <FontAwesomeIcon icon={faBullhorn} /> Sponsor
            </span>
          )}
          {isVideo && compact && (
            <span className="ep-badge ep-badge--video">
              <FontAwesomeIcon icon={faPlay} /> Video
            </span>
          )}
          {mediaCount > 1 && (
            <span className="ep-badge ep-badge--carousel">
              <FontAwesomeIcon icon={faImages} /> {mediaCount}
            </span>
          )}
          {clientNotes.length > 0 && (
            <span
              className={`ep-badge ${
                clientPending ? "ep-badge--note" : "ep-badge--note-done"
              }`}
            >
              <FontAwesomeIcon icon={clientPending ? faComment : faCheck} />{" "}
              Cliente{clientNotes.length > 1 ? ` ${clientNotes.length}` : ""}
            </span>
          )}
          {agencyNotes.length > 0 && (
            <span className="ep-badge ep-badge--agency">
              <FontAwesomeIcon icon={faComment} />{" "}
              Note{agencyNotes.length > 1 ? ` ${agencyNotes.length}` : ""}
            </span>
          )}
          {internalNotes.length > 0 && (
            <span className="ep-badge ep-badge--internal">
              <FontAwesomeIcon icon={internalPending ? faLock : faCheck} />{" "}
              Interna{internalNotes.length > 1 ? ` ${internalNotes.length}` : ""}
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
};

export default PostChip;
