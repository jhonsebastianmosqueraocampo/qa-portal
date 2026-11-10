// Mapa de rutas de la API. Cada línea: método + ruta → validación → controlador.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as auth from '../controllers/authController.js';
import * as reports from '../controllers/reportController.js';
import * as runs from '../controllers/runController.js';
import * as sprints from '../controllers/sprintController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireCiToken } from '../middleware/ciToken.js';
import { validate } from '../middleware/validate.js';
import { loginBody } from '../validators/authValidators.js';
import { idParams } from '../validators/common.js';
import {
  ciResultBody,
  createRunBody,
  latestRunQuery,
  listRunsQuery,
} from '../validators/runValidators.js';
import {
  createSprintBody,
  createTaskBody,
  listSprintsQuery,
  manualCaseResultBody,
  manualResultBody,
  taskParams,
  updateSprintBody,
  updateTaskBody,
} from '../validators/sprintValidators.js';

export const router = Router();

// Limita intentos de login por IP: frena ataques de fuerza bruta a contraseñas.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { message: 'Demasiados intentos. Espera 15 minutos' } },
});

router.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ---- Autenticación ----
router.post('/auth/login', loginLimiter, validate({ body: loginBody }), auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', requireAuth, auth.me);

// ---- Resultados desde el pipeline (token de CI, no sesión de usuario) ----
router.post('/ci/results', requireCiToken, validate({ body: ciResultBody }), runs.receiveCiResult);

// ---- Todo lo de abajo requiere sesión ----
router.use(requireAuth);

router.get('/sprints', validate({ query: listSprintsQuery }), sprints.list);
router.post('/sprints', validate({ body: createSprintBody }), sprints.create);
router.get('/sprints/:id', validate({ params: idParams }), sprints.getById);
router.patch(
  '/sprints/:id',
  validate({ params: idParams, body: updateSprintBody }),
  sprints.update,
);
router.delete('/sprints/:id', requireRole('admin'), validate({ params: idParams }), sprints.remove);

router.post(
  '/sprints/:id/tasks',
  validate({ params: idParams, body: createTaskBody }),
  sprints.addTask,
);
router.patch(
  '/sprints/:id/tasks/:taskId',
  validate({ params: taskParams, body: updateTaskBody }),
  sprints.updateTask,
);
router.delete('/sprints/:id/tasks/:taskId', validate({ params: taskParams }), sprints.removeTask);
router.put(
  '/sprints/:id/tasks/:taskId/manual-result',
  validate({ params: taskParams, body: manualResultBody }),
  sprints.setManualResult,
);

router.put(
  '/sprints/:id/cases/manual-result',
  validate({ params: idParams, body: manualCaseResultBody }),
  sprints.setManualCaseResult,
);

router.get('/runs', validate({ query: listRunsQuery }), runs.list);
router.get('/runs/latest', validate({ query: latestRunQuery }), runs.latest);
router.get('/runs/:id', validate({ params: idParams }), runs.getById);
router.post('/runs', validate({ body: createRunBody }), runs.create);
router.post('/runs/:id/cancel', validate({ params: idParams }), runs.cancel);

// ---- Informes (Dashboard) ----
router.get('/reports/sprints', reports.sprints);
