# Reed

> *«El amigo curioso que ya leyó el libro y te lo cuenta con calma.»*

Reed lee **contigo**: te lee en voz alta, te resume, responde tus preguntas y conversa por voz
sobre el pasaje que tienes enfrente.

**Estado:** v2. Fork de [`Afaguayo/hackathon`](https://github.com/Afaguayo/hackathon) (2.º lugar
en Innovathon 2.0) en [`victorleonllan/reed`](https://github.com/victorleonllan/reed). El fork
todavía no tiene Vercel, base ni claves propias: el original vive en el Vercel y las cuentas de
Angel. Para dejarlo en vivo, sigue [Poner en marcha el fork](#poner-en-marcha-el-fork).

## Estructura

Un solo proyecto de Vercel sirve todo desde el mismo dominio:

| Ruta | Qué es | Código |
|---|---|---|
| `/` | Landing (hero, modos, funciones, precios, FAQ) | `src/app/(marketing)/page.tsx`, `src/components/marketing/` |
| `/blog`, `/blog/<slug>` | Blog estático con tres artículos | `src/app/(marketing)/blog/`, `src/lib/blog.ts` |
| `/tos`, `/privacy-policy` | Términos y privacidad (borrador, falta revisión legal) | `src/app/(marketing)/` |
| `/sitemap.xml`, `/robots.txt`, `/opengraph-image` | SEO | `src/app/sitemap.ts`, `robots.ts`, `opengraph-image.tsx`, `src/lib/seo.ts` |
| `/app` | La app de Reed (Vite + React), compilada en `public/app/` | `frontend/` ([notas](frontend/README.md)) |
| `/api/*` | La API (route handlers de Next) | `src/app/api/`, `src/lib/` ([notas](backend/README.md)) |

Nombre, dominio, planes, precios y remitentes de correo salen de una sola fuente:
`src/config.ts`.

## Tecnologías

| Tecnología | Para qué |
|---|---|
| **Next.js 16** (App Router, TypeScript) | Landing, blog, SEO y la API. `src/proxy.ts` es el antiguo middleware |
| **Vite + React 18 + Tailwind** (`frontend/`) | La app en `/app`; se compila en `public/app/` |
| **motion** | Transiciones: el junco entre modos, personajes que respiran, cambio de vista (respeta `prefers-reduced-motion`) |
| **react-hot-toast** | Avisos breves dentro de la app |
| **Vercel** | Deploy (cada push a la rama principal publica; los PR tienen URL de vista previa) |
| **ElevenLabs Text to Speech** | Leer en voz alta |
| **ElevenLabs Agents + Knowledge Base** | Conversación por voz (modo Compañero); cada documento subido tiene su agente con el libro entero. Un agente de solo texto responde explicar / resumir / test |
| **Neon Postgres + Drizzle ORM** | Documentos, progreso, conversaciones, notas, uso |
| **Clerk** | Inicio de sesión, y el plan del usuario (Gratis / Reed Pro) en `publicMetadata.reed` |
| **Stripe** | Cobro de Reed Pro: checkout, portal de clientes y webhook que sincroniza el plan en Clerk |
| **Resend** | Correos: bienvenida al crear la cuenta y aviso de Reed Pro activo. Sin clave se omiten sin error |
| **PostHog** | Analítica en la landing y la app. Sin clave no se envía nada |
| n8n, Zavu | Sin conectar todavía |

## API (lo que llama la app desde `frontend/src/services/`)

| Endpoint | Hace | Devuelve |
|---|---|---|
| `POST /api/documents` multipart `file`, `title?`, `author?` | Sube EPUB/PDF/TXT/MD/HTML (máx. 4 MB): extrae capítulos y párrafos, agrega el texto a la knowledge base de ElevenLabs y crea su agente | `201 { document }` |
| `GET /api/documents` | Documentos del usuario (sin texto), más recientes primero, cada uno con `progress` | `{ documents }` |
| `GET /api/documents/:id/content` | El texto: `{ chapters: [{ number, title, paragraphs }] }` | `{ content }` |
| `GET /api/documents/:id` | Un documento | `{ document }` |
| `DELETE /api/documents/:id` | Lo borra junto con su agente y su archivo en ElevenLabs | `204` |
| `GET /api/documents/:id/signed-url` | Sesión de voz con el agente **de ese documento** | `{ signedUrl }` |
| `GET` / `PUT /api/documents/:id/progress` body `{ position, percent }` | Dónde quedaste | `{ progress }` |
| `GET` / `POST /api/documents/:id/notes` body `{ text, quote?, type? }` | Notas, subrayados, definiciones | `{ notes }` / `201 { note }` |
| `DELETE /api/documents/:id/notes/:noteId` | Borra una nota | `204` |
| `GET /api/documents/:id/conversations` | Conversaciones de voz pasadas con transcripción y resumen | `{ conversations }` |
| `POST /api/tts` body `{ "text": "..." }` | Texto a voz con ElevenLabs (máx. 2500 caracteres) | `audio/mpeg` |
| `GET /api/companion/signed-url` | Sesión con el agente general (sin documento) | `{ signedUrl }` |
| `POST /api/ai/explain` body `{ paragraph, question }` | Reed explica un pasaje | `{ explanation }` |
| `POST /api/ai/summarize` body `{ title, text }` | Resumen del capítulo | `{ summary }` |
| `POST /api/ai/quiz` body `{ title, text }` | 3–5 preguntas de opción múltiple | `{ questions }` |
| `GET /api/usage` | Uso de las últimas 24 h contra los límites del plan, y el plan | `{ usage, plan: { plan, status, renewsAt } }` |
| `POST /api/stripe/create-checkout` body `{ interval: "month" \| "year" }` | Checkout de Stripe para Reed Pro (`409` si ya es Pro) | `{ url }` |
| `POST /api/stripe/create-portal` | Portal de clientes de Stripe: tarjeta, cancelar (`404` sin suscripción) | `{ url }` |
| `POST /api/webhooks/stripe` | *Lo llama Stripe* (firmado): mantiene el plan en Clerk al día | |
| `POST /api/webhooks/clerk` | *Lo llama Clerk* (firmado) en `user.created`: correo de bienvenida | |
| `POST /api/webhooks/elevenlabs` | *Lo llama ElevenLabs* tras cada conversación (firmado): guarda la transcripción | |
| `POST /api/agent-tools/save-note` | *Lo llama el agente* durante la conversación (header secreto) | `{ result }` |

**Auth:** `Authorization: Bearer <token de sesión de Clerk>` (la app lo agrega en
`services/api.ts`). Los webhooks y la herramienta del agente no usan Clerk: validan su propia
firma o secreto.

**Planes y límites** (ventana móvil de 24 h, por usuario; definidos en `src/config.ts`):

| | Voz (caracteres) | Subidas | Sesiones de voz | Respuestas de Reed |
|---|---|---|---|---|
| Gratis | 5 000 | 10 | 30 | 100 |
| Reed Pro (MXN 99/mes o 990/año) | 20 000 | 30 | 60 | 500 |

El plan Gratis además comparte un tope global para toda la app (20 000 / 100 / 300 / 1 000) que
protege la cuota de ElevenLabs; Reed Pro no lo cuenta. Las variables `LIMIT_*` de `.env.example`
cambian el tope global y los límites por usuario **del plan Gratis**. Un Pro con el pago atrasado
(`past_due`) sigue siendo Pro mientras Stripe reintenta el cobro.

Errores: `{ "error": "..." }` (400 dato inválido, 401 sin sesión, 404 no existe, 409 documento no
listo o ya eres Pro, 413 muy grande, 415 tipo de archivo, 422 archivo ilegible, 429 límite de
uso, 502 falló ElevenLabs, 503 servicio sin configurar). La clave de ElevenLabs y los ids de
Stripe se quedan en el servidor.

## Catálogo de muestra (libros que todo usuario tiene)

Cinco libros educativos de dominio público, en español, están en la base como **libros de
catálogo**: todo usuario con sesión los ve en el almacén, puede leerlos, escucharlos, preguntarle
a Reed, pedir resúmenes y tests, y guarda su propio progreso y notas. Nadie puede borrarlos.

| Libro | Autor | Muestra |
|---|---|---|
| *Reglas y consejos sobre investigación científica* | Santiago Ramón y Cajal | Cómo piensa un científico |
| *La Montaña* | Élisée Reclus | Ciencias de la Tierra explicadas |
| *El Mar* | Jules Michelet | Historia natural del océano |
| *El Hombre Mediocre* | José Ingenieros | Psicología y ética; debatir con Reed |
| *Ariel* | José Enrique Rodó | Ensayo sobre educación y cultura |

Fuente: EPUB de Project Gutenberg; el seed quita la cabecera, la licencia y las menciones de
marca de Gutenberg. Para agregar o restaurar libros, edita `CATALOG` en
`scripts/seed-catalog.mts` y corre `npm run db:seed-catalog` (se puede repetir sin duplicar;
`-- --dry-run` muestra qué haría). Son filas con `is_public = true` y dueño `catalog`.

## Máquina de audio (VoiceStudio)

El audio del lector para los libros del catálogo se puede generar **una vez**, gratis, en una
máquina propia con [VoiceStudio](https://github.com/debpalash/VoiceStudio), y servirse a todos
los lectores sin gastar créditos de ElevenLabs. Cada párrafo queda en Vercel Blob en una ruta
que se calcula de la voz y el texto (`src/lib/audio-library.ts`), y `/api/tts` lo busca ahí
antes de llamar a ElevenLabs. La máquina puede ser un PC con Windows (GPU NVIDIA) o un Mac con
Apple Silicon; el script habla con VoiceStudio por HTTP, así que también puede usar el
VoiceStudio de otra máquina (por ejemplo, por Tailscale).

1. **Instala VoiceStudio** y ábrelo. Windows (PowerShell): `irm https://voicestudio.sh/install | iex`;
   macOS: `curl -fsSL https://voicestudio.sh/install | sh`. Instala el modelo **OmniVoice**
   cuando lo pida. Su backend escucha en `http://127.0.0.1:3900` (`VOICESTUDIO_URL`).
2. **Crea dos perfiles de voz** llamados **exactamente** `Reed Antonio` y `Reed Mauricio`, con
   el diseño de voz o clonando una grabación **con permiso** de quien habla. El nombre es lo
   que el script le pide a VoiceStudio (`localProfile` en `src/config.ts`).
3. **Crea el almacén de audio.** Vercel → Storage → Blob → crea un store **público**. Copia el
   token a `BLOB_READ_WRITE_TOKEN` en el `.env.local` de la máquina de audio, y la URL pública
   del store a `REED_AUDIO_BASE_URL` en ese `.env.local` **y** en las variables de Vercel. La
   máquina de audio también necesita `DATABASE_URL` (solo lee los libros; no escribe en la base).
   Si VoiceStudio tiene clave, ponla en `VOICESTUDIO_API_KEY`.
4. **Prueba antes de la corrida completa:**
   - `npm run audio:generate -- --catalog --dry-run` — cuenta párrafos, caracteres, cuántos ya
     existen y los créditos de ElevenLabs que se evitan. No llama a VoiceStudio ni sube nada.
   - `npm run audio:generate -- --catalog --limit 5` — genera 5 párrafos. Escúchalos en el Blob.
   - `npm run audio:generate -- --catalog` — la corrida completa (una voz por corrida; la otra
     con `--voice mauricio`). Para un libro solo: `--book <documentId>`.
5. **Si se corta**, vuelve a correr el mismo comando: los párrafos que ya están en el Blob se
   saltan, y un párrafo que falló dos veces se reintenta en la siguiente corrida (el comando
   termina con código 1 cuando hubo fallidos). **Para regenerar todo** (otro motor, perfiles
   nuevos), sube `localTts.libraryVersion` en `src/config.ts` (`v1` → `v2`): las rutas
   cambian y los archivos viejos quedan donde estaban, sin borrarse.

VoiceStudio es AGPL-3.0; usarlo sin modificar para generar archivos no obliga a publicar el
código de Reed.

## Poner en marcha el fork

En este orden. Cada paso dice dónde se obtiene el valor y qué variable de `.env.example` llena.
Las variables van en Vercel → **Settings → Environment Variables** (Production y Preview) y, para
trabajar en local, en `.env.local` (raíz) y `frontend/.env.local`. Las `VITE_*` se leen **al
compilar**: después de agregarlas o cambiarlas hay que volver a desplegar.

1. **Vercel.** vercel.com → **Add New… → Project** → importar `victorleonllan/reed`. Framework
   **Next.js**, raíz `/`, comandos por defecto: `npm run build` compila la app de Vite en
   `public/app/` y luego Next.
2. **Neon (base de datos).** En el proyecto de Vercel → **Storage → Create → Neon** → conectar.
   Vercel agrega `DATABASE_URL` y `DATABASE_URL_UNPOOLED` (la conexión directa que usan las
   migraciones). Bájalas a local (`vercel env pull .env.local`, o cópialas a mano) y crea las
   tablas una vez:
   ```bash
   npm run db:migrate
   ```
   El catálogo (`npm run db:seed-catalog`) se carga al final del paso 4, porque crea un agente de
   ElevenLabs por libro y necesita sus claves.
3. **Clerk (sesión).** dashboard.clerk.com → app nueva.
   - **API Keys** (Next.js) → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY`. La
     misma clave pública va también en `VITE_CLERK_PUBLISHABLE_KEY` (la app de Vite la necesita
     al compilar; sin ella, `/app` solo muestra un aviso pidiéndola).
   - **Domains**: agrega el dominio de Vercel (y el definitivo cuando exista) como dominio
     permitido. La app usa el inicio de sesión de Clerk embebido en `/app` y vuelve a `/` al
     cerrar sesión.
   - **Webhooks** → endpoint `https://<dominio>/api/webhooks/clerk`, evento `user.created` →
     su *signing secret* en `CLERK_WEBHOOK_SIGNING_SECRET`. Sin él no sale el correo de
     bienvenida.
   - Para producción hace falta una instancia de producción de Clerk (claves `pk_live_` /
     `sk_live_`), que pide dominio propio.
4. **ElevenLabs (voz e IA).** Agentes y prompts según [`ai-agents/README.md`](ai-agents/README.md)
   y [`ai-agents/reading-companion-agent.md`](ai-agents/reading-companion-agent.md); los pasos del
   webhook y de la herramienta `save_note` están en
   [`backend/README.md`](backend/README.md#hooking-up-elevenlabs).
   - **Developers → API Keys** (permisos de Text to Speech y Agents) → `ELEVENLABS_API_KEY`.
   - **Voices** → la voz de «Léemelo» → su Voice ID en `ELEVENLABS_VOICE_ID`.
   - **Agents** → el agente de lectura (privado, con autenticación) → `ELEVENLABS_AGENT_ID`. Es
     también la plantilla que se copia para cada documento subido.
   - **Agents** → un agente de solo texto para `/api/ai/*` (privado, con *overrides* de prompt,
     primer mensaje y `text_only` permitidos en Security) → `ELEVENLABS_TEXT_AGENT_ID`.
   - **Agents → Settings → Post-call webhook** → `https://<dominio>/api/webhooks/elevenlabs`,
     evento de transcripción → su secreto en `ELEVENLABS_WEBHOOK_SECRET`. Sin él no se guardan
     las transcripciones.
   - `ELEVENLABS_TOOL_SECRET`: invéntalo (`openssl rand -hex 32`) y ponlo también como header
     `x-agent-tool-secret` de la herramienta `save_note` del agente.
   - Con las claves en `.env.local`, carga el catálogo una vez: `npm run db:seed-catalog`.
   - Opcional, sin cuenta que crear: los topes del plan Gratis, si quieres moverlos de sus
     valores por defecto (`.env.example`). Por usuario: `LIMIT_TTS_CHARS_PER_USER`,
     `LIMIT_UPLOADS_PER_USER`, `LIMIT_SESSIONS_PER_USER`, `LIMIT_AI_PER_USER`. Globales:
     `LIMIT_TTS_CHARS_GLOBAL`, `LIMIT_UPLOADS_GLOBAL`, `LIMIT_SESSIONS_GLOBAL`,
     `LIMIT_AI_GLOBAL`.
5. **Stripe (cobro), primero en modo prueba.**
   - **Product catalog** → producto «Reed Pro» con dos precios recurrentes: MXN 99 mensual y
     MXN 990 anual → sus ids `price_…` en `STRIPE_PRICE_PRO_MONTHLY` y
     `STRIPE_PRICE_PRO_YEARLY`.
   - **Developers → API keys** → la *secret key* en `STRIPE_SECRET_KEY`.
   - **Developers → Webhooks** → endpoint `https://<dominio>/api/webhooks/stripe` con los eventos
     `checkout.session.completed`, `customer.subscription.updated`,
     `customer.subscription.deleted` e `invoice.payment_failed` → su *signing secret* en
     `STRIPE_WEBHOOK_SECRET`.
   - **Settings → Billing → Customer portal** → activarlo (cambiar tarjeta y cancelar).
   - Sin `STRIPE_SECRET_KEY` o sin los precios, el pago responde «Los pagos todavía no están
     activos.» y el plan Gratis funciona igual. Para cobrar de verdad, repite el paso con las
     claves de modo real.
6. **Resend (correos).** resend.com → **Domains** → verificar el dominio de envío → **API Keys**
   → `RESEND_API_KEY`. Cambia los remitentes (`resend.fromNoReply`, `resend.fromAdmin`) y
   `supportEmail` en `src/config.ts`: hoy son el placeholder `@reed.app`.
7. **PostHog (analítica).** posthog.com → proyecto nuevo → **Project settings** → *Project API
   key* en `NEXT_PUBLIC_POSTHOG_KEY` (landing) y `VITE_POSTHOG_KEY` (app). Si el proyecto está
   en la región de la UE, cambia `NEXT_PUBLIC_POSTHOG_HOST` y `VITE_POSTHOG_HOST` (por defecto
   `https://us.i.posthog.com`).
8. **Dominio.** `NEXT_PUBLIC_SITE_URL` con el dominio final, sin barra al final (lo usan el SEO,
   las URL de vuelta de Stripe y los enlaces de los correos). Al cambiar de dominio, actualiza
   también las URL de los webhooks de Clerk, Stripe y ElevenLabs.

Lo que queda por verificar con la app corriendo está en
[`specs/R-PENDIENTES.md`](specs/R-PENDIENTES.md).

## Correr en local

Necesita Node.js 20+.

```bash
git clone https://github.com/victorleonllan/reed.git
cd reed
npm install
cp .env.example .env.local   # y llena los valores (guía de arriba)
npm run db:migrate           # crea o actualiza las tablas
npm run dev                  # landing y API en http://localhost:3000

# segunda terminal: la app de Reed
cd frontend && npm install
echo "VITE_CLERK_PUBLISHABLE_KEY=pk_test_..." > .env.local   # opcional: VITE_POSTHOG_KEY
npm run dev                  # http://localhost:5173 (reenvía /api a :3000)
```

`npm run build` en la raíz compila las dos, igual que Vercel (la app en `public/app/`, luego
Next).

Sin claves todo compila y degrada con un mensaje claro: las rutas de ElevenLabs y de la base
responden con el nombre de la variable que falta, el pago responde 503, los correos se omiten y
la analítica no se carga.

Scripts de base: `npm run db:generate` (tras editar `src/db/schema.ts`, escribe una migración en
`drizzle/`), `npm run db:migrate` (aplica migraciones), `npm run db:studio` (ver los datos).

## Cómo trabajamos

- Todo cambio sale de un spec en [`specs/`](specs/). El índice vivo es
  [`specs/R-README.md`](specs/R-README.md); lo pendiente, `specs/R-PENDIENTES.md`.
- Un spec = un commit, con el prefijo del spec: `feat(spec-R0NN): …`.
- El remoto `upstream` (el repo de Angel, `Afaguayo/hackathon`) está bloqueado para push; se
  trabaja y se sube solo a `origin` (`victorleonllan/reed`).
- Nunca se commitean claves: `.env.local` está en `.gitignore`; las variables nuevas se
  documentan en `.env.example`.

## Origen

Reed nació en Innovathon 2.0 como *AI Reading Companion*, con el deploy en
https://reefai-app.vercel.app (Vercel `reading-companion`, equipo REEF, cuentas de Angel). Allí
sacó el 2.º lugar. Así se repartió el trabajo en el hackathon:

| Área | Archivos | Responsable |
|---|---|---|
| Backend / API | `src/app/api/`, `src/lib/`, `src/db/`, `drizzle/` | Emmanuel ([notas](backend/README.md)) |
| Frontend / UI | `frontend/` (app de Vite) | Gael ([notas](frontend/README.md)) |
| IA / agente de ElevenLabs | Prompt y voz en ElevenLabs, `src/lib/elevenlabs.ts` con Emmanuel | Victor ([notas](ai-agents/README.md)) |

La v2 (este fork) la sigue Victor.
