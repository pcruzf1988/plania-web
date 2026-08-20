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

  var KEY   = 'plania_cookie_consent';
  var GA_ID = 'G-SEVF5SCQNG';

  function get() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function set(value) {
    // En modo privado localStorage puede tirar. Si no podemos recordar la
    // decision, preferimos volver a preguntar antes que asumir que acepto.
    try { localStorage.setItem(KEY, value); } catch (e) { /* no-op */ }
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

  function dismiss(banner, value) {
    set(value);
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    if (value === 'accepted') loadAnalytics();
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
    reset: function () {
      try { localStorage.removeItem(KEY); } catch (e) { /* no-op */ }
    }
  };

  var stored = get();
  if (stored === 'accepted') {
    loadAnalytics();
  } else if (stored !== 'rejected') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', render);
    } else {
      render();
    }
  }
})();
