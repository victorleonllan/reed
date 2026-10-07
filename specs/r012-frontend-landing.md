# Spec R-012 — La landing de Reed (portada, modos, precios y FAQ)

> Estado: aplicado (07-oct-2026) — `tsc` raíz y `frontend` + `lint` verdes; revisión en navegador pendiente (V2).
> Capa: FRONTEND. `src/app/(marketing)/page.tsx`, `src/app/(marketing)/layout.tsx` (nuevo),
> `src/components/marketing/SiteHeader.tsx`, `src/components/marketing/SiteFooter.tsx`,
> `src/components/marketing/Hero.tsx`, `src/components/marketing/Problem.tsx`,
> `src/components/marketing/WithWithout.tsx`, `src/components/marketing/ModesShowcase.tsx`,
> `src/components/marketing/Features.tsx`, `src/components/marketing/Pricing.tsx`,
> `src/components/marketing/FAQ.tsx`, `src/components/marketing/CTA.tsx` (todos nuevos).
> Depende de: R-001 (`config`, `motion`), R-004 (`public/reed/*.webp`), R-005 (`/` libre,
> tokens y fuentes en `globals.css`).

> **En una frase:** la portada pública de Reed, armada con las secciones de ShipeaRapido
> (hero, problema, con/sin, funciones, precios, FAQ, CTA) pero con la voz, los colores y los
> cinco personajes de Reed, y con los modos como protagonista.

## Motivo

Un producto con cobro necesita explicar qué es antes de pedir una cuenta, y mostrar el precio.
ShipeaRapido (`~/projects/shipearapido/components/`, **solo lectura**) trae las secciones que
convierten: `Hero.js`, `Problem.js`, `WithWithout.js`, `FeaturesAccordion.js`, `Pricing.js`,
`FAQ.js`, `CTA.js`, `Footer.js`, `Header.js`. Se **portan** a TSX: estructura y orden de esas
secciones, nada de daisyUI (Reed no lo usa) ni de su copia.

## Decisión

### Voz y estética (obligatorio)

- Copia en español neutro, de tú, con la personalidad del alma de marca: **curiosa, cálida,
  clara**; nunca académica, apurada ni condescendiente; humor ligero. Sin culpa por no leer.
- Fuentes y tokens de `globals.css` (R-005). Papel cálido de fondo, mucho aire, Literata en
  títulos grandes.
- Prohibido: chispas ✨, robots, cerebros, búhos, degradado violeta→cian, fotos de stock.
- **Nada inventado:** sin testimonios, sin cifras de usuarios, sin logos de prensa. La única
  prueba social real es: «2.º lugar en Innovathon 2.0 · Chihuahua Tech Week 2026».

### Secciones, en orden

1. **`SiteHeader`**: logo (`/reed/…` o texto «Reed» en Literata), enlaces a #modos, #precios,
   #preguntas y Blog (`/blog`, lo crea R-018; el enlace va igual), y botón «Abrir Reed» →
   `config.appPath`. Con `<SignedIn>` de `@clerk/nextjs` el botón dice «Ir a mi biblioteca».
   Fijo arriba, con fondo translúcido al hacer scroll.
