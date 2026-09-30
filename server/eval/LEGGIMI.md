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

**Di sessione**: `verificaSessione()` nello stesso modulo. Scegliendo **Logo**
la sessione deve contenere **una domanda sui colori e una sullo stile del
font**, in qualunque ordine, una volta sola (deciso con Marco). Oggi il
**font è garantito dal codice** (`buildFontQuestion` in `server.js`: per il
servizio "Logo" la seconda domanda è sempre quella, testo fisso e sei
categorie). I **colori NON sono garantiti da niente**: il prompt dice solo
come formulare la domanda se il modello decide di farla. Il 100% lo dà solo
il codice, quindi la correzione è una garanzia scritta come quella del font
(una `buildColorQuestion`, domanda aperta come prevede il prompt). Negli
scenari i servizi con domande obbligatorie simulano la **sessione completa
(10 domande) ripetuta 5 volte** (campi `domande` e `ripetizioni`): il banco
deve applicare `verificaSessione()` a ogni sessione e riportare quante volte
manca una domanda obbligatoria.

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
  per scenario, rispondendo sempre con la prima opzione; il Logo invece fa
  la sessione completa di 10 domande, 5 volte per lingua. In tutto 202
  domande per giro.
- `server/eval/controllaSerbatoio.js`: scarica i dati votati **solo in
  lettura** (GET dal backend RL con la sua chiave), li congela in
  `eval/risultati/fotografia-serbatoio.json` (ignorato da git) e misura
  quante domande hanno la lingua sbagliata e dove il riciclo le può servire.

**Prima misura (passo 1, 30 settembre 2026)** — fotografia di 274 righe,
dal 12/06/2025 al 31/07/2026, congelata in `eval/risultati/`.
- Tutte le righe sono del servizio **Logo**: per gli altri servizi il
  serbatoio è vuoto, quindi niente esempi né riciclo.
- 258 righe su 274 **senza lingua**: metà italiane (128), metà inglesi (129).
- 130 domande trattate da italiane ma **in inglese** (129 senza lingua, 1
  etichettata "it"); 43 hanno voto positivo.
- Logo italiano: 3 dei 6 esempi del prompt sono inglesi, e il riciclo li
  può servire tali e quali (circa una volta su tre). Confermata la causa 1.
- Logo inglese: solo 5 positive, quindi niente riciclo; esempi tutti inglesi.

**Banco (passo 2, 30 settembre 2026)** — `npm run eval:banco` in `server/`.
- `services/generaDomanda.js`: la generazione delle domande spostata da
  `server.js` **tale e quale** (verificato riga per riga). Anche il cuore di
  `/api/nextQuestion` è ora `domandaSuccessiva()`; l'unico ritocco: il 502
  diventa un errore con `stato: 502` che la rotta trasforma nella stessa
  risposta.
- `eval/banco/`: avvia il backend RL **della repo, senza cambiarne una riga**,
  con `mongooseFinto.mjs` al posto di mongoose (legge la fotografia; le
  scritture lanciano un errore). Ambiente del backend costruito da zero:
  niente Mongo vero, niente chiavi di produzione.
- `eval/banco/contatoreSpesa.js`: tutte le chiamate a OpenAI passano da lì.
  Prenota il caso peggiore prima di ogni chiamata e rifiuta se si sfora.
  Tetto **4 $ in tutto**, non per giro: il totale sta in `eval/spesa.json`,
  **versionato**, così vale anche tra sessioni diverse. Solo modelli col
  prezzo scritto in `PREZZI`.
- Opzioni: `--giro NOME`, `--solo it-01,en-19`, `--exploit 0|1` (i due rami
  separati; senza, 0.35 come in produzione), `--modello`.
- Collaudi fatti: riciclo al 100% (gratis) e LLM su 3 scenari (0,02 $).

**Scoperte del banco (da confermare col giro A)**
- `rlClient` non manda mai `state`: il backend RL crede che **ogni servizio
  sia "Logo"**. Esempi, blacklist e riciclo sono sempre quelli del Logo; col
  riciclo, Content Creation fallisce (riceve domande sul logo, la policy le
  scarta, errore 500).
- Nel serbatoio 3 righe hanno servizio `logo-design`: il backend non le usa.
- Font: se l'LLM mette `type: "font_selection"` senza la parola
  font/tipograf nel testo, `hardNormalizeFont` non sostituisce le opzioni e
  la domanda esce con 4 font invece di 6.

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
  (`marphco/rl-question-generator`) e clonata accanto a basic-adv
  (`/home/user/rl-question-generator`), poi `npm ci` in `backend/`. Al banco
  non serve l'axios recente: il backend parla col contatore in locale.

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

1. ✅ **Prima misura**: `npm ci && npm run eval:serbatoio` in `server/`.
   Spiegare a Marco il risultato in parole semplici: quante domande votate
   hanno la lingua sbagliata, e in quali servizi il riciclo le mostra così
   come sono.
2. ✅ **Banco**: far girare in locale la catena **vera**:
   - backend RL con una sorgente dati dalla fotografia al posto di Mongo,
     senza cambiare il comportamento;
   - post-elaborazione di basic-adv: estrarre `generateQuestionForService`
     in un modulo, come spostamento puro;
   - tetto di spesa;
   - i rami del riciclo misurati anche separatamente (`RL_EXPLOIT_P` a 0 e a 1).
