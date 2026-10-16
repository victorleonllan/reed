# Specs — Reed v2

Reed es la app del equipo en Innovathon 2.0 (2.º lugar, 26-sep-2026): un compañero de lectura
con IA que lee en voz alta, resume y responde preguntas. Este repo es el **fork de Victor**
(`victorleonllan/reed`) del original `Afaguayo/hackathon`. El remoto `upstream` (Angel) está
bloqueado para push a propósito.

La v2 (diseñada el 07-oct-2026) convierte el prototipo en **producto con cobro**: landing,
cobro con Stripe, correos, analítica, una estética pulida, los personajes sin fondo y la
transición animada entre modos. Toma lo mejor de ShipeaRapido (`~/projects/shipearapido`, solo
referencia, nunca se modifica).

## Numeración y capas

- Specs `R-NNN`, archivo `rNNN-<capa>-<titulo>.md`. Commit: `feat(spec-R0NN): …`.
- Un spec toca **una** capa: DATOS → LÓGICA → FRONTEND.
- **No hay specs DATOS en la v2**: decisión de Victor (07-oct-2026), la corrida de noche no
  toca la base Neon. El plan de pago vive en la metadata de Clerk (R-006).
- Los specs son inmutables en el diseño; los errores encontrados al aplicar van en una addenda
  fechada («Bugs encontrados al aplicar»).

## Reglas para quien ejecuta (agentes de la cadena)

1. **No instales nada** (`npm install`, `npm ci`) **ni corras `npm run build`**: todas las
   dependencias entraron en R-001, y el build completo hace `npm ci` en `frontend/` y vacía
   `public/app/`, rompiendo a los otros agentes que trabajan en paralelo. Tu verificación es
   `npx tsc --noEmit && npx tsc --noEmit -p frontend && npm run lint`. La cadena corre el build
   completo una vez por paso, cuando ya no hay agentes vivos.
2. **No levantes servidores** (`npm run dev`, `next dev`, `next start`): comparten `.next/` y
   puertos. Las verificaciones en ejecución están anotadas como `V#` en `R-PENDIENTES.md` para
   la mañana.
3. **No toques la base**: ni `src/db/schema.ts`, ni `drizzle/`, ni `npm run db:*`.
4. **Next 16 no es el Next que conoces**: antes de escribir código de Next, lee la guía en
   `node_modules/next/dist/docs/` (lo dice `AGENTS.md`). `src/proxy.ts` es el antiguo middleware.
5. Comentarios de código en inglés (como el resto del repo); textos de interfaz en **español
   neutro, de tú**.
6. **Tono de Reed** (alma de marca): curioso, cálido, claro; tranquilo; humor ligero. Nunca
   académico, apurado ni condescendiente. El usuario nunca siente culpa por no leer, vergüenza
   por preguntar ni apuro.
7. **Estética prohibida**: chispas ✨ (incluido el ícono `Sparkles` de lucide), robots,
   cerebros, búhos, degradado violeta→cian, fotos de stock. **Nada inventado**: ni testimonios,
   ni cifras de usuarios, ni logos.
8. Respeta `prefers-reduced-motion` en toda animación.
9. Sin claves (Stripe, Resend, PostHog, ElevenLabs), todo compila y degrada con un mensaje
   claro: nunca un crash.
10. Al cerrar: cambia **solo tu fila** de la tabla de abajo (columna Estado) y la línea
    `> Estado:` de tu spec.

## Índice

