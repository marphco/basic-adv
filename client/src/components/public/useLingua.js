import { useEffect, useState } from "react";
import i18n from "../../i18n";
import { linguaDi } from "./testiPiano";

// La lingua della pagina del piano è quella del resto del sito (i18n.js):
// stessa scelta automatica, stesso cookie, stesso ?lang= nel link. Qui la si
// legge e basta, e si segue quando cambia (la scelta automatica arriva un
// attimo dopo l'apertura).
//
// Non usa useTranslation apposta: quello aspetta il caricamento dei file
// delle traduzioni del sito, che a questa pagina non servono, e la farebbe
// partire più tardi.
export default function useLingua() {
  const [lingua, setLingua] = useState(() => linguaDi(i18n.language));

  useEffect(() => {
    const segui = (l) => setLingua(linguaDi(l));
    i18n.on("languageChanged", segui);
    segui(i18n.language); // potrebbe essere cambiata prima di questo effetto
    return () => i18n.off("languageChanged", segui);
  }, []);

  // La scelta a mano resta salvata (cookie del sito) e vale anche alla
  // prossima apertura del link.
  const scegli = (l) => {
    if (linguaDi(l) !== lingua) i18n.changeLanguage(linguaDi(l));
  };

  return [lingua, scegli];
}
