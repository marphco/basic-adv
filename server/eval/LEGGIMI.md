# Banco di prova del form dinamico

Punto di ripartenza per chi continua il lavoro. Tutto quello che serve è qui:
perché lo facciamo, cosa è deciso, cosa è fatto, cosa manca e le regole da
non rompere.

Marco lavora dal telefono, in italiano. Vuole **un passo alla volta**: per
ogni cosa che deve fare lui, dove toccare e cosa rispondere. Niente muri di
testo, niente complicazioni inutili. Codice, commenti e commit in italiano.
Le PR le unisco io quando lui ha verificato.

## Perché

Il form dinamico di basicadv.com genera le domande per il cliente con un LLM.
Ogni tanto escono **nella lingua sbagliata** (italiano sul sito inglese e
viceversa), e in generale la qualità è da migliorare. Si lavora **fuori dalla
produzione**: si misura com'è oggi, si corregge, si rimisura sugli stessi dati,
e si va in produzione solo se il nuovo supera la soglia.

## Com'è fatta la catena oggi

sito (Vercel) → server basic-adv (Railway, **Node 18**) → backend RL (repo
privata `marphco/rl-question-generator`, Railway,
`rl-question-generator-production.up.railway.app`) → OpenAI `gpt-3.5-turbo`.

**basic-adv** (`server/server.js`)
- `generateQuestionForService`: costruisce il `promptBase` **sempre in
  italiano**, anche per il sito inglese (compreso l'esempio JSON).
- `violatesPolicy`, `regenerateWithPolicy` (dopo tre tentativi restituisce il
  candidato anche se viola), `isEnglish`/`isItalian` (nove parole ciascuno),
  `normalizeFromRl`, `hardNormalizeFont`, `ensureLanguage`.
- Nessuna domanda di riserva: se il backend RL fallisce, `/api/generate`
  risponde 500.
- `server/services/rlClient.js`: chiama il backend RL con
  `Authorization: Bearer RL_API_KEY`.
- `server/routes/rlTraining.js`: i voti dalla dashboard; **se manca la lingua
  diventa "it"**. La dashboard la prende da `formData.lang`
  (`client/.../RequestDetails.jsx`), che in `ProjectLog` non ha default.

**backend RL** (`backend/server.js`)
- `/api/generate-questions`: ε-greedy con `RL_EXPLOIT_P` (0.35). Nel ramo
  "exploit" restituisce **tali e quali** le domande votate bene, senza LLM e
  senza controlli, se ne ha almeno `n` (6). Per l'italiano pesca anche tra
  quelle **senza lingua**.
- Negli altri casi: prompt con 6 esempi positivi e una blacklist, poi
  `fixFormat` che **riempie con "Opzione N"** e **taglia a 4** anche i font.
  Nessun controllo della lingua sull'uscita.
- Dati: MongoDB, database `basic`, collezione `appuser`.
- `ADMIN_SECRET` è impostata su Railway ma il codice non la usa.

## Cause probabili del bug di lingua (da misurare, non da dare per buone)

1. Il riciclo per l'italiano include le domande senza lingua: se sono
   inglesi, escono così come sono sul sito italiano.
2. I voti senza lingua finiscono archiviati come italiani (alimentano la 1).
3. Il prompt principale è sempre in italiano, anche per il sito inglese.
4. Il rilevatore di lingua è troppo stretto e le opzioni non si controllano.
5. `gpt-3.5-turbo` è un modello vecchio.

## Decisioni di Marco (30 settembre 2026)

- Si dà del **tu**.
- Tra le quattro opzioni **al massimo una via d'uscita** ("Non saprei,
  consigliatemi voi").
- Scelta del font: **sei categorie**.
- Domande aperte solo per i servizi di branding. Il **Packaging è branding**,
  come nel form.
- **Soglia per la produzione**: zero violazioni dei requisiti bloccanti sugli
  scenari, nessun criterio di qualità in calo, e l'ok di Marco su circa 20
  domande messe a confronto vecchio/nuovo.
- **Niente chiave OpenAI separata**: si usa quella di produzione (credito di
  circa 9 $). Quindi **le prove devono avere un tetto di spesa nel codice:
  si fermano da sole a 4 $**, così almeno 5 $ restano al sito. Obbligatorio.
- **Il modello si sceglie con i numeri**, facendo girare gli stessi scenari
  in tre versioni:
  - **A**: com'è oggi;
  - **B**: codice corretto, sempre `gpt-3.5-turbo`;
  - **C**: codice corretto e modello recente, con il costo ogni 1000 domande.

  In produzione **non si cambia `OPENAI_MODEL` senza adattare il backend**:
  alcuni modelli recenti rifiutano `max_tokens` e `temperature` e il form
  smetterebbe di fare domande.

## Requisiti

**Bloccanti**: `server/services/requisitiDomande.js`, con `verifica()` e
`rilevaLingua()`. Nessuna dipendenza, compatibile con Node 18. Prova:
`npm run eval:requisiti` dalla cartella `server/`.

**Qualità**, da valutare con un giudice LLM (voto da 1 a 5 più il motivo):
chiarezza per chi non fa il mestiere, utilità per il preventivo, opzioni che
coprono le possibilità senza sovrapporsi, adatta al profilo (budget e
settore), brevità su telefono, tono al tu, via d'uscita usata bene, lingua
(seconda rete dopo il controllo automatico). Il giudice si fissa **prima**
delle correzioni.

## Già fatto

**Sicurezza**
- Il backend RL accetta solo richieste con la chiave (PR
  `marphco/rl-question-generator#2`). `RL_API_KEY` è impostata su entrambi i
  servizi. Verificato che il browser riceve 401 e che il form funziona.
- La repo RL ora è **privata**. La sua storia è pulita: nessun segreto è mai
  stato pubblicato.
- Al **primo deploy** dopo averla resa privata, controllare che Railway
  riesca ancora a leggerla.

**Su questo ramo (`claude/requisiti-domande`), niente in produzione**
- `server/services/requisitiDomande.js` con `server/eval/provaRequisiti.js`:
  casi veri, e i test falliscono se si rompe il modulo.
- `server/eval/scenari.json`: 36 scenari **congelati** (ogni servizio nelle
  due lingue; ogni budget, settore e tipo di progetto). Tre domande di fila
  per scenario, rispondendo sempre con la prima opzione.
- `server/eval/controllaSerbatoio.js`: scarica i dati votati **solo in
  lettura** (GET dal backend RL con la sua chiave), li congela in
  `eval/risultati/fotografia-serbatoio.json` (ignorato da git) e misura
  quante domande hanno la lingua sbagliata e dove il riciclo le può servire.

## Ambiente cloud delle prove

- Variabili già impostate: `OPENAI_API_KEY`, `OPENAI_API_URL`,
  `OPENAI_MODEL=gpt-3.5-turbo`, `RL_API_BASE`, `RL_API_KEY`.
- Rete consentita: `api.openai.com` e
  `rl-question-generator-production.up.railway.app`. **MongoDB non si
  raggiunge** (porta chiusa): i dati arrivano dal backend RL.
- **Node e il proxy**: `fetch` passa dal proxy solo con
  `NODE_USE_ENV_PROXY=1` (lo script `eval:serbatoio` lo imposta già).
  **axios 1.12 del backend RL attraverso il proxy risponde 405**: nelle prove
  va installato axios recente **senza salvarlo**
  (`npm i axios@latest --no-save` in `backend/`). Così i file della repo, e
  quindi la produzione, non cambiano. Verificato: con axios 1.20 OpenAI
  risponde.
- `server/node_modules` può essere vuoto: `npm ci` in `server/`.
- La repo RL va agganciata con permesso di scrittura
  (`marphco/rl-question-generator`).

## Regole da non rompere

- **Mai scrivere sui dati di produzione**: solo GET. Mai chiamare
  `PUT /api/update-training-data` né `POST /api/save-training-data`.
- **Mai stampare o scrivere le chiavi** (log, file, chat, commit).
- **Tetto di spesa a 4 $** in ogni giro di prova, contando i token dalla
  risposta di OpenAI (`usage`).
- Gli scenari e la fotografia dei dati **non cambiano** tra i giri A, B e C.
- Le correzioni vanno in produzione **solo** dopo la soglia e l'ok di Marco.
  Prima la chiave, poi il resto: ordine sicuro, come per `RL_API_KEY`.

## Prossimi passi, in ordine

1. **Prima misura**: `npm ci && npm run eval:serbatoio` in `server/`.
   Spiegare a Marco il risultato in parole semplici: quante domande votate
   hanno la lingua sbagliata, e in quali servizi il riciclo le mostra così
   come sono.
2. **Banco**: far girare in locale la catena **vera**:
   - backend RL con una sorgente dati dalla fotografia al posto di Mongo,
     senza cambiare il comportamento;
   - post-elaborazione di basic-adv: estrarre `generateQuestionForService`
     in un modulo, come spostamento puro;
   - tetto di spesa;
   - i rami del riciclo misurati anche separatamente (`RL_EXPLOIT_P` a 0 e a 1).
3. **Giudice** di qualità, fissato prima delle correzioni.
4. **Giro A** e rapporto.
5. **Correzioni**, poi giri B e C, rapporto di confronto e campione di 20 per
   Marco.
6. Solo con il suo ok: PR e deploy nell'ordine sicuro.
