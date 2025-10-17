function normalizeLang(req, _res, next) {
  // Prove dagli header/body (multipart potrebbe non avere ancora req.body)
  const xLang = (req.header('x-lang') || '').toLowerCase();
  const bodyLang = (req.body?.lang || '').toLowerCase();
  const accept = (req.headers['accept-language'] || '').toLowerCase();
  const acceptFirst = (accept.split(',')[0] || '').trim();

  const pick = (val) =>
    val?.startsWith('it') ? 'it' :
    val?.startsWith('en') ? 'en' : '';

  // Ordine di priorità
  const used =
    pick(xLang) ||
    pick(bodyLang) ||
    pick(acceptFirst) ||
    'it'; // default (se preferisci 'en', cambialo qui)

  // Esponi la decisione
  req.lang = used;
  if (!req.session) req.session = {};
  req.session.lang = used;

  console.log('[LANG_DECISION]', {
    used,
    xLang: xLang || null,
    bodyLang: bodyLang || null,
    acceptFirst: acceptFirst || null,
  });

  next();
}

module.exports = normalizeLang;
