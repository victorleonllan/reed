# Spec R-008 — Transición animada entre modos y personajes vivos

> Estado: diseño (07-oct-2026).
> Capa: FRONTEND. `frontend/src/components/reed/ReedCharacter.tsx`,
> `frontend/src/components/reed/ReedBubble.tsx`, `frontend/src/components/reed/ReedModePanel.tsx`,
> `frontend/src/components/reed/modeTheme.ts` (nuevo).
> Depende de: R-001 (`motion` instalado en `frontend/`), R-004 (`ReedCharacter`, `portraits.ts`).

> **En una frase:** cuando cambias de modo, Reed se dobla como un junco y se levanta convertido
> en el personaje nuevo; mientras tanto respira, y dormido suelta «z» que flotan.

## Motivo

Pedido de Victor (07-oct-2026): «quizá animar la transición de un modo a otro». Los cinco modos
son lo más fuerte de la demo (lo dijo el equipo en el pitch): verlos cambiar con intención hace
que se entienda que es el **mismo** Reed adaptándose a tu tiempo, no cinco botones.

## Decisión

Todo con `motion` (`import { motion, AnimatePresence, useReducedMotion } from "motion/react"`).

### La metáfora: el junco que se dobla

La fábula que guía la marca (*La encina y la caña*): el junco se dobla con el viento y vuelve a
levantarse. La transición la cuenta sin decirla:

1. **Sale** el personaje actual: rota hacia un lado con el origen en los pies
   (`transformOrigin: "50% 100%"`, `rotate: -8°`), baja un poco la escala (0.92) y se
   desvanece. ~180 ms, `easeIn`.
2. **Entre los dos**, una línea vertical fina (el junco, color del modo nuevo) crece desde la
   sombra de contacto hacia arriba y se apaga. ~160 ms. Es el único «efecto»: nada de chispas,
   destellos ni confeti.
3. **Entra** el personaje nuevo desde el lado contrario (`rotate: 8° → 0`, escala 0.92 → 1,
   opacidad 0 → 1) con un resorte suave (`type: "spring", stiffness: 260, damping: 18`): se
   endereza con un pequeño rebote, como el junco.

`AnimatePresence mode="wait"` con `key={mode}` sobre la imagen del personaje.

### Personajes vivos (`ReedCharacter`)

Prop nueva `animated?: boolean` (por defecto `false`, para no animar los íconos chicos de los
menús):

- **Respiración:** escala Y 1 → 1.015 y desplazamiento de 2 px, ciclo de 4 s, infinito.
- **Dormido:** respiración más lenta (6 s) y tres «z» en Literata que suben, se agrandan y se
  desvanecen en secuencia (2.4 s, escalonadas).
- La sombra de contacto se encoge un poco cuando el personaje «sube» en la respiración.
- Al pasar el cursor por encima (o foco), una inclinación de 2-3° hacia el cursor. Nada más.

### Color por modo (`modeTheme.ts`)

Un acento por modo, con tokens que ya existen: dormido → `ink-muted`, compañero → `reed`,
profesor → `ambar`, bibliotecario → `clay-strong`, lector → `reed-strong`. Lo usan la línea del
junco, el halo detrás del botón flotante y el subrayado del título del panel. El halo cambia de
color con transición de 320 ms (`duration-panels`).

### Dónde se ve

- `ReedBubble`: el personaje del botón flotante usa `animated` y hace la transición completa al
  elegir un modo en el menú. El menú aparece con escala 0.96 → 1 y opacidad, desde la esquina
  del botón (`transformOrigin` abajo a la derecha), y cada opción entra escalonada 30 ms.
- `ReedModePanel`: su raíz es un `motion.div` con `initial`/`animate`/`exit`: al montarse sube
  12 px y aparece (220 ms); al desmontarse baja y se desvanece (160 ms). El `exit` funciona
  porque R-011 (mismo paso) envuelve el montaje del panel en `ReaderView` con `AnimatePresence`;
  sin eso, el `exit` simplemente no corre, sin error. Al cambiar de modo con el panel
  abierto, el contenido del modo hace un cruce: el viejo se va 8 px hacia un lado y se
  desvanece, el nuevo entra desde el otro (`AnimatePresence mode="wait"`, `key={mode}`). El
  título del encabezado cruza igual.

### Movimiento reducido

Con `useReducedMotion()` en `true`: sin rotaciones, sin resorte, sin respiración ni «z»; los
cambios son un fundido de opacidad de 120 ms. El bloque `prefers-reduced-motion` de `index.css`
se queda.

## Criterios de aceptación

1. Cambiar de modo desde el menú anima salida → junco → entrada, en < 600 ms en total.
2. Dormido muestra las «z» y la respiración lenta; los demás modos, la respiración normal.
3. Con movimiento reducido, solo fundidos (verificable en el código: rama de `useReducedMotion`).
4. Ningún cambio fuera de los cuatro archivos de la capa (los modos en `reed/modes/` los toca
   R-009 en paralelo).
5. `npx tsc --noEmit -p frontend && npm run lint` verde.

## Fuera de alcance

- Animaciones de la landing (R-012).