3. **Giudice** di qualità, fissato prima delle correzioni.
3b. ✅ **Prima del giro A, il banco va adattato ai requisiti di sessione**
   (aggiunti dopo che il banco era già scritto): leggere da ogni scenario
   `domande` (se c'è, al posto di `domandePerScenario`) e `ripetizioni` (se
   c'è, giocare lo scenario quel numero di volte), e applicare
   `verificaSessione()` alle domande di ogni sessione completa. Nel rapporto:
   quante sessioni Logo non hanno la domanda sui colori, quante non hanno
   quella sul font, quante li chiedono due volte.
   Fatto: il banco gioca `domande` × `ripetizioni` e applica
   `verificaSessione()` alle sessioni complete. Come il sito, il form non
   riprova da solo: il banco fa il cliente paziente (fino a 3 tentativi per
   domanda) e conta **ogni errore visto**, servizio per servizio; tre errori
   di fila = sessione abbandonata.
4a. **Subito dopo il giro A, da sola e prima delle altre correzioni** (voluto
   da Marco): mandare il servizio al backend RL (`state.service`), provarla
   sul banco e portarla in produzione appena provata.
   Deciso con Marco: la correzione PRIMA del giro A (il "prima" si può
   sempre rimisurare dal codice vecchio). Fatta e provata: su 34 scenari non
   Logo col riciclo sempre acceso, errori visti da 48 a 0. Per la
   produzione, da sola su `main`: PR `marphco/basic-adv#129`.
   **Marco NON vuole unirla ancora**: prima errori ridotti a zero e training.

## Dopo il 30 settembre: la strada verso il merge (decisa con Marco)

1. **Rete di sicurezza** (`services/reteSicurezza.js`): ogni domanda passa
   da `verifica()` prima del cliente; se l'AI sbaglia, non risponde o ci
   mette più di 20 s, esce una **domanda di riserva** scritta a mano
   (`services/domandeRiserva.js`, 10 per servizio e lingua, verificate da
   `eval:requisiti`). Se anche la riserva è finita, il form passa ai
   contatti come a fine sessione: mai un errore. Il banco misura quanto
   spesso scatta la riserva (`r` nella riga dello scenario; `--senza-rete`
   per com'era).
2. Correzione dei difetti che fanno scattare la riserva ("Opzione N",
   lingua, font a 4, colori del Logo garantiti dal codice).
3. **Training** in una **raccolta separata**, mai nel database vero: ogni
   voto dice da chi viene (`marco` o `ai`). I 274 voti di oggi sono tutti di
   Marco. **Nessuna domanda votata si mostra tale e quale**, nemmeno quelle
   votate da Marco: il suo voto dice "la direzione è giusta", non "usa
   questa frase". Tutti i voti servono **solo come ispirazione** (esempi nel
   prompt). Il riciclo (ramo ε-greedy, `RL_EXPLOIT_P`) è tolto dal backend
   RL, ramo `claude/requisiti-domande` della sua repo. Dopo, Marco decide se unire la raccolta o sostituire i voti
   vecchi; i suoi voti non si cancellano mai (al massimo si mettono da
   parte).
4. Tutto sul banco, poi merge con l'ok di Marco. Prima del merge Marco vede
   un campione delle **domande di riserva**: anche quelle sono scritte da
   un'AI e si mostrano tali e quali.

**Tempi** (Marco: anche 3 secondi sono troppi). Sul banco una chiamata
all'AI costa circa 3 s perché scrive 6 domande e se ne usa una; i tentativi
ripetuti arrivano a 5-11 s. Fatto: 2 domande per chiamata
(`DOMANDE_PER_CHIAMATA`) e meno scarti. Se non basta: preparare la domanda
mentre il cliente risponde alla precedente (una per ogni risposta possibile,
più veloce ma circa 4 volte il costo; oppure senza l'ultima risposta, stesso
costo), o un modello più veloce (giro C).

**Punto 2, fatto sul ramo**: backend RL senza riciclo e senza "Opzione N"
(scarta invece di riempire; font non tagliato a 4). In basic-adv:
`buildColorQuestion` (Logo: prima domanda AI, poi font, poi colori);
`temaFisso()` in `requisitiDomande.js` scarta colori e font del Logo se li
propone l'AI; `hardNormalizeFont` scatta anche su `type: "font_selection"`.
Poi: al massimo una via d'uscita anche nel prompt del backend, e in
`generateQuestionForService` le proposte con difetti delle opzioni (vie
d'uscita, segnaposto, lingua) si scartano per la seconda proposta.
Giro `vie-uscita` (202 domande): 0 errori, riserva 1% (2 doppioni), attesa
mediana 1,4 s, 9 su 10 entro 2,4 s, massimo 4,6 s. Spesa totale 0,78 $.

**Domanda preparata in anticipo** (`services/prossimaDomanda.js`, voluto da
Marco): appena il server mostra una domanda, prepara già la successiva
mentre il cliente risponde. Conosce tutte le domande e tutte le risposte
tranne l'ultima (il piano, cioè servizio e regole del Logo, non dipende
dalla risposta). Tenuta in memoria per sessione e punto della sessione; se
non c'è (riavvio, più copie del server) si genera come prima. Il banco lo
simula (`--pensa MS`, il cliente risponde in 2 s di base; `--senza-anticipo`
per confronto). Da misurare col giudice: la qualità con e senza anticipo.
Giro `anticipo` (202 domande, cliente che risponde in 2 s): 0 errori, 0
riserve; domande successive alla prima: 135 su 158 immediate (sotto 0,1 s),
9 su 10 entro 0,3 s; la prima domanda resta 1,6 s di mediana (non si può
preparare: arriva dal modulo iniziale). Spesa totale 0,98 $.
4. **Giro A** e rapporto.
5. **Correzioni**, poi giri B e C, rapporto di confronto e campione di 20 per
   Marco. Tra le correzioni: la domanda sui colori del Logo **garantita dal
   codice**, come quella del font.
6. Solo con il suo ok: PR e deploy nell'ordine sicuro.
