# Mejoras futuras

Ideas acordadas que se dejaron fuera del alcance actual. Al retomar una, conviene crear su
tarea en Jira.

## Valor de la automatización (tiempo ahorrado)

- **Tiempo ahorrado frente a la ejecución manual:** `pruebas ejecutadas × minutos por caso manual
− duración de la ejecución automatizada`, con un campo configurable de minutos por caso.
- **Evitar inflar la cifra:** contar como máximo una ejecución por día por suite/sprint
  (repetir el botón varias veces no equivale a varias regresiones manuales).
- **Línea base en el portal:** registrar mediciones "antes (manual)" y "con automatización"
  (horas de regresión, casos, bugs escapados, horas en informes) y mostrar la comparación con
  su porcentaje de cambio. Sugerir los minutos por caso a partir de esas mediciones.
  Mientras tanto se mide con [linea-base-metricas.md](linea-base-metricas.md).

## Otras

- Estado en vivo con Server-Sent Events o WebSockets en lugar de polling.
- Integración directa con la API de Jira (traer sprints y tareas) y de Confluence.
- Marcar desde la creación del sprint qué tareas se van a automatizar (hoy se deduce al ejecutar:
  si Cypress encuentra el ID es automatizada; si no, manual).
