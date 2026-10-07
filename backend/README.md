# Backend (owner: Emmanuel)

Server side of Reed: Next.js route handlers on Vercel, Neon Postgres via Drizzle, ElevenLabs for voice and AI, Clerk for sessions and the user's plan, Stripe for Reed Pro, Resend for email. In the v2 fork, work goes through specs (`specs/R-README.md`), one commit per spec. See the [project README](../README.md) for the full API table and the setup guide.

## Code map
| Path | What |
|---|---|
| `src/db/schema.ts` | Tables: `documents`, `reading_progress`, `conversations`, `messages`, `notes`, `usage_events` |
| `src/db/index.ts` | `getDb()`: Drizzle over Neon's HTTP driver |
| `drizzle/` | SQL migrations (generated; commit them) |
| `src/lib/elevenlabs.ts` | TTS, signed URLs, knowledge-base text upload, per-document agents |
| `src/lib/book-text.ts` | Extracts chapters + paragraphs from PDF (`unpdf`, layout-aware), EPUB (`jszip`), TXT/MD/HTML |
| `src/lib/reed-ai.ts` | `askReed()`: one text-only websocket turn with the `ELEVENLABS_TEXT_AGENT_ID` agent |
| `src/lib/auth.ts` | `getUserId()`: Clerk user id, or 401 |
| `src/config.ts` | Single source of product data: name, site URL, plans (prices, limits, Stripe price ids), email senders |
| `src/lib/usage.ts` | Rolling-24h usage limits on paid ElevenLabs calls: per user from the plan in `config.ts`, plus a global cap that only counts the free plan |
| `src/lib/plan.ts` | `getPlan()` / `setPlan()` / `isPro()`: the plan lives in Clerk `publicMetadata.reed` (`plan`, `status`, `renewsAt`, Stripe ids), cached 60 s; `past_due` still counts as Pro |
| `src/lib/stripe.ts` | Lazy Stripe client, Checkout and Customer Portal sessions, status mapping, `onProActivated()` (Reed Pro email). Without keys it throws `PaymentsNotConfiguredError` → 503 |
| `src/lib/resend.ts`, `src/lib/emails.ts` | `sendEmail()` (never throws; skips without `RESEND_API_KEY`) and the welcome / Reed Pro templates in Reed's voice |
| `src/proxy.ts` | Next 16 proxy running `clerkMiddleware()` |
| `src/lib/documents.ts`, `src/lib/http.ts` | Shared lookup (by user, by agent id) and error helpers |
| `src/lib/webhook-signature.ts` | Verifies `ElevenLabs-Signature` (HMAC-SHA256, 30 min replay window) |
| `src/app/api/documents/**` | Documents, text content, progress, notes, conversations, per-document signed URL |
| `src/app/api/ai/*` | `explain`, `summarize`, `quiz` for the frontend (Reed text agent) |
| `src/app/api/webhooks/elevenlabs` | Post-call webhook: saves transcript + summary |
| `src/app/api/agent-tools/save-note` | Server tool the agent calls to save a note |
| `src/app/api/tts`, `src/app/api/companion/signed-url` | Read aloud; general companion session |
| `src/app/api/usage` | Current user's usage vs. their plan's limits, plus `plan: { plan, status, renewsAt }` |
| `src/app/api/stripe/create-checkout`, `create-portal` | Reed Pro Checkout (`{ interval: "month" \| "year" }`) and the billing portal; return `{ url }` |
| `src/app/api/webhooks/stripe` | Stripe webhook (signed): `checkout.session.completed`, `customer.subscription.updated` / `.deleted`, `invoice.payment_failed` → plan in Clerk |
| `src/app/api/webhooks/clerk` | Clerk webhook (signed, `CLERK_WEBHOOK_SIGNING_SECRET`): `user.created` → welcome email |

## How "ask about the whole book" works
1. `POST /api/documents` extracts the book's chapters and paragraphs itself (`book-text.ts`; ElevenLabs' own PDF extraction drops content), stores them in `documents.content` for the reader, and adds the same text to the **ElevenLabs Knowledge Base**.
2. It creates a **private agent for that document**: a copy of the Reading Companion template (`ELEVENLABS_AGENT_ID`) with only that document in its knowledge base and RAG on. A conversation can't switch knowledge bases, so one agent per document keeps users' books separate.
3. `GET /api/documents/:id/signed-url` starts a voice session with that agent. The UI still passes `{{passage}}`/`{{book_title}}` for the part being read right now.
4. Deleting a document deletes its agent and knowledge-base file too.