2. **`Hero`**: título «Cualquier libro cabe en tu día.»; bajada: «Reed te lee en voz alta, te
   resume y responde tus preguntas mientras lees. Como leer con un amigo curioso que ya leyó el
   libro.» Botones «Empieza gratis» (`/app`) y «Ver cómo funciona» (#modos). A la derecha, Reed
   en modo compañero (`/reed/companion.webp` con `next/image`, sin marco, sombra de contacto
   como en R-004) y la línea del junco detrás.
3. **`Problem`**: el insight del alma de marca: «Tengo tres libros empezados en la mesa de noche
   y no termino ninguno.» y los tres dolores: tiempo, atención, comprensión (texto de
   `02-PROJECTS/Innovathon 2.0/Contenido/Pitch Reed - apertura` en el vault de Victor; el
   agente usa la versión de este spec).
   - Tiempo: «Lees diez minutos en la noche y te quedas dormido.»
   - Atención: «El libro compite con un celular que nunca se cansa.»
   - Comprensión: «Cuando algo no se entiende, no hay a quién preguntarle.»
4. **`WithWithout`**: «Leer solo» vs. «Leer con Reed», 4 filas emparejadas (perder el hilo ↔
   resumen de dónde quedaste; buscar en Google y cerrar el libro ↔ preguntar sobre el párrafo;
   no tener tiempo de sentarte ↔ escuchar mientras haces otra cosa; leer y olvidar ↔ un test
   corto de lo que leíste).
5. **`ModesShowcase`** (#modos, la sección estrella): «Un Reed para cada momento». Los cinco
   personajes en fila (en móvil, carrusel horizontal con scroll-snap). Al elegir uno (clic o
   flechas), se agranda con la **misma transición del junco que se dobla** de R-008
   (reimplementada aquí con `motion`, porque la app de Vite y Next no comparten componentes) y
   aparece su texto: nombre, frase y para cuándo sirve:
   | Modo | Frase | Para cuándo |
   |---|---|---|
   | Dormido | «Déjame solo» | Tienes tiempo y quieres leer tú. Reed no interrumpe. |
   | Compañero | «Acompáñame» | Quieres entender más: resúmenes y datos curiosos. |
   | Profesor | «Enséñame» | Estás estudiando: pistas y preguntas para que llegues solo. |
   | Bibliotecario | «Ayúdame con mis libros» | Quieres ubicarte rápido entre tus libros. |
   | Lector | «Léemelo» | No tienes nada de tiempo: te lo lee en voz alta. |
   Respeta `prefers-reduced-motion`.
6. **`Features`**: acordeón (patrón de `FeaturesAccordion.js`) con: Escuchar · Preguntar ·
   Resumir · Ponerte a prueba · Tu biblioteca (EPUB, PDF, TXT). Una o dos frases cada una.
7. **`Pricing`** (#precios): dos tarjetas desde `config.plans`: Gratis (límites diarios del plan
   free, en palabras: «unos 5 000 caracteres leídos en voz alta al día», etc.) y **Reed Pro**
   (destacada, `MXN 99/mes`, con conmutador mensual/anual que muestra `MXN 990/año` y «dos meses
   de regalo»). Botones: Gratis → `/app`; Pro → `/app?plan=pro&interval=month|year` (R-019
   arranca el checkout al entrar). Debajo: «Cancelas cuando quieras desde tu perfil.»
8. **`FAQ`** (#preguntas): 6 preguntas reales: ¿Qué libros puedo leer? (los suyos en EPUB/PDF/
   TXT/MD/HTML hasta 4 MB y el almacén de dominio público) · ¿En qué idioma? (español) · ¿Reed
   inventa cosas? (responde sobre el texto que lees; si no sabe, lo dice) · ¿Qué pasa con mis
   libros? (son tuyos, solo tú los ves) · ¿Cómo cancelo Pro? (desde tu perfil, en un clic) ·
   ¿Sirve si me cuesta leer? (sí: te lo lee en voz alta y te explica lo que no se entiende).
9. **`CTA`**: «Vuelve a terminar libros.» + botón «Empieza gratis».
10. **`SiteFooter`**: © año, enlaces a Términos (`/tos`) y Privacidad (`/privacy-policy`) (las
    crea R-017), Blog, contacto `config.supportEmail`, y «Hecho en Chihuahua».

`(marketing)/layout.tsx` monta `SiteHeader` y `SiteFooter` para todas las páginas del grupo
(las de R-017 y R-018 los heredan). `page.tsx` reemplaza la portada provisional de R-005 y
exporta `metadata` con título y descripción de `config`.

### Técnica

- Componentes de servidor por defecto; `"use client"` solo donde hay estado o `motion`
  (`ModesShowcase`, el conmutador de `Pricing`, el acordeón, el header con scroll).
- `next/image` para los personajes, con `alt` descriptivo.
- Accesible: un solo `h1`, secciones con `aria-labelledby`, contraste AA, navegable con teclado.
- Antes de escribir, leer la guía de App Router de Next 16 en `node_modules/next/dist/docs/`.

## Criterios de aceptación

1. `/` muestra las 10 secciones en orden, con las anclas `#modos`, `#precios`, `#preguntas`.
2. Los precios salen de `config.plans` (cambiar el precio en `config.ts` cambia la landing).
3. No hay testimonios, cifras ni logos inventados; no hay chispas ni degradado violeta/cian.
4. `npx tsc --noEmit && npm run lint` verde.
5. **V2 (en ejecución, la mañana):** revisar la landing en navegador en móvil y escritorio.

## Fuera de alcance

Páginas legales y SEO (R-017), blog (R-018), analítica (R-021).

## Bugs encontrados al aplicar (07-oct-2026)

- **`<SignedIn>` ya no existe en `@clerk/nextjs` 7 (Clerk Core 3).** El paquete lo exporta solo
  como stub que lanza un error al renderizarse. `SiteHeader` usa su reemplazo,
  `<Show when="signed-in" fallback={…}>`: «Ir a mi biblioteca» con sesión, «Abrir Reed» sin ella.
  Como `SiteHeader` es componente de cliente, `Show` resuelve a la versión de cliente (lee la
  sesión en el navegador) y la portada no se vuelve dinámica.
- **`<main>` en el layout.** `(marketing)/layout.tsx` pone el único `<main id="contenido">`
  (con enlace «Saltar al contenido»), así que `page.tsx` y las páginas de R-017/R-018 no deben
  abrir otro `<main>`.
