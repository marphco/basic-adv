import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTriangleExclamation,
  faPlay,
  faCircleCheck,
  faTrash,
  faCheck,
  faImage,
} from "@fortawesome/free-solid-svg-icons";
import { api, API_URL } from "./api";

const MB = (n) => {
  if (!n) return "0 MB";
  const mb = n / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
};

// I percorsi arrivano relativi ("/uploads-ped/ped-1.jpg"): li completo qui,
// così valgono con qualsiasi indirizzo del server.
const src = (p) => (p ? `${API_URL}${p}` : "");

// Anteprima di un file. Per i video senza poster si usa <video>: un <img>
// con l'indirizzo di un mp4 darebbe solo un'icona di immagine rotta.
const Anteprima = ({ file, className = "" }) => {
  const video = file.kind === "video";
  return (
    <div className={`ep-thumb ${className}`}>
      {video && !file.thumb ? (
        <video src={`${src(file.path)}#t=0.1`} muted preload="metadata" />
      ) : (
        <img src={src(video ? file.thumb : file.path)} alt="" loading="lazy" />
      )}
      {video && (
        <span className="ep-thumb-video">
          <FontAwesomeIcon icon={faPlay} />
        </span>
      )}
    </div>
  );
};

// Contenuti dell'archivio: cosa occupa spazio, di chi è, e come liberarlo.
//
// Regola che guida tutto il pannello: non si cancella al buio. Ogni cosa
// selezionabile mostra cosa contiene, e la barra in basso dice quanto si sta
// per liberare PRIMA di premere.
const InventoryPanel = () => {
  const [data, setData] = useState(null);
  const [vista, setVista] = useState("mesi"); // mesi | file | rotti
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scelti, setScelti] = useState([]);
  const [conferma, setConferma] = useState(null);
  const [esito, setEsito] = useState("");

  const carica = (ordina) => {
    setBusy(true);
    setError("");
    api
      .storageInventory(ordina ? { ordina } : {})
      .then(setData)
      .catch((e) =>
        setError(e?.response?.data?.error || "Inventario non disponibile.")
      )
      .finally(() => setBusy(false));
  };

  useEffect(() => {
    carica();
  }, []);

  const cambiaVista = (v, ordina) => {
    setVista(v);
    setScelti([]); // la selezione di una vista non ha senso nell'altra
    setEsito("");
    if (ordina !== undefined) carica(ordina);
  };

  const toggle = (id) =>
    setScelti((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const esegui = async (body, descrizione) => {
    setBusy(true);
    setConferma(null);
    try {
      const r = await api.storageCleanup(body);
      setEsito(
        `${descrizione}: ${r.rimossi} file eliminati` +
          (r.bytes ? `, ${MB(r.bytes)} liberati` : "") +
          (r.postToccati ? ` · ${r.postToccati} post aggiornati` : "")
      );
      setScelti([]);
      carica(vista === "file" ? "peso" : undefined);
    } catch (e) {
      setEsito(e?.response?.data?.error || "Eliminazione non riuscita.");
    } finally {
      setBusy(false);
    }
  };

  if (error)
    return (
      <div className="ep-share-warning">
        <FontAwesomeIcon icon={faTriangleExclamation} /> {error}
      </div>
    );
  if (!data) return <p className="ep-share-hint">Caricamento…</p>;

  const t = data.totali || {};
  const rotti = data.mancanti || [];
  const orfani = data.orfani || [];

  const elenco = vista === "mesi" ? data.mesi || [] : data.pesanti || [];
  const idDi = (x) => (vista === "mesi" ? x.chiave : x.key);
  const selezionati = elenco.filter((x) => scelti.includes(idDi(x)));
  const pesoScelto = selezionati.reduce((n, x) => n + (x.bytes || 0), 0);
  const fileScelti = selezionati.reduce(
    (n, x) => n + (vista === "mesi" ? x.files : 1),
    0
  );

  const chiediEliminazione = () => {
    if (vista === "mesi")
      setConferma({
        titolo:
          selezionati.length === 1
            ? `Eliminare le foto di ${selezionati[0].cliente} — ${selezionati[0].mese}?`
            : `Eliminare le foto di ${selezionati.length} mesi?`,
        testo:
          `${fileScelti} file, ${MB(pesoScelto)} liberati. I post restano con ` +
          `didascalie, note e storico: perdono solo le immagini.`,
        azione: () =>
          esegui(
            {
              scope: "mesi",
              mesi: selezionati.map((m) => ({
                clientId: m.clientId,
                year: m.year,
                month: m.month,
              })),
            },
            "Eliminati"
          ),
      });
    else
      setConferma({
        titolo: `Eliminare ${fileScelti} file?`,
        testo:
          `${MB(pesoScelto)} liberati. I file spariscono anche dai post che li ` +
          `mostrano.`,
        azione: () =>
          esegui({ scope: "file", keys: selezionati.map((f) => f.key) }, "Eliminati"),
      });
  };

  return (
    <>
      {/* Stato in una riga: si legge in un secondo. */}
      <div className={`ep-inv-summary ${rotti.length ? "is-bad" : "is-ok"}`}>
        <FontAwesomeIcon
          icon={rotti.length ? faTriangleExclamation : faCircleCheck}
        />
        <div>
          {rotti.length ? (
            <strong>
              {rotti.length} immagini non si aprono più
            </strong>
          ) : (
            <strong>Tutte le immagini dei piani sono al loro posto</strong>
          )}
          <div className="ep-inv-sub">
            {t.citati} file in uso · {MB(t.bytes)}
            {t.soloDisco ? ` · ${t.soloDisco} non ancora sul bucket` : ""}
          </div>
        </div>
      </div>

      {/* Spazio recuperabile senza conseguenze: sta in cima perché è sempre
          la prima cosa da fare, e mostra cosa sta per buttare. */}
      {!!t.orfani && (
        <div className="ep-inv-orfani">
          <div className="ep-inv-orfani-testo">
            <strong>{t.orfani} file di post eliminati</strong>
            <div className="ep-inv-sub">
              Non compaiono in nessun piano · {MB(t.bytesOrfani)} da recuperare
            </div>
          </div>
          <div className="ep-thumb-strip">
            {orfani.slice(0, 8).map((f) => (
              <Anteprima key={f.key} file={f} className="ep-thumb--mini" />
            ))}
            {orfani.length > 8 && (
              <span className="ep-thumb-more">+{orfani.length - 8}</span>
            )}
          </div>
          <button
            className="ep-btn ep-btn--ghost"
            disabled={busy}
            onClick={() =>
              setConferma({
                titolo: `Eliminare ${t.orfani} file inutilizzati?`,
                testo: `Si liberano ${MB(t.bytesOrfani)}. Non sono mostrati in nessun piano, quindi non cambia niente per i clienti.`,
                azione: () => esegui({ scope: "orfani" }, "Eliminati"),
              })
            }
          >
            <FontAwesomeIcon icon={faTrash} /> Libera {MB(t.bytesOrfani)}
          </button>
        </div>
      )}

      <div className="ep-tabs">
        <button
          className={`ep-tab ${vista === "mesi" ? "active" : ""}`}
          onClick={() => cambiaVista("mesi", undefined)}
        >
          Per mese
        </button>
        <button
          className={`ep-tab ${vista === "file" ? "active" : ""}`}
          onClick={() => cambiaVista("file", "peso")}
        >
          File più pesanti
        </button>
        {/* Compare solo se c'è davvero qualcosa da guardare: una scheda
            sempre vuota è solo una domanda senza risposta. */}
        {!!rotti.length && (
          <button
            className={`ep-tab ${vista === "rotti" ? "active" : ""}`}
            onClick={() => cambiaVista("rotti")}
          >
            Da controllare ({rotti.length})
          </button>
        )}
      </div>

      {busy && <p className="ep-share-hint">Attendi…</p>}
      {esito && (
        <div className="ep-share-ok">
          <FontAwesomeIcon icon={faCircleCheck} /> {esito}
        </div>
      )}

      {/* ---- Per mese: la riga mostra un assaggio di cosa contiene ---- */}
      {vista === "mesi" && (
        <ul className="ep-inv-list">
          {(data.mesi || []).map((m) => {
            const sel = scelti.includes(m.chiave);
            return (
              <li
                key={m.chiave}
                className={`ep-inv-mese ${sel ? "is-selected" : ""}`}
                onClick={() => toggle(m.chiave)}
              >
                <span className={`ep-check ${sel ? "is-on" : ""}`} aria-hidden="true">
                  {sel && <FontAwesomeIcon icon={faCheck} />}
                </span>
                <div className="ep-inv-mese-corpo">
                  <div className="ep-inv-mese-testa">
                    <div>
                      <strong>{m.cliente}</strong>
                      <span className="ep-inv-meta"> {m.mese}</span>
                    </div>
                    <div className="ep-inv-peso">
                      {MB(m.bytes)}
                      <span className="ep-inv-meta">
                        {m.files} file{m.video ? ` · ${m.video} video` : ""}
                      </span>
                    </div>
                  </div>
                  <div className="ep-thumb-strip">
                    {(m.anteprime || []).map((a, i) => (
                      <Anteprima key={i} file={a} className="ep-thumb--mini" />
                    ))}
                    {m.files > (m.anteprime || []).length && (
                      <span className="ep-thumb-more">
                        +{m.files - (m.anteprime || []).length}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ---- File più pesanti: una galleria, si sceglie guardando ---- */}
      {vista === "file" && (
        <div className="ep-inv-griglia">
          {(data.pesanti || []).map((f) => {
            const sel = scelti.includes(f.key);
            return (
              <button
                key={f.key}
                type="button"
                className={`ep-inv-tile ${sel ? "is-selected" : ""}`}
                onClick={() => toggle(f.key)}
              >
                <Anteprima file={f} />
                <span className={`ep-check ep-check--tile ${sel ? "is-on" : ""}`}>
                  {sel && <FontAwesomeIcon icon={faCheck} />}
                </span>
                <span className="ep-inv-tile-peso">{MB(f.bytes)}</span>
                <span className="ep-inv-tile-info">
                  <strong>{f.cliente}</strong>
                  <span className="ep-inv-meta">
                    {f.mese} · {f.day}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ---- Da controllare: cosa non si apre più e in quale post ---- */}
      {vista === "rotti" && (
        <>
          <p className="ep-share-desc">
            Questi file sono citati da un post ma non esistono più: nel piano si
            vede uno spazio vuoto. Vai al post indicato e ricarica l'immagine.
          </p>
          <ul className="ep-inv-list">
            {rotti.map((f) => (
              <li key={f.key} className="ep-inv-rotto">
                <span className="ep-thumb ep-thumb--mini ep-thumb--vuota">
                  <FontAwesomeIcon icon={faImage} />
                </span>
                <div>
                  <strong>{f.cliente}</strong>
                  <div className="ep-inv-meta">
                    {f.mese} · giorno {f.day}
                    {f.origine !== "post" ? ` · ${f.origine}` : ""}
                  </div>
                  {f.caption && <div className="ep-inv-cap">{f.caption}</div>}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Barra della selezione: dice sempre quanto si sta per liberare. */}
      {vista !== "rotti" && selezionati.length > 0 && (
        <div className="ep-inv-bar">
          <span>
            <strong>{fileScelti} file</strong> · {MB(pesoScelto)}
          </span>
          <div className="ep-inv-bar-actions">
            <button className="ep-btn ep-btn--ghost" onClick={() => setScelti([])}>
              Annulla
            </button>
            <button
              className="ep-btn ep-btn--danger"
              disabled={busy}
              onClick={chiediEliminazione}
            >
              <FontAwesomeIcon icon={faTrash} /> Elimina
            </button>
          </div>
        </div>
      )}

      {/* Conferma: è l'unica cosa del pannello che distrugge qualcosa. */}
      {conferma && (
        <div className="ep-modal-overlay" onClick={() => setConferma(null)}>
          <div
            className="ep-modal ep-modal--confirm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ep-modal-head">
              <h3>{conferma.titolo}</h3>
            </div>
            <div className="ep-modal-body">
              <p className="ep-share-desc">{conferma.testo}</p>
              <p className="ep-share-hint">Non si può annullare.</p>
            </div>
            <div className="ep-modal-foot">
              <div className="ep-foot-right">
                <button
                  className="ep-btn ep-btn--ghost"
                  onClick={() => setConferma(null)}
                >
                  Annulla
                </button>
                <button
                  className="ep-btn ep-btn--danger"
                  onClick={conferma.azione}
                  disabled={busy}
                >
                  <FontAwesomeIcon icon={faTrash} /> Elimina
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryPanel;
