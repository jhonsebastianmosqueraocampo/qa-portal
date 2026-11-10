import { FINAL_STATUSES, Run } from '../models/Run.js';
import { Sprint } from '../models/Sprint.js';
import { getSprintCoverage } from './coverageService.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const RUN_FIELDS = 'suite status trigger stats reportUrl createdAt finishedAt';

/**
 * Informe sprint a sprint:
 * - Tareas: automatizadas (con prueba de Cypress) y manuales, con sus resultados.
 * - Ejecuciones de las pruebas del sprint (con su tasa de éxito).
 * - Ejecuciones de regresión hechas dentro de las fechas del sprint.
 *
 * Tasa de éxito = pruebas que pasaron / pruebas ejecutadas (las pendientes y manuales no cuentan).
 */
export async function getSprintReports() {
  const sprints = await Sprint.find().sort({ number: -1 });

  return Promise.all(
    sprints.map(async (sprint) => {
      const [coverage, sprintRuns, regressionRuns] = await Promise.all([
        getSprintCoverage(sprint),
        Run.find({ suite: 'sprint', sprint: sprint._id, status: { $in: FINAL_STATUSES } })
          .sort({ createdAt: -1 })
          .select(RUN_FIELDS)
          .lean(),
        findRegressionRunsDuring(sprint),
      ]);

      return {
        sprint: {
          _id: sprint.id,
          number: sprint.number,
          name: sprint.name,
          folder: sprint.folder,
          status: sprint.status,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          links: sprint.links,
        },
        tasks: {
          total: coverage.totalTasks,
          withoutCases: coverage.tasks.filter((t) => t.type === 'none').length,
        },
        // Casos por tipo: automatizados (Cypress), pendientes de automatizar y manuales.
        cases: coverage.cases,
        sprintRuns: summarize(sprintRuns),
        regression: summarize(regressionRuns),
      };
    }),
  );
}

/** Regresiones ejecutadas entre la fecha de inicio y la de fin (inclusive) del sprint. */
function findRegressionRunsDuring(sprint) {
  if (!sprint.startDate || !sprint.endDate) return [];
  return Run.find({
    suite: { $in: ['regression', 'all'] },
    status: { $in: FINAL_STATUSES },
    createdAt: { $gte: sprint.startDate, $lt: new Date(sprint.endDate.getTime() + DAY_MS) },
  })
    .sort({ createdAt: -1 })
    .select(RUN_FIELDS)
    .lean();
}

/** Pruebas que se ejecutaron (pasaron o fallaron): las pendientes/manuales no cuentan. */
const executed = (stats) => stats.passed + stats.failed;

function summarize(runs) {
  const tests = runs.reduce((sum, run) => sum + executed(run.stats), 0);
  const passed = runs.reduce((sum, run) => sum + run.stats.passed, 0);
  return {
    total: runs.length,
    passedRuns: runs.filter((run) => run.status === 'passed').length,
    testsExecuted: tests,
    testsPassed: passed,
    successRate: tests ? Math.round((passed / tests) * 100) : null,
    lastRunAt: runs[0]?.createdAt ?? null,
    runs: runs.map((run) => ({
      _id: run._id,
      createdAt: run.createdAt,
      status: run.status,
      trigger: run.trigger,
      stats: run.stats,
      reportUrl: run.reportUrl,
      successRate: executed(run.stats)
        ? Math.round((run.stats.passed / executed(run.stats)) * 100)
        : null,
    })),
  };
}
