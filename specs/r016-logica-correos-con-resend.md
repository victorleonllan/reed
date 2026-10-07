# Spec R-016 — Correos con Resend: bienvenida y Reed Pro

> Estado: aplicado (07-oct-2026). Verificado: `tsc` (raíz y frontend) y `lint` verdes; plantillas
> renderizadas con `tsx` (html + text, nombre escapado) y `sendEmail` sin clave registra «email omitido».
> Webhook de Clerk con firma real y envío con Resend quedan para la verificación en ejecución.
> Capa: LOGICA. `src/lib/resend.ts` (nuevo), `src/lib/emails.ts` (nuevo),
> `src/app/api/webhooks/clerk/route.ts` (nuevo), `src/lib/stripe.ts` (solo `onProActivated`).
> Depende de: R-001 (`resend`, `config.resend`), R-010 (`onProActivated` en `src/lib/stripe.ts`).

> **En una frase:** quien crea su cuenta recibe un correo de bienvenida de Reed, y quien paga
> Pro recibe uno que le confirma qué cambió; sin clave de Resend, no se manda nada y nada falla.

## Motivo

Un producto con usuarios necesita al menos esos dos correos: el primero devuelve a quien se
registró y no volvió; el segundo confirma un pago (el recibo formal lo manda Stripe). El patrón
viene de `~/projects/shipearapido/libs/resend.js` y `libs/emailTemplates.js` (**solo lectura**).

## Decisión

### `src/lib/resend.ts`

`sendEmail({ to, subject, html, text, replyTo? })`: con `RESEND_API_KEY` manda con
`config.resend.fromAdmin`; sin clave, `console.info("email omitido: …")` y retorna. Nunca lanza
por falta de configuración; un error de Resend se registra y no rompe el webhook que lo llamó.

### `src/lib/emails.ts`

Plantillas como funciones que devuelven `{ subject, html, text }`, HTML simple y en línea (tabla
de 560 px, fondo papel `#f3ecdf`, títulos en Georgia como respaldo de Literata, botón color
`#2f5d46`). Voz de Reed: cálida, breve, de tú, sin culpa.

- `welcomeEmail({ name })`: asunto «Ya estoy listo para leer contigo». Tres líneas: qué hace
  Reed, los cinco modos en una frase cada uno, y botón «Abrir mi biblioteca» →
  `${config.siteUrl}/app`. Firma «— Reed».
- `proActivatedEmail({ name })`: asunto «Reed Pro está activo». Qué cambió (los límites de
  `config.plans.pro` en palabras), dónde se cancela («desde tu perfil, cuando quieras») y botón
  a la app.

### Bienvenida: webhook de Clerk

`POST /api/webhooks/clerk`: verifica con `verifyWebhook` de `@clerk/nextjs/webhooks` (usa
`CLERK_WEBHOOK_SIGNING_SECRET`; sin secreto → 503). En `user.created`, toma el email principal y
el nombre, y manda `welcomeEmail`. Otros eventos → 200 sin acción. Leer la doc del paquete
instalado antes de escribir.

### Pro: `onProActivated`

Completa la función que dejó R-010 en `src/lib/stripe.ts`: busca el usuario en Clerk
(`clerkClient().users.getUser`) y manda `proActivatedEmail`. No tocar nada más de ese archivo ni
el webhook de Stripe.

## Criterios de aceptación

1. Sin `RESEND_API_KEY`, el webhook de Clerk responde 200 y registra «email omitido».
2. Con firma inválida, el webhook de Clerk responde 400 (o lo que devuelva `verifyWebhook` al
   fallar, mapeado a 400).
3. Las dos plantillas generan `html` y `text` (texto plano para clientes sin HTML).
4. `npx tsc --noEmit && npm run lint` verde.

## Fuera de alcance

Registrar el webhook en Clerk y verificar el dominio en Resend (lo documenta R-022). Correos de
marketing o de recordatorio.
