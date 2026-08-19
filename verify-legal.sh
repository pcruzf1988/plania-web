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

exit $fail
