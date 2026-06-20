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
} from "@fortawesome/free-solid-svg-icons";
import { categoryColor } from "./mockData";

// Card di un post. `compact` = versione testuale per la vista a matrice
// (pagine × giorni), senza miniatura, come nel PED a griglia.
const PostChip = ({ post, compact, onClick, movable, dndHandlers }) => {
  const cover = post.media?.[0];
  const mediaCount = post.media?.length || 0;
  const isVideo = cover?.kind === "video";
  const notes = post.notes || [];
  // "in sospeso": nota cliente non risolta OPPURE richiesta dell'agenzia non
  // risolta. Le spiegazioni dell'agenzia non sono "in sospeso".
  const pending = notes.filter(
    (n) => !n.resolved && (!n.fromAgency || n.needsReply)
  ).length;
  const hasUnresolved = pending > 0;
  const hasNotes = notes.length > 0;
  // Colore del bordo laterale = colore della categoria (come nel prototipo).
  const catColor = post.category ? categoryColor(post.category) : null;

  return (
    <button
      className={[
        "ep-post",
        compact ? "ep-post--compact" : "",
        post.sponsored ? "ep-post--sponsored" : "",
        hasUnresolved ? "ep-post--note" : "",
        hasNotes && !hasUnresolved ? "ep-post--note-done" : "",
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
            <img
              src={isVideo ? cover.thumbUrl || cover.url : cover.url}
              alt=""
              loading="lazy"
            />
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
          {hasUnresolved && (
            <span className="ep-badge ep-badge--note">
              <FontAwesomeIcon icon={faComment} /> {pending}
            </span>
          )}
          {hasNotes && !hasUnresolved && (
            <span className="ep-badge ep-badge--note-done">
              <FontAwesomeIcon icon={faCheck} />
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
