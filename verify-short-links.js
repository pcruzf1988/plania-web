// Verificacion de los links cortos de redes (.htaccess).
// Uso: node verify-short-links.js   — sale 1 si alguna expectativa falla.
//
// planiat.com/ig, /fb, /li y /wa van en las bios; planiat.com/{fb|li|ig}/{planItemId}
// va en las piezas. Cada uno redirige (302) a la landing con las UTM armadas, asi
// la visita queda medida sin un link largo en el copy.
//
// Igual que verify-origin-links.js: se mira el resultado, no el codigo fuente.
// Se leen las RewriteRule reales del .htaccess, se aplican a cada ruta como lo
// hace Apache (patron sin la barra inicial, $n, QSA) y se compara el destino.
// La prueba de verdad es `curl -I` de las 7 rutas despues del deploy (manual).

const fs = require('node:fs');

const HTACCESS = fs.existsSync('.htaccess') ? fs.readFileSync('.htaccess', 'utf8') : '';
const WORKFLOW = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');

// Las reglas tal cual las escribe el .htaccess: RewriteRule patron destino [flags].
function reglas() {
  return HTACCESS.split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('RewriteRule '))
    .map((l) => {
      const [, patron, destino, flags = ''] = l.match(/^RewriteRule\s+(\S+)\s+(\S+)(?:\s+\[([^\]]*)\])?$/) || [];
      return { patron: new RegExp(patron), destino, flags: flags.split(',').map((f) => f.trim()) };
    });
}

// Pide una ruta como el navegador. Devuelve "302 destino", "403" o "sirve".
function pedir(url) {
  const [ruta, query = ''] = url.split('?');
  // En un .htaccess de la raiz, Apache compara la ruta sin la barra inicial.
  const path = ruta.replace(/^\//, '');
  for (const r of reglas()) {
    const m = path.match(r.patron);
    if (!m) continue;
    if (r.flags.includes('F')) return r.flags.includes('L') ? '403' : 'regla sin [F,L]';
    let destino = r.destino.replace(/\$(\d)/g, (_, n) => m[Number(n)] ?? '');
    if (query && r.flags.includes('QSA')) destino += (destino.includes('?') ? '&' : '?') + query;
    const redirige = r.flags.find((f) => f.startsWith('R'));
    if (!redirige || !r.flags.includes('L')) return `regla sin [R=302,L]: ${r.destino}`;
    return `${redirige.split('=')[1] || '302'} ${destino}`;
  }
  return 'sirve';
}

const casos = [
  // Las 7 de la tabla de la spec (3.6).
  ['/ig de la bio', '/ig', '302 /?utm_source=instagram&utm_medium=bio'],
  ['/fb de la bio', '/fb', '302 /?utm_source=facebook&utm_medium=bio'],
  ['/li de la bio', '/li', '302 /?utm_source=linkedin&utm_medium=bio'],
  ['/wa de la bio', '/wa', '302 /?utm_source=whatsapp&utm_medium=bio'],
  ['/li/{planItemId} de un post', '/li/2026-11-04-post-1',
    '302 /?utm_source=linkedin&utm_medium=post&utm_campaign=2026-11&utm_content=2026-11-04-post-1'],
  ['/fb/{planItemId} de un post', '/fb/2026-11-04-post-1',
    '302 /?utm_source=facebook&utm_medium=post&utm_campaign=2026-11&utm_content=2026-11-04-post-1'],
  ['/ig/{planItemId} de una story', '/ig/2026-11-04-story-1',
    '302 /?utm_source=instagram&utm_medium=story&utm_campaign=2026-11&utm_content=2026-11-04-story-1'],

  ['con barra final redirige igual', '/ig/', '302 /?utm_source=instagram&utm_medium=bio'],
  ['el numero de pieza puede tener mas de un digito', '/li/2026-12-31-post-12',
    '302 /?utm_source=linkedin&utm_medium=post&utm_campaign=2026-12&utm_content=2026-12-31-post-12'],
  ['otro query string se conserva', '/fb?fbclid=abc',
    '302 /?utm_source=facebook&utm_medium=bio&fbclid=abc'],
  ['otro query string se conserva en una pieza', '/ig/2026-11-04-story-1?x=1',
    '302 /?utm_source=instagram&utm_medium=story&utm_campaign=2026-11&utm_content=2026-11-04-story-1&x=1'],

  // Lo que no matchea sigue sirviendo como siempre.
  ['la landing no redirige', '/', 'sirve'],
  ['las paginas legales no redirigen', '/privacidad.html', 'sirve'],
  ['los assets no redirigen', '/js/origin-links.js', 'sirve'],
  ['un prefijo parecido no redirige', '/igx', 'sirve'],
  ['un id que no es de pieza no redirige', '/ig/hola', 'sirve'],
  ['un kind desconocido no redirige', '/fb/2026-11-04-reel-1', 'sirve'],
  ['/wa no tiene links por pieza', '/wa/2026-11-04-post-1', 'sirve'],

  // Los archivos con punto no se sirven: el estado del FTP lista el sitio entero.
  ['el estado del deploy por FTP no se sirve', '/.ftp-deploy-sync-state.json', '403'],
  ['el .htaccess no se sirve', '/.htaccess', '403'],
  ['un archivo con punto en una carpeta no se sirve', '/assets/.DS_Store', '403'],
  ['.well-known sigue sirviendo (certificado SSL)', '/.well-known/acme-challenge/abc', 'sirve'],
  ['un archivo con punto en el medio del nombre sirve', '/css/styles.min.css', 'sirve'],
];

let fail = 0;
function informa(ok, nombre, detalle) {
  if (!ok) fail = 1;
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${nombre}`);
  if (!ok && detalle) console.log(`      ${detalle}`);
}

informa(HTACCESS !== '', 'existe .htaccess en la raiz');
informa(/^\s*RewriteEngine\s+On\s*$/m.test(HTACCESS), 'el .htaccess prende RewriteEngine');
const redirecciones = reglas().filter((r) => r.flags.some((f) => f.startsWith('R'))).length;
informa(redirecciones === 7, 'el .htaccess tiene exactamente 7 redirecciones', `tiene ${redirecciones}`);

// El FTP sube lo que el exclude no saca. Un patron como **/.* o .htaccess dejaria
// el sitio sin redirecciones sin que nadie se entere.
const exclude = (WORKFLOW.match(/exclude:\s*\|\n((?:\s+.+\n?)+)/) || [, ''])[1]
  .split('\n').map((l) => l.trim()).filter(Boolean);
const sacaHtaccess = exclude.filter((p) => p.includes('htaccess') || /(^|\/)\.\*/.test(p) || p === '.*');
informa(sacaHtaccess.length === 0, 'el deploy no excluye .htaccess', `excluye con ${JSON.stringify(sacaHtaccess)}`);
// Los verificadores son del repo, no del sitio.
const verificadores = fs.readdirSync('.').filter((f) => /^verify-/.test(f));
const subidos = verificadores.filter((f) => !exclude.includes(f));
informa(subidos.length === 0, 'el deploy no sube los verificadores', `sube ${JSON.stringify(subidos)}`);

for (const [nombre, url, esperado] of casos) {
  let obtenido;
  try {
    obtenido = pedir(url);
  } catch (e) {
    obtenido = `TIRO: ${e.message}`;
  }
  informa(obtenido === esperado, `${nombre} (${url})`, `esperado ${esperado}\n      obtenido ${obtenido}`);
}

process.exit(fail);
