import "./CookiePolicy.css";
import { useEffect } from "react";

const CookiePolicy = () => {
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "canonical";
    link.href = "https://www.basicadv.com/cookie-policy";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  return (
    <div className="policy-page">
      <div className="policy-content">
        <h1>Cookie Policy</h1>
        <p>
          <strong>Ultimo aggiornamento:</strong> 5 marzo 2025
        </p>

        <p>
          Basic adv srls (&quot;noi&quot;, &quot;nostro&quot;, o &quot;ci&quot;)
          utilizza cookie e tecnologie simili sul nostro sito per migliorare la
          tua esperienza di navigazione e per analizzare l’uso del sito. Questa
          Cookie Policy spiega cosa sono i cookie, come li utilizziamo e come
          puoi gestirli.
        </p>

        <h2>1. Cosa Sono i Cookie?</h2>
        <p>
          I cookie sono piccoli file di testo che vengono salvati sul tuo
          dispositivo (computer, smartphone, tablet) quando visiti un sito web.
          Possono essere utilizzati per ricordare le tue preferenze, migliorare
          la tua esperienza di navigazione o raccogliere dati analitici.
        </p>

        <h2>2. Tipi di Cookie che Utilizziamo</h2>
        <p>Utilizziamo i seguenti tipi di cookie:</p>
        <ul>
          <li>
            <strong>Cookie Essenziali:</strong> Necessari per il funzionamento
            del sito. Ad esempio, cookie di sessione per mantenere attiva la tua
            navigazione. Questi cookie non richiedono il tuo consenso.
          </li>
          <li>
            <strong>Cookie Analitici:</strong> Ci aiutano a capire come gli
            utenti interagiscono con il nostro sito (es. Google Analytics).
            Questi cookie raccolgono dati anonimi, come il numero di visitatori
            e le pagine più visitate. Richiedono il tuo consenso.
          </li>
        </ul>

        <h2>3. Come Utilizziamo i Cookie</h2>
        <p>Utilizziamo i cookie per:</p>
        <ul>
          <li>
            Garantire il corretto funzionamento del sito (cookie essenziali).
          </li>
          <li>
            Analizzare il traffico e migliorare i nostri servizi (cookie
            analitici).
          </li>
        </ul>

        <h2>4. Durata dei Cookie</h2>
        <p>I cookie possono essere:</p>
        <ul>
          <li>
            <strong>Cookie di sessione:</strong> Vengono cancellati quando
            chiudi il browser.
          </li>
          <li>
            <strong>Cookie persistenti:</strong> Rimangono sul tuo dispositivo
            per un periodo di tempo specificato (es. i cookie analitici di
            Google Analytics sono conservati per 24 mesi).
          </li>
        </ul>

        <h2>5. Gestione dei Cookie</h2>
        <p>Puoi gestire i cookie in diversi modi:</p>
        <ul>
          <li>
            <strong>Tramite il nostro banner di consenso:</strong> Quando visiti
            il nostro sito, ti mostriamo un banner che ti permette di accettare
            o rifiutare i cookie non essenziali.
          </li>
          <li>
            <strong>Tramite le impostazioni del browser:</strong> Puoi
            configurare il tuo browser per bloccare o eliminare i cookie. Ad
            esempio:
            <ul>
              <li>
                Google Chrome: Impostazioni &gt; Privacy e sicurezza &gt; Cookie
                e altri dati dei siti.
              </li>
              <li>
                Firefox: Impostazioni &gt; Privacy e sicurezza &gt; Cookie e
                dati dei siti.
              </li>
              <li>
                Safari: Preferenze &gt; Privacy &gt; Gestisci dati dei siti web.
              </li>
            </ul>
          </li>
        </ul>

        <h2>6. Cookie di Terze Parti</h2>
        <p>
          Utilizziamo servizi di terze parti che potrebbero impostare cookie sul
          tuo dispositivo, ad esempio:
        </p>
        <ul>
          <li>
            <strong>Google Analytics:</strong> Per analizzare il traffico sul
            nostro sito. Puoi trovare maggiori informazioni nella{" "}
            <a href="https://policies.google.com/privacy">
              Privacy Policy di Google
            </a>
            .
          </li>
        </ul>

        <h2>7. Contatti</h2>
        <p>Per domande sull’uso dei cookie, contattaci:</p>
        <p>
          Basic adv srls
          <br />
          P. IVA IT09456771212
          <br />
          Email: <a href="mailto:info@basicadv.com">info@basicadv.com</a>
          <br />
          Sedi: Napoli, Roma, New York
        </p>

        <p>© {currentYear} Basic adv srls. Tutti i diritti riservati.</p>
      </div>
    </div>
  );
};

export default CookiePolicy;
