import { env } from '../config/env.js';
import { FINAL_STATUSES, Run } from '../models/Run.js';
import { Sprint } from '../models/Sprint.js';
import { AppError } from '../utils/AppError.js';
import { describeTest, extractJiraKeys } from '../utils/jira.js';
import { ciProvider } from './ci/index.js';

// Registro en la terminal de la API (silencioso durante las pruebas automatizadas).
const log = env.NODE_ENV === 'test' ? () => {} : console.log;
const logError = env.NODE_ENV === 'test' ? () => {} : console.error;

// Una ejecución "en cola" o "en curso" más vieja que esto se considera abandonada
// (p. ej. el pipeline se canceló) y no bloquea nuevas ejecuciones.
const STALE_RUN_MS = 2 * 60 * 60 * 1000;

/**
 * Botón "Ejecutar pruebas": registra la ejecución en Mongo y dispara el pipeline.
 * El portal NO corre las pruebas; solo pide al CI que lo haga.
 */
export async function triggerRun({ suite, sprintId, user }) {
  let sprint = null;
  if (suite === 'sprint') {
    sprint = await Sprint.findById(sprintId);
    if (!sprint) throw new AppError(404, 'Sprint no encontrado');
    if (sprint.isClosed) {
      throw new AppError(409, 'El sprint está finalizado: no se pueden ejecutar sus pruebas');
    }
  }

  // Evita ejecuciones duplicadas por doble clic o por dos personas a la vez.
  const inProgress = await Run.exists({
    suite,
    sprint: sprint?._id ?? null,
    status: { $in: ['queued', 'running'] },
    createdAt: { $gte: new Date(Date.now() - STALE_RUN_MS) },
  });
  if (inProgress) throw new AppError(409, 'Ya hay una ejecución en curso para estas pruebas');

  const run = await Run.create({
    suite,
    sprint: sprint?._id ?? null,
    sprintNumber: sprint?.number ?? null,
    trigger: 'manual',
    triggeredBy: user._id,
    ci: { provider: ciProvider.name },
  });

  const label = suite === 'sprint' ? `sprint ${sprint.folder}` : suite;
  log(`[CI] Ejecución ${run.id}: solicitando pipeline (${label}) a ${ciProvider.name}…`);
  try {
    const { pipelineId, pipelineUrl } = await ciProvider.triggerPipeline({
      runId: run.id,
      suite,
      sprintNumber: sprint?.number,
    });
    run.ci.pipelineId = pipelineId;
    run.ci.pipelineUrl = pipelineUrl;
    await run.save();
    log(`[CI] Ejecución ${run.id}: pipeline ${pipelineId} creado ${pipelineUrl}`);
  } catch (error) {
    logError(`[CI] Ejecución ${run.id}: no se pudo crear el pipeline: ${error.message}`);
    // Queda registrado como fallido con el motivo, para que se vea en el historial.
    run.status = 'failed';
    run.error = error.message;
    run.finishedAt = new Date();
    await run.save();
    throw error;
  }

  return run;
}

/**
 * Cancela en el portal una ejecución que quedó "En cola" o "En curso" (p. ej. el pipeline
 * nunca respondió). No detiene el pipeline en GitLab: si luego envía resultados, se guardan.
 */
export async function cancelRun(id, user) {
  const run = await Run.findById(id);
  if (!run) throw new AppError(404, 'Ejecución no encontrada');
  if (FINAL_STATUSES.includes(run.status)) {
    throw new AppError(409, 'La ejecución ya terminó');
  }
  run.status = 'failed';
  run.error = `Cancelada en el portal por ${user.name}`;
  run.finishedAt = new Date();
  await run.save();
  log(`[CI] Ejecución ${run.id}: cancelada por ${user.email}`);
  return run;
}

/**
 * Procesa un resultado enviado por el pipeline (o por el proveedor simulado).
 * - Si trae runId (ejecución lanzada desde el portal), actualiza ese registro.
 * - Si no (nocturna, manual desde GitLab, tras despliegue), busca por pipelineId o crea uno.
 */
export async function applyCiResult(payload) {
  let run = null;

  if (payload.runId) {
    run = await Run.findById(payload.runId);
    if (!run) throw new AppError(404, 'Ejecución no encontrada');
  } else if (payload.ci?.pipelineId) {
    run = await Run.findOne({ 'ci.pipelineId': payload.ci.pipelineId });
  }

  if (!run) {
    const sprint = await resolveSprint(payload);
    run = new Run({
      suite: payload.suite,
      sprint: sprint?._id ?? null,
      sprintNumber: sprint?.number ?? null,
      trigger: payload.trigger,
    });
  }

  // Los mensajes pueden llegar desordenados: un "running" tardío no pisa un resultado final.
  if (payload.status === 'running' && FINAL_STATUSES.includes(run.status)) return run;

  log(`[CI] Ejecución ${run.id ?? 'nueva'}: el pipeline reporta "${payload.status}"`);
  run.status = payload.status;
  // Un resultado real reemplaza una cancelación previa hecha en el portal.
  if (run.error.startsWith('Cancelada')) run.error = '';
  // Campo por campo, para no borrar datos de CI que ya estaban guardados.
  for (const [key, value] of Object.entries(payload.ci ?? {})) {
    if (value) run.set(`ci.${key}`, value);
  }
  if (payload.reportUrl) run.reportUrl = payload.reportUrl;

  if (payload.status === 'running') {
    run.startedAt = run.startedAt ?? new Date();
  } else {
    if (payload.stats) run.stats = payload.stats;
    run.tests = payload.tests.map((test) => ({
      title: test.title,
      description: describeTest(test.title),
      jiraKeys: extractJiraKeys(test.title),
      group: test.group ?? 'regression',
      file: test.file ?? '',
      state: test.state,
      durationMs: test.durationMs ?? 0,
    }));
    run.startedAt = payload.startedAt ?? run.startedAt;
    run.finishedAt = payload.finishedAt ?? new Date();
  }

  await run.save();
  return run;
}

async function resolveSprint(payload) {
  if (payload.suite !== 'sprint' || !payload.sprintId) return null;
  return Sprint.findOne({ number: Number(payload.sprintId) });
}
