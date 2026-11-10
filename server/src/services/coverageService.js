import { ManualCaseResult } from '../models/ManualCaseResult.js';
import { FINAL_STATUSES, Run } from '../models/Run.js';

/**
 * Casos de prueba de cada tarea del sprint y su estado.
 *
 * La lista de casos sale de qa-automation: cada ejecución trae TODOS los casos del sprint,
 * también los pendientes y manuales (Cypress los omite pero los reporta con su ID).
 *   - automated: it() → su resultado lo da Cypress (passed / failed).
 *   - pending:   pendiente() → se automatizará; mientras tanto se prueba a mano.
 *   - manual:    manual() → se prueba a mano.
 * Los resultados manuales se registran en el portal por caso (colección ManualCaseResult).
 *
 * Se miran la última ejecución terminada del sprint (o de "all") y la última regresión,
 * porque un caso puede haberse movido ya a la regresión.
 */
export async function getSprintCoverage(sprint) {
  const finished = { status: { $in: FINAL_STATUSES } };
  const [sprintRun, regressionRun, manualResults] = await Promise.all([
    Run.findOne({ ...finished, $or: [{ suite: 'sprint', sprint: sprint._id }, { suite: 'all' }] })
      .sort({ createdAt: -1 })
      .select('tests createdAt'),
    Run.findOne({ ...finished, suite: { $in: ['regression', 'all'] } })
      .sort({ createdAt: -1 })
      .select('tests createdAt'),
    ManualCaseResult.find({ sprint: sprint._id }).populate({ path: 'testedBy', select: 'name' }),
  ]);

  // Por caso (tarea + descripción) se queda el dato más reciente.
  const casesByKey = new Map();
  for (const run of [regressionRun, sprintRun].filter(Boolean).sort(byDate)) {
    for (const test of run.tests) {
      for (const key of test.jiraKeys) casesByKey.set(`${key}|${test.description}`, test);
    }
  }
  const manualByKey = new Map(manualResults.map((m) => [`${m.taskKey}|${m.caseDescription}`, m]));

  const tasks = sprint.tasks.map((task) => {
    const cases = [...casesByKey.entries()]
      .filter(([k]) => k.startsWith(`${task.key}|`))
      .map(([k, test]) => toCase(test, manualByKey.get(k)));
    return {
      taskId: task.id,
      key: task.key,
      type: taskType(cases),
      result: taskResult(cases, task),
      summary: summarize(cases),
      cases,
    };
  });

  const allCases = tasks.flatMap((t) => t.cases);
  return {
    totalTasks: tasks.length,
    cases: summarize(allCases),
    tasks,
  };
}

function toCase(test, manual) {
  const base = {
    description: test.description,
    kind: test.kind ?? 'automated',
    reason: test.reason ?? '',
    group: test.group,
    durationMs: test.durationMs,
  };
  if (base.kind === 'automated') {
    // Sensible no activado: está automatizado pero en esta ejecución no corrió.
    return { ...base, result: ['passed', 'failed'].includes(test.state) ? test.state : 'notRun' };
  }
  return {
    ...base,
    result: manual?.result ?? 'pending',
    manual: manual
      ? {
          comment: manual.comment,
          testedAt: manual.testedAt,
          testedBy: manual.testedBy?.name ?? '',
        }
      : null,
  };
}

/** automated (todo automatizado) | manual (todo a mano) | mixed | none (sin casos en Cypress). */
function taskType(cases) {
  if (cases.length === 0) return 'none';
  const automated = cases.filter((c) => c.kind === 'automated').length;
  if (automated === cases.length) return 'automated';
  if (automated === 0) return 'manual';
  return 'mixed';
}

/** failed si algún caso falló; pending si falta probar alguno; passed si todos pasaron. */
function taskResult(cases, task) {
  if (cases.length === 0) return task.manualResult; // tarea sin casos: resultado a nivel tarea
  if (cases.some((c) => c.result === 'failed')) return 'failed';
  if (cases.some((c) => c.result === 'pending' || c.result === 'notRun')) return 'pending';
  return 'passed';
}

function summarize(cases) {
  const count = (kind, result) =>
    cases.filter((c) => c.kind === kind && (!result || c.result === result)).length;
  const group = (kind) => ({
    total: count(kind),
    passed: count(kind, 'passed'),
    failed: count(kind, 'failed'),
    pending: count(kind, 'pending') + count(kind, 'notRun'),
  });
  return {
    total: cases.length,
    automated: group('automated'),
    pending: group('pending'),
    manual: group('manual'),
  };
}

function byDate(a, b) {
  return a.createdAt - b.createdAt;
}
