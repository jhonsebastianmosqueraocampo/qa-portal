# qa-portal · client

Interfaz web del qa-portal: **React 19 + TypeScript + Vite + Material UI**.

| Pantalla  | Ruta               | Qué muestra                                                                                                                                                                        |
| --------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sprints   | `/sprints`         | Lista de sprints y botón para crear uno                                                                                                                                            |
| Detalle   | `/sprints/:id`     | Tareas (con enlace a Jira) automatizadas/manuales, registro del resultado manual, «Pruebas exploratorias» (Confluence), «Ejecutar pruebas», última ejecución e historial           |
| Regresión | `/regresion`       | Última regresión destacada, «Ejecutar regresión» e historial con filtros                                                                                                           |
| Ejecución | `/ejecuciones/:id` | Cada prueba con su ID, descripción, resultado y duración                                                                                                                           |
| Informes  | `/informes`        | Por sprint (acordeón): tareas automatizadas y manuales con sus resultados, ejecuciones con su tasa de éxito, enlaces de pruebas exploratorias y resumen de regresión en Confluence |

## Requisitos

La API (`../server`) corriendo en `http://localhost:4000`.

## Instalación y uso (PowerShell)

```powershell
cd C:\Users\USUARIO\Documents\Proyectos\Portal\qa-portal\client
npm install
npm run dev      # http://localhost:5173
```

| Comando             | Qué hace                                       |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo con recarga instantánea |
| `npm run build`     | Verifica tipos (TypeScript) y genera `dist/`   |
| `npm run typecheck` | Solo verifica tipos                            |
| `npm run lint`      | ESLint                                         |
| `npm run format`    | Prettier                                       |

No necesita archivo `.env`: en desarrollo Vite reenvía `/api` al backend (ver
`vite.config.ts`), así el navegador ve un solo origen y la cookie de sesión funciona sin
configuración de CORS.

## Estructura

```
src/
├── api/
│   ├── client.ts     Cliente HTTP único (fetch + manejo de errores)
│   ├── hooks.ts      Hooks de datos con TanStack Query (caché, carga, errores, polling)
│   └── types.ts      Tipos de las respuestas de la API
├── components/       Layout, diálogos, tablas de ejecuciones, chips de estado…
├── pages/            Una por ruta
├── utils/            Formato de fechas/duraciones y etiquetas
├── theme.ts          Tema de MUI (claro/oscuro, colores, tipografía)
└── main.tsx          Proveedores y rutas
```

## Decisiones técnicas

- **TypeScript:** detecta en el editor errores como usar un campo que la API no envía.
- **TanStack Query** para los datos: evita escribir a mano en cada pantalla el estado de
  carga, error, caché y refresco. Tras crear/editar algo se invalida la caché y la
  pantalla se actualiza sola.
- **Estado en vivo con polling:** mientras una ejecución está «En cola» o «En curso», la
  pantalla consulta la API cada 3 s y se detiene al terminar. Es simple y suficiente para
  un equipo pequeño. Alternativas a futuro: **Server-Sent Events** (el servidor avisa al
  navegador; simple y unidireccional) o **WebSockets** (bidireccional), que evitan
  consultas innecesarias cuando hay muchos usuarios.
- **Seguridad:** los enlaces externos abren en pestaña nueva con `rel="noopener noreferrer"`,
  y la API solo acepta enlaces `http(s)`.
