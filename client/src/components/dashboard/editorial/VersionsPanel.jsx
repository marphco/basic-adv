import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faTriangleExclamation,
  faRotateLeft,
  faSpinner,
  faPlay,
} from "@fortawesome/free-solid-svg-icons";
import { api } from "./api";
import { quandoTempo } from "./cronologia";
import { confirmDialog, toastErr, toastOk } from "./uiNotify";

// Storico delle versioni di un post: si sceglie un momento e ci si torna.
//
// Il punto delicato è che ripristinare SOSTITUISCE quello che c'è adesso.
// Per questo non si ripristina mai alla cieca: prima si vede cosa cambierebbe,
// campo per campo, e se qualche foto di allora è stata cancellata a mano lo si
// legge PRIMA, non dopo con un post pieno di buchi.

const quando = (d) =>
  new Date(d).toLocaleString("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const ETICHETTA = {
  iniziale: "stato iniziale",
  ripristino: "ripristino",
  salvataggio: "",
};

// I valori grezzi non si mostrano: "none" e "true" non vogliono dire niente.
const leggibile = (v) => {
  if (v === true) return "sì";
  if (v === false) return "no";
  if (v === "" || v === null || v === undefined) return "—";
  if (v === "none") return "nessuno";
  return String(v);
};

// Le foto di una versione, in miniatura. Gli indirizzi sono già assoluti
// (arrivano dal post così come erano salvati). Per un video senza poster serve
// <video>: un <img> con un mp4 dentro mostrerebbe solo un'icona rotta.
const Miniature = ({ foto = [], totale = 0 }) => {
  if (!foto.length) return null;
  return (
    <span className="ep-thumb-strip">
      {foto.map((m, i) => (
        <span key={i} className="ep-thumb ep-thumb--mini">
          {m.kind === "video" && !m.thumbUrl ? (
            <video src={`${m.url}#t=0.1`} muted preload="metadata" />
          ) : (
            <img
              src={m.kind === "video" ? m.thumbUrl : m.url}
              alt=""
              loading="lazy"
            />
          )}
          {m.kind === "video" && (
            <span className="ep-thumb-video">
              <FontAwesomeIcon icon={faPlay} />
            </span>
          )}
        </span>
      ))}
      {totale > foto.length && (
        <span className="ep-thumb-more">+{totale - foto.length}</span>
      )}
    </span>
  );
};

Miniature.propTypes = {
  foto: PropTypes.array,
  totale: PropTypes.number,
};

