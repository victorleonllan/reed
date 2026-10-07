# Spec R-020 — Bienvenida: Reed presenta sus cinco modos la primera vez

> Estado: diseño (07-oct-2026).
> Capa: FRONTEND. `frontend/src/components/reed/Onboarding.tsx` (nuevo), `frontend/src/App.tsx`.
> Depende de: R-004 (`ReedCharacter`, `portraits.ts`), R-008 (transición del junco),
> R-019 (`App.tsx` ya con `UpgradeModal` y `CheckoutReturn`).

> **En una frase:** la primera vez que alguien entra a la app, Reed se presenta en cinco pasos
> cortos, uno por modo, cambiando de personaje con la misma transición del junco, y al final le
> deja elegir con qué modo empezar.

## Motivo

Los modos son lo que distingue a Reed de un audiolibro, y hoy un usuario nuevo no sabe que
existen hasta que toca el botón flotante. El pitch del equipo lo dijo: «los modos explican por
qué Reed no es solo un audiolibro: el mismo libro se adapta al tiempo que tienes».

## Decisión

- Modal a pantalla completa en móvil y centrado en escritorio, sobre la biblioteca.
- Paso 0: «Hola, soy Reed. Ya leí el libro; lo leemos juntos.» con Reed compañero.
- Pasos 1-5: un modo por paso, con `ReedCharacter size="xl" animated` y la transición del junco
  al avanzar (reutilizar el componente/animación de R-008; si la transición vive dentro de
  `ReedBubble`, extraer **solo dentro de este archivo** una versión local con `motion`, sin
  editar archivos de R-008). Texto por modo: nombre, frase entre comillas («Acompáñame»…) y para
  cuándo sirve (los mismos de la landing, R-012).
- Navegación: «Siguiente», «Atrás», puntos de progreso (como la línea del junco segmentada),
  teclado (flechas y Escape) y «Saltar».
- Último paso: «¿Cómo empezamos?» con los cinco personajes chicos; elegir uno llama a
  `setMode(modo)` de `useReed()` y cierra. Por defecto, compañero.
- Se muestra una sola vez por navegador: `localStorage["reed-onboarding-v2"] = "done"`, envuelto
  en `try/catch` (si el almacenamiento falla, no se muestra, para no repetirlo en bucle).
- Desde el perfil no se reabre (fuera de alcance); queda en `R-PENDIENTES.md`.
- Foco atrapado dentro del modal, `aria-modal`, título accesible; con movimiento reducido, solo
  fundidos.

## Criterios de aceptación

1. Primera visita: aparece la bienvenida; segunda: no.
2. Elegir un modo al final deja ese modo activo en el botón de Reed.
3. Escape o «Saltar» la cierran y la marcan como vista.
4. `npx tsc --noEmit -p frontend && npm run lint` verde.

## Fuera de alcance

Tour guiado sobre la interfaz real (señalar botones). Reabrir la bienvenida.
