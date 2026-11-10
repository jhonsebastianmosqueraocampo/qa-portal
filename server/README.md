# qa-portal · server

API REST del qa-portal (Node.js + Express 5 + MongoDB/Mongoose).

- Sprints y sus tareas (registradas a mano, con enlaces a Jira y a las pruebas exploratorias
  en Confluence).
- Ejecuciones de pruebas: el botón "Ejecutar pruebas" registra la ejecución y **pide a GitLab**
  que corra Cypress; el pipeline devuelve los resultados a esta API.
- Tipo de cada tarea: **automatizada** si su ID aparece en los resultados de Cypress, si no
  **manual** (con su resultado registrado a mano), e informes sprint a sprint.

## Requisitos

- Node.js 22+ y MongoDB corriendo como servicio de Windows (`Get-Service MongoDB`).

## Instalación (PowerShell)

```powershell
cd C:\Users\USUARIO\Documents\Proyectos\Portal\qa-portal\server
npm install
Copy-Item .env.example .env   # completa los valores marcados con <...>
npm run seed                  # datos de ejemplo + usuario administrador
npm run dev                   # API en http://localhost:4000/api (se reinicia al guardar)
```

Generar un secreto aleatorio para `JWT_SECRET` y `CI_RESULTS_TOKEN`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Variables de entorno

Ver [.env.example](.env.example) (cada variable está comentada). El servidor **valida todas al
arrancar** y, si falta algo, se detiene indicando qué corregir.

| Variable                                    | Para qué                                                 |
| ------------------------------------------- | -------------------------------------------------------- |
| `MONGODB_URI`                               | Conexión a Mongo                                         |
| `JWT_SECRET`, `JWT_EXPIRES_HOURS`           | Firma y duración de la sesión                            |
| `COOKIE_SECURE`                             | `true` cuando se sirva por HTTPS                         |
| `CORS_ORIGIN`                               | URL del frontend autorizado                              |
| `CI_PROVIDER`                               | `mock` (simulado, desarrollo) o `gitlab`                 |
| `GITLAB_PROJECT_ID`, `GITLAB_TRIGGER_TOKEN` | Para disparar el pipeline de qa-automation               |
| `CI_RESULTS_TOKEN`                          | Secreto compartido con el pipeline (= `PORTAL_CI_TOKEN`) |
| `SEED_ADMIN_*`                              | Usuario administrador que crea `npm run seed`            |

## Scripts

| Comando                           | Qué hace                                                       |
| --------------------------------- | -------------------------------------------------------------- |
| `npm run dev`                     | Servidor con recarga automática                                |
| `npm start`                       | Servidor (producción)                                          |
| `npm run seed`                    | **Borra** sprints/ejecuciones y carga datos de ejemplo         |
| `npm run user:create -- ...`      | Crea o actualiza un usuario (pide la contraseña por consola)   |
| `npm test`                        | Pruebas automatizadas de la API (usa la base `qa_portal_test`) |
| `npm run lint` / `npm run format` | ESLint / Prettier                                              |

Crear un usuario:

```powershell
npm run user:create -- --email ana@empresa.com --name "Ana Pérez" --role qa
```

Roles: `admin` (además puede eliminar sprints) y `qa`.

## Estructura

```
src/
├── config/        env.js (validación de variables), db.js (conexión Mongo)
├── models/        User, Sprint (con tareas embebidas), Run (ejecución + pruebas), Setting
├── validators/    Esquemas Zod de entrada (body, query, params)
├── middleware/    auth (sesión JWT), ciToken, validate, errorHandler
├── services/
│   ├── ci/        Proveedores de CI: gitlabProvider, mockProvider (misma interfaz)
│   ├── runService.js       Disparar ejecuciones y procesar resultados
│   ├── coverageService.js  Cobertura de tareas por sprint
│   └── reportService.js    Informes sprint a sprint
├── controllers/   Reciben la petición validada y responden
├── routes/        Mapa de endpoints
├── app.js         Construye la app Express
└── server.js      Arranca el servidor
scripts/           seed.js, create-user.js
tests/             Pruebas de la API (node:test + supertest)
docs/              Colección de Postman
```

**Por qué esta separación:** las rutas solo dicen _qué_ endpoint existe; los validadores, _qué
datos acepta_; los controladores, _cómo responde_; y los servicios contienen la lógica de
negocio. Así cada pieza se entiende y se prueba por separado, y cambiar GitLab por otro CI solo
toca `services/ci/`.

## Endpoints

Todos bajo `/api`. Salvo login, health y `/ci/results`, requieren sesión.