## Done
- [x] ElevenLabs TTS and companion signed URL
- [x] Database schema + first migration on Neon
- [x] Document upload → ElevenLabs knowledge base + per-document agent
- [x] List / get / delete documents (with ElevenLabs cleanup)
- [x] Reading progress (get / upsert)
- [x] Notes: list / create / delete
- [x] Post-call webhook → `conversations` + `messages` (signature-checked, idempotent on retries)
- [x] Conversation history per document
- [x] `save_note` server tool endpoint
- [x] Deleting a document cascades to its progress, notes, conversations and messages
- [x] Clerk auth on every user route; users only see their own data
- [x] Usage limits (`usage_events` table): TTS characters, uploads, voice sessions, AI answers
- [x] Text extraction (PDF/EPUB/TXT/MD/HTML) + `GET /api/documents/:id/content`
- [x] Reed AI for the frontend: `/api/ai/explain`, `/api/ai/summarize`, `/api/ai/quiz` (ElevenLabs text-only agent)
- [x] Frontend (Gael's Vite app) served at `/app` from the same deployment; Next serves the landing at `/`
- [x] Demo catalog: 5 public-domain books readable by every user (`is_public`), seeded by `npm run db:seed-catalog`
- [x] Book agents wait for ElevenLabs' search index (`ensureRagIndex`, multilingual embeddings) before creation; uploads take ~10 s
- [x] Free / Reed Pro plan in Clerk `publicMetadata.reed`, with per-plan limits (R-006)
- [x] Reed Pro billing with Stripe: checkout, portal, webhook that syncs the plan (R-010)
- [x] Emails with Resend: welcome via the Clerk webhook, Reed Pro on activation (R-016)

## Hooking up ElevenLabs

**Done on the original deploy** (https://reefai-app.vercel.app, Angel's ElevenLabs account); **the fork needs its own**, following the manual steps below: workspace webhook `Reading Companion transcripts` is the post-call webhook (transcripts), and the `save_note` tool is attached to the Reading Companion template agent (its secret header comes from the ElevenLabs secret `reading_companion_tool_secret`). New document agents copy the template, so they get the tool too. If the deploy URL changes, update both URLs in ElevenLabs.

Manual steps, for reference or a new workspace:
**Post-call webhook**
1. ElevenLabs → Agents → Settings → Post-call webhook → add `https://<deploy>/api/webhooks/elevenlabs`, event "transcription".
2. Copy the secret it shows into `ELEVENLABS_WEBHOOK_SECRET` (Vercel env + `.env.local`).

**`save_note` tool** (on the template agent, so new document agents inherit it; existing ones need it added too)
1. ElevenLabs → Agents → Reading Companion → Tools → Add tool → Webhook:
   - Name `save_note`; description "Save a note for the reader when they ask you to remember something."
   - Method `POST`, URL `https://<deploy>/api/agent-tools/save-note`
   - Header `x-agent-tool-secret` = the value of `ELEVENLABS_TOOL_SECRET` (make one: `openssl rand -hex 32`)
   - Body: `agent_id` = dynamic variable `system__agent_id`; `text` (string, required, "what to remember"); `quote` (string, optional, "the passage it refers to")
2. Add a line to the prompt: "When the reader asks you to remember something, call save_note."

## Next
1. More agent tools: `quiz_me`, `define_word`.
2. Uploads over 4 MB: upload straight to Vercel Blob from the browser, then hand the URL to the backend.
3. Clerk webhook to delete a user's documents/agents when they delete their account.

## Before going to production
Fine to skip for the hackathon demo; do all of these before real users rely on the app.
- [ ] **Rotate the Neon database password** (Neon → Roles → `neondb_owner` → Reset password), then update `DATABASE_URL` / `DATABASE_URL_UNPOOLED` in `.env` and in Vercel (Production + Preview) and redeploy. The current one was handled in plain text during setup.
- [ ] **Clerk production instance**: needs a custom domain; swap in the `pk_live_` / `sk_live_` keys.
- [ ] **Content-Security-Policy** header once the UI exists (allow Clerk and ElevenLabs domains).
- [ ] Review usage limits (`LIMIT_*`) against the ElevenLabs plan's monthly characters.
- [ ] Make sure no old Syncthing share still points at the project folder on any teammate's machine.

## Environment
`ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_TEXT_AGENT_ID`, `ELEVENLABS_WEBHOOK_SECRET`, `ELEVENLABS_TOOL_SECRET`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEXT_PUBLIC_SITE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`, `RESEND_API_KEY`, `NEXT_PUBLIC_POSTHOG_KEY` / `_HOST`, optional `LIMIT_*` (free plan only); build-time `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_POSTHOG_KEY` / `_HOST` for the frontend. See `.env.example` and the setup guide in the [project README](../README.md#poner-en-marcha-el-fork). Locally the database URL lives in `.env` and the ElevenLabs values in `.env.local`; both are git-ignored.
