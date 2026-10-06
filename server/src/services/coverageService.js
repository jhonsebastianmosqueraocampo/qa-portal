import { FINAL_STATUSES, Run } from '../models/Run.js';

/**
 * Estado de pruebas de cada tarea del sprint.
 *
 * Una tarea es AUTOMATIZADA si su clave de Jira aparece en el nombre de alguna prueba de
 * Cypress ejecutada (convención it('UA-123 ...')). Si no aparece, es MANUAL y su resultado
 * es el que se registra a mano en el portal.
 *
 * Se miran las pruebas de la última ejecución terminada del sprint (o de "all") y de la
 * última regresión, porque una prueba de la tarea puede haberse movido ya a regresión.
 */
export async function getSprintCoverage(sprint) {
  const finished = { status: { $in: FINAL_STATUSES } };
  const [sprintRun, regressionRun] = await Promise.all([
    Run.findOne({ ...finished, $or: [{ suite: 'sprint', sprint: sprint._id }, { suite: 'all' }] })
      .sort({ createdAt: -1 })
      .select('tests createdAt'),
    Run.findOne({ ...finished, suite: { $in: ['regression', 'all'] } })
      .sort({ createdAt: -1 })
      .select('tests createdAt'),
  ]);

  // Por título de prueba se queda el resultado más reciente.
  const testsByTitle = new Map();
  for (const run of [regressionRun, sprintRun].filter(Boolean).sort(byDate)) {
    for (const test of run.tests) testsByTitle.set(test.title, test);
  }
  const tests = [...testsByTitle.values()];

  const tasks = sprint.tasks.map((task) => {
    const matching = tests.filter((test) => test.jiraKeys.includes(task.key));
    if (matching.length > 0) {
      return {
        taskId: task.id,
        key: task.key,
        type: 'automated',
        testCount: matching.length,
        // Una tarea puede tener varios casos de prueba: pasa solo si TODOS pasaron.
        result: matching.some((test) => test.state === 'failed') ? 'failed' : 'passed',
        tests: matching.map((test) => ({
          title: test.title,
          description: test.description,
          state: test.state,
          durationMs: test.durationMs,
          group: test.group,
        })),
      };
    }
    return {
      taskId: task.id,
      key: task.key,
      type: 'manual',
      testCount: 0,
      result: task.manualResult,
      tests: [],
    };
  });

  const count = (type, result) =>
    tasks.filter((task) => task.type === type && (!result || task.result === result)).length;

  return {
    totalTasks: tasks.length,
    automated: {
      total: count('automated'),
      passed: count('automated', 'passed'),
      failed: count('automated', 'failed'),
    },
    manual: {
      total: count('manual'),
      passed: count('manual', 'passed'),
      failed: count('manual', 'failed'),
      pending: count('manual', 'pending'),
    },
    tasks,
  };
}

function byDate(a, b) {
  return a.createdAt - b.createdAt;
}
