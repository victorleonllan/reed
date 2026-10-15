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
- **V8** (R-020) — bienvenida en un navegador limpio: aparece la primera vez y no la segunda;
  elegir un modo al final lo deja en el botón de Reed; Escape y «Saltar» la cierran; móvil y escritorio.

- **V9** (R-027) — escuchar un párrafo, recargar y volver a escucharlo: sin segundo
  `POST /api/tts`; el uso de ElevenLabs (`/v1/usage/character-stats`) no sube.
- **V10** (R-028) — planificador en móvil y escritorio: nada suena ni se genera antes de
  «Empezar»; con 5 min la lectura para sola al final del tramo; comparar los minutos reales con
  el estimado (`CHARS_PER_MINUTE = 890`) y ajustar la constante si se desvía más de 15 %.
- **V11** (R-031) — `npm run audio:generate -- --catalog --dry-run`: anotar párrafos,
  caracteres y créditos de ElevenLabs que se evitarían.
- **V12** (R-031, R-032) — `npm run audio:generate -- --catalog --limit 5`: los 5 mp3 aparecen
  en el bucket R2 y suenan bien en español.
- **V13** (R-030) — en el lector, un párrafo generado responde `X-Reed-Audio: library` y el
  uso de ElevenLabs no sube.

## Decisiones abiertas de Victor

- **Precio y límites de Reed Pro** (R-001): quedó MXN 99/mes y 990/año, con 20 000 caracteres
  de voz al día. Revisar contra el costo real de ElevenLabs: en el plan Creator, ~131 000
  caracteres al mes cuestan USD 22, así que un Pro que use su tope todos los días cuesta más de
  lo que paga. Ajustar en `src/config.ts`.
- **Correo de soporte y remitentes** (`src/config.ts`): `hola@reed.app` es un placeholder.
- **Términos y privacidad** (R-017): son un borrador; revisión legal antes de cobrar en serio.
- **Dominio** del fork y `NEXT_PUBLIC_SITE_URL`.
- **Dominio para el audio** (R-032): Cloudflare dice que la URL `r2.dev` «is rate-limited and
  should only be used for development purposes» y no tiene caché; en producción pide un dominio
  propio en Cloudflare para el bucket `reed-audio`. Va junto con la decisión del dominio del
  fork. (Cierra la decisión «espacio del Blob» de R-031: R2 aguanta las dos voces, ~3,8 GB de
  10 GB gratis.)

## Mejoras detectadas, sin spec

- Reabrir la bienvenida de los modos desde el perfil (R-020).
- Slugs de los artículos en el sitemap (R-018).
- **Agente por libro al subir** (R-026): sin voz en el Compañero, el agente que se crea por cada
  libro subido ya no se usa. Dejar de crearlo ahorra ~1 minuto por subida; es un spec LÓGICA.
  Sacar también `@elevenlabs/react` del `package.json` del frontend.
- **Costo de ElevenLabs** (medido el 10-oct-2026): ~390 créditos por minuto de audio
  (`eleven_multilingual_v2`), ~19 por respuesta escrita. El tope Pro de 20 000 caracteres/día
  cuesta ~USD 44/mes si se usa entero.
