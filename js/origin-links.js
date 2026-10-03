// ── ORIGEN DE LA VISITA EN LOS LINKS A LA APP ────────────────────────────────
// El registro ocurre en app.planiat.com, otro origen: la UTM con la que se
// llego a planiat.com y el sitio que trajo a la persona se pierden en el salto.
// Esto los pone en cada link a la app, para que la app los guarde una sola
// vez al crear la cuenta (planiat-web/public/js/origin.js).
//
// Sin cookies ni localStorage, a proposito: una cookie de marketing pediria
// consentimiento previo. Esto solo reescribe links de la pagina.
//
// Las UTM viajan tal cual: la app es la unica que normaliza. `ref` es el
// dominio externo del que llego la visita, o `direct`.
//
// Si algo de esto falla, los links quedan como estaban y nada se rompe. El
// tracking de clics de cookie-consent.js sigue andando: busca
// href*="app.planiat.com", y eso no cambia.

(function () {
  'use strict';

  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var LANDING_HOSTS = ['planiat.com', 'www.planiat.com'];

  // https://app.planiat.com y nada mas: ni app.planiat.com.otro.net, ni rutas
  // relativas, ni anclas.
  var APP_LINK = /^https:\/\/app\.planiat\.com(?=[/?#]|$)/i;

  /** El dominio del referrer si es externo a la landing, o ''. */
  function externalHost(referrer) {
    var host = '';
    try { host = referrer ? new URL(referrer).hostname : ''; } catch (e) { host = ''; }
    return LANDING_HOSTS.indexOf(host) === -1 ? host : '';
  }

  /**
   * Los parametros que se agregan a cada link a la app, en orden: las UTM de
   * esta URL tal cual (con una clave repetida, la primera) y `ref`.
   */
  function buildAppLinkParams(search, referrer) {
    var params = new URLSearchParams(search || '');
    var out = [];
    UTM_KEYS.forEach(function (key) {
      var value = params.get(key);
      if (value !== null) out.push([key, value]);
    });
    out.push(['ref', externalHost(referrer) || 'direct']);
    return out;
  }

  // Conserva el path, la query que ya tenga el link y el hash.
  function decorate(href, pairs) {
    var url = new URL(href);
    pairs.forEach(function (pair) { url.searchParams.set(pair[0], pair[1]); });
    return url.toString();
  }

  function decorateAll() {
    var pairs = buildAppLinkParams(window.location.search, document.referrer);
    var links = document.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      if (!APP_LINK.test(href)) continue;
      // Un link que no se puede reescribir queda como estaba; los demas siguen.
      try { links[i].setAttribute('href', decorate(href, pairs)); } catch (e) { /* no-op */ }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', decorateAll);
  } else {
    decorateAll();
  }
})();