| Spec | Capa | Qué hace | Estado |
|---|---|---|---|
| R-001 | LÓGICA | Dependencias de toda la v2, `.env.example` y `src/config.ts` (planes, precios) | aplicado (07-oct-2026) |
| R-002 | FRONTEND | `ReedModePanel` partido en un componente por modo (refactor) | aplicado (07-oct-2026) |
| R-003 | FRONTEND | Sistema visual: tokens, tipografía, `Button`, `Surface`, `IconButton` | aplicado (07-oct) |
| R-004 | FRONTEND | Personajes sin fondo ni marco: WebP, `ReedCharacter` | aplicado (07-oct-2026) |
| R-005 | LÓGICA | Landing en `/`, app en `/app`, layout de Next con las fuentes de Reed | aplicado |
| R-006 | LÓGICA | Plan en la metadata de Clerk y límites de uso por plan | aplicado (07-oct) |
| R-007 | FRONTEND | Biblioteca y almacén: portadas generadas, «sigue leyendo», subida | aplicado (07-oct-2026) |
| R-008 | FRONTEND | Transición animada entre modos (el junco que se dobla) y personajes vivos | aplicado (07-oct) |
| R-009 | FRONTEND | Los modos usan la IA real: sin Macondo ni datos inventados | aplicado (07-oct-2026) |
| R-010 | LÓGICA | Cobro de Reed Pro con Stripe: checkout, portal, webhook | aplicado (07-oct-2026) |
| R-011 | FRONTEND | Pantalla de lectura: «dónde quedaste», riel de progreso, ajustes, escucha | aplicado (07-oct-2026) |
| R-012 | FRONTEND | Landing: hero, problema, modos, funciones, precios, FAQ | aplicado (07-oct-2026) |
| R-013 | FRONTEND | Encabezado, navegación móvil, transición entre vistas, avisos | aplicado (07-oct-2026) |
| R-014 | FRONTEND | Pantalla de acceso con los personajes | aplicado (07-oct-2026) |
| R-015 | FRONTEND | Hablar con Reed por voz (ElevenLabs) desde el modo Compañero | superado por R-026 (10-oct-2026) |
| R-016 | LÓGICA | Correos con Resend: bienvenida y Reed Pro | aplicado (07-oct-2026) |
| R-017 | FRONTEND | Términos, privacidad, SEO (sitemap, robots, OG) y páginas de error | aplicado (07-oct-2026) |
| R-018 | FRONTEND | Blog estático con tres artículos | aplicado (07-oct-2026) |
| R-019 | FRONTEND | Plan, uso y pago dentro de la app; modal al llegar al límite | aplicado (07-oct) |
| R-020 | FRONTEND | Bienvenida: Reed presenta sus cinco modos | aplicado (07-oct-2026) |
| R-021 | FRONTEND | Analítica con PostHog (landing y app) | aplicado (07-oct-2026) |
| R-022 | LÓGICA | README de la v2 y guía para poner en marcha el fork | aplicado (07-oct-2026) |
| R-023 | FRONTEND | Transición entre modos sin la línea del junco (modifica R-008) | aplicado (07-oct-2026) |
| R-024 | FRONTEND | Hero con Reed de cuerpo completo y sin la línea del junco (modifica R-012) | aplicado (07-oct-2026) |
| R-025 | LÓGICA | Dos voces para el lector (Antonio y Mauricio) en `/api/tts` | aplicado (15-oct-2026) |
| R-026 | FRONTEND | Solo el lector habla: el Compañero pierde la voz (supera R-015) | aplicado (15-oct-2026) — pendiente: `src/config.ts` aún promete voz en Pro |
| R-027 | FRONTEND | Audio solo cuando lo pides: caché en el navegador y voz elegible | aplicado (15-oct-2026) |
| R-028 | FRONTEND | Sesión de escucha planificada: 5, 15 o 30 min y voz antes de generar audio | aplicado (15-oct-2026) |
| R-029 | LÓGICA | Biblioteca de audio pregenerado: clave por voz + texto en Vercel Blob | aplicado (15-oct-2026) |
| R-030 | LÓGICA | `/api/tts` sirve primero el audio pregenerado, sin gastar ElevenLabs | aplicado (15-oct-2026) |
| R-031 | LÓGICA | Máquina de audio: `npm run audio:generate` con VoiceStudio | aplicado (15-oct-2026) |
| R-032 | LÓGICA | El audio pregenerado se sube a Cloudflare R2: Vercel Blob Hobby no alcanza (supera el almacenamiento de R-029/R-031) | aplicado (15-oct-2026) |
| R-033 | LÓGICA | Reed Pro deja de prometer conversación por voz (config, mensaje de límite, correo) | aplicado (15-oct-2026) |
| R-034 | LÓGICA | Tres planes de pago en dólares: Básico USD 1, Pro USD 10, Biblioteca USD 25 | aplicado (15-oct-2026) |
| R-035 | LÓGICA | Límites por mes y cupo de libros guardados (borra uno para subir otro) | diseñado |
| R-036 | LÓGICA | Cola de audio: la máquina local genera los libros de los usuarios con plan de voz | diseñado |
| R-037 | LÓGICA | La máquina de audio atiende la cola, cuida el tope del bucket y limpia lo huérfano | diseñado |
| R-038 | LÓGICA | `/api/tts` deja de usar ElevenLabs salvo `TTS_FALLBACK=elevenlabs` | diseñado |
| R-039 | FRONTEND | Precios y planes en la landing y en la app | diseñado |
| R-040 | FRONTEND | El lector avisa el estado de la voz de tus libros; subir respeta el cupo | diseñado |

