import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTriangleExclamation,
  faImage,
  faVideo,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import { api } from "./api";

const MB = (n) => {
  if (!n) return "0 MB";
  const mb = n / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
};

// Contenuti dell'archivio: cosa occupa spazio, di chi è, e cosa non si trova.
//
// La vista predefinita è per MESE dal più vecchio, perché è così che si
// ragiona quando si fa pulizia. Ma i mesi vecchi non bastano: se il peso sta
// in tre video di settembre, cancellare un anno di foto non risolve niente —
// per quello c'è la vista per peso.
const InventoryPanel = () => {
  const [data, setData] = useState(null);
  const [vista, setVista] = useState("mesi"); // mesi | peso | problemi
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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

  if (error)
    return (
      <div className="ep-share-warning">
        <FontAwesomeIcon icon={faTriangleExclamation} /> {error}
      </div>
    );
  if (!data) return <p className="ep-share-hint">Caricamento…</p>;

  // I totali arrivano in un oggetto a parte: gli elenchi hanno gli stessi nomi
  // e allo stesso livello si sarebbero sovrascritti a vicenda.
  const t = data.totali || {};
  const problemi = data.mancanti?.length || 0;

  return (
    <>
      {/* Il riepilogo che risponde alla domanda "va tutto bene?" */}
      <div className={`ep-inv-summary ${problemi ? "is-bad" : "is-ok"}`}>
        <FontAwesomeIcon icon={problemi ? faTriangleExclamation : faCircleCheck} />
        <div>
          {problemi ? (
            <>
              <strong>{problemi} file non si trovano</strong> — sono le immagini
              che non si vedono. Sotto c'è l'elenco con cliente e giorno.
            </>
          ) : (
            <>
              <strong>Tutti i {t.citati} file dei piani sono al loro posto.</strong>{" "}
              Nessuna immagine rotta.
            </>
          )}
          <div className="ep-inv-sub">
            {t.citati} file usati nei piani · {MB(t.bytes)}
            {t.soloDisco ? ` · ${t.soloDisco} ancora solo sul volume` : ""}
            {t.orfani
              ? ` · ${t.orfani} non più usati, ${MB(t.bytesOrfani)} recuperabili`
              : ""}
          </div>
        </div>
      </div>

      <div className="ep-tabs">
        <button
          className={`ep-tab ${vista === "mesi" ? "is-active" : ""}`}
          onClick={() => {
            setVista("mesi");
            carica();
          }}
        >
          Mesi più vecchi
        </button>
        <button
          className={`ep-tab ${vista === "peso" ? "is-active" : ""}`}
          onClick={() => {
            setVista("peso");
            carica("peso");
          }}
        >
          Chi pesa di più
        </button>
        <button
          className={`ep-tab ${vista === "problemi" ? "is-active" : ""}`}
          onClick={() => setVista("problemi")}
        >
          Problemi{problemi ? ` (${problemi})` : ""}
        </button>
      </div>

      {busy && <p className="ep-share-hint">Aggiorno…</p>}

      {/* --- per mese: l'unità con cui si fa pulizia --- */}
      {vista === "mesi" && (
        <ul className="ep-inv-list">
          {(data.mesi || []).map((m) => (
            <li key={m.chiave} className="ep-inv-row">
              <div className="ep-inv-main">
                <strong>{m.cliente}</strong>
                <span className="ep-inv-meta">{m.mese}</span>
              </div>
              <div className="ep-inv-side">
                <span className="ep-inv-size">{MB(m.bytes)}</span>
                <span className="ep-inv-meta">
                  {m.files} file
                  {m.video ? ` · ${m.video} video` : ""}
                  {m.mancanti ? ` · ${m.mancanti} mancanti` : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* --- per peso: i singoli file più grossi, con tutti i riferimenti --- */}
      {vista === "peso" && (
        <ul className="ep-inv-list">
          {(data.pesanti || []).map((f) => (
            <li key={f.key} className="ep-inv-row">
              <div className="ep-inv-main">
                <FontAwesomeIcon icon={f.kind === "video" ? faVideo : faImage} />{" "}
                <strong>{f.cliente}</strong>
                <span className="ep-inv-meta">
                  {f.mese} · giorno {f.day}
                  {f.origine !== "post" ? ` · ${f.origine}` : ""}
                </span>
                {f.caption && <div className="ep-inv-cap">{f.caption}</div>}
              </div>
              <div className="ep-inv-side">
                <span className="ep-inv-size">{MB(f.bytes)}</span>
                <span className="ep-inv-meta">{f.name}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* --- problemi: cosa non si trova, e dove guardare --- */}
      {vista === "problemi" && (
        <>
          {!problemi ? (
            <p className="ep-share-hint">Nessun file mancante.</p>
          ) : (
            <ul className="ep-inv-list">
              {data.mancanti.map((f) => (
                <li key={f.key} className="ep-inv-row is-bad">
                  <div className="ep-inv-main">
                    <FontAwesomeIcon
                      icon={f.kind === "video" ? faVideo : faImage}
                    />{" "}
                    <strong>{f.cliente}</strong>
                    <span className="ep-inv-meta">
                      {f.mese} · giorno {f.day}
                      {f.origine !== "post" ? ` · ${f.origine}` : ""}
                    </span>
                    {f.caption && <div className="ep-inv-cap">{f.caption}</div>}
                  </div>
                  <div className="ep-inv-side">
                    <span className="ep-inv-meta">{f.name}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!!data.soloDisco?.length && (
            <>
              <div className="ep-share-admin-head">
                Ancora solo sul volume ({data.soloDisco.length})
              </div>
              <p className="ep-share-desc">
                Da copiare sul bucket prima di staccare il volume.
              </p>
              <ul className="ep-inv-list">
                {data.soloDisco.slice(0, 50).map((f) => (
                  <li key={f.key} className="ep-inv-row">
                    <div className="ep-inv-main">
                      <strong>{f.cliente}</strong>
                      <span className="ep-inv-meta">
                        {f.mese} · giorno {f.day}
                      </span>
                    </div>
                    <div className="ep-inv-side">
                      <span className="ep-inv-meta">{f.name}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </>
  );
};

export default InventoryPanel;
