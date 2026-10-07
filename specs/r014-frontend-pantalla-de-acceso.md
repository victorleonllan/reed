# Spec R-014 — Pantalla de acceso con los personajes de Reed

> Estado: aplicado (07-oct-2026) — `tsc --noEmit` (raíz y `frontend`) y `npm run lint` verdes; render en navegador pendiente (sin servidor, por regla de la tanda).
> Capa: FRONTEND. `frontend/src/components/auth/AuthScreen.tsx`.
> Depende de: R-003 (componentes base), R-004 (`ReedCharacter`), R-008 (prop `animated`).

> **En una frase:** la pantalla para entrar a `/app` sin sesión presenta a Reed (el personaje,
> sin marco) y dice en una línea qué vas a encontrar, con el acceso de Clerk al centro.

## Motivo

Con la landing en `/` (R-005, R-012), quien llega a `/app` sin sesión ya viene de «Empieza
gratis» o de un enlace directo. La pantalla tiene que confirmarle que está en el lugar correcto
y dejarlo entrar rápido, sin repetir la landing.

## Decisión

- Dos columnas en escritorio, una en móvil:
  - Izquierda: `ReedCharacter mode="companion" size="xl" animated`, y debajo
    «Reed, como *read*: leer.» en Literata pequeña.
  - Derecha: título «Hola, soy Reed.», bajada «Ya leí el libro. Lo leemos juntos: te lo leo en
    voz alta, te lo resumo y respondo lo que no se entienda.», y el acceso de Clerk que ya usa
    la pantalla (mismo componente/flujo de hoy, con su `appearance` alineada a los tokens: fuente
    Atkinson, color primario `reed`, radios `md`).
- Si la URL trae `?plan=pro`, una línea arriba del acceso: «Entra o crea tu cuenta y seguimos con
  Reed Pro.» (R-019 hace el resto después del login).
- Enlace «← Volver al inicio» a `/`.
- El modo demo (sin clave de Clerk) sigue funcionando como hoy.

## Criterios de aceptación

1. Sin sesión, `/app` muestra al personaje sin caja y el acceso de Clerk.
2. Con `?plan=pro`, aparece la línea de Reed Pro.
3. `npx tsc --noEmit -p frontend && npm run lint` verde.

## Fuera de alcance

Cambiar el proveedor o el flujo de autenticación.
