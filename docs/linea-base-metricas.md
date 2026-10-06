# Línea base de métricas (antes de la automatización)

Objetivo: medir **hoy**, con el proceso manual, lo mismo que el portal medirá después.
Sin línea base no hay "antes y después" que mostrar a la empresa.

Registra los datos de al menos **2 o 3 sprints** (una sola medición no es representativa).

> **Estado:** el registro de estas mediciones y el cálculo de tiempo ahorrado en el portal quedan
> como **mejora futura** (ver [mejoras-futuras.md](mejoras-futuras.md)). Mientras tanto, usa
> esta plantilla para medir y guardar la línea base.

## 1. Métricas a medir

| #   | Métrica                                          | Cómo medirla hoy (manual)                                                             | Cómo la medirá el portal                                    | Valor base |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------- |
| 1   | Tiempo de una regresión completa (horas-persona) | Cronometrar la próxima regresión manual de inicio a fin, sumando a todas las personas | Duración de las ejecuciones `regression` en `Run`           |            |
| 2   | Nº de casos de regresión                         | Contar los casos del set de regresión                                                 | `stats.total` de la última regresión                        |            |
| 3   | Minutos promedio por caso manual                 | Métrica 1 ÷ métrica 2                                                                 | (mejora futura)                                             |            |
| 4   | Frecuencia de regresión                          | ¿Cuántas veces por sprint / mes se corre?                                             | Nº de `Run` por periodo (nocturnas incluidas)               |            |
| 5   | Bugs escapados a producción                      | Bugs en Jira creados en prod por sprint (filtro JQL, ver abajo)                       | Mismo filtro JQL vía API                                    |            |
| 6   | Tiempo dedicado a informes de QA (horas/sprint)  | Estimar cuánto toma armar reportes y evidencias                                       | ~0: el reporte lo genera el pipeline                        |            |
| 7   | % de tareas del sprint con prueba automatizada   | 0 % hoy                                                                               | Indicador de cobertura por sprint                           | 0 %        |
| 8   | Tiempo de feedback tras un despliegue a QA       | Horas desde el despliegue hasta "QA terminó el smoke"                                 | Hora del despliegue → fin del `Run` con disparador `deploy` |            |

## 2. Fórmulas (para la mejora futura de tiempo ahorrado)

- **Tiempo ahorrado por ejecución** = `casos automatizados ejecutados × minutos por caso manual − duración de la ejecución automatizada`
- **Tasa de éxito** (la que usa el portal) = `pruebas que pasaron ÷ pruebas ejecutadas`
- **Cobertura del sprint** = `tareas con al menos una prueba con su ID de Jira ÷ total de tareas`

## 3. Ejemplo de JQL para bugs escapados (ajustar a tu Jira)

```
project = <PROYECTO> AND issuetype = Bug AND "Ambiente" = Producción AND created >= startOfMonth(-1)
```

> El campo "Ambiente" es un ejemplo: confirma cómo se marca en tu Jira un bug encontrado en producción.

## 4. Registro

| Sprint | Fecha | Métrica 1 | Métrica 2 | Métrica 5 | Métrica 6 | Métrica 8 | Notas |
| ------ | ----- | --------- | --------- | --------- | --------- | --------- | ----- |
|        |       |           |           |           |           |           |       |
