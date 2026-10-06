# qa-portal

Portal interno de QA. Centraliza por sprint las tareas, sus pruebas automatizadas y la
documentación de pruebas exploratorias; permite **ejecutar las pruebas con un botón** y ver el
reporte de cada prueba (ID, descripción, resultado); y muestra informes sprint a sprint de la
automatización.

| Carpeta            | Qué es                                                  | Detalle                                       |
| ------------------ | ------------------------------------------------------- | --------------------------------------------- |
| [server/](server/) | API REST: Node.js + Express + MongoDB                   | [server/README.md](server/README.md)          |
| [client/](client/) | Interfaz web: React + TypeScript + Vite + MUI           | [client/README.md](client/README.md)          |
| [docs/](docs/)     | Guía para conectar GitLab, línea base y mejoras futuras | [conectar-gitlab.md](docs/conectar-gitlab.md) |

## Cómo encaja con qa-automation

```
 Portal (botón «Ejecutar pruebas»)
   │  POST /api/runs
   ▼
 server ──(trigger token)──► GitLab: pipeline de qa-automation ──► Cypress
   ▲                                                                  │
   └──────────── POST /api/ci/results (estado y resultado) ◄──────────┘
```

El portal **no** ejecuta las pruebas: le pide a GitLab que lo haga y recibe los resultados.
Con `CI_PROVIDER=mock` (por defecto) el servidor simula ese ciclo para desarrollar sin GitLab.

## Arranque rápido en Windows (dos terminales de PowerShell)

```powershell
# Terminal 1: API
cd C:\Users\USUARIO\Documents\Proyectos\Portal\qa-portal\server
npm install
Copy-Item .env.example .env   # y completa los valores (ver server/README.md)
npm run seed                  # datos de ejemplo + usuario admin
npm run dev
```

```powershell
# Terminal 2: interfaz
cd C:\Users\USUARIO\Documents\Proyectos\Portal\qa-portal\client
npm install
npm run dev                   # abre http://localhost:5173
```

Inicia sesión con `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` de `server/.env`.

## Calidad

```powershell
cd server; npm run lint; npm test        # 14 pruebas de la API
cd ..\client; npm run lint; npm run build
```

## Commits

[Conventional Commits](https://www.conventionalcommits.org/es/) con alcance:
`feat(client): ...`, `fix(server): ...`, `docs: ...`.
