import { Run } from '../models/Run.js';
import { applyCiResult, cancelRun, triggerRun } from '../services/runService.js';
import { AppError } from '../utils/AppError.js';

const POPULATE_SPRINT = { path: 'sprint', select: 'number name' };
const POPULATE_USER = { path: 'triggeredBy', select: 'name email' };

/** Historial con filtros y paginación. La lista no incluye el detalle de cada prueba. */
export async function list(req, res) {
  const { suite, sprintId, status, from, to, page, limit } = req.valid.query;
  const filter = {};
  if (suite) filter.suite = suite;
  if (sprintId) filter.sprint = sprintId;
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }

  const [runs, total] = await Promise.all([
    Run.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-tests')
      .populate(POPULATE_SPRINT)
      .populate(POPULATE_USER),
    Run.countDocuments(filter),
  ]);

  res.json({ runs, page, limit, total, totalPages: Math.ceil(total / limit) });
}

/** Última ejecución de una suite (para la tarjeta destacada de Regresión). */
export async function latest(req, res) {
  const { suite, sprintId } = req.valid.query;
  const filter = { suite, ...(sprintId && { sprint: sprintId }) };
  const run = await Run.findOne(filter)
    .sort({ createdAt: -1 })
    .populate(POPULATE_SPRINT)
    .populate(POPULATE_USER);
  res.json({ run });
}

/** Detalle con la lista de pruebas (ID, descripción, resultado, duración). */
export async function getById(req, res) {
  const run = await Run.findById(req.valid.params.id)
    .populate(POPULATE_SPRINT)
    .populate(POPULATE_USER);
  if (!run) throw new AppError(404, 'Ejecución no encontrada');
  res.json({ run });
}

/** Botón "Ejecutar pruebas". Responde 202: aceptada, el resultado llega después. */
export async function create(req, res) {
  const run = await triggerRun({ ...req.valid.body, user: req.user });
  res.status(202).json({ run });
}

/** Cancela una ejecución atascada en el portal. */
export async function cancel(req, res) {
  const run = await cancelRun(req.valid.params.id, req.user);
  res.json({ run });
}

/** Resultados enviados por el pipeline (protegido con el token de CI). */
export async function receiveCiResult(req, res) {
  const run = await applyCiResult(req.valid.body);
  res.json({ runId: run.id, status: run.status });
}
