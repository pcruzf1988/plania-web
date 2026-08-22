// ── CONSENTIMIENTO DE COOKIES ───────────────────────────────────────────────
// Google Analytics no puede cargarse antes del consentimiento: las cookies _ga
// y _ga_<ID> no son tecnicas esenciales. Antes de esto, GA se cargaba de forma
// incondicional en las cuatro paginas mientras la politica de privacidad
// declaraba que no habia tracking.
//
// Rechazar tiene que costar lo mismo que aceptar. Un banner con "Aceptar"
// destacado y el rechazo escondido detras de un submenu no es consentimiento
// libre bajo el GDPR, y las autoridades de control ya sancionaron ese patron.
// Por eso los dos botones son hermanos, del mismo tamano y peso visual.

(function () {
  'use strict';

  var KEY    = 'plania_cookie_consent';
  var GA_ID  = 'G-SEVF5SCQNG';
  var DOMAIN = '.planiat.com';
  // 6 meses. Un consentimiento eterno no es consentimiento.
  var MAX_AGE = 15768000;

  // Conjunto de datos "PlanIA — Web". El mismo ID corre en app.planiat.com,
  // que es donde ocurre el alta: con un pixel por dominio se cortaria la
  // atribucion entre el anuncio y el registro.
  //
  // El <noscript><img src=".../tr?id=..."> que Meta entrega junto al snippet
  // NO esta puesto a proposito: es HTML estatico, se dispara al cargar la
  // pagina y no hay forma de condicionarlo al consentimiento.
  var META_PIXEL_ID = '2498486493894197';

  // La decision se replica en una cookie sobre `.planiat.com` porque
  // localStorage esta aislado por origen: lo que se contesta aca no se ve
  // desde app.planiat.com, que es donde ocurre el registro. Con el domain
  // padre, las dos puntas comparten la misma respuesta y no se pregunta dos
  // veces. localStorage se mantiene para no perder las decisiones que los
  // visitantes ya tomaron antes de que existiera la cookie.

  function readCookie() {
    var jar;
    try { jar = document.cookie; } catch (e) { return null; }
    if (typeof jar !== 'string' || !jar) return null;

    var parts = jar.split(';');
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      var eq = part.indexOf('=');
      if (eq < 0 || part.slice(0, eq) !== KEY) continue;
      var value = part.slice(eq + 1);
      return (value === 'accepted' || value === 'rejected') ? value : null;
    }
    return null;
  }

  function writeCookie(value) {
    var host = location.hostname;
    var isLocal = host === 'localhost' || host === '127.0.0.1';
    var isOwn = host === 'planiat.com' || host.indexOf('.planiat.com', host.length - 12) !== -1;

    var cookie = KEY + '=' + value + '; path=/; max-age=' + MAX_AGE + '; SameSite=Lax';
    if (isOwn) cookie += '; domain=' + DOMAIN;
    // Una cookie Secure no se guarda sobre http, y en local no hay https.
    if (!isLocal) cookie += '; Secure';

    try { document.cookie = cookie; } catch (e) { /* no-op */ }
  }

  function get() {
    var fromCookie = readCookie();
    if (fromCookie) return fromCookie;

    var stored = null;
    try { stored = localStorage.getItem(KEY); } catch (e) { /* no-op */ }

    // Visitante que ya habia decidido cuando esto solo usaba localStorage:
    // se respeta su respuesta y se replica a la cookie para que la app la vea.
    if (stored === 'accepted' || stored === 'rejected') {
      writeCookie(stored);
      return stored;
    }
    return null;
  }

  function set(value) {
    // En modo privado localStorage puede tirar. Si no podemos recordar la
    // decision, preferimos volver a preguntar antes que asumir que acepto.
    try { localStorage.setItem(KEY, value); } catch (e) { /* no-op */ }
    writeCookie(value);
  }

  function loadAnalytics() {
    if (document.getElementById('ga-script')) return;

    var s = document.createElement('script');
    s.id = 'ga-script';
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  }

  function loadMetaPixel() {
    if (!META_PIXEL_ID || window.fbq) return;

    /* Snippet oficial del pixel. La unica diferencia con el que entrega Meta
       es que corre cuando hay consentimiento, no al cargar la pagina. */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  function loadMarketing() {
    loadAnalytics();
    loadMetaPixel();
  }

  // Los CTA llevan a app.planiat.com, otro origen: el registro se mide alla.
  // Este evento es el puente — mientras las altas son pocas, le da a Meta una
  // senal intermedia con volumen suficiente para optimizar.
  function trackCtaClicks() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest && e.target.closest('a[href*="app.planiat.com"]');
      if (!link || typeof window.fbq !== 'function') return;
      try {
        window.fbq('trackCustom', 'ClickEmpezarGratis', {
          origen: link.textContent.trim().slice(0, 40)
        });
      } catch (err) { /* nunca frenar la navegacion por un evento */ }
    });
  }

  function dismiss(banner, value) {
    set(value);
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    if (value === 'accepted') loadMarketing();
  }

  function render() {
    var banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Consentimiento de cookies');
    banner.innerHTML =
      '<p>Usamos cookies técnicas para que el sitio funcione y, si nos dejás, ' +
      'cookies analíticas para entender qué páginas se visitan. ' +
      '<a href="cookies.html">Más detalle</a>.</p>' +
      '<div class="cookie-banner-actions">' +
        '<button type="button" data-consent="rejected">Solo las esenciales</button>' +
        '<button type="button" data-consent="accepted">Aceptar todas</button>' +
      '</div>';

    banner.addEventListener('click', function (e) {
      var value = e.target.getAttribute('data-consent');
      if (value) dismiss(banner, value);
    });

    document.body.appendChild(banner);
  }

  // Expuesto para que cookies.html pueda mostrar la decision actual y
  // permitir cambiarla sin tener que duplicar la logica de storage.
  window.planiaConsent = {
    get: get,
    // cookies.html cambia la decision desde ahi. Tiene que pasar por aca y no
    // escribir localStorage a mano, o la cookie compartida con app.planiat.com
    // queda desincronizada y la app sigue con la decision vieja.
    set: set,
    reset: function () {
      try { localStorage.removeItem(KEY); } catch (e) { /* no-op */ }
      // Sin esto la cookie sobrevive y get() devuelve la decision vieja: el
      // boton de "cambiar mi decision" no haria nada.
      var host = location.hostname;
      var isOwn = host === 'planiat.com' || host.indexOf('.planiat.com', host.length - 12) !== -1;
      var expira = KEY + '=; path=/; max-age=0';
      try {
        document.cookie = expira;
        if (isOwn) document.cookie = expira + '; domain=' + DOMAIN;
      } catch (e) { /* no-op */ }
    }
  };

  trackCtaClicks();

  var stored = get();
  if (stored === 'accepted') {
    loadMarketing();
  } else if (stored !== 'rejected') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', render);
    } else {
      render();
    }
  }
})();
