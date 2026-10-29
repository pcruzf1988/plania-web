// Verificacion estatica de la pagina de la convocatoria Pro (planiat.com/convocatoria).
// Uso: node verify-convocatoria.js   — sale 1 si alguna expectativa falla.
//
// La pagina habla con el proxy (POST /api/convocatoria/postular), que valida con
// las listas cerradas y los nombres de campo de `proxy-plania/convocatoria.js`.
// Este repo no comparte codigo con el proxy, asi que CAMPOS y LISTAS son una
// COPIA de ese modulo: si cambia uno, tiene que cambiar el otro. Lo que se
// afirma aca es que el HTML manda exactamente esos nombres y esos valores, que
// los rangos del cliente son los del backend y que los textos que fija la spec
// (docs/superpowers/specs/2026-10-29-convocatoria-cm-design.md) estan tal cual.

const fs = require('node:fs');

const HTML = leer('convocatoria/index.html');
const JS = leer('js/convocatoria.js');
const WORKFLOW = leer('.github/workflows/deploy.yml');

function leer(ruta) {
  return fs.existsSync(ruta) ? fs.readFileSync(ruta, 'utf8') : '';
}

// Copia de proxy-plania/convocatoria.js (Tarea A2 del plan).
const CAMPOS = [
  'nombre', 'correo', 'whatsapp', 'instagram', 'pais', 'contactoPreferido', 'rol', 'rolOtro',
  'antiguedad', 'tendencia', 'clientesActivos', 'clientesIgFb', 'redes', 'planificacion', 'planificacionOtro',
  'informes', 'horasMes', 'herramientasQuePaga', 'cobro', 'cobroOtro', 'tarifa', 'disponibilidad',
  'expectativa', 'comoSeEntero', 'aceptoContacto',
];
const LISTAS = {
  pais: ['argentina', 'chile', 'espana', 'uruguay', 'mexico', 'colombia', 'peru', 'estados_unidos', 'bolivia', 'costa_rica', 'cuba', 'ecuador', 'el_salvador', 'guatemala', 'honduras', 'nicaragua', 'panama', 'paraguay', 'puerto_rico', 'republica_dominicana', 'venezuela', 'otro'],
  contactoPreferido: ['whatsapp', 'correo', 'instagram'],
  rol: ['freelance_full', 'freelance_part', 'agencia_propia', 'empleado', 'otro'],
  antiguedad: ['menos_1', '1_a_3', 'mas_3'],
  tendencia: ['creciendo', 'estable', 'achicandose'],
  redes: ['instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'x', 'pinterest', 'otra'],
  planificacion: ['planilla', 'herramienta', 'no_planifica', 'otra'],
  informes: ['siempre', 'a_veces', 'no'],
  horasMes: ['menos_5', '5_a_15', 'mas_15'],
  cobro: ['fee_mensual', 'por_proyecto', 'mezcla', 'otro'],
  tarifa: ['menos_100', '100_a_300', '300_a_600', 'mas_600', 'no_dice'],
  disponibilidad: ['ambos', 'uno', 'no'],
  comoSeEntero: ['instagram_plania', 'anuncio', 'recomendacion', 'otro'],
};

// Textos fijados por la spec, seccion "Formulario". Los de confirmacion, pausa,
// finalizada y error de red los pone el script, asi que se buscan en los dos.
const TEXTOS = [
  'Convocatoria Pro: 2 meses de PlanIA Pro gratis',
  'Primera etapa hasta el 8 de noviembre. Resultados el lunes 9.',
  'Recibimos tu postulación. Los resultados de esta etapa salen el lunes',
  'La primera etapa se completó. La segunda abre el jueves 12 de noviembre. Seguinos en @plan.ia.t para enterarte.',
  'La inscripción cerró. Si querés probar PlanIA, creá tu cuenta gratis en app.planiat.com.',
  'No pudimos enviar tu postulación. Probá de nuevo en un minuto.',
  'nos ayuda a entender tu negocio; no cambia tu postulación',
  'o el equivalente en tu moneda',
  // Correcciones de Pedro (2026-10-29) al texto de la pagina y a las preguntas.
  'A cambio solo te pedimos tu feedback',
  'del 20 de noviembre al 31 de enero',
  'Meta Business Suite',
  'pendiente de aprobación por Meta',
  'la podés crear gratis cuando quieras',
  'CM o SMM',
  'gestionás para tus clientes',
  'herramienta o app',
  'planificar, pedir aprobación a tus clientes e informar',
  'herramientas o apps pagás',
  // Mensaje de texto corto (Pedro, 2026-10-29): el cliente dice el minimo y la pregunta lo muestra.
  'necesita al menos ',
  'al menos 20 caracteres',
];

// Devuelve los atributos de cada etiqueta <input>, <select> o <textarea> del HTML.
function controles() {
  const lista = [];
  const re = /<(input|select|textarea)\b([^>]*)>/g;
  let m;
  while ((m = re.exec(HTML))) {
    const attrs = {};
    const reAttr = /([a-zA-Z-]+)(?:="([^"]*)")?/g;
    let a;
    while ((a = reAttr.exec(m[2]))) attrs[a[1]] = a[2] === undefined ? '' : a[2];
    lista.push({ tag: m[1], attrs });
  }
  return lista;
}