## Cadena de ejecución (herdr)

Siete pasos; dentro de un paso los specs corren en paralelo (un agente cada uno) porque no
dependen entre sí ni comparten archivos. Entre pasos, `spec-fleet-cadena` corre `npm run build`
completo.

```
1  R-001 + R-002 + R-003
2  R-004 + R-005 + R-006
3  R-007 + R-008 + R-009 + R-010 + R-011
4  R-012 + R-013 + R-014 + R-015 + R-016
5  R-017 + R-019
6  R-018 + R-020 + R-021
7  R-022
```

Comando (desde un pane de herdr):

```
spec-fleet-cadena reed:R001+reed:R002+reed:R003 reed:R004+reed:R005+reed:R006 \
  reed:R007+reed:R008+reed:R009+reed:R010+reed:R011 \
  reed:R012+reed:R013+reed:R014+reed:R015+reed:R016 \
  reed:R017+reed:R019 reed:R018+reed:R020+reed:R021 reed:R022
```

Al final hace `git push origin HEAD` al fork. Si un paso falla, se detiene; se arregla y se
vuelve a correr **el mismo comando**: salta lo ya aplicado.

### Tanda del 10-oct-2026 (voz del lector)

```
1  R-025 + R-026 + R-027
2  R-028
```

```
spec-fleet-cadena reed:R025+reed:R026+reed:R027 reed:R028
```

R-027 depende de R-025 solo en ejecución (manda `voice`; el servidor viejo lo ignora), así que
compila en paralelo. R-028 usa archivos de R-027 y espera al paso 1.

### Tanda del 15-oct-2026 (audio pregenerado con VoiceStudio)

Incluye la tanda del 10-oct: R-029 necesita `config.readerVoices` de R-025. R-026 ya quedó
aplicado en la primera corrida (15-oct-2026).

```
1  R-025
2  R-029            (solo: instala @vercel/blob y toca src/config.ts)
3  R-027 + R-030 + R-031
4  R-028            (usa archivos de R-027)
```

```
spec-fleet-cadena reed:R025 reed:R029 reed:R027+reed:R030+reed:R031 reed:R028
```

La primera corrida se detuvo porque `spec-fleet` lee como dependencia todo `R-NNN` de la línea
`Depende de:`, y «Lo usan R-027 y R-028» armaba un ciclo. Esas menciones pasaron a una línea
`> Alimenta:` propia.

### R-032 (15-oct-2026): de Vercel Blob a Cloudflare R2

El `--dry-run` midió 3027 párrafos y ~1,9 GB por voz. Vercel Blob Hobby permite 1 GB y 2000
subidas al mes, y bloquea Blob 30 días si se pasa. R2 da gratis 10 GB y un millón de
escrituras. Va solo en su paso porque cambia dependencias.

```
spec-fleet-cadena reed:R032 reed:R033
```

R-033 cierra la addenda de R-026. No comparte archivos con R-032; va después solo porque R-032
instala dependencias.

### R-034 → R-040 (15-oct-2026): voz 100 % local y planes en dólares

Victor decidió sacar a ElevenLabs de la voz (queda solo para texto) y cobrar tres planes:
Básico USD 1, Pro USD 10 con 3 libros propios con voz, Biblioteca USD 25 con 20. El porqué y los
números están en el vault («Reed — plan de orquestación del audio pregenerado»).

```
1  R-034                    (solo: cambia los tipos de plan que usan todos los demás)
2  R-035 + R-036
3  R-037 + R-038 + R-039    (R-038 va después de R-036 porque ambos tocan .env.example)
4  R-040                    (usa R-035, R-036 y R-038)
```

```
spec-fleet-cadena reed:R034 reed:R035+reed:R036 reed:R037+reed:R038+reed:R039 reed:R040
```

Sin specs DATOS: «libro terminado» es un manifiesto en R2 (R-036) y el cupo se cuenta en
`documents` (R-035).

Pendientes y verificaciones: [R-PENDIENTES.md](R-PENDIENTES.md).
