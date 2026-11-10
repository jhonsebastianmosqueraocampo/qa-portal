import { ManualCaseResult } from '../models/ManualCaseResult.js';
import { Run } from '../models/Run.js';
import { Sprint } from '../models/Sprint.js';
import { getSprintCoverage } from '../services/coverageService.js';
import { AppError } from '../utils/AppError.js';
import { sprintStatusFilter } from '../utils/sprintStatus.js';

const CLOSED_MESSAGE = 'El sprint está finalizado: es de solo lectura';

async function findSprintOr404(id) {
  const sprint = await Sprint.findById(id);
  if (!sprint) throw new AppError(404, 'Sprint no encontrado');
  return sprint;
}

/** Un sprint finalizado no admite cambios en sus tareas ni resultados. */
function assertOpen(sprint) {
  if (sprint.isClosed) throw new AppError(409, CLOSED_MESSAGE);
}

/** Escapa caracteres especiales para usar texto del usuario dentro de una expresión regular. */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Lista de sprints con filtros:
 *  - status: planned (pendiente) | active | closed (finalizado)
 *  - q: busca en nombre/número del sprint y en ID o título de sus tareas
 * Cada sprint incluye las tareas que coinciden con la búsqueda (matchedTasks).
 */
export async function list(req, res) {
  const { status, q } = req.valid.query;
  const filter = { ...sprintStatusFilter(status) };
  let regex = null;

  if (q) {
    regex = new RegExp(escapeRegex(q), 'i');
    const textMatch = [{ name: regex }, { 'tasks.key': regex }, { 'tasks.title': regex }];
    if (/^\d+$/.test(q)) textMatch.push({ number: Number(q) });
    // $and para no pisar el $or que puede traer el filtro de estado
    filter.$and = [{ $or: textMatch }];
  }

  const sprints = await Sprint.find(filter).sort({ number: -1 });
  res.json({
    sprints: sprints.map((sprint) => {
      const { tasks, ...rest } = sprint.toJSON();
      const matchedTasks = regex
        ? tasks
            .filter((task) => regex.test(task.key) || regex.test(task.title))
            .slice(0, 5)
            .map(({ _id, key, title }) => ({ _id, key, title }))
        : [];
      return { ...rest, taskCount: tasks.length, matchedTasks };
    }),
  });
}

/** Detalle: sprint + tareas + estado de pruebas + última ejecución del sprint. */
export async function getById(req, res) {
  const sprint = await findSprintOr404(req.valid.params.id);
  await sprint.populate({ path: 'tasks.manualTestedBy', select: 'name' });
  const [coverage, lastRun] = await Promise.all([
    getSprintCoverage(sprint),
    Run.findOne({ suite: 'sprint', sprint: sprint._id })
      .sort({ createdAt: -1 })
      .populate({ path: 'triggeredBy', select: 'name email' }),
  ]);
  res.json({ sprint, coverage, lastRun });
}

export async function create(req, res) {
  const sprint = await Sprint.create(req.valid.body);
  res.status(201).json({ sprint });
}

export async function update(req, res) {
  const sprint = await findSprintOr404(req.valid.params.id);
  // Excepción: un administrador puede corregir un sprint finalizado (p. ej. sus fechas).
  if (sprint.isClosed && req.user.role !== 'admin') throw new AppError(409, CLOSED_MESSAGE);

  const { links, ...fields } = req.valid.body;
  sprint.set(fields);
  // Los enlaces se actualizan uno a uno para no borrar el que no se envió.
  if (links) {
    for (const [key, value] of Object.entries(links)) sprint.set(`links.${key}`, value);
  }
  if (sprint.startDate > sprint.endDate) {
    throw new AppError(400, 'La fecha de fin debe ser posterior a la de inicio');
  }
  await sprint.save();
  res.json({ sprint });
}

export async function remove(req, res) {
  const sprint = await findSprintOr404(req.valid.params.id);
  // El historial de ejecuciones se conserva (es evidencia); solo se desvincula del sprint.
  await Run.updateMany({ sprint: sprint._id }, { $set: { sprint: null } });
  await ManualCaseResult.deleteMany({ sprint: sprint._id });
  await sprint.deleteOne();
  res.status(204).end();
}

// ---- Tareas del sprint ----

export async function addTask(req, res) {
  const sprint = await findSprintOr404(req.valid.params.id);
  assertOpen(sprint);
  if (sprint.tasks.some((task) => task.key === req.valid.body.key)) {
    throw new AppError(409, `La tarea ${req.valid.body.key} ya está en este sprint`);
  }
  sprint.tasks.push(req.valid.body);
  await sprint.save();
  res.status(201).json({ task: sprint.tasks.at(-1) });
}

export async function updateTask(req, res) {
  const { id, taskId } = req.valid.params;
  const sprint = await findSprintOr404(id);
  assertOpen(sprint);
  const task = sprint.tasks.id(taskId);
  if (!task) throw new AppError(404, 'Tarea no encontrada');

  const { key } = req.valid.body;
  if (key && sprint.tasks.some((other) => other.key === key && other.id !== task.id)) {
    throw new AppError(409, `La tarea ${key} ya está en este sprint`);
  }
  task.set(req.valid.body);
  await sprint.save();
  res.json({ task });
}

/** Registra el resultado de la prueba manual de una tarea (quién y cuándo se guardan solos). */
export async function setManualResult(req, res) {
  const { id, taskId } = req.valid.params;
  const sprint = await findSprintOr404(id);
  assertOpen(sprint);
  const task = sprint.tasks.id(taskId);
  if (!task) throw new AppError(404, 'Tarea no encontrada');

  const { result, comment = '' } = req.valid.body;
  const pending = result === 'pending';
  task.set({
    manualResult: result,
    manualComment: comment,
    manualTestedAt: pending ? null : new Date(),
    manualTestedBy: pending ? null : req.user._id,
  });
  await sprint.save();
  res.json({ task });
}

/**
 * Registra el resultado manual de un caso (pendiente o manual) de una tarea.
 * Solo se aceptan casos que existen en la última ejecución del sprint y no son automatizados.
 */
export async function setManualCaseResult(req, res) {
  const sprint = await findSprintOr404(req.valid.params.id);
  assertOpen(sprint);
  const { taskKey, caseDescription, result, comment = '' } = req.valid.body;

  const coverage = await getSprintCoverage(sprint);
  const task = coverage.tasks.find((t) => t.key === taskKey);
  if (!task) throw new AppError(404, `La tarea ${taskKey} no está en este sprint`);
  const caso = task.cases.find((c) => c.description === caseDescription);
  if (!caso)
    throw new AppError(404, 'Caso no encontrado. Ejecuta las pruebas del sprint para cargarlo');
  if (caso.kind === 'automated') {
    throw new AppError(409, 'Este caso está automatizado: su resultado lo da Cypress');
  }

  const pending = result === 'pending';
  const saved = await ManualCaseResult.findOneAndUpdate(
    { sprint: sprint._id, taskKey, caseDescription },
    {
      result,
      comment,
      testedAt: pending ? null : new Date(),
      testedBy: pending ? null : req.user._id,
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  res.json({ result: saved });
}

export async function removeTask(req, res) {
  const { id, taskId } = req.valid.params;
  const sprint = await findSprintOr404(id);
  assertOpen(sprint);
  const task = sprint.tasks.id(taskId);
  if (!task) throw new AppError(404, 'Tarea no encontrada');
  task.deleteOne();
  await sprint.save();
  res.status(204).end();
}
