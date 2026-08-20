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
    addEventListener() {},
    head: { appendChild(c) { appended.push(c); } },
    body: { appendChild(c) { appended.push(c); } },
  };

  const win = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
    },
  };

  const ctx = { window: win, document: doc, localStorage: win.localStorage };
  ctx.window.document = doc;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);

  const gaCargado = appended.some(
    (e) => typeof e.src === 'string' && e.src.includes('googletagmanager')
  );
  const bannerRenderizado = appended.some(
    (e) => e.className === 'cookie-banner'
  );
  return { gaCargado, bannerRenderizado, ctx };
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

process.exit(fail);
