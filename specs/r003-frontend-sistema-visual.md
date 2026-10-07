# Spec R-003 — Sistema visual: tokens, tipografía y componentes base

> Estado: diseño (07-oct-2026).
> Capa: FRONTEND. `frontend/src/index.css`, `frontend/tailwind.config.js`, `frontend/index.html`,
> `frontend/src/components/ui/Button.tsx`, `frontend/src/components/ui/Badge.tsx`,
> `frontend/src/components/ui/ProgressBar.tsx`, `frontend/src/components/ui/ThemeToggle.tsx`,
> `frontend/src/components/ui/BrandLogo.tsx`, `frontend/src/components/ui/Surface.tsx` (nuevo),
> `frontend/src/components/ui/IconButton.tsx` (nuevo).
> Depende de: nada.

> **En una frase:** se afina la identidad que ya tiene Reed (papel cálido, salvia, arcilla,
> Literata + Atkinson Hyperlegible) en un sistema de tokens y componentes base consistente,
> para que los rediseños de pantallas (R-007, R-011, R-013, R-014) partan de lo mismo.

## Motivo

La app se armó en 12 horas: cada pantalla repite clases a mano (`bg-paper-raised border
border-line-strong rounded-lg shadow-2xl …`), hay sombras y radios distintos para lo mismo, y
`Button` cubre pocos casos. Antes de rediseñar pantallas hace falta la base.

## Dirección visual (vale para toda la v2)

Del alma de marca (`02-PROJECTS/Innovathon 2.0/Identidad/Formulario Alma de Marca` en el
vault de Victor), resumido:

- **Sensación:** calma y compañía. Leer es tranquilo, como escuchar música. Página limpia, con
  alguien al lado.
- **Motivo gráfico:** el **junco**: una línea fina y vertical que según el contexto es marcador
  de página, cursor de lectura u onda de voz. Úsalo con moderación (progreso, foco, separadores).
- **Nunca:** estética genérica de IA (robots, cerebros, chispas ✨, degradado violeta→cian),
  frialdad de tienda tipo Kindle/Amazon, look escolar, búhos o libros con estrellitas.

## Decisión

### Tokens (`index.css` + `tailwind.config.js`)

- Mantener la paleta actual y sus nombres (`paper`, `ink`, `reed`, `clay`, `ambar`…): todo el
  código ya los usa. Se permite **ajustar valores** para mejorar contraste (texto ≥ 4.5:1 sobre
  su fondo, en claro y oscuro) y armonía, no renombrar.
- Agregar tokens de **elevación** (`--shadow-1`, `--shadow-2`, `--shadow-3`: sombras suaves y
  cálidas, no grises duros) y exponerlos en Tailwind como `shadow-1/2/3`.
- Escala tipográfica explícita en `tailwind.config.js` (`display`, `title`, `heading`, `body`,
  `small`, `caption`) con Literata para títulos y lectura y Atkinson Hyperlegible para la UI.
- Una textura de papel muy sutil en `body` (ruido SVG en data URI, opacidad ≤ 4 %), desactivada
  en oscuro si ensucia.
- Clases utilitarias en `@layer components`: `.surface` (tarjeta estándar), `.surface-raised`,
  `.reed-line` (la línea vertical del junco), `.focus-ring`.
- Mantener el bloque `prefers-reduced-motion` existente.

### Componentes base

- `Button`: variantes `primary` (reed), `secondary` (clay), `ghost`, `outline`, `danger`;
  tamaños `sm`, `md`, `lg`; estado `loading` (spinner fino, deshabilita) e `icon` a la
  izquierda. Debe seguir aceptando las props que ya se le pasan en el código (revisar todos los
  usos con `grep -rn "<Button" frontend/src`) para no romper ninguna pantalla.
- `IconButton` (nuevo): botón cuadrado para íconos, con `aria-label` obligatorio por tipo.
- `Surface` (nuevo): `<Surface as="section" elevation={1|2|3} padding="sm|md|lg">`, envuelve
  la clase `.surface`.
- `Badge`: variantes `neutral`, `reed`, `clay`, `ambar`; mismo API que hoy más `variant`.
- `ProgressBar`: estilo «junco»: línea fina con extremo redondeado. Mantiene su API.
- `ThemeToggle`: transición suave entre claro y oscuro (ícono que rota/funde, 200 ms) y
  `aria-pressed`.
- `BrandLogo`: mismo logo (`assets/reed/logo.png`), con tamaños coherentes y `alt="Reed"`.

### `index.html`

`<meta name="description">` con `config.appDescription` (copiar el texto de R-001),
`<meta name="theme-color">` para claro y oscuro, y título «Reed · El amigo curioso que ya leyó
el libro» (ya está).

## Criterios de aceptación

1. Ninguna pantalla existente se rompe: `npx tsc --noEmit -p frontend && npm run lint` verde y
   todos los usos actuales de `Button`, `Badge` y `ProgressBar` siguen compilando.
2. Los tokens nuevos existen en claro y oscuro.
3. No aparece ningún ícono `Sparkles` ni degradado violeta/cian en los archivos de este spec.
4. El contraste de `ink` y `ink-muted` sobre `paper` y `paper-raised` es ≥ 4.5:1 en los dos
   temas (anotar los valores calculados en el reporte).

## Fuera de alcance

Rediseñar pantallas (Header, biblioteca, lector, acceso): son R-007, R-011, R-013, R-014.
