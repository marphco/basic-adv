import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTriangleExclamation,
  faImage,
  faVideo,
  faCircleCheck,
  faTrash,
  faBroom,
} from "@fortawesome/free-solid-svg-icons";
import { api } from "./api";

const MB = (n) => {
  if (!n) return "0 MB";
  const mb = n / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
};

// Contenuti dell'archivio: cosa occupa spazio, di chi è, cosa non si trova —
// e come liberarlo.
//
// La vista predefinita è per MESE dal più vecchio, perché è così che si
// ragiona quando si fa pulizia. Ma i mesi vecchi non bastano: se il peso sta
// in tre video di settembre, cancellare un anno di foto non risolve niente —
// per quello c'è la vista per peso.
//
// La selezione è multipla e i totali si aggiornano mentre scegli: spuntare
// una riga per volta senza sapere quanto si sta liberando è una perdita di
// tempo.
const InventoryPanel = () => {
  const [data, setData] = useState(null);
  const [vista, setVista] = useState("mesi"); // mesi | peso | problemi
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scelti, setScelti] = useState([]); // chiavi dei mesi o dei file
  const [conferma, setConferma] = useState(null); // { titolo, testo, azione }
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
        `${descrizione}: ${r.rimossi} file rimossi` +
          (r.bytes ? `, ${MB(r.bytes)} liberati` : "") +
          (r.postToccati ? ` · ${r.postToccati} post aggiornati` : "") +
          (r.errori?.length ? ` · ${r.errori.length} problemi` : "")
      );
      setScelti([]);
      carica(vista === "peso" ? "peso" : undefined);
    } catch (e) {
      setEsito(e?.response?.data?.error || "Cancellazione non riuscita.");
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

  // I totali arrivano in un oggetto a parte: gli elenchi hanno gli stessi nomi
  // e allo stesso livello si sarebbero sovrascritti a vicenda.
  const t = data.totali || {};
  const problemi = data.mancanti?.length || 0;

  // Quanto si libera con la selezione attuale: si vede prima di decidere.
  const elenco = vista === "mesi" ? data.mesi || [] : data.pesanti || [];
  const idDi = (x) => (vista === "mesi" ? x.chiave : x.key);
  const selezionati = elenco.filter((x) => scelti.includes(idDi(x)));
  const pesoScelto = selezionati.reduce((n, x) => n + (x.bytes || 0), 0);
  const fileScelti = selezionati.reduce(
    (n, x) => n + (vista === "mesi" ? x.files : 1),
    0
  );

  const chiediCancellazione = () => {
    if (vista === "mesi")
      setConferma({
        titolo: `Cancellare ${selezionati.length} ${
          selezionati.length === 1 ? "mese" : "mesi"
        }?`,
        testo:
          `Verranno cancellati ${fileScelti} file e liberati ${MB(pesoScelto)}. ` +
          `I post restano con didascalie, note e storico: perdono solo le ` +
          `immagini. L'operazione non si può annullare.`,
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
            "Mesi cancellati"
          ),
      });
    else
      setConferma({
        titolo: `Cancellare ${fileScelti} file?`,
        testo:
          `Verranno liberati ${MB(pesoScelto)}. I file spariscono anche dai ` +
          `post che li mostrano. L'operazione non si può annullare.`,
        azione: () =>
          esegui(
            { scope: "file", keys: selezionati.map((f) => f.key) },
            "File cancellati"
          ),
      });
  };

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
          </div>
        </div>
      </div>

      {/* Pulizia gratis: file che nessuno vede più. Un tocco, nessuna
          conseguenza — sta in cima perché è sempre la prima cosa da fare. */}
      {!!t.orfani && (
        <div className="ep-inv-orfani">
          <div>
            <strong>{t.orfani} file non più usati</strong> — restano di post
            cancellati, non li vede nessuno.
            <div className="ep-inv-sub">{MB(t.bytesOrfani)} da recuperare</div>
          </div>
          <button
            className="ep-btn ep-btn--ghost"
            disabled={busy}
            onClick={() =>
              setConferma({
                titolo: `Eliminare ${t.orfani} file non più usati?`,
                testo:
                  `Si liberano ${MB(t.bytesOrfani)}. Non sono mostrati da nessun ` +
                  `post, quindi non cambia niente in nessun piano.`,
                azione: () => esegui({ scope: "orfani" }, "Pulizia completata"),
              })
            }
          >
            <FontAwesomeIcon icon={faBroom} /> Libera {MB(t.bytesOrfani)}
          </button>
        </div>
      )}

      <div className="ep-tabs">
        <button
          className={`ep-tab ${vista === "mesi" ? "is-active" : ""}`}
          onClick={() => cambiaVista("mesi", undefined)}
        >
          Mesi più vecchi
        </button>
        <button
          className={`ep-tab ${vista === "peso" ? "is-active" : ""}`}
          onClick={() => cambiaVista("peso", "peso")}
        >
          Chi pesa di più
        </button>
        <button
          className={`ep-tab ${vista === "problemi" ? "is-active" : ""}`}
          onClick={() => cambiaVista("problemi")}
        >
          Problemi{problemi ? ` (${problemi})` : ""}
        </button>
      </div>

      {busy && <p className="ep-share-hint">Attendi…</p>}
      {esito && (
        <div className="ep-share-ok">
          <FontAwesomeIcon icon={faCircleCheck} /> {esito}
        </div>
      )}

      {/* --- per mese: l'unità con cui si fa pulizia --- */}
      {vista === "mesi" && (
        <ul className="ep-inv-list">
          {(data.mesi || []).map((m) => (
            <li
              key={m.chiave}
              className={`ep-inv-row ep-inv-row--sel ${
                scelti.includes(m.chiave) ? "is-selected" : ""
              }`}
              onClick={() => toggle(m.chiave)}
            >
              <input
                type="checkbox"
                checked={scelti.includes(m.chiave)}
                onChange={() => toggle(m.chiave)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Seleziona ${m.cliente} ${m.mese}`}
              />
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
            <li
              key={f.key}
              className={`ep-inv-row ep-inv-row--sel ${
                scelti.includes(f.key) ? "is-selected" : ""
              }`}
              onClick={() => toggle(f.key)}
            >
              <input
                type="checkbox"
                checked={scelti.includes(f.key)}
                onChange={() => toggle(f.key)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Seleziona ${f.name}`}
              />
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

      {/* Barra della selezione: compare solo quando serve e dice sempre
          quanto si sta per liberare. */}
      {vista !== "problemi" && selezionati.length > 0 && (
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
              onClick={chiediCancellazione}
            >
              <FontAwesomeIcon icon={faTrash} /> Elimina
            </button>
          </div>
        </div>
      )}

      {/* Conferma esplicita: è l'unica cosa in tutto il pannello che
          distrugge qualcosa, e non si può annullare. */}
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
                  <FontAwesomeIcon icon={faTrash} /> Elimina davvero
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
