// Verificacion de la decoracion de los links a la app.
// Uso: node verify-origin-links.js   — sale 1 si alguna expectativa falla.
//
// Los botones de planiat.com llevan a app.planiat.com, otro origen: la UTM y
// el referrer de la visita se pierden en el salto si no viajan en el link. La
// app los guarda una sola vez, al crear la cuenta (planiat-web/public/js/origin.js).
//
// Igual que verify-consent.js: se ejecuta el modulo real contra un DOM falso y
// se mira el resultado, los href, no el codigo fuente.

const fs = require('node:fs');
const vm = require('node:vm');

const SRC = fs.readFileSync('js/origin-links.js', 'utf8');

// Un link con lo minimo que usa el modulo: leer y escribir su href.
function link(href) {
  return {
    href0: href,
    _href: href,
    getAttribute(name) { return name === 'href' ? this._href : null; },
    setAttribute(name, value) { if (name === 'href') this._href = value; },
  };
}

// Corre el modulo como lo carga index.html: con la URL de la landing, el
// referrer de la visita y los links de la pagina. Devuelve los href finales.
function run({ search = '', referrer = '', hrefs }) {
  const links = hrefs.map(link);
  const doc = {
    readyState: 'complete',
    referrer,
    addEventListener() {},
    // El modulo filtra por su cuenta: aca vuelven todos los <a href>, como en
    // una pagina real con links internos, externos y a la app.
    querySelectorAll: () => links,
  };
  const win = { location: { search, hostname: 'planiat.com' } };
  // URL y URLSearchParams no son del lenguaje sino de Node: un contexto de vm
  // nuevo no los trae, y sin esto el modulo tira ReferenceError.
  const ctx = { window: win, document: doc, URL, URLSearchParams };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return links.map((l) => l._href);
}

const APP = 'https://app.planiat.com';

const casos = [
  ['las UTM de la landing pasan a la app, tal cual',
    { search: '?utm_source=instagram&utm_medium=bio', referrer: 'https://l.instagram.com/', hrefs: [APP] },
    ['https://app.planiat.com/?utm_source=instagram&utm_medium=bio&ref=l.instagram.com']],

  ['no normaliza: eso lo hace la app',
    { search: '?utm_campaign=Lanzamiento%20Medios', hrefs: [APP] },
    ['https://app.planiat.com/?utm_campaign=Lanzamiento+Medios&ref=direct']],

  ['ref lleva el dominio externo, sin la ruta',
    { referrer: 'https://www.google.com/search?q=planes', hrefs: [APP] },
    ['https://app.planiat.com/?ref=www.google.com']],

  ['sin referrer: ref=direct',
    { hrefs: [APP] },
    ['https://app.planiat.com/?ref=direct']],

  ['con la landing como referrer: ref=direct',
    { referrer: 'https://planiat.com/privacidad.html', hrefs: [APP, APP] },
    ['https://app.planiat.com/?ref=direct', 'https://app.planiat.com/?ref=direct']],

  ['con www de la landing como referrer: ref=direct',
    { referrer: 'https://www.planiat.com/', hrefs: [APP] },
    ['https://app.planiat.com/?ref=direct']],

  ['las claves que no son utm_ no viajan',
    { search: '?fbclid=abc&gclid=xyz&ref=otro&utm_id=1&utm_source=ig', hrefs: [APP] },
    ['https://app.planiat.com/?utm_source=ig&ref=direct']],

  ['conserva el path y el hash',
    { hrefs: ['https://app.planiat.com/registro#planes'] },
    ['https://app.planiat.com/registro?ref=direct#planes']],

  ['no toca los links que no van a la app',
    { search: '?utm_source=ig', hrefs: ['#precios', 'privacidad.html', 'https://wa.me/5491158507027?text=Hola',
      'https://app.planiat.com.evil.example/', 'https://planiat.com/'] },
    ['#precios', 'privacidad.html', 'https://wa.me/5491158507027?text=Hola',
      'https://app.planiat.com.evil.example/', 'https://planiat.com/']],

  // ── Review Focus ──────────────────────────────────────────────────────────
  ['un link que ya tiene query y hash los conserva',
    { search: '?utm_source=ig', hrefs: ['https://app.planiat.com/?plan=pro#precios'] },
    ['https://app.planiat.com/?plan=pro&utm_source=ig&ref=direct#precios']],

  ['con utm_source repetida viaja solo la primera',
    { search: '?utm_source=instagram&utm_source=linktree', hrefs: [APP] },
    ['https://app.planiat.com/?utm_source=instagram&ref=direct']],
];

// La promesa de consentimiento de la landing: nada en el navegador. Se corre
// con un document.cookie y unos storages que anotan cualquier uso. Esta es la
// prueba de que los links no agregan cookies (verify-consent.js solo prueba
// que cookie-consent.js sigue comportandose igual).
function tocaElNavegador() {
  const toques = [];
  const anota = (nombre) => new Proxy({}, {
    get: (_, k) => { toques.push(`${nombre}.${String(k)}`); return () => {}; },
    set: (_, k) => { toques.push(`${nombre}.${String(k)}=`); return true; },
  });
  const doc = {
    readyState: 'complete', referrer: 'https://l.instagram.com/', addEventListener() {},
    querySelectorAll: () => [link(APP)],
    get cookie() { toques.push('cookie'); return ''; },
    set cookie(v) { toques.push(`cookie=${v}`); },
  };
  const win = { location: { search: '?utm_source=ig' }, localStorage: anota('localStorage'), sessionStorage: anota('sessionStorage') };
  const ctx = { window: win, document: doc, URL, URLSearchParams, localStorage: win.localStorage, sessionStorage: win.sessionStorage };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return toques;
}

let fail = 0;
{
  const toques = tocaElNavegador();
  const ok = toques.length === 0;
  if (!ok) fail = 1;
  console.log(`${ok ? 'OK  ' : 'FALLA'} no escribe cookies ni nada en localStorage o sessionStorage`);
  if (!ok) console.log(`      toco ${JSON.stringify(toques)}`);
}
for (const [nombre, entrada, esperado] of casos) {
  let obtenido;
  try {
    obtenido = run(entrada);
  } catch (e) {
    obtenido = [`TIRO: ${e.message}`];
  }
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fail = 1;
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${nombre}`);
  if (!ok) console.log(`      esperado ${JSON.stringify(esperado)}\n      obtenido ${JSON.stringify(obtenido)}`);
}

process.exit(fail);
