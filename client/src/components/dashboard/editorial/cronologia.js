// Cronologia delle modifiche di un post aperto in modifica: la meccanica di
// annulla/ripristina, senza React dentro, così si può provare da sola.
//
// Perché vive nel browser e non sul server: qui si torna indietro DENTRO una
// sessione di lavoro, prima di salvare, e deve essere istantaneo — passare
// dalla rete a ogni Ctrl+Z sarebbe insopportabile. Tornare a uno stato già
// salvato in passato è un'altra cosa, e la fa lo storico delle versioni.
//
// Gli stati si conservano come stringhe: confrontarle è immediato ed evita di
// registrare un passo quando in realtà non è cambiato niente.

const MAX = 100; // passi conservati: oltre non serve a nessuno

export function creaCronologia({ max = MAX } = {}) {
  let passi = [];
  let i = -1; // posizione corrente dentro `passi`

  return {
    // Registra un nuovo stato. Restituisce false se è identico a quello
    // corrente (capita di continuo: un carattere scritto e subito cancellato).
    registra(stato) {
      if (passi[i] === stato) return false;
      // Se si era tornati indietro e poi si modifica, il "futuro" che c'era
      // non ha più senso: sparisce, come in qualsiasi editor.
      passi = passi.slice(0, i + 1);
      passi.push(stato);
      if (passi.length > max) passi.shift();
      i = passi.length - 1;
      return true;
    },

    indietro() {
      if (i <= 0) return null;
      i -= 1;
      return passi[i];
    },

    avanti() {
      if (i >= passi.length - 1) return null;
      i += 1;
      return passi[i];
    },

    puoIndietro: () => i > 0,
    puoAvanti: () => i < passi.length - 1,
    passi: () => passi.length,
    corrente: () => (i >= 0 ? passi[i] : null),
  };
}

/* ==================== BOZZA NON SALVATA ==================== */

// Il lavoro non salvato sopravvive alla chiusura del browser e ai crash.
// Resta sul dispositivo: non passa dal server, quindi non crea bozze che due
// persone sullo stesso post si contendono.
const chiaveBozza = (postId) => `ped-bozza-${postId || "nuovo"}`;

export function salvaBozza(postId, stato) {
  try {
    localStorage.setItem(
      chiaveBozza(postId),
      JSON.stringify({ at: Date.now(), stato })
    );
  } catch {
    /* spazio esaurito o modalità privata: pazienza, non è un errore grave */
  }
}

export function leggiBozza(postId) {
  try {
    const v = JSON.parse(localStorage.getItem(chiaveBozza(postId)) || "null");
    return v && v.stato ? v : null;
  } catch {
    return null;
  }
}

export function scartaBozza(postId) {
  try {
    localStorage.removeItem(chiaveBozza(postId));
  } catch {
    /* niente da fare */
  }
}

// "5 minuti fa", "ieri": una data intera per una bozza di poco fa è rumore.
export function quandoTempo(ms) {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return "poco fa";
  if (min < 60) return `${min} ${min === 1 ? "minuto" : "minuti"} fa`;
  const ore = Math.round(min / 60);
  if (ore < 24) return `${ore} ${ore === 1 ? "ora" : "ore"} fa`;
  const giorni = Math.round(ore / 24);
  return `${giorni} ${giorni === 1 ? "giorno" : "giorni"} fa`;
}
