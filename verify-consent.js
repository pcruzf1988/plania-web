// Verificacion de comportamiento del banner de consentimiento.
// Uso: node verify-consent.js   — sale 1 si alguna expectativa falla.
//
// No alcanza con verificar el codigo fuente: lo que importa es que GA NO se
// cargue antes del "aceptar". Se ejecuta el modulo real contra un DOM falso.

const fs = require('node:fs');
const vm = require('node:vm');

const SRC = fs.readFileSync('js/cookie-consent.js', 'utf8');

function run(stored) {
  const creados = [];
  const appended = [];
  const clickHandlers = [];
  const store = new Map();
  if (stored !== null) store.set('plania_cookie_consent', stored);

  function makeEl(tag) {
    const el = {
      tagName: tag, id: '', className: '', async: false, src: '',
      innerHTML: '', parentNode: null,
      setAttribute() {}, addEventListener() {},
      appendChild(c) { appended.push(c); c.parentNode = el; },
    };
    creados.push(el);
    return el;
  }

  const doc = {
    readyState: 'complete',
    getElementById: () => null,
    createElement: makeEl,
    addEventListener(type, fn) { if (type === 'click') clickHandlers.push(fn); },
    head: { appendChild(c) { appended.push(c); } },
    body: { appendChild(c) { appended.push(c); } },
    // El snippet del pixel de Meta inserta su <script> antes del primero.
    getElementsByTagName: () => [{ parentNode: { insertBefore(c) { appended.push(c); } } }],
  };

  const win = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
    },
  };

  // writeCookie lee location.hostname para decidir el domain de la cookie.
  const ctx = { window: win, document: doc, localStorage: win.localStorage, location: { hostname: 'planiat.com' } };
  ctx.window.document = doc;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);

  const gaCargado = appended.some(
    (e) => typeof e.src === 'string' && e.src.includes('googletagmanager')
  );
  const bannerRenderizado = appended.some(
    (e) => e.className === 'cookie-banner'
  );
  return { gaCargado, bannerRenderizado, ctx, clickHandlers };
}

// Simula un clic en un CTA que lleva a la app y devuelve los eventos que
// recibio GA (los gtag('event', ...) que quedaron en dataLayer).
function clicEnCta(stored) {
  const r = run(stored);
  const link = { textContent: '  Empezar gratis, sin tarjeta y en dos minutos  ' };
  const target = { closest: (sel) => (sel.includes('app.planiat.com') ? link : null) };
  for (const fn of r.clickHandlers) fn({ target });
  const eventos = (r.ctx.window.dataLayer || [])
    .map((args) => Array.from(args))
    .filter((args) => args[0] === 'event');
  return eventos;
}

const casos = [
  ['sin decision previa',   null,       { ga: false, banner: true  }],
  ['rechazo previo',        'rejected', { ga: false, banner: false }],
  ['aceptacion previa',     'accepted', { ga: true,  banner: false }],
];

let fail = 0;
for (const [nombre, stored, esperado] of casos) {
  const r = run(stored);
  const okGa = r.gaCargado === esperado.ga;
  const okBn = r.bannerRenderizado === esperado.banner;
  if (!okGa || !okBn) fail = 1;
  console.log(
    `${okGa && okBn ? 'OK  ' : 'FALLA'} ${nombre.padEnd(22)} ` +
    `GA=${r.gaCargado} (esp ${esperado.ga})  banner=${r.bannerRenderizado} (esp ${esperado.banner})`
  );
}

// El clic en "Empezar gratis" llega a GA solo con consentimiento: es la
// conversion de la landing a la app que mira Lucia.
const conCta = clicEnCta('accepted');
const okCon = conCta.length === 1 && conCta[0][1] === 'click_empezar_gratis' &&
  conCta[0][2] && conCta[0][2].origen === 'Empezar gratis, sin tarjeta y en dos min';
if (!okCon) fail = 1;
console.log(`${okCon ? 'OK  ' : 'FALLA'} clic en CTA aceptado   eventos=${JSON.stringify(conCta)}`);

const sinCta = clicEnCta('rejected');
const okSin = sinCta.length === 0;
if (!okSin) fail = 1;
console.log(`${okSin ? 'OK  ' : 'FALLA'} clic en CTA rechazado  eventos=${JSON.stringify(sinCta)}`);

process.exit(fail);
