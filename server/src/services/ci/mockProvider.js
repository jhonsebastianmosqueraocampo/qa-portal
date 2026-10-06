import { Sprint } from '../../models/Sprint.js';
import { ciResultBody } from '../../validators/runValidators.js';

// Tiempos de la simulación: "en cola" → "en curso" → resultado final.
const RUNNING_AFTER_MS = 1500;
const FINISHED_AFTER_MS = 6000;
const FAILURE_PROBABILITY = 0.2;

const REGRESSION_TESTS = [
  'UA-001 inicia sesión con credenciales válidas',
  'UA-002 muestra error con contraseña inválida',
  'UA-003 muestra error con usuario inexistente',
];

/**
 * Proveedor SIMULADO para desarrollar sin GitLab.
 * Imita lo que haría el pipeline real: unos segundos después envía "running" y luego el
 * resultado final, pasando por la MISMA función que procesa los resultados reales
 * (applyCiResult). Así se prueba el flujo completo del portal sin depender de nada externo.
 */
export function createMockProvider() {
  return {
    name: 'mock',

    async triggerPipeline({ runId, suite, sprintNumber }) {
      const pipelineId = `mock-${Date.now()}`;
      const base = {
        runId,
        suite,
        sprintId: sprintNumber ? String(sprintNumber).padStart(2, '0') : null,
        trigger: 'manual',
        ci: { provider: 'mock', pipelineId },
      };

      schedule(RUNNING_AFTER_MS, () => send({ ...base, status: 'running' }));
      schedule(FINISHED_AFTER_MS, async () => {
        const titles = await buildTitles(suite, sprintNumber);
        const tests = titles.map((title) => ({
          title,
          group: suite === 'sprint' ? `sprint-${base.sprintId}` : 'regression',
          state: Math.random() < FAILURE_PROBABILITY ? 'failed' : 'passed',
          durationMs: 1000 + Math.round(Math.random() * 4000),
        }));
        const failed = tests.filter((test) => test.state === 'failed').length;
        const durationMs = tests.reduce((sum, test) => sum + test.durationMs, 0);
        await send({
          ...base,
          status: failed > 0 ? 'failed' : 'passed',
          stats: { total: tests.length, passed: tests.length - failed, failed, durationMs },
          tests,
          startedAt: new Date(Date.now() - durationMs),
          finishedAt: new Date(),
        });
      });

      return { pipelineId, pipelineUrl: '' };
    },
  };
}

/** Pruebas simuladas: una por tarea del sprint, excepto la última (para ver tareas sin cobertura). */
async function buildTitles(suite, sprintNumber) {
  if (suite !== 'sprint') return REGRESSION_TESTS;
  const sprint = await Sprint.findOne({ number: sprintNumber });
  const tasks = sprint?.tasks ?? [];
  return tasks.slice(0, Math.max(tasks.length - 1, 1)).map((task) => `${task.key} ${task.title}`);
}

function schedule(delay, fn) {
  // unref(): el temporizador no impide que el proceso termine (útil en las pruebas).
  setTimeout(() => {
    fn().catch((error) => console.error('[mock CI]', error.message));
  }, delay).unref();
}

async function send(payload) {
  // Import dinámico para evitar una dependencia circular (runService usa ciProvider).
  const { applyCiResult } = await import('../runService.js');
  // Se valida con el mismo esquema que los resultados reales del pipeline.
  await applyCiResult(ciResultBody.parse(payload));
}