// Valores (sin el vacio) de los <option> del <select name="..."> pedido.
function opciones(name) {
  const m = HTML.match(new RegExp(`<select\\b[^>]*name="${name}"[^>]*>([\\s\\S]*?)</select>`));
  if (!m) return null;
  return [...m[1].matchAll(/<option\b[^>]*value="([^"]*)"/g)].map((o) => o[1]).filter(Boolean);
}

const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let fail = 0;
function informa(ok, nombre, detalle) {
  if (!ok) fail = 1;
  console.log(`${ok ? 'OK:   ' : 'FALLA:'} ${nombre}`);
  if (!ok && detalle) console.log(`       ${detalle}`);
}

informa(HTML !== '', 'existe convocatoria/index.html');
informa(JS !== '', 'existe js/convocatoria.js');

const todos = controles();
const porNombre = (name) => todos.filter((c) => c.attrs.name === name);

// Un control por cada clave de CAMPOS, mas el honeypot.
for (const campo of [...CAMPOS, 'sitio']) {
  informa(porNombre(campo).length > 0, `hay un control name="${campo}"`);
}

// Cada select manda exactamente los valores de su lista; redes, un checkbox por valor.
for (const [campo, lista] of Object.entries(LISTAS)) {
  if (campo === 'redes') {
    const checks = porNombre('redes').filter((c) => c.attrs.type === 'checkbox').map((c) => c.attrs.value);
    informa(iguales(checks, lista), 'redes: un checkbox por valor de la lista',
      `esperado ${JSON.stringify(lista)}\n       obtenido ${JSON.stringify(checks)}`);
    continue;
  }
  const obtenido = opciones(campo);
  informa(iguales(obtenido, lista), `select ${campo}: las opciones son exactamente la lista`,
    `esperado ${JSON.stringify(lista)}\n       obtenido ${JSON.stringify(obtenido)}`);
}

// Rangos del cliente iguales a los del backend.
function tieneAttrs(name, esperados) {
  const c = porNombre(name)[0];
  const faltan = Object.entries(esperados).filter(([k, v]) => !c || c.attrs[k] !== v);
  informa(faltan.length === 0, `${name} lleva ${Object.entries(esperados).map(([k, v]) => `${k}="${v}"`).join(' ')}`,
    `faltan o difieren: ${JSON.stringify(faltan)}`);
}
tieneAttrs('clientesActivos', { type: 'text', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '2' });
tieneAttrs('clientesIgFb', { type: 'text', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '2' });
tieneAttrs('expectativa', { minlength: '20', maxlength: '600' });
tieneAttrs('nombre', { minlength: '2', maxlength: '80' });
for (const otro of ['rolOtro', 'planificacionOtro', 'cobroOtro']) tieneAttrs(otro, { type: 'text', maxlength: '120' });

// Honeypot: visible para los bots (no type=hidden), fuera del tab y sin autocompletar.
const sitio = porNombre('sitio')[0];
informa(!!sitio && sitio.attrs.type !== 'hidden' && sitio.attrs.tabindex === '-1' && sitio.attrs.autocomplete === 'off',
  'el honeypot sitio no es type=hidden y lleva tabindex="-1" autocomplete="off"');

// Textos exactos de la spec.
for (const texto of TEXTOS) {
  informa(HTML.includes(texto) || JS.includes(texto), `texto de la spec presente: "${texto}"`);
}

// Ids que usa el script.
for (const id of ['conv-estado', 'conv-form', 'conv-submit', 'conv-msg', 'conv-ok']) {
  informa(HTML.includes(`id="${id}"`), `existe id="${id}"`);
}
informa(/id="conv-msg"[^>]*role="status"[^>]*aria-live="polite"|role="status"[^>]*aria-live="polite"[^>]*id="conv-msg"/.test(HTML),
  'conv-msg es role="status" aria-live="polite"');

informa(HTML.includes('../privacidad.html#convocatoria'), 'el consentimiento linkea a ../privacidad.html#convocatoria');
informa(HTML.includes('src="../js/convocatoria.js"'), 'la pagina carga ../js/convocatoria.js');

const exclude = (WORKFLOW.match(/exclude:\s*\|\n((?:\s+.+\n?)+)/) || [, ''])[1]
  .split('\n').map((l) => l.trim()).filter(Boolean);
informa(exclude.includes('verify-convocatoria.js'), 'deploy.yml excluye verify-convocatoria.js');

informa(JS.includes('/api/convocatoria/estado'), 'el script consulta /api/convocatoria/estado');
informa(JS.includes('/api/convocatoria/postular'), 'el script envia a /api/convocatoria/postular');

// Si el GET de estado falla (proxy caido), el formulario se muestra igual: la
// funcion de carga tiene que llamar a mostrarFormulario() tambien en su catch.
const llamadas = (JS.match(/mostrarFormulario\(\)/g) || []).length;
informa(llamadas >= 2, 'mostrarFormulario() se llama al menos dos veces (rama abierta y rama de error)', `se llama ${llamadas} veces`);

process.exit(fail);