const VersionsPanel = ({ postId, modificato, onClose, onRestored }) => {
  const [versioni, setVersioni] = useState(null);
  const [errore, setErrore] = useState("");
  const [aperta, setAperta] = useState(null); // dettaglio della versione scelta
  const [caricando, setCaricando] = useState(false);
  const [ripristinando, setRipristinando] = useState(false);

  useEffect(() => {
    api
      .listVersions(postId)
      .then(setVersioni)
      .catch((e) =>
        setErrore(e?.response?.data?.error || "Storico non disponibile.")
      );
  }, [postId]);

  const apri = async (v) => {
    if (aperta?.id === v.id) return setAperta(null); // seconda toccata: si chiude
    setCaricando(true);
    setAperta(null);
    try {
      setAperta(await api.getVersion(postId, v.id));
    } catch (e) {
      toastErr(e?.response?.data?.error || "Versione non leggibile.");
    } finally {
      setCaricando(false);
    }
  };

  const ripristina = async (v) => {
    const avvisi = [
      modificato ? "Le modifiche non salvate andranno perse." : "",
      v.mancanti?.length
        ? `${v.mancanti.length} file di questa versione non esistono più e non torneranno.`
        : "",
    ].filter(Boolean);

    const ok = await confirmDialog(
      [
        `Il post tornerà com'era il ${quando(v.at)}.`,
        ...avvisi,
        "Lo stato attuale viene salvato nello storico: se sbagli, torni indietro da qui.",
      ].join(" "),
      { title: "Ripristinare questa versione?", confirmLabel: "Ripristina" }
    );
    if (!ok) return;

    setRipristinando(true);
    try {
      const post = await api.restoreVersion(postId, v.id);
      toastOk("Versione ripristinata.");
      onRestored(post);
    } catch (e) {
      toastErr(e?.response?.data?.error || "Ripristino non riuscito.");
      setRipristinando(false);
    }
  };

  return (
    // Si apre sopra al post: il click fuori chiude SOLO questo pannello,
    // altrimenti chiuderebbe anche la modifica del post che c'è sotto.
    <div
      className="ep-modal-overlay"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="ep-modal ep-modal--share"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ep-modal-head">
          <h3>Versioni del post</h3>
          <button className="ep-icon-btn" onClick={onClose} aria-label="Chiudi">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="ep-modal-body">
          {errore && (
            <div className="ep-share-warning">
              <FontAwesomeIcon icon={faTriangleExclamation} /> {errore}
            </div>
          )}
          {!versioni && !errore && <p className="ep-share-hint">Caricamento…</p>}

          {versioni && !versioni.length && (
            <p className="ep-share-hint">
              Nessuna versione ancora: lo storico parte dal primo salvataggio.
            </p>
          )}

          {modificato && versioni?.length > 0 && (
            <div className="ep-share-warning">
              <FontAwesomeIcon icon={faTriangleExclamation} /> Ci sono modifiche
              non salvate: ripristinando una versione andranno perse.
            </div>
          )}

          <ul className="ep-ver-lista">
            {(versioni || []).map((v, i) => (
              <li
                key={v.id}
                className={`ep-ver ${aperta?.id === v.id ? "is-aperta" : ""}`}
              >
                <button className="ep-ver-testa" onClick={() => apri(v)}>
                  <span className="ep-ver-quando">
                    {quandoTempo(new Date(v.at).getTime())}
                    {/* La più recente è quello che si vede adesso: dirlo evita
                        il ripristino inutile "tanto per sicurezza". */}
                    {i === 0 && !modificato && (
                      <span className="ep-ver-tag">versione attuale</span>
                    )}
                    {ETICHETTA[v.origine] && (
                      <span className="ep-ver-tag">{ETICHETTA[v.origine]}</span>
                    )}
                  </span>
                  <span className="ep-ver-data">
                    {quando(v.at)} · {v.by}
                  </span>
                  <span className="ep-ver-anteprima">
                    {v.anteprima || "(senza didascalia)"}
                  </span>
                  <span className="ep-ver-data">
                    {v.media} media · {v.note} note
                  </span>
                  <Miniature foto={v.foto} totale={v.media} />
                </button>

                {aperta?.id === v.id && (
                  <div className="ep-ver-dettaglio">
                    {!aperta.differenze.length ? (
                      <p className="ep-share-hint">
                        È il post così com'è adesso: non c'è niente da
                        ripristinare.
                      </p>
                    ) : (
                      <table className="ep-ver-diff">
                        <tbody>
                          {aperta.differenze.map((d) => (
                            <tr key={d.campo}>
                              <th>{d.campo}</th>
                              <td className="ep-ver-prima">
                                {leggibile(d.prima)}
                              </td>
                              <td className="ep-ver-dopo">
                                {leggibile(d.dopo)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {aperta.mancanti?.length > 0 && (
                      <div className="ep-share-warning">
                        <FontAwesomeIcon icon={faTriangleExclamation} />{" "}
                        {aperta.mancanti.length === 1
                          ? "Un file di questa versione"
                          : `${aperta.mancanti.length} file di questa versione`}{" "}
                        non esiste più (cancellato dall'Archivio): ripristinando,
                        quel post resterà senza.
                      </div>
                    )}

                    {/* Le foto per intero solo se in elenco non ci stavano
                        tutte: ripeterle sotto quelle già visibili sopra non
                        aggiunge niente. */}
                    {aperta.snapshot?.media?.length > 4 && (
                      <Miniature
                        foto={aperta.snapshot.media}
                        totale={aperta.snapshot.media.length}
                      />
                    )}

                    {/* Nessun pulsante se non cambierebbe niente: offrire di
                        ripristinare il post che si sta già guardando è solo un
                        modo per far dubitare di aver capito male. */}
                    {!!aperta.differenze.length && (
                      <button
                        className="ep-btn ep-btn--primary"
                        onClick={() => ripristina(aperta)}
                        disabled={ripristinando}
                      >
                        <FontAwesomeIcon
                          icon={ripristinando ? faSpinner : faRotateLeft}
                          spin={ripristinando}
                        />{" "}
                        Ripristina questa versione
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {caricando && <p className="ep-share-hint">Apro la versione…</p>}
        </div>
      </div>
    </div>
  );
};

VersionsPanel.propTypes = {
  postId: PropTypes.string.isRequired,
  modificato: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onRestored: PropTypes.func.isRequired,
};

export default VersionsPanel;
