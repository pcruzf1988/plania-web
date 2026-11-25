// Verificacion de la migracion al manual de marca v1.1 (odd/tasks/brand-manual-web.md, S1-S4).
// Uso: node verify-brand.js   — sale 1 si alguna expectativa falla.
//
// Lee los HTML y el CSS tal cual se sirven. No ejecuta nada en un navegador:
// todo lo que fija el manual (fuentes, tokens, copy, logo, favicon, OG) es
// observable en el codigo fuente.

const fs = require('node:fs');
const path = require('node:path');

const PAGINAS = [
  'index.html',
  'arrepentimiento.html',
  'cookies.html',
  'copyright.html',
  'dpa.html',
  'privacidad.html',
  'terminos.html',
  'convocatoria/index.html',
];
const CSS = ['css/main.css', 'css/responsive.css'];

const leer = (f) => fs.readFileSync(f, 'utf8');
const html = Object.fromEntries(PAGINAS.map((p) => [p, leer(p)]));
const css = Object.fromEntries(CSS.map((c) => [c, leer(c)]));
const mainCss = css['css/main.css'];
const index = html['index.html'];

let fail = 0;
function check(nombre, ok, detalle) {
  if (!ok) fail = 1;
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${nombre}${!ok && detalle ? `  (${detalle})` : ''}`);
}

// Texto visible de un fragmento HTML: sin etiquetas, con espacios colapsados.
const texto = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const atributo = (src, re) => { const m = src.match(re); return m ? m[1] : null; };
// Prefijo relativo con el que cada pagina llega a la raiz del sitio.
const raiz = (p) => (p.includes('/') ? '../' : '');

// ── S1 · Tipografia ──────────────────────────────────────────────────────────
const FONT_LINK = /<link[^>]+href="https:\/\/fonts\.googleapis\.com\/css2\?([^"]+)"/;
for (const p of PAGINAS) {
  const q = atributo(html[p], FONT_LINK) || '';
  check(`${p}: link de Google Fonts carga Playfair Display 400/700/italica`,
    q.includes('family=Playfair+Display:ital,wght@0,400;0,700;1,400'), q);
  check(`${p}: link de Google Fonts carga Hanken Grotesk 400-700`,
    q.includes('family=Hanken+Grotesk:wght@400;500;600;700'), q);
  check(`${p}: no carga Inter`, !q.includes('Inter'), q);
  check(`${p}: no menciona 'Inter'`, !html[p].includes("'Inter'"));
}
for (const c of CSS) check(`${c}: no menciona 'Inter'`, !css[c].includes("'Inter'"));

check("main.css define --font-serif: 'Playfair Display', Georgia, serif",
  /--font-serif:\s*'Playfair Display', Georgia, serif;/.test(mainCss));
check("main.css define --font-sans: 'Hanken Grotesk', Arial, sans-serif",
  /--font-sans:\s*'Hanken Grotesk', Arial, sans-serif;/.test(mainCss));
const bodyRule = (mainCss.match(/\nbody\s*\{([^}]*)\}/) || [])[1] || '';
check('body usa var(--font-sans)', /font-family:\s*var\(--font-sans\)/.test(bodyRule), bodyRule.trim());
const h1h2 = (mainCss.match(/\nh1,\s*h2\s*\{([^}]*)\}/) || [])[1] || '';
check('h1 y h2 usan var(--font-serif) con peso 700',
  /font-family:\s*var\(--font-serif\)/.test(h1h2) && /font-weight:\s*700/.test(h1h2), h1h2.trim());
const featH3 = (mainCss.match(/\.feat-text h3\s*\{([^}]*)\}/) || [])[1] || '';
check('titulos de seccion (.feat-text h3) usan var(--font-serif)',
  /font-family:\s*var\(--font-serif\)/.test(featH3), featH3.trim());
for (const p of PAGINAS.slice(1)) {
  const h1 = (html[p].match(/\.legal-header h1\s*\{([^}]*)\}/) || [])[1] || '';
  check(`${p}: .legal-header h1 usa var(--font-serif) con peso 700`,
    /font-family:\s*var\(--font-serif\)/.test(h1) && /font-weight:\s*700/.test(h1), h1.trim());
}

// Sin tracking negativo menor que -0.02em en ningun estilo (titulares incluidos).
const TRACKING = /letter-spacing:\s*(-?\.?\d*\.?\d+)em/g;
for (const [f, src] of [...Object.entries(css), ...Object.entries(html)]) {
  const malos = [...src.matchAll(TRACKING)].map((m) => parseFloat(m[1])).filter((v) => v < -0.02);
  check(`${f}: ningun letter-spacing menor que -0.02em`, malos.length === 0, malos.join(', '));
}
const label = (mainCss.match(/\n\.label\s*\{([^}]*)\}/) || [])[1] || '';
check('.label (etiquetas en mayusculas) usa letter-spacing .12em', /letter-spacing:\s*\.12em/.test(label), label.trim());
check('main.css no conserva letter-spacing .14em', !/letter-spacing:\s*\.14em/.test(mainCss));

// Pesos permitidos de Hanken: 400, 500, 600 y 700.
const PESO = /font-weight:\s*(\d{3})/g;
for (const [f, src] of [...Object.entries(css), ...Object.entries(html)]) {
  const malos = [...src.matchAll(PESO)].map((m) => Number(m[1])).filter((v) => v > 700 || v < 400);
  check(`${f}: ningun font-weight fuera de 400-700`, malos.length === 0, malos.join(', '));
}

// ── S2 · Tokens ──────────────────────────────────────────────────────────────
const root = (mainCss.match(/:root\s*\{([^}]*)\}/) || [])[1] || '';
const TOKENS = {
  '--carbon': '#1E1A16',
  '--text-primary': '#1E1A16',
  '--surface': '#FAF7F2',
  '--surface-2': '#F5EDE0',
  '--border': '#E2DAD0',
  '--text-secondary': '#6B6157',
  '--radius': '12px',
  '--radius-sm': '8px',
  '--radius-xs': '4px',
  '--radius-lg': '20px',
  '--radius-pill': '999px',
  '--tierra-boton': '#B5582A',
  '--carbon-2': '#18130E',
  '--carbon-3': '#231A12',
};
for (const [t, v] of Object.entries(TOKENS)) {
  const m = root.match(new RegExp(`${t}:\\s*([^;]+);`));
  check(`:root ${t}: ${v}`, !!m && m[1].trim() === v, m ? m[1].trim() : 'ausente');
}
const btnTierra = (mainCss.match(/\n\.btn-tierra\s*\{([^}]*)\}/) || [])[1] || '';
check('.btn-tierra usa background: var(--tierra-boton)', /background:\s*var\(--tierra-boton\)/.test(btnTierra), btnTierra.trim());
const btnTierraHover = (mainCss.match(/\.btn-tierra:hover\s*\{([^}]*)\}/) || [])[1] || '';
check('.btn-tierra:hover usa background: var(--tierra-dark)', /background:\s*var\(--tierra-dark\)/.test(btnTierraHover), btnTierraHover.trim());

// ── S3 · Copy de marca ───────────────────────────────────────────────────────
const h1 = (index.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '';
check('hero h1 dice "Planificá las redes de cada cliente en minutos."',
  texto(h1) === 'Planificá las redes de cada cliente en minutos.', texto(h1));
const grad = (h1.match(/<span class="grad-text">([\s\S]*?)<\/span>/) || [])[1] || '';
check('hero h1: "en minutos." dentro de .grad-text', texto(grad) === 'en minutos.', texto(grad));

const heroSub = (index.match(/<p class="hero-sub[^"]*">([\s\S]*?)<\/p>/) || [])[1] || '';
check('.hero-sub con el texto del manual',
  texto(heroSub) === 'Cargás el perfil del negocio una vez. Cada mes PlanIA arma el plan de contenidos con el copy listo, vos lo revisás y se lo mandás a tu cliente.',
  texto(heroSub));

const heroCtas = (index.match(/<div class="hero-ctas[^"]*">([\s\S]*?)<\/div>/) || [])[1] || '';
const ctaPrimario = (heroCtas.match(/<a[^>]*class="[^"]*btn-tierra[^"]*"[^>]*>([\s\S]*?)<\/a>/) || [])[1] || '';
check('CTA primario del hero dice "Crear mi primer plan gratis" (sin flecha)',
  texto(ctaPrimario) === 'Crear mi primer plan gratis', texto(ctaPrimario));
const despuesCtas = index.slice(index.indexOf('<div class="hero-ctas'));
const heroNote = (despuesCtas.match(/<\/div>\s*<p class="hero-note[^"]*">([\s\S]*?)<\/p>/) || [])[1] || '';
check('<p class="hero-note"> debajo de los CTAs dice "Nada sale a tus redes sin tu ok."',
  texto(heroNote) === 'Nada sale a tus redes sin tu ok.', texto(heroNote));
check('.hero-note tiene estilo en main.css', /\.hero-note\s*\{/.test(mainCss));

const FIRMA = 'Un producto de <a href="https://www.rutasdigitales.com.ar" target="_blank" rel="noopener">Rutas Digitales</a> · Jujuy, Argentina';
for (const p of PAGINAS) {
  const footer = (html[p].match(/<footer>([\s\S]*?)<\/footer>/) || [])[1] || '';
  check(`${p}: pie sin la frase del fundador (retirada el 19/11/2026)`, !footer.includes('Hecha desde Jujuy'));
  check(`${p}: firma "Un producto de Rutas Digitales · Jujuy, Argentina"`, footer.includes(FIRMA));
  check(`${p}: pie conserva "© 2026 PlanIA · planiat.com"`, footer.includes('© 2026 PlanIA · planiat.com'));
  check(`${p}: pie sin "Desarrollado por Pedro Cruz"`, !footer.includes('Desarrollado por Pedro Cruz'));
  check(`${p}: pie (fondo carbon) usa plania-horizontal-blanco.svg`,
    footer.includes(`src="${raiz(p)}assets/brand/plania-horizontal-blanco.svg`));
}

