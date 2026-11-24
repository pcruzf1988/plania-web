// Verificacion de Cloudflare Turnstile en los tres formularios publicos
// (arrepentimiento, convocatoria y copyright).
// Uso: node verify-turnstile.js   — sale 1 si alguna expectativa falla.
//
// El widget lo pone js/turnstile.js, que es el UNICO lugar donde vive la clave
// publica del sitio. Mientras esa clave sea la cadena vacia el script no hace
// nada: no carga nada de Cloudflare y los formularios envian como siempre. Con
// clave, cada formulario manda el token en `turnstileToken` y pide uno nuevo
// despues de cada respuesta del proxy (el token es de un solo uso).
//
// No se prueba contra Cloudflare real: js/turnstile.js se evalua en un contexto
// de node:vm con un `document` falso, y el codigo de cada formulario se lee.

const fs = require('node:fs');
const vm = require('node:vm');

const API_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const ESPERA = 'Esperá un segundo a que termine la verificación y volvé a enviar.';
const CLAVE = /var TURNSTILE_SITE_KEY = '([^']*)';/g;

// `codigo` es el archivo donde esta el envio del formulario: en arrepentimiento
// y copyright es un <script> en la misma pagina.
const FORMULARIOS = [
  { pagina: 'arrepentimiento.html', codigo: 'arrepentimiento.html', src: 'js/turnstile.js', ruta: '/api/arrepentimiento', boton: 'arr-submit' },
  { pagina: 'convocatoria/index.html', codigo: 'js/convocatoria.js', src: '../js/turnstile.js', ruta: '/api/convocatoria/postular', boton: 'conv-submit' },
  { pagina: 'copyright.html', codigo: 'copyright.html', src: 'js/turnstile.js', ruta: '/api/copyright-claim', boton: 'cr-submit' },
];

function leer(ruta) {
  return fs.existsSync(ruta) ? fs.readFileSync(ruta, 'utf8') : '';
}
const veces = (texto, parte) => texto.split(parte).length - 1;

let fail = 0;
let total = 0;
function informa(ok, nombre, detalle) {
  total++;
  if (!ok) fail++;
  console.log(`${ok ? 'OK:   ' : 'FALLA:'} ${nombre}`);
  if (!ok && detalle) console.log(`       ${detalle}`);
}

const FUENTE = leer('js/turnstile.js');
informa(FUENTE !== '', 'existe js/turnstile.js');

// --- La clave vive en un solo lugar -----------------------------------------
const declaraciones = [...FUENTE.matchAll(CLAVE)];
informa(declaraciones.length === 1, "js/turnstile.js declara una sola vez `var TURNSTILE_SITE_KEY = '...';`",
  `declaraciones encontradas: ${declaraciones.length}`);
informa(/clave P[UÚ]BLICA/i.test(FUENTE) && /proxy/.test(FUENTE),
  'js/turnstile.js aclara que la clave es la publica y que la secreta vive en el proxy');

const OTROS = [...new Set(FORMULARIOS.flatMap((f) => [f.pagina, f.codigo]))];
for (const ruta of OTROS) {
  const texto = leer(ruta);
  informa(!/TURNSTILE_SITE_KEY|sitekey/i.test(texto), `${ruta} no lleva la clave del sitio`);
}

// --- Comportamiento de js/turnstile.js (document falso) ---------------------
// Evalua el script con la clave pedida y devuelve lo que hizo.
function evaluar(clave, conContenedor) {
  const anexados = [];
  const contenedor = { id: 'plania-turnstile', hidden: true };
  const llamadas = { render: [], reset: [] };
  const document = {
    documentElement: { getAttribute: () => null },
    getElementById: (id) => (conContenedor && id === 'plania-turnstile' ? contenedor : null),
    createElement: (tag) => ({ tag }),
    head: { appendChild: (el) => { anexados.push(el); return el; } },
  };
  const window = { document };
  window.window = window;
  const fuente = FUENTE.replace(CLAVE, `var TURNSTILE_SITE_KEY = '${clave}';`);
  let error = null;
  try {
    vm.runInNewContext(fuente, window, { filename: 'js/turnstile.js' });
  } catch (e) {
    error = e;
  }
  return { anexados, contenedor, llamadas, window, api: window.PlaniaTurnstile, error };
}

// Sin clave: no hace nada.
{
  const r = evaluar('', true);
  informa(!r.error, 'sin clave: el script corre sin errores', r.error && String(r.error));
  informa(r.anexados.length === 0, 'sin clave: no se agrega ningun <script> de Cloudflare',
    `agregados: ${JSON.stringify(r.anexados)}`);
  informa(r.contenedor.hidden === true, 'sin clave: el contenedor del widget sigue oculto');
  const api = r.api;
  informa(!!api && api.isActive() === false, 'sin clave: PlaniaTurnstile.isActive() es false');
  informa(!!api && api.getToken() === '', "sin clave: PlaniaTurnstile.getToken() es ''");
  let tiro = null;
  try { if (api) api.reset(); else tiro = 'no hay PlaniaTurnstile'; } catch (e) { tiro = String(e); }
  informa(tiro === null, 'sin clave: PlaniaTurnstile.reset() no falla', tiro);
}

// Con clave pero sin contenedor (cualquier otra pagina): tampoco carga nada.
{
  const r = evaluar('CLAVE-DE-PRUEBA', false);
  informa(!r.error && r.anexados.length === 0, 'con clave y sin contenedor: no se agrega ningun <script>');
  informa(!!r.api && r.api.isActive() === false, 'con clave y sin contenedor: isActive() es false');
}