| Método | Ruta                                       | Descripción                                                                                                                            |
| ------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`                                  | Estado del servidor                                                                                                                    |
| POST   | `/auth/login`                              | Inicia sesión (cookie httpOnly). Limitado a 10 intentos/15 min                                                                         |
| POST   | `/auth/logout`                             | Cierra sesión                                                                                                                          |
| GET    | `/auth/me`                                 | Usuario actual                                                                                                                         |
| GET    | `/sprints?status&q`                        | Lista con filtros: `status` (`planned` pendiente, `active`, `closed` finalizado) y `q` (busca en sprint e ID/título de tareas)         |
| POST   | `/sprints`                                 | Crea un sprint (`startDate` y `endDate` obligatorias: definen su estado)                                                               |
| GET    | `/sprints/:id`                             | Detalle: tareas, cobertura y última ejecución                                                                                          |
| PATCH  | `/sprints/:id`                             | Edita datos o enlaces de exploratorias                                                                                                 |
| DELETE | `/sprints/:id`                             | Elimina (admin). El historial de ejecuciones se conserva                                                                               |
| POST   | `/sprints/:id/tasks`                       | Agrega una tarea (`key`, `title`, `jiraUrl`)                                                                                           |
| PATCH  | `/sprints/:id/tasks/:taskId`               | Edita una tarea                                                                                                                        |
| DELETE | `/sprints/:id/tasks/:taskId`               | Elimina una tarea                                                                                                                      |
| PUT    | `/sprints/:id/tasks/:taskId/manual-result` | Resultado de la prueba manual: `pending`, `passed` o `failed` + comentario                                                             |
| PUT    | `/sprints/:id/cases/manual-result`         | Resultado manual de un **caso** (`taskKey`, `caseDescription`, `result`, `comment`): casos `pendiente()` y `manual()` de qa-automation |
| POST   | `/runs`                                    | **Ejecutar pruebas** (`suite`: `regression` o `sprint` + `sprintId`) → 202                                                             |
| GET    | `/runs`                                    | Historial: filtros `suite`, `sprintId`, `status`, `from`, `to`, `page`, `limit`                                                        |
| GET    | `/runs/latest?suite=regression`            | Última ejecución de una suite                                                                                                          |
| GET    | `/runs/:id`                                | Detalle con cada prueba: ID, descripción, resultado, duración                                                                          |
| POST   | `/ci/results`                              | Resultados del pipeline (`Authorization: Bearer <CI_RESULTS_TOKEN>`)                                                                   |
| GET    | `/reports/sprints`                         | Informe por sprint: tareas planeadas/automatizadas, ejecuciones y regresión                                                            |

### Casos de prueba de cada tarea

La lista de casos sale de qa-automation: cada ejecución trae todos los casos, también los
`pendiente()` (`[PENDIENTE] UA-1 … — motivo`) y `manual()` (`[MANUAL] UA-1 … — motivo`) que Cypress
no ejecuta. El portal arma por tarea los casos **automatizados** (resultado de Cypress), **por
automatizar** y **manuales** (resultado registrado a mano por caso). La tasa de éxito solo cuenta
las pruebas ejecutadas.

### Estado del sprint

Se calcula con las fechas en la zona `APP_TIMEZONE`: **pendiente** antes del inicio, **activo**
entre inicio y fin, **finalizado** después del fin. Un sprint finalizado es de solo lectura (409
al modificar tareas, registrar resultados o ejecutar pruebas); un admin puede editar sus datos.

Errores: siempre `{ "error": { "message": "...", "details": [{ "field", "message" }] } }`.

### Estados de una ejecución

`queued` (registrada, pipeline solicitado) → `running` (el pipeline empezó) → `passed` / `failed`.
Si no se pudo contactar al CI queda `failed` con el motivo en `error`. No se permiten dos
ejecuciones simultáneas de la misma suite/sprint (409).

## Probar sin interfaz

### Postman

Importa [docs/qa-portal.postman_collection.json](docs/qa-portal.postman_collection.json) y
sigue las instrucciones de su descripción (variables y orden de ejecución).

### PowerShell

`Invoke-RestMethod` con `-WebSession` conserva la cookie de sesión entre peticiones:

```powershell
$api = 'http://localhost:4000/api'
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Login (usa los valores SEED_ADMIN_* de tu .env)
$body = @{ email = 'admin@qa.local'; password = Read-Host 'Contraseña' } | ConvertTo-Json
Invoke-RestMethod "$api/auth/login" -Method Post -Body $body -ContentType 'application/json' -WebSession $s

# Sprints y detalle del primero
$sprints = (Invoke-RestMethod "$api/sprints" -WebSession $s).sprints
Invoke-RestMethod "$api/sprints/$($sprints[0]._id)" -WebSession $s | ConvertTo-Json -Depth 6

# Ejecutar regresión y consultar el estado (con CI_PROVIDER=mock termina en ~6 s)
$run = (Invoke-RestMethod "$api/runs" -Method Post -Body '{"suite":"regression"}' -ContentType 'application/json' -WebSession $s).run
Start-Sleep 7
(Invoke-RestMethod "$api/runs/$($run._id)" -WebSession $s).run.tests | Format-Table title, state, durationMs

# Informes por sprint
Invoke-RestMethod "$api/reports/sprints" -WebSession $s | ConvertTo-Json -Depth 6
```

## Seguridad

- Contraseñas con bcrypt (nunca en texto plano); el hash no sale nunca en las respuestas.
- Sesión JWT en cookie `httpOnly` + `SameSite=Strict` (protege de robo por XSS y de CSRF).
- Límite de intentos de login por IP.
- `helmet` (cabeceras de seguridad) y CORS restringido al frontend.
- Toda entrada se valida con Zod; los enlaces solo aceptan `http(s)` (bloquea `javascript:`).
- El endpoint del pipeline usa un token propio, comparado en tiempo constante.
- Errores inesperados: detalle solo en el log del servidor, mensaje genérico al cliente.
