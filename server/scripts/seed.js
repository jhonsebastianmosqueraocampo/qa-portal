// Datos de ejemplo para desarrollar sin depender de GitLab ni de datos reales.
//   npm run seed
// BORRA sprints, ejecuciones y configuración, y crea/actualiza el usuario administrador
// definido en SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD del archivo .env.
import { connectDb, disconnectDb } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { Run } from '../src/models/Run.js';
import { Sprint } from '../src/models/Sprint.js';
import { User } from '../src/models/User.js';
import { extractJiraKeys, parseTestTitle } from '../src/utils/jira.js';
import { ManualCaseResult } from '../src/models/ManualCaseResult.js';

if (env.NODE_ENV === 'production') {
  console.error('El seed no se ejecuta en producción.');
  process.exit(1);
}

const { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME = 'Administrador QA' } = process.env;
if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD || SEED_ADMIN_PASSWORD.length < 12) {
  console.error('Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD (mín. 12 caracteres) en .env');
  process.exit(1);
}

// Enlaces de ejemplo: reemplázalos desde el portal por los reales de tu Jira/Confluence.
const JIRA = 'https://tu-empresa.atlassian.net/browse';
const WIKI = 'https://tu-empresa.atlassian.net/wiki/spaces/QA/pages';
const DAY = 24 * 60 * 60 * 1000;

const REGRESSION_TESTS = [
  'UA-001 inicia sesión con credenciales válidas',
  'UA-002 muestra error con contraseña inválida',
  'UA-003 muestra error con usuario inexistente',
];
// Sprint activo: UA-005 tiene DOS casos de prueba (una tarea puede tener varios).
const SPRINT_02_TESTS = [
  'UA-004 cierra sesión y vuelve al login',
  'UA-005 no permite volver al área segura tras cerrar sesión',
  'UA-005 muestra el mensaje de sesión cerrada',
  // Casos que Cypress no ejecuta pero reporta (ver qa-automation/cypress/support/casos.js)
  '[PENDIENTE] UA-005 cierra sesión en dos pestañas a la vez — falta desplegar en PRE',
  '[MANUAL] UA-010 recibe el correo de recuperación de contraseña — necesita un buzón de pruebas',
  '[MANUAL] UA-010 el enlace de recuperación caduca a las 24 h — requiere esperar 24 h',
];