// Con clave: carga api.js una vez y dibuja el widget de forma explicita.
{
  const r = evaluar('CLAVE-DE-PRUEBA', true);
  informa(!r.error, 'con clave: el script corre sin errores', r.error && String(r.error));
  const cf = r.anexados.filter((el) => el.src === API_URL);
  informa(r.anexados.length === 1 && cf.length === 1, `con clave: se agrega una sola vez ${API_URL}`,
    `agregados: ${JSON.stringify(r.anexados.map((el) => el.src))}`);
  const s = cf[0] || {};
  informa(s.tag === 'script' && s.async === true && s.defer === true, 'con clave: el <script> es async y defer');
  informa(r.contenedor.hidden === false, 'con clave: el contenedor del widget se muestra');
  const api = r.api;
  informa(!!api && api.isActive() === true, 'con clave: isActive() es true');
  informa(!!api && api.getToken() === '', "con clave: getToken() es '' hasta que Cloudflare entrega el token");

  // Simula que api.js termino de cargar.
  r.window.turnstile = {
    render: (donde, opciones) => { r.llamadas.render.push({ donde, opciones }); return 'widget-1'; },
    reset: (id) => { r.llamadas.reset.push(id); },
  };
  let tiro = null;
  try { s.onload(); } catch (e) { tiro = String(e); }
  const render = r.llamadas.render[0] || { opciones: {} };
  const o = render.opciones;
  informa(tiro === null && r.llamadas.render.length === 1 && render.donde === r.contenedor,
    'con clave: al cargar api.js se dibuja un widget en el contenedor', tiro);
  informa(o.sitekey === 'CLAVE-DE-PRUEBA' && o.language === 'es' && o.theme === 'light' && o.size === 'flexible',
    'con clave: el widget lleva la clave, language "es" y el tema de la pagina',
    `opciones: ${JSON.stringify(o)}`);

  if (typeof o.callback === 'function') o.callback('TOKEN-1');
  informa(!!api && api.getToken() === 'TOKEN-1', 'con clave: getToken() devuelve el token que entrega el widget');
  if (typeof o['expired-callback'] === 'function') o['expired-callback']();
  informa(typeof o['expired-callback'] === 'function' && api.getToken() === '', 'con clave: un token vencido se descarta');

  if (typeof o.callback === 'function') o.callback('TOKEN-2');
  if (api) api.reset();
  informa(!!api && api.getToken() === '' && r.llamadas.reset.length === 1 && r.llamadas.reset[0] === 'widget-1',
    'con clave: reset() descarta el token y le pide uno nuevo al widget',
    `reset: ${JSON.stringify(r.llamadas.reset)}`);
}

// --- Las tres paginas -------------------------------------------------------
for (const f of FORMULARIOS) {
  const html = leer(f.pagina);
  const codigo = leer(f.codigo);
  const etiqueta = `<script src="${f.src}"></script>`;

  informa(veces(html, etiqueta) === 1, `${f.pagina} carga ${f.src} una vez`);
  informa(veces(html, 'id="plania-turnstile"') === 1, `${f.pagina} tiene exactamente un contenedor del widget`,
    `encontrados: ${veces(html, 'id="plania-turnstile"')}`);
  // Sin clases, estilos ni handlers en linea: oculto hasta que el script lo active.
  informa(new RegExp(`<div id="plania-turnstile" hidden></div>\\s*<button type="submit"[^>]*id="${f.boton}"`).test(html),
    `${f.pagina}: el contenedor esta justo arriba del boton de enviar`);

  // turnstile.js tiene que cargar antes que el codigo del formulario.
  const envio = html.indexOf(f.codigo === f.pagina ? f.ruta : 'js/convocatoria.js?v=');
  informa(html.indexOf(etiqueta) !== -1 && html.indexOf(etiqueta) < envio,
    `${f.pagina}: ${f.src} carga antes que el codigo del formulario`);

  informa(/\.turnstileToken = /.test(codigo), `${f.codigo}: el envio manda turnstileToken`);
  informa(/isActive\(\)/.test(codigo), `${f.codigo}: solo manda el token si el widget esta activo`);
  const dondeEspera = codigo.indexOf(ESPERA);
  informa(veces(codigo, ESPERA) === 1 && dondeEspera < codigo.indexOf(`'${f.ruta}'`),
    `${f.codigo}: sin token avisa "${ESPERA}" antes de llamar al proxy`);
  informa(/\.reset\(\)/.test(codigo), `${f.codigo}: llama a reset() despues de la respuesta del proxy`);
}

// --- CSP --------------------------------------------------------------------
// El sitio hoy no declara Content-Security-Policy. Si algun dia lo hace, tiene
// que dejar pasar a Turnstile en script-src y frame-src.
for (const ruta of ['.htaccess', ...FORMULARIOS.map((f) => f.pagina)]) {
  const texto = leer(ruta);
  if (!/Content-Security-Policy/i.test(texto)) continue;
  informa(/script-src[^;"]*https:\/\/challenges\.cloudflare\.com/.test(texto) && /frame-src[^;"]*https:\/\/challenges\.cloudflare\.com/.test(texto),
    `${ruta}: la CSP permite https://challenges.cloudflare.com en script-src y frame-src`);
}

console.log(`\n${total - fail} de ${total} verificaciones OK`);
process.exit(fail ? 1 : 0);