// ── S4 · Identidad ───────────────────────────────────────────────────────────
const TITULO = 'PlanIA · Planes de contenido para redes, con IA';
check(`<title> de index.html es "${TITULO}"`, atributo(index, /<title>([^<]*)<\/title>/) === TITULO);
check('og:title de index.html', atributo(index, /property="og:title" content="([^"]*)"/) === TITULO);
check('twitter:title de index.html', atributo(index, /name="twitter:title" content="([^"]*)"/) === TITULO);
check('meta description de index.html sin cambios',
  (atributo(index, /name="description" content="([^"]*)"/) || '').startsWith('PlanIA es la herramienta online con inteligencia artificial para community managers'));
check('og:image apunta a https://planiat.com/assets/images/og-image.png',
  atributo(index, /property="og:image" content="([^"]*)"/) === 'https://planiat.com/assets/images/og-image.png');
check('twitter:image apunta a https://planiat.com/assets/images/og-image.png',
  atributo(index, /name="twitter:image" content="([^"]*)"/) === 'https://planiat.com/assets/images/og-image.png');
check('index.html lleva <meta name="theme-color" content="#C4622D">',
  index.includes('<meta name="theme-color" content="#C4622D">'));

const ASSETS = [
  'assets/brand/plania-horizontal.svg',
  'assets/brand/plania-horizontal-blanco.svg',
  'assets/brand/plania-principal.svg',
  'assets/brand/plania-blanco.svg',
  'assets/brand/favicon.svg',
  'assets/brand/favicon-32.png',
  'assets/brand/apple-touch-icon-180.png',
  'assets/images/og-image.png',
];
for (const a of ASSETS) check(`existe ${a}`, fs.existsSync(a) && fs.statSync(a).size > 0);
const ORIGEN = path.join(__dirname, '..', 'docs', 'brand', 'manual-v1', 'v1.1-assets');
if (fs.existsSync(ORIGEN)) {
  const copias = ASSETS.map((a) => [a, path.basename(a) === 'og-image.png' ? 'og-image-1200x630.png' : path.basename(a)]);
  for (const [dest, src] of copias) {
    const o = path.join(ORIGEN, src);
    check(`${dest} es copia fiel de v1.1-assets/${src}`,
      fs.existsSync(dest) && fs.existsSync(o) && fs.readFileSync(dest).equals(fs.readFileSync(o)));
  }
}

const ALT = 'alt="PlanIA · Planes de contenido para redes, con IA"';
for (const p of PAGINAS) {
  const r = raiz(p);
  const nav = (html[p].match(/<header class="nav[^"]*">([\s\S]*?)<\/header>/) || [])[1] || '';
  const navLogo = (nav.match(/<a[^>]*class="nav-logo"[^>]*>\s*(<img[^>]*>)/) || [])[1] || '';
  check(`${p}: nav usa assets/brand/plania-horizontal.svg con alt del manual`,
    navLogo.includes(`src="${r}assets/brand/plania-horizontal.svg`) && navLogo.includes(ALT), navLogo);
  const footerImg = ((html[p].match(/<footer>([\s\S]*?)<\/footer>/) || [])[1] || '').match(/<img[^>]*>/);
  check(`${p}: logo del pie con alt del manual`, !!footerImg && footerImg[0].includes(ALT), footerImg && footerImg[0]);
  check(`${p}: no referencia logo-plania.png`, !html[p].includes('logo-plania.png'));
  check(`${p}: no referencia favicon.png`, !html[p].includes('favicon.png'));
  check(`${p}: no referencia og-image.jpg`, !html[p].includes('og-image.jpg'));
  check(`${p}: favicon SVG`, html[p].includes(`<link rel="icon" type="image/svg+xml" href="${r}assets/brand/favicon.svg`));
  check(`${p}: favicon PNG 32x32`, html[p].includes(`<link rel="icon" type="image/png" sizes="32x32" href="${r}assets/brand/favicon-32.png`));
  check(`${p}: apple-touch-icon`, html[p].includes(`<link rel="apple-touch-icon" href="${r}assets/brand/apple-touch-icon-180.png`));
}

// ── Banda final (19/11/2026, opción 1 elegida por Pedro) ──────────────────
{
  const i = html['index.html'];
  check('banda final: título con el slogan', i.includes('Las redes de cada cliente,<br class="br-desktop">planificadas en minutos.'));
  check('banda final: bajada del Free', i.includes('Empezá con un cliente, un plan y un informe. Gratis y sin tarjeta.'));
  check('banda final: sin el copy viejo', !i.includes('Más tiempo para la estrategia') && !i.includes('sin vencimiento, sin compromiso'));
  check('banda final: botón "Crear mi primer plan gratis" sin flecha', !/Empezar gratis →/.test(i.slice(i.indexOf('Las redes de cada cliente,<br'))));
}

// ── Landing actualizada (24/11/2026): funciones, capturas nuevas y franja de la convocatoria ──
// Texto visible con las etiquetas convertidas en espacios (un <br> separa palabras).
const plano = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const mainJs = leer('js/main.js');
const respCss = css['css/responsive.css'];

// Ancho y alto reales de un PNG o WebP, leidos de la cabecera del archivo.
function dimensiones(archivo) {
  const b = fs.readFileSync(archivo);
  if (b.toString('ascii', 1, 4) === 'PNG') return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const tipo = b.toString('ascii', 12, 16);
    if (tipo === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (tipo === 'VP8L') { const n = b.readUInt32LE(21); return [(n & 0x3fff) + 1, ((n >>> 14) & 0x3fff) + 1]; }
    if (tipo === 'VP8X') return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
  }
  return null;
}
const imagenes = (src) => [...src.matchAll(/<img\b[^>]*>/g)].map((m) => {
  const at = (n) => atributo(m[0], new RegExp(`\\b${n}="([^"]*)"`));
  return { tag: m[0], src: at('src'), width: at('width'), height: at('height'), alt: at('alt'), loading: at('loading') };
});

{
  // Franja de la convocatoria: arriba del menu, con su fecha de cierre.
  const bar = (index.match(/<a\b[^>]*class="conv-bar"[^>]*>[\s\S]*?<\/a>/) || [''])[0];
  const barTag = (bar.match(/<a\b[^>]*>/) || [''])[0];
  check('franja convocatoria: existe <a class="conv-bar" id="conv-bar">', barTag.includes('id="conv-bar"'), barTag);
  check('franja convocatoria: linkea a /convocatoria/', barTag.includes('href="/convocatoria/"'), barTag);
  check('franja convocatoria: lleva el cierre data-cierra="2026-11-30T03:00:00Z"',
    barTag.includes('data-cierra="2026-11-30T03:00:00Z"'), barTag);
  check('franja convocatoria: texto de la convocatoria',
    plano(bar).startsWith('Convocatoria Pro: 2 meses de PlanIA Pro gratis para community managers. Inscripción abierta hasta el domingo 29 de noviembre.'),
    plano(bar));
  check('franja convocatoria: llamada "Postulate →"', plano(bar).endsWith('Postulate →'), plano(bar));
  check('franja convocatoria: va antes del menu', bar !== '' && index.indexOf(bar) < index.indexOf('<header class="nav'));
  check('franja convocatoria: main.css la oculta con [hidden] (display:none le gana al flex)',
    /\.conv-bar\[hidden\]\s*\{\s*display:\s*none/.test(mainCss));
  const barRule = (mainCss.match(/\n\.conv-bar\s*\{([^}]*)\}/) || [])[1] || '';
  check('franja convocatoria: sin alto fijo (se adapta si el texto ocupa dos lineas)',
    barRule !== '' && !/[^-]height:/.test(` ${barRule}`), barRule.trim());
  check(':root define --bar-h: 0px (sin franja no hay desplazamiento)', /--bar-h:\s*0px;/.test(root));
  const navRule = (mainCss.match(/\n\.nav\s*\{([^}]*)\}/) || [])[1] || '';
  check('.nav se ubica debajo de la franja: top: var(--bar-h)', /top:\s*var\(--bar-h\)/.test(navRule), navRule.trim());
  const navMobile = (respCss.match(/\n\.nav-mobile\s*\{([^}]*)\}/) || [])[1] || '';
  check('.nav-mobile abre debajo del menu y la franja: top: calc(66px + var(--bar-h))',
    /top:\s*calc\(66px \+ var\(--bar-h\)\)/.test(navMobile), navMobile.trim());
  const heroPads = [...(mainCss + respCss).matchAll(/\.hero\s*\{[^}]*?padding:\s*([^;]+);/g)].map((m) => m[1]);
  check('el padding superior del hero suma la franja en todos los anchos',
    heroPads.length === 4 && heroPads.every((p) => /^calc\(\d+px \+ var\(--bar-h\)\)/.test(p)), heroPads.join(' | '));
  check('main.js mide la franja y publica --bar-h', mainJs.includes("getElementById('conv-bar')") && mainJs.includes("'--bar-h'"));
  check('main.js oculta la franja al cierre (lee data-cierra)', mainJs.includes("getAttribute('data-cierra')"));
  check('main.js ya no asume 66 px fijos para el estado on-dark', !/heroBottom > 66\b/.test(mainJs));
  check('main.js ya no asume 72 px fijos al hacer scroll a una seccion', !/const offset = 72;/.test(mainJs));

  // Precios: se conservan, y la nota dice la verdad sobre los medios de pago.
  const nota = plano((index.match(/<p class="pricing-note">([\s\S]*?)<\/p>/) || [])[1] || '');
  check('nota de precios: ya no dice "próximamente"', nota !== '' && !/pr[oó]ximamente/i.test(nota), nota);
  check('nota de precios: tarjeta internacional en USD', /tarjeta/i.test(nota) && nota.includes('USD'), nota);
  check('nota de precios: Argentina paga en pesos con MercadoPago', nota.includes('pesos') && nota.includes('MercadoPago'), nota);
  check('precios: aclara qué no consume generaciones',
    plano(index).includes('Mejorar el copy con IA, generar guiones de reel, exportar PDF y compartir enlaces de aprobación no consumen generaciones de plan.'));
  for (const s of ['<sup>$</sup>16.99<span class="period"> / mes USD</span>', '<sup>$</sup>25.99<span class="period"> / mes USD</span>',
    '<sup>$</sup>43.99<span class="period"> / mes USD</span>', 'o $19.500 ARS / mes con MercadoPago', 'o $30.000 ARS / mes con MercadoPago',
    'o $51.000 ARS / mes con MercadoPago', '4 generaciones de plan por mes', '12 generaciones de plan por mes', '30 generaciones de plan por mes',
    'Hasta 3 clientes', 'Hasta 10 clientes', 'Hasta 25 clientes']) {
    check(`precios sin cambios: ${s.replace(/<[^>]+>/g, '')}`, index.includes(s));
  }
  const starter = index.slice(index.indexOf('<div class="p-tier">Starter</div>'), index.indexOf('Elegir Starter'));
  check('Starter conserva "Soporte por email y WhatsApp"', starter.includes('<li>Soporte por email y WhatsApp</li>'));

  // Funciones: cada bloque nuevo tiene su titulo.
  const funciones = index.slice(index.indexOf('<div id="funciones">'), index.indexOf('<section class="workflow-section"'));
  const titulos = [...funciones.matchAll(/<h[34][^>]*>([\s\S]*?)<\/h[34]>/g)].map((m) => plano(m[1]));
  for (const t of [
    'Un plan mensual completo. Copy incluido.',
    'Tu cliente aprueba desde el celular, sin crear una cuenta',
    'Pedile a la IA que mejore una pieza, no todo el plan',
    'El guion del reel, escena por escena',
    'La IA entiende el negocio. Vos le das la dirección.',
    'Identidad visual de cada cliente',
    'Informes de resultados y métricas que te toman minutos, no horas',
    'Conocé a quién le hablás de verdad',
    'El informe para el cliente, redactado y editable',
    'Arrancá el día sabiendo exactamente qué hacer',
    'Uma te explica cómo se hace, sin salir de la app',
    'También en el celular, y conectado con lo que ya usás',
    'Diseñar en Canva',
    'Crear en Meta',
    'Exportación en PDF',
    'Tema claro y oscuro',
  ]) check(`#funciones tiene el título "${t}"`, titulos.includes(t));
  for (const s of ['Pendiente', 'Programada', 'Publicado', 'Falta insumo', 'Listo para programar', 'Mejorar con IA', 'hasta 8 colores', 'Business Suite']) {
    check(`#funciones menciona "${s}"`, plano(funciones).includes(s));
  }
  check('FAQ: pregunta sobre la aprobación del cliente', index.includes('¿Cómo aprueba el plan mi cliente?'));

  // Lo que no existe para los usuarios no se anuncia.
  for (const s of ['Lucía', 'Lucia', 'Telegram', 'TikTok', 'LinkedIn', 'instalable', 'notificaciones push', 'colaboradores', 'miembros del equipo']) {
    check(`index.html no anuncia "${s}"`, !plano(index).toLowerCase().includes(s.toLowerCase()));
  }

  let ld = null;
  try { ld = JSON.parse((index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1]); } catch (e) { ld = null; }
  check('JSON-LD válido con featureList', !!ld && Array.isArray(ld.featureList) && ld.featureList.length >= 6);

  // Capturas: ninguna vieja, todas existen, con su tamaño real, alt y carga diferida.
  for (const p of PAGINAS) check(`${p}: no referencia captura-*.png`, !/captura-[a-z]+\.png/.test(html[p]));
  const viejas = fs.readdirSync('assets/images').filter((f) => /^captura-/.test(f));
  check('assets/images ya no tiene captura-*.png', viejas.length === 0, viejas.join(', '));
  check('se conserva assets/images/og-image.png', fs.existsSync('assets/images/og-image.png'));

  for (const p of ['index.html', 'convocatoria/index.html']) {
    const imgs = imagenes(html[p]);
    const capturas = imgs.filter((i) => /assets\/images\/app-/.test(i.src || ''));
    check(`${p}: usa las capturas nuevas (assets/images/app-*)`, capturas.length >= (p === 'index.html' ? 12 : 2), `${capturas.length}`);
    for (const i of imgs) {
      const archivo = path.join(path.dirname(p), (i.src || '').split('?')[0]);
      const existe = !!i.src && fs.existsSync(archivo);
      check(`${p}: existe ${i.src}`, existe);
      check(`${p}: ${i.src} lleva alt descriptivo`, !!i.alt && i.alt.length >= 20, i.alt);
      if (!existe || !/\.(png|webp)$/.test(archivo)) continue;
      const real = dimensiones(archivo);
      check(`${p}: ${i.src} declara su tamaño real`,
        !!real && Number(i.width) === real[0] && Number(i.height) === real[1], `declara ${i.width}x${i.height}, real ${real}`);
      const peso = fs.statSync(archivo).size;
      check(`${p}: ${i.src} pesa menos de 250 KB`, peso < 250 * 1024, `${Math.round(peso / 1024)} KB`);
    }
    const sinLazy = capturas.filter((i) => i.loading !== 'lazy');
    if (p === 'index.html') {
      const hero = index.slice(index.indexOf('<section class="hero">'), index.indexOf('<div class="stats-band">'));
      check('index.html: solo la captura del hero carga sin loading="lazy"',
        sinLazy.length === 1 && hero.includes(sinLazy[0].tag), sinLazy.map((i) => i.src).join(', '));
    } else {
      check(`${p}: todas las capturas llevan loading="lazy"`, sinLazy.length === 0, sinLazy.map((i) => i.src).join(', '));
    }
  }
  check('index.html muestra las dos capturas de celular',
    index.includes('app-aprobacion-celular.webp') && index.includes('app-plan-celular.webp'));
  check('convocatoria: captura del plan y del portal de aprobación',
    html['convocatoria/index.html'].includes('app-plan-lista.webp') && html['convocatoria/index.html'].includes('app-aprobacion-celular.webp'));

  // Hostinger guarda CSS y JS una semana: lo que cambió sube de versión.
  const version = (src, archivo) => Number(atributo(src, new RegExp(`${archivo.replace('.', '\\.')}\\?v=(\\d+)"`)) || 0);
  for (const [archivo, minimo] of [['css/main.css', 9], ['css/responsive.css', 9], ['js/cookie-consent.js', 3]]) {
    const vi = version(index, archivo);
    const vc = version(html['convocatoria/index.html'], archivo);
    check(`${archivo}: index.html y convocatoria cargan la misma versión nueva (?v=${minimo} o más)`, vi >= minimo && vi === vc, `index ${vi}, convocatoria ${vc}`);
  }
  check('js/main.js: index.html carga ?v=6 o más', version(index, 'js/main.js') >= 6);
}
process.exit(fail);
