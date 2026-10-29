// Formulario de la convocatoria Pro (planiat.com/convocatoria).
//
// Al cargar consulta el estado de la convocatoria en el proxy y muestra el
// formulario o el mensaje de pausa/finalizada. Si esa consulta falla (proxy
// caido, sin red), muestra el formulario igual: el POST decide. Al enviar
// valida en el cliente con los mismos rangos, listas y mensajes que
// `proxy-plania/convocatoria.js` (copiados a mano: este repo no comparte
// codigo con el proxy) y manda el JSON a /api/convocatoria/postular.
(function () {
  var PROXY_URL = 'https://plania-proxy-production.up.railway.app';

  var TEXTOS = {
    pausa: 'La primera etapa se completó. La segunda abre el jueves 12 de noviembre. Seguinos en @plan.ia.t para enterarte.',
    finalizada: 'La inscripción cerró. Si querés probar PlanIA, creá tu cuenta gratis en app.planiat.com.',
    errorRed: 'No pudimos enviar tu postulación. Probá de nuevo en un minuto.',
    consentimiento: 'Necesitamos tu consentimiento para guardar tus datos y contactarte.',
    correoInvalido: 'Revisá el correo: no parece válido.',
    igFbMayor: 'Los clientes con Instagram y Facebook no pueden ser más que los clientes activos.',
  };
  // Dia del lunes de resultados por etapa (spec: "lunes 9" en la 1, "lunes 16" en la 2).
  var DIA_RESULTADOS = { 1: '9', 2: '16' };
  function textoConfirmacion(etapa) {
    var dia = DIA_RESULTADOS[etapa] || DIA_RESULTADOS[1];
    return 'Recibimos tu postulación. Los resultados de esta etapa salen el lunes ' + dia +
      ' de noviembre y te escribimos por el medio que elegiste.';
  }

  // Copia de proxy-plania/convocatoria.js (Tarea A2 del plan).
  var CAMPOS = [
    'nombre', 'correo', 'whatsapp', 'instagram', 'pais', 'contactoPreferido', 'rol', 'rolOtro',
    'antiguedad', 'tendencia', 'clientesActivos', 'clientesIgFb', 'redes', 'planificacion', 'planificacionOtro',
    'informes', 'horasMes', 'herramientasQuePaga', 'cobro', 'cobroOtro', 'tarifa', 'disponibilidad',
    'expectativa', 'comoSeEntero', 'aceptoContacto',
  ];
  var LISTAS = {
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
  var ETIQUETAS = {
    nombre: 'nombre y apellido',
    correo: 'correo electrónico',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    pais: 'país',
    contactoPreferido: 'medio de contacto',
    rol: 'cómo trabajás hoy',
    rolOtro: 'cómo trabajás hoy (otro)',
    antiguedad: 'antigüedad',
    tendencia: 'cartera de clientes',
    clientesActivos: 'clientes activos',
    clientesIgFb: 'clientes con Instagram y Facebook',
    redes: 'redes que gestionás',
    planificacion: 'cómo armás los planes',
    planificacionOtro: 'cómo armás los planes (otra)',
    informes: 'informes de métricas',
    horasMes: 'horas por mes',
    herramientasQuePaga: 'herramientas que pagás',
    cobro: 'cómo cobrás',
    cobroOtro: 'cómo cobrás (otro)',
    tarifa: 'cuánto cobrás',
    disponibilidad: 'disponibilidad',
    expectativa: 'qué esperás resolver',
    comoSeEntero: 'cómo te enteraste',
    aceptoContacto: 'consentimiento',
  };
  var OPCIONALES = { herramientasQuePaga: true, tarifa: true, comoSeEntero: true };
  var LARGOS = { nombre: [2, 80], whatsapp: [8, 20], instagram: [1, 40], herramientasQuePaga: [0, 300], expectativa: [20, 600] };
  var ENTEROS = { clientesActivos: true, clientesIgFb: true };
  // Texto libre que solo existe cuando su select vale "otro" (mismo criterio que el backend).
  var OTROS = { rolOtro: ['rol', 'otro'], planificacionOtro: ['planificacion', 'otra'], cobroOtro: ['cobro', 'otro'] };
  var CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  var estado = document.getElementById('conv-estado');
  var form = document.getElementById('conv-form');
  var btn = document.getElementById('conv-submit');
  var msgBox = document.getElementById('conv-msg');
  var okBox = document.getElementById('conv-ok');

  function faltante(campo) { return 'Completá el campo "' + ETIQUETAS[campo] + '".'; }
  function revisar(campo) { return 'Revisá el campo "' + ETIQUETAS[campo] + '".'; }
  function corto(campo, min) { return 'Revisá el campo "' + ETIQUETAS[campo] + '": necesita al menos ' + min + ' caracteres.'; }

  function mostrar(kind, text) {
    msgBox.className = 'conv-msg show ' + kind;
    msgBox.textContent = text;
  }

  function mostrarFormulario() {
    estado.classList.remove('show');
    form.style.display = '';
  }

  function mostrarCerrada(mensaje) {
    estado.textContent = TEXTOS[mensaje];
    estado.classList.add('show');
    form.style.display = 'none';
  }

  // Lee los 22 campos tal como los va a mandar: textos recortados, correo en
  // minusculas, Instagram sin @, WhatsApp solo digitos y el + inicial.
  function leer() {
    var datos = {};
    CAMPOS.forEach(function (campo) {
      if (campo === 'redes') {
        datos.redes = Array.prototype.map.call(
          form.querySelectorAll('input[name="redes"]:checked'),
          function (el) { return el.value; }
        );
        return;
      }
      if (campo === 'aceptoContacto') {
        datos.aceptoContacto = form.querySelector('input[name="aceptoContacto"]').checked;
        return;
      }
      var el = form.querySelector('[name="' + campo + '"]');
      var valor = (el.value || '').trim();
      if (campo === 'correo') valor = valor.toLowerCase().replace(/\s+/g, '');
      if (campo === 'instagram') valor = valor.replace(/^@+/, '');
      if (campo === 'whatsapp') valor = (valor.charAt(0) === '+' ? '+' : '') + valor.replace(/\D/g, '');
      datos[campo] = valor;
    });
    return datos;
  }

  // Devuelve { ok: true, datos } o { ok: false, error, campo }, con el primer
  // error en el orden de CAMPOS, igual que el backend.
  function validar() {
    var datos = leer();
    for (var i = 0; i < CAMPOS.length; i++) {
      var campo = CAMPOS[i];
      var valor = datos[campo];

      if (campo === 'aceptoContacto') {
        if (valor !== true) return { ok: false, error: TEXTOS.consentimiento, campo: campo };
        continue;
      }
      if (campo === 'redes') {
        if (!valor.length) return { ok: false, error: faltante(campo), campo: campo };
        var vistas = {};
        for (var j = 0; j < valor.length; j++) {
          if (LISTAS.redes.indexOf(valor[j]) === -1 || vistas[valor[j]]) return { ok: false, error: revisar(campo), campo: campo };
          vistas[valor[j]] = true;
        }
        continue;
      }
      if (OTROS[campo]) {
        if (datos[OTROS[campo][0]] !== OTROS[campo][1]) { datos[campo] = ''; continue; }
        if (valor === '') return { ok: false, error: faltante(campo), campo: campo };
        if (valor.length > 120) datos[campo] = valor.slice(0, 120);
        continue;
      }
      if (valor === '') {
        if (OPCIONALES[campo]) continue;
        return { ok: false, error: faltante(campo), campo: campo };
      }
      if (campo === 'correo') {
        if (!CORREO.test(valor)) return { ok: false, error: TEXTOS.correoInvalido, campo: campo };
        continue;
      }
      if (ENTEROS[campo]) {
        if (!/^\d+$/.test(valor)) return { ok: false, error: revisar(campo), campo: campo };
        datos[campo] = Number(valor);
        if (datos[campo] > 50) return { ok: false, error: revisar(campo), campo: campo };
        if (campo === 'clientesIgFb' && datos.clientesIgFb > datos.clientesActivos) {
          return { ok: false, error: TEXTOS.igFbMayor, campo: campo };
        }
        continue;
      }
      if (LISTAS[campo]) {
        if (LISTAS[campo].indexOf(valor) === -1) return { ok: false, error: revisar(campo), campo: campo };
        continue;
      }
      if (LARGOS[campo]) {
        if (valor.length > LARGOS[campo][1]) datos[campo] = valor = valor.slice(0, LARGOS[campo][1]);
        if (valor.length < LARGOS[campo][0]) return { ok: false, error: corto(campo, LARGOS[campo][0]), campo: campo };
      }
    }
    return { ok: true, datos: datos };
  }

  function enfocar(campo) {
    var el = form.querySelector('[name="' + campo + '"]');
    if (el && typeof el.focus === 'function') el.focus();
  }

  function habilitar() {
    btn.disabled = false;
    btn.textContent = 'Postularme';
  }

  // Muestra el texto libre solo cuando el select que lo acompaña vale "otro".
  Object.keys(OTROS).forEach(function (campo) {
    var select = form.querySelector('[name="' + OTROS[campo][0] + '"]');
    var wrap = document.getElementById('conv-' + campo + '-wrap');
    function sincronizar() { wrap.hidden = select.value !== OTROS[campo][1]; }
    select.addEventListener('change', sincronizar);
    sincronizar();
  });

  function cargarEstado() {
    fetch(PROXY_URL + '/api/convocatoria/estado')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && (data.mensaje === 'pausa' || data.mensaje === 'finalizada')) mostrarCerrada(data.mensaje);
        else mostrarFormulario();
      })
      .catch(function () {
        // Sin estado no se bloquea a nadie: el POST decide.
        mostrarFormulario();
      });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var r = validar();
    if (!r.ok) {
      mostrar('err', r.error);
      enfocar(r.campo);
      return;
    }
    var payload = r.datos;
    payload.sitio = form.querySelector('input[name="sitio"]').value;

    btn.disabled = true;
    btn.textContent = 'Enviando…';
    msgBox.className = 'conv-msg';

    fetch(PROXY_URL + '/api/convocatoria/postular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { status: res.status, data: data };
        });
      })
      .then(function (r) {
        var data = r.data || {};
        if (r.status === 200) {
          form.style.display = 'none';
          okBox.textContent = textoConfirmacion(data.etapa);
          okBox.classList.add('show');
          okBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        if (r.status === 409 && data.error === 'CERRADA' && data.estado && TEXTOS[data.estado.mensaje]) {
          mostrarCerrada(data.estado.mensaje);
          habilitar();
          return;
        }
        if (r.status === 400 && data.error) {
          mostrar('err', data.error);
          habilitar();
          return;
        }
        mostrar('err', TEXTOS.errorRed);
        habilitar();
      })
      .catch(function () {
        mostrar('err', TEXTOS.errorRed);
        habilitar();
      });
  });

  cargarEstado();
})();
