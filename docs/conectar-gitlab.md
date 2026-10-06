# Conectar el portal con GitLab (Fase 5)

Objetivo: que el botón **Ejecutar pruebas** del portal dispare el pipeline de `qa-automation` en
GitLab y que el pipeline devuelva los resultados al portal.

```
Portal (tu PC)  ──trigger token──►  GitLab.com: pipeline qa-automation ──► Cypress
      ▲                                                                    │
      └──── túnel público (Cloudflare) ◄── POST /api/ci/results ◄──────────┘
```

El túnel es necesario porque las máquinas de GitLab están en internet y no pueden llegar a
`localhost:4000`. Es temporal, solo para probar; en la empresa el portal estará publicado en un
servidor.

> **Nunca pegues tokens en chats, correos ni en el código.** Van solo en `server/.env` (portal) y
> en las variables de GitLab.

---

## Parte A — El pipeline funciona solo (sin portal)

### 1. Crear el proyecto en GitLab y subir el código

1. En GitLab.com: **New project › Create blank project**.
   - Nombre: `qa-automation` · Visibilidad: **Private**
   - **Desmarca** "Initialize repository with a README" (el repo ya existe en tu PC).
2. En PowerShell:
   ```powershell
   cd C:\Users\USUARIO\Documents\Proyectos\Portal\qa-automation
   git remote add origin https://gitlab.com/<tu-usuario>/qa-automation.git
   git push -u origin main
   ```
   La primera vez se abre el navegador para iniciar sesión en GitLab (Git Credential Manager).

### 2. Ajustes del proyecto

- **Settings › CI/CD › Variables › "Minimum role to use pipeline variables"**: ponlo en
  **Developer**. Si está en "No one allowed", GitLab rechaza los parámetros `SUITE`, `SPRINT_ID`,
  `RUN_ID` (es un valor por defecto reciente en proyectos nuevos). Si la opción no aparece, omite
  este paso.
- Si al ejecutar un pipeline GitLab pide **verificar tu cuenta** (teléfono o tarjeta, sin cobro),
  hazlo: es requisito para usar los runners compartidos gratuitos.

### 3. Variables de las pruebas

**Settings › CI/CD › Variables › Add variable** (marca **Protect variable** en todas):

| Key                | Valor (demo)                         | Visibility        |
| ------------------ | ------------------------------------ | ----------------- |
| `CYPRESS_BASE_URL` | `https://the-internet.herokuapp.com` | Visible           |
| `CYPRESS_USERNAME` | `tomsmith`                           | Masked            |
| `CYPRESS_PASSWORD` | el de `qa-automation/.env.example`   | Masked and hidden |

Si GitLab no permite enmascarar un valor por sus caracteres, déjalo visible: los de la demo son
públicos. Con credenciales reales de la empresa sí deben ir enmascaradas.

### 4. Primera ejecución manual ✅ punto de control

1. **Build › Pipelines › Run pipeline**, rama `main`, `SUITE` = `regression` › **Run pipeline**.
2. Abre el job **tests** y espera el resultado (unos 3–4 min la primera vez).
3. En el job, panel derecho: **Job artifacts › Browse** › `cypress/reports/index.html`.

Si falla, copia el final del log del job (sin datos sensibles) para revisarlo.

---

## Parte B — Conectar portal ↔ GitLab

### 5. Trigger token e ID del proyecto (portal → GitLab)

1. **Settings › CI/CD › Pipeline trigger tokens › Add new token**, descripción `qa-portal`.
   Copia el token.
2. ID del proyecto: en la página principal del proyecto, menú **⋮ › Copy project ID**.
3. Edita `qa-portal/server/.env`:
   ```
   CI_PROVIDER=gitlab
   GITLAB_PROJECT_ID=<id numérico>
   GITLAB_TRIGGER_TOKEN=<token del paso 1>
   GITLAB_REF=main
   ```

El trigger token solo permite crear pipelines en ese proyecto (permiso mínimo).

### 6. Túnel público hacia la API del portal (GitLab → portal)

```powershell
winget install --id Cloudflare.cloudflared
# En una terminal aparte, con la API corriendo (npm run dev en server):
cloudflared tunnel --url http://localhost:4000
```

Copia la URL que imprime (`https://<palabras>.trycloudflare.com`). **Cambia cada vez** que
reinicias el túnel.

Seguridad: el túnel expone solo la API, no tu PC. Todo requiere sesión salvo `/api/health`, el
login (con límite de intentos) y `/api/ci/results` (protegido con token). Cierra el túnel
(Ctrl+C) cuando termines de probar.

### 7. Variables para que el pipeline envíe resultados

En GitLab, **Settings › CI/CD › Variables**:

| Key               | Valor                                                     | Visibility        |
| ----------------- | --------------------------------------------------------- | ----------------- |
| `PORTAL_API_URL`  | la URL del túnel, sin `/` final                           | Visible           |
| `PORTAL_CI_TOKEN` | el valor de `CI_RESULTS_TOKEN` de `qa-portal/server/.env` | Masked and hidden |

### 8. Prueba completa ✅

1. Reinicia la API (`npm run dev` en `server`) para que lea el nuevo `.env`. Debe decir
   `(CI: gitlab)`.
2. En el portal: **Regresión › Ejecutar regresión**.
3. Verás **En cola** → **En curso** (cuando arranca el job) → resultado final, con enlaces a
   **Pipeline** y **Reporte completo**.
4. Prueba también **Sprint 02 › Ejecutar pruebas** (carpeta `cypress/e2e/sprints/sprint-02`).

## Problemas frecuentes

| Síntoma                                                    | Causa probable                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| "GitLab rechazó la ejecución (HTTP 404)"                   | `GITLAB_PROJECT_ID` incorrecto                                     |
| "GitLab rechazó la ejecución (HTTP 401/403)"               | Trigger token inválido, o "Minimum role to use pipeline variables" |
| El pipeline corre pero el portal se queda en **En cola**   | `PORTAL_API_URL` desactualizada (el túnel cambió) o túnel cerrado  |
| En el log: `[portal] Intento 1: HTTP 401`                  | `PORTAL_CI_TOKEN` distinto de `CI_RESULTS_TOKEN`                   |
| `SUITE=sprint requiere SPRINT_ID` / "No existe la carpeta" | El sprint del portal no tiene carpeta `sprint-XX` en qa-automation |
| Las variables `CYPRESS_*` llegan vacías                    | Están protegidas y el pipeline no corrió sobre `main`              |

Una ejecución que se quede "En cola" o "En curso" más de 2 horas deja de bloquear nuevas
ejecuciones de esa misma suite.