/** Fecha "de día" (medianoche UTC) desplazada N días desde hoy, como las guarda el portal. */
function day(offset) {
  const date = new Date(Date.now() + offset * DAY);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function task(key, title) {
  return { key, title, jiraUrl: `${JIRA}/${key}` };
}

/** Construye un documento de ejecución con fecha en el pasado. */
function buildRun({ suite, sprint, daysAgo, titles, failIndexes = [], trigger = 'nightly' }) {
  const finishedAt = new Date(Date.now() - daysAgo * DAY);
  const tests = titles.map((title, index) => {
    const caso = parseTestTitle(title);
    const ejecutada = caso.kind === 'automated';
    return {
      title,
      description: caso.description,
      kind: caso.kind,
      reason: caso.reason,
      jiraKeys: extractJiraKeys(caso.name),
      group: sprint ? sprint.folder : 'regression',
      file: sprint
        ? `cypress/e2e/sprints/${sprint.folder}/logout.cy.js`
        : 'cypress/e2e/regression/login.cy.js',
      state: !ejecutada ? 'pending' : failIndexes.includes(index) ? 'failed' : 'passed',
      durationMs: ejecutada ? 1500 + ((index * 997 + daysAgo * 131) % 3500) : 0,
    };
  });
  const failed = tests.filter((test) => test.state === 'failed').length;
  const pending = tests.filter((test) => test.state === 'pending').length;
  const durationMs = tests.reduce((sum, test) => sum + test.durationMs, 0);

  const doc = new Run({
    suite,
    sprint: sprint?._id ?? null,
    sprintNumber: sprint?.number ?? null,
    status: failed ? 'failed' : 'passed',
    trigger,
    stats: {
      total: tests.length,
      passed: tests.length - failed - pending,
      failed,
      pending,
      durationMs,
    },
    tests,
    reportUrl: '',
    ci: { provider: 'seed', pipelineId: `seed-${suite}-${daysAgo}` },
    startedAt: new Date(finishedAt.getTime() - durationMs),
    finishedAt,
  }).toObject();
  return { ...doc, createdAt: doc.startedAt, updatedAt: finishedAt };
}

await connectDb(env.MONGODB_URI);

await Promise.all([Sprint.deleteMany({}), Run.deleteMany({}), ManualCaseResult.deleteMany({})]);

// Usuario administrador (se actualiza la contraseña si ya existía)
let admin = await User.findOne({ email: SEED_ADMIN_EMAIL.toLowerCase() });
admin ??= new User({ email: SEED_ADMIN_EMAIL, name: SEED_ADMIN_NAME, role: 'admin' });
await admin.setPassword(SEED_ADMIN_PASSWORD);
admin.active = true;
await admin.save();

// Un sprint en cada estado. El estado se calcula con las fechas.
const [, sprint2] = await Sprint.create([
  {
    // Finalizado: sus pruebas ya se movieron a regresión (UA-001..003 aparecen en la regresión)
    number: 1,
    name: 'Sprint 01',
    startDate: day(-24),
    endDate: day(-10),
    links: {
      testDesign: `${WIKI}/1001/Diseno+Sprint+01`,
      testExecution: `${WIKI}/1002/Ejecucion+Sprint+01`,
      regressionSummary: `${WIKI}/1003/Regresion+Sprint+01`,
    },
    tasks: [
      task('UA-001', 'Iniciar sesión'),
      task('UA-002', 'Validar contraseña incorrecta'),
      task('UA-003', 'Validar usuario inexistente'),
      {
        ...task('UA-008', 'Ver perfil de usuario'),
        manualResult: 'passed',
        manualComment: 'Revisado en escritorio y móvil',
        manualTestedAt: day(-12),
        manualTestedBy: admin._id,
      },
    ],
  },
  {
    // Activo
    number: 2,
    name: 'Sprint 02',
    startDate: day(-9),
    endDate: day(5),
    links: {
      testDesign: `${WIKI}/2001/Diseno+Sprint+02`,
      testExecution: `${WIKI}/2002/Ejecucion+Sprint+02`,
      regressionSummary: `${WIKI}/2003/Regresion+Sprint+02`,
    },
    tasks: [
      task('UA-004', 'Cerrar sesión'),
      task('UA-005', 'Proteger el área segura tras cerrar sesión'),
      // Tarea con casos manuales (declarados con manual() en Cypress)
      task('UA-010', 'Recuperar contraseña'),
    ],
  },
  {
    // Pendiente
    number: 3,
    name: 'Sprint 03',
    startDate: day(6),
    endDate: day(19),
    links: { testDesign: '', testExecution: '', regressionSummary: '' },
    tasks: [
      task('UA-011', 'Bloquear usuario tras 3 intentos fallidos'),
      task('UA-012', 'Cambiar contraseña'),
    ],
  },
]);

// Historial: regresión nocturna de los últimos 30 días hábiles + ejecuciones del sprint 02
const runs = [];
for (let daysAgo = 30; daysAgo >= 1; daysAgo -= 1) {
  const weekday = new Date(Date.now() - daysAgo * DAY).getDay();
  if (weekday === 0 || weekday === 6) continue; // sin fines de semana
  const failIndexes = daysAgo % 9 === 0 ? [1] : []; // algunas fallas para que el historial sea realista
  runs.push(buildRun({ suite: 'regression', daysAgo, titles: REGRESSION_TESTS, failIndexes }));
}
runs.push(
  buildRun({
    suite: 'sprint',
    sprint: sprint2,
    daysAgo: 3,
    titles: SPRINT_02_TESTS,
    failIndexes: [1],
    trigger: 'manual',
  }),
  buildRun({
    suite: 'sprint',
    sprint: sprint2,
    daysAgo: 1,
    titles: SPRINT_02_TESTS,
    trigger: 'manual',
  }),
);
// Inserción directa a la colección para conservar las fechas pasadas (Mongoose pondría "ahora").
await Run.collection.insertMany(runs);

// Resultado manual de uno de los casos manuales de UA-010 (el otro queda sin probar).
await ManualCaseResult.create({
  sprint: sprint2._id,
  taskKey: 'UA-010',
  caseDescription: 'recibe el correo de recuperación de contraseña',
  result: 'passed',
  comment: 'Correo recibido en el buzón de pruebas',
  testedAt: day(-1),
  testedBy: admin._id,
});

console.log(`Seed listo: 3 sprints, ${runs.length} ejecuciones, usuario admin ${admin.email}`);
await disconnectDb();
