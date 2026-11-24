// Cloudflare Turnstile en los formularios publicos (arrepentimiento,
// convocatoria y copyright). Verificacion: node verify-turnstile.js
//
// La pagina pone un <div id="plania-turnstile" hidden> arriba del boton de
// enviar y carga este script antes que el codigo de su formulario. El
// formulario usa window.PlaniaTurnstile:
//   isActive()  true si en esta pagina hay un widget (hay clave y contenedor).
//   getToken()  el token vigente, o '' si Cloudflare todavia no lo entrego.
//   reset()     descarta el token y pide uno nuevo (un token sirve una sola vez).
// El token viaja al proxy en el campo `turnstileToken` del JSON.
(function () {
  // Clave PUBLICA del sitio ("Site Key"), del panel de Cloudflare Turnstile.
  // Es el unico lugar donde va. La clave secreta vive solo en el proxy y nunca
  // se escribe en este repo.
  // Mientras sea la cadena vacia este script no hace nada: no carga nada de
  // Cloudflare, no dibuja el widget y los formularios envian como siempre.
  var TURNSTILE_SITE_KEY = '';

  var API_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

  var contenedor = TURNSTILE_SITE_KEY ? document.getElementById('plania-turnstile') : null;
  var activo = !!contenedor;
  var token = '';
  var widgetId = null;

  function descartar() { token = ''; }

  window.PlaniaTurnstile = {
    isActive: function () { return activo; },
    getToken: function () { return token; },
    reset: function () {
      token = '';
      if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId);
    },
  };

  if (!activo) return;

  contenedor.hidden = false;

  var script = document.createElement('script');
  script.src = API_URL;
  script.async = true;
  script.defer = true;
  script.onload = function () {
    if (!window.turnstile || widgetId !== null) return;
    widgetId = window.turnstile.render(contenedor, {
      sitekey: TURNSTILE_SITE_KEY,
      language: 'es',
      // 'flexible' ocupa el ancho del contenedor: en celulares angostos el
      // tamano normal (300 px fijos) se salia de la tarjeta del formulario.
      size: 'flexible',
      // El sitio es claro; si una pagina declara data-theme="dark", la sigue.
      theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
      callback: function (t) { token = t || ''; },
      'expired-callback': descartar,
      'timeout-callback': descartar,
      'error-callback': descartar,
    });
  };
  document.head.appendChild(script);
})();
