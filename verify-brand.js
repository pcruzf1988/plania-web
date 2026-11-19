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
process.exit(fail);
