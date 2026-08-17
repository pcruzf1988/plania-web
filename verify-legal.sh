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

exit $fail
