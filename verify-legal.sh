#!/usr/bin/env bash
# Aserciones de los criterios de aceptación del spec legal.
# Uso: bash verify-legal.sh   — sale 1 si alguna falla.
set -u
fail=0
assert_absent() {
  if rg -qi "$1" ./*.html; then
    echo "FALLA: sigue presente → $1"; fail=1
  else
    echo "OK: ausente → $1"
  fi
}
assert_present() {
  if rg -qi "$1" "$2"; then
    echo "OK: presente en $2 → $1"
  else
    echo "FALLA: falta en $2 → $1"; fail=1
  fi
}

assert_absent "no recopila datos de uso"
assert_absent "ningún dato de tus clientes se almacena"
assert_absent "Application Support/PlanIA"
assert_absent "APPDATA"
assert_absent "intencional y permanente"
assert_absent "conexiones externas son tres"
assert_absent "No utiliza cookies de rastreo"

# El resumen del encabezado promete cinco servicios externos: la seccion de
# detalle tiene que documentarlos a los cinco o el documento se contradice.
for s in Anthropic Meta Firebase MercadoPago Paddle; do
  assert_present "$s" privacidad.html
done

# ── Task 4: terminos.html ───────────────────────────────────────────────────
assert_present "mantener indemne" terminos.html
assert_present "si los hubiera" terminos.html
assert_present "puede no ser único" terminos.html
assert_present "Merchant of Record" terminos.html
assert_present "14 días" terminos.html
assert_present "país de residencia" terminos.html
assert_present "tercera denuncia fundada" terminos.html
assert_absent "el contenido generado con IA dentro de PlanIA es tuyo"

# PlanIA nunca ofrece indemnidad de propiedad intelectual a sus usuarios
# (decision D3 del spec): no puede financiar una defensa. Si alguna vez
# aparece la promesa inversa, esto tiene que gritar.
assert_present "no</strong> te ofrece indemnidad" terminos.html

# Dato fiscal obligatorio (Ley 24.240 art. 4 y Res. 104/2005). El marcador
# hace fallar la verificacion a proposito: sin CUIT real no se publica.
if rg -q "COMPLETAR-CUIT" terminos.html; then
  echo "FALLA: falta cargar el CUIT real en terminos.html"; fail=1
else
  echo "OK: CUIT cargado"
fi

# ── Task 5: privacidad.html al estandar GDPR ────────────────────────────────
assert_present "encargado del tratamiento" privacidad.html
assert_present "base legal" privacidad.html
assert_present "AAIP" privacidad.html
assert_present "AEPD" privacidad.html
assert_present "conservación" privacidad.html
assert_present "oposición" privacidad.html
assert_present "limitación del tratamiento" privacidad.html
assert_present "transferencias internacionales" privacidad.html
assert_present "dpa.html" privacidad.html
assert_present "cookies.html" privacidad.html

# ── Task 6: copyright.html ──────────────────────────────────────────────────
assert_present "buena fe" copyright.html
assert_present "contranotificación" copyright.html
assert_present "infractores reiterados" copyright.html
assert_present "api/copyright-claim" copyright.html
assert_present "512" copyright.html
assert_present "tercera denuncia fundada" copyright.html

# No se puede afirmar que hay agente DMCA registrado hasta que el tramite ante
# la US Copyright Office este hecho. Seria la misma clase de afirmacion falsa
# que vinimos a limpiar.
if rg -qi "agente designado|agente registrado|designated agent" copyright.html; then
  echo "FALLA: copyright.html afirma tener agente DMCA sin que el tramite este hecho"; fail=1
else
  echo "OK: no se afirma un agente DMCA inexistente"
fi

# ── Task 7: cookies.html y banner de consentimiento ─────────────────────────
assert_present "_ga" cookies.html
assert_present "esenciales" cookies.html
assert_present "cookie-consent.js" cookies.html

# GA no puede cargarse de forma incondicional en ninguna pagina: las cookies
# analiticas necesitan consentimiento previo. El unico lugar donde puede
# aparecer la URL de googletagmanager es dentro del modulo de consentimiento,
# que la inyecta solo despues del "aceptar".
if rg -q "googletagmanager" ./*.html; then
  echo "FALLA: alguna pagina carga GA sin consentimiento previo"; fail=1
else
  echo "OK: ninguna pagina carga GA de forma incondicional"
fi

for page in index.html terminos.html privacidad.html arrepentimiento.html copyright.html cookies.html; do
  assert_present "cookie-consent.js" "$page"
done

# Rechazar tiene que costar lo mismo que aceptar (consentimiento libre).
if rg -q 'data-consent="rejected"' js/cookie-consent.js && rg -q 'data-consent="accepted"' js/cookie-consent.js; then
  echo "OK: el banner ofrece aceptar y rechazar"
else
  echo "FALLA: el banner no ofrece ambas opciones"; fail=1
fi

# ── Task 8: dpa.html ────────────────────────────────────────────────────────
for s in Anthropic Firebase Meta Railway MercadoPago Paddle; do
  assert_present "$s" dpa.html
done
assert_present "72 horas" dpa.html
assert_present "subencargado" dpa.html
assert_present "art. 28" dpa.html
assert_present "cookie-consent.js" dpa.html

# Compromiso explicito que los clientes preguntan y que hay que poder sostener.
assert_present "no los usamos para entrenar modelos" dpa.html

# ── Pixel de Meta ───────────────────────────────────────────────────────────
# El pixel se carga en planiat.com y en app.planiat.com. Estas afirmaciones
# eran ciertas antes y dejaron de serlo: si alguna vuelve, el documento miente
# sobre lo que el sitio hace con los datos de sus visitantes.
assert_absent "No usamos pixeles publicitarios"
assert_absent "no hay analytics ni telemetría; en el sitio público"
assert_absent "ni compartimos datos con anunciantes"

# La contracara: el pixel tiene que estar documentado con nombre y duracion.
assert_present "_fbp" cookies.html
assert_present "_fbc" cookies.html
assert_present "plania_cookie_consent" cookies.html
assert_present "píxel de Meta" privacidad.html
assert_present "de marketing" privacidad.html

# Meta es CORRESPONSABLE del tratamiento del pixel, no encargado: decide por su
# cuenta que hace con esos datos. Confundirlo cambia el regimen legal aplicable.
assert_present "corresponsable" privacidad.html

# El pixel no puede cargarse antes del consentimiento en ninguno de los dos
# repos. Si aparece un snippet suelto fuera del gate, esto tiene que gritar.
if rg -q "connect.facebook.net" ./*.html; then
  echo "FALLA: el pixel esta incrustado en el HTML, fuera del gate de consentimiento"; fail=1
else
  echo "OK: el pixel solo se carga desde cookie-consent.js"
fi

# El <noscript><img src=".../tr?id=..."> que Meta entrega junto al snippet se
# dispara al cargar la pagina, sin pasar por ningun gate. Es HTML estatico: no
# hay forma de condicionarlo al consentimiento. Por eso se omite a proposito, y
# esto existe para que no lo pegue nadie "porque venia en el codigo de Meta".
if rg -q "facebook.com/tr" ./*.html; then
  echo "FALLA: el pixel <noscript> se dispara sin consentimiento"; fail=1
else
  echo "OK: sin pixel <noscript>"
fi

exit $fail
