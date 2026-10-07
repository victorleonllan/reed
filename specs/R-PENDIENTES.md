# Pendientes — Reed v2

Lo que la cadena de noche no puede cerrar sola. Las `V#` se hacen con la app corriendo
(`npm run build && npm run start`, o en el deploy del fork) y con las claves puestas.

## Verificaciones en ejecución

- **V1** (R-005) — `/` muestra la portada de Next, `/app` carga la app, `/app/assets/*` 200.
- **V2** (R-012) — la landing en navegador, móvil (375 px) y escritorio; la sección de modos con
  la transición del junco.
- **V3** (R-015) — conversación por voz real con un libro del almacén (claves de ElevenLabs).
- **V4** (R-017) — `/opengraph-image` devuelve imagen; una URL inexistente muestra el 404 de Reed.
- **V5** (R-019) — pago completo en modo prueba de Stripe (`4242 4242 4242 4242`), plan Pro en
  el perfil, y cancelación desde el portal.
- **V6** (R-004, R-008) — los cinco personajes sin caja, la transición entre modos y las «z» del
  modo dormido, en claro y oscuro.
- **V7** (R-016) — correo de bienvenida al crear cuenta y de Pro al pagar (con Resend y webhook
  de Clerk registrados).

## Decisiones abiertas de Victor

- **Precio y límites de Reed Pro** (R-001): quedó MXN 99/mes y 990/año, con 20 000 caracteres
  de voz al día. Revisar contra el costo real de ElevenLabs: en el plan Creator, ~131 000
  caracteres al mes cuestan USD 22, así que un Pro que use su tope todos los días cuesta más de
  lo que paga. Ajustar en `src/config.ts`.
- **Correo de soporte y remitentes** (`src/config.ts`): `hola@reed.app` es un placeholder.
- **Términos y privacidad** (R-017): son un borrador; revisión legal antes de cobrar en serio.
- **Dominio** del fork y `NEXT_PUBLIC_SITE_URL`.

## Mejoras detectadas, sin spec

- Reabrir la bienvenida de los modos desde el perfil (R-020).
- Slugs de los artículos en el sitemap (R-018).
