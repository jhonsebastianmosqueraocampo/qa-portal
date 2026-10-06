// Pruebas de integración de la API: levantan la app en memoria (sin abrir un puerto) y
// usan una base de datos SEPARADA (qa_portal_test) que se borra al empezar.
//   npm test
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';

// Configuración de prueba ANTES de importar la app (env.js se lee al importarse).
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI =
  process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/qa_portal_test';
process.env.CI_PROVIDER = 'mock';
process.env.JWT_SECRET = 'test-secret-de-al-menos-treinta-y-dos-caracteres';
process.env.CI_RESULTS_TOKEN = 'test-ci-token-de-al-menos-treinta-y-dos-caracteres';

const { default: request } = await import('supertest');
const { default: mongoose } = await import('mongoose');
const { createApp } = await import('../src/app.js');
const { User } = await import('../src/models/User.js');

const app = createApp();
const agent = request.agent(app); // conserva la cookie de sesión entre peticiones
const CI_AUTH = `Bearer ${process.env.CI_RESULTS_TOKEN}`;
const PASSWORD = 'clave-de-prueba-123';

/** Fecha YYYY-MM-DD desplazada N días desde hoy. */
const dayOffset = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await mongoose.connection.dropDatabase();
  const user = new User({ email: 'qa@test.local', name: 'QA Test', role: 'admin' });
  await user.setPassword(PASSWORD);
  await user.save();
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('Autenticación', () => {
  it('rechaza peticiones sin sesión', async () => {
    const res = await request(app).get('/api/sprints');
    assert.equal(res.status, 401);
  });

  it('rechaza una contraseña incorrecta con mensaje genérico', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'qa@test.local', password: 'incorrecta' });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.message, 'Correo o contraseña incorrectos');
  });

  it('inicia sesión con cookie httpOnly y no devuelve el hash', async () => {
    const res = await agent
      .post('/api/auth/login')
      .send({ email: 'QA@test.local', password: PASSWORD });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.passwordHash, undefined);
    assert.match(res.headers['set-cookie'][0], /HttpOnly/i);
    assert.match(res.headers['set-cookie'][0], /SameSite=Strict/i);
  });
});

describe('Sprints y tareas', () => {
  let sprintId;

  it('crea un sprint con enlaces de exploratorias', async () => {
    const res = await agent.post('/api/sprints').send({
      number: 1,
      name: 'Sprint 01',
      startDate: dayOffset(-3),
      endDate: dayOffset(7),
      links: { testDesign: 'https://empresa.atlassian.net/wiki/diseno' },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.sprint.folder, 'sprint-01');
    assert.equal(res.body.sprint.status, 'active', 'el estado se calcula con las fechas');
    sprintId = res.body.sprint._id;
  });

  it('rechaza enlaces que no son http(s)', async () => {
    const res = await agent
      .patch(`/api/sprints/${sprintId}`)
      .send({ links: { testExecution: 'javascript:alert(1)' } });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.details[0].field, 'links.testExecution');
  });

  it('rechaza un número de sprint duplicado', async () => {
    const res = await agent.post('/api/sprints').send({
      number: 1,
      name: 'Otro',
      startDate: dayOffset(1),
      endDate: dayOffset(2),
    });
    assert.equal(res.status, 409);
  });

  it('agrega tareas y normaliza la clave a mayúsculas', async () => {
    const res = await agent.post(`/api/sprints/${sprintId}/tasks`).send({
      key: 'ua-004',
      title: 'Cerrar sesión',
      jiraUrl: 'https://empresa.atlassian.net/browse/UA-004',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.task.key, 'UA-004');
    await agent
      .post(`/api/sprints/${sprintId}/tasks`)
      .send({ key: 'UA-010', title: 'Recuperar contraseña' });
  });

  it('rechaza una tarea repetida en el mismo sprint', async () => {
    const res = await agent
      .post(`/api/sprints/${sprintId}/tasks`)
      .send({ key: 'UA-004', title: 'X' });
    assert.equal(res.status, 409);
  });

  it('calcula la cobertura a partir de los resultados del pipeline', async () => {
    const res = await request(app)
      .post('/api/ci/results')
      .set('Authorization', CI_AUTH)
      .send({
        suite: 'sprint',
        sprintId: '01',
        trigger: 'nightly',
        status: 'failed',
        ci: { provider: 'gitlab', pipelineId: '999' },
        stats: { total: 2, passed: 1, failed: 1, durationMs: 9000 },
        tests: [
          { title: 'UA-004 cierra sesión y vuelve al login', state: 'passed', durationMs: 4000 },
          {
            title: 'UA-004 no permite volver tras cerrar sesión',
            state: 'failed',
            durationMs: 5000,
          },
        ],
      });
    assert.equal(res.status, 200);

    const detail = await agent.get(`/api/sprints/${sprintId}`);
    const byKey = Object.fromEntries(detail.body.coverage.tasks.map((t) => [t.key, t]));
    // UA-004 aparece en los resultados de Cypress → automatizada (con su último resultado)
    assert.equal(byKey['UA-004'].type, 'automated');
    assert.equal(byKey['UA-004'].testCount, 2);
    assert.equal(byKey['UA-004'].result, 'failed');
    // UA-010 no aparece → manual, pendiente hasta que se registre su resultado
    assert.equal(byKey['UA-010'].type, 'manual');
    assert.equal(byKey['UA-010'].result, 'pending');
    assert.equal(detail.body.lastRun.tests[0].description, 'cierra sesión y vuelve al login');
  });

  it('registra el resultado manual con quién y cuándo', async () => {
    const detail = await agent.get(`/api/sprints/${sprintId}`);
    const manualTask = detail.body.sprint.tasks.find((t) => t.key === 'UA-010');

    const res = await agent
      .put(`/api/sprints/${sprintId}/tasks/${manualTask._id}/manual-result`)
      .send({ result: 'passed', comment: 'Probado en Chrome y Edge' });
    assert.equal(res.status, 200);
    assert.equal(res.body.task.manualResult, 'passed');
    assert.ok(res.body.task.manualTestedAt);

    const after = await agent.get(`/api/sprints/${sprintId}`);
    const task = after.body.sprint.tasks.find((t) => t.key === 'UA-010');
    assert.equal(task.manualTestedBy.name, 'QA Test');
    assert.deepEqual(after.body.coverage.manual, { total: 1, passed: 1, failed: 0, pending: 0 });
  });

  it('rechaza un resultado manual inválido', async () => {
    const detail = await agent.get(`/api/sprints/${sprintId}`);
    const taskId = detail.body.sprint.tasks[0]._id;
    const res = await agent
      .put(`/api/sprints/${sprintId}/tasks/${taskId}/manual-result`)
      .send({ result: 'blocked' });
    assert.equal(res.status, 400);
  });
});

describe('Ejecuciones', () => {
  it('protege el endpoint de resultados con el token de CI', async () => {
    const res = await request(app)
      .post('/api/ci/results')
      .set('Authorization', 'Bearer token-falso')
      .send({ suite: 'regression', status: 'running' });
    assert.equal(res.status, 401);
  });

  it('dispara una regresión (mock) y recibe el resultado completo', async () => {
    const created = await agent.post('/api/runs').send({ suite: 'regression' });
    assert.equal(created.status, 202);
    assert.equal(created.body.run.status, 'queued');

    const duplicated = await agent.post('/api/runs').send({ suite: 'regression' });
    assert.equal(duplicated.status, 409, 'no debe permitir dos ejecuciones simultáneas');

    // El proveedor simulado termina en ~6 s: se consulta como lo hará el frontend (polling).
    let run;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await sleep(500);
      run = (await agent.get(`/api/runs/${created.body.run._id}`)).body.run;
      if (['passed', 'failed'].includes(run.status)) break;
    }
    assert.ok(
      ['passed', 'failed'].includes(run.status),
      `estado final esperado, llegó ${run.status}`,
    );
    assert.equal(run.stats.total, 3);
    assert.deepEqual(run.tests[0].jiraKeys, ['UA-001']);
    assert.equal(run.triggeredBy.email, 'qa@test.local');
  });

  it('cancela una ejecución atascada y libera el botón', async () => {
    const created = await agent.post('/api/runs').send({ suite: 'regression' });
    assert.equal(created.status, 202);
    const id = created.body.run._id;

    const cancelled = await agent.post(`/api/runs/${id}/cancel`);
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.run.status, 'failed');
    assert.match(cancelled.body.run.error, /Cancelada en el portal por QA Test/);

    const again = await agent.post(`/api/runs/${id}/cancel`);
    assert.equal(again.status, 409, 'no se cancela dos veces');

    // Ya no bloquea: se puede lanzar otra regresión de inmediato
    const next = await agent.post('/api/runs').send({ suite: 'regression' });
    assert.equal(next.status, 202);
    await agent.post(`/api/runs/${next.body.run._id}/cancel`);
  });

  it('exige sprintId cuando la suite es sprint', async () => {
    const res = await agent.post('/api/runs').send({ suite: 'sprint' });
    assert.equal(res.status, 400);
  });

  it('lista el historial con filtros y sin el detalle de pruebas', async () => {
    const res = await agent.get('/api/runs').query({ suite: 'regression', limit: 5 });
    assert.equal(res.status, 200);
    assert.ok(res.body.total >= 1);
    assert.equal(res.body.runs[0].tests, undefined);
  });
});

describe('Informes por sprint', () => {
  it('resume tareas automatizadas y manuales, y la tasa de éxito', async () => {
    const { sprints } = (await agent.get('/api/sprints')).body;
    const today = new Date().toISOString().slice(0, 10);
    await agent.patch(`/api/sprints/${sprints[0]._id}`).send({
      startDate: today,
      endDate: today,
      links: { regressionSummary: 'https://empresa.atlassian.net/wiki/regresion' },
    });

    const res = await agent.get('/api/reports/sprints');
    assert.equal(res.status, 200);
    const [report] = res.body.reports;
    assert.deepEqual(report.tasks, {
      total: 2,
      automated: { total: 1, passed: 0, failed: 1 },
      manual: { total: 1, passed: 1, failed: 0, pending: 0 },
    });
    // Ejecución del sprint recibida antes: 1 de 2 pruebas pasó
    assert.equal(report.sprintRuns.total, 1);
    assert.equal(report.sprintRuns.successRate, 50);
    // La regresión simulada se ejecutó hoy, dentro de las fechas del sprint
    assert.ok(report.regression.total >= 1);
    assert.equal(
      report.sprint.links.regressionSummary,
      'https://empresa.atlassian.net/wiki/regresion',
    );
  });
});

describe('Estado del sprint, filtros y bloqueo', () => {
  let closedId;

  before(async () => {
    const closed = await agent.post('/api/sprints').send({
      number: 50,
      name: 'Sprint viejo',
      startDate: dayOffset(-30),
      endDate: dayOffset(-16),
    });
    closedId = closed.body.sprint._id;
    await agent.post('/api/sprints').send({
      number: 60,
      name: 'Sprint futuro',
      startDate: dayOffset(10),
      endDate: dayOffset(20),
    });
  });

  it('exige las fechas al crear un sprint', async () => {
    const res = await agent.post('/api/sprints').send({ number: 70, name: 'Sin fechas' });
    assert.equal(res.status, 400);
  });

  it('filtra por estado calculado con las fechas', async () => {
    const names = async (status) =>
      (await agent.get('/api/sprints').query({ status })).body.sprints.map((s) => s.name);
    assert.deepEqual(await names('closed'), ['Sprint viejo']);
    assert.deepEqual(await names('planned'), ['Sprint futuro']);
    assert.ok((await names('active')).includes('Sprint 01'));
  });

  it('busca por ID o descripción de tarea y devuelve las tareas que coinciden', async () => {
    const byKey = (await agent.get('/api/sprints').query({ q: 'ua-010' })).body.sprints;
    assert.equal(byKey.length, 1);
    assert.equal(byKey[0].matchedTasks[0].key, 'UA-010');

    const byTitle = (await agent.get('/api/sprints').query({ q: 'contraseña' })).body.sprints;
    assert.equal(byTitle[0].matchedTasks[0].title, 'Recuperar contraseña');

    const combined = await agent.get('/api/sprints').query({ q: 'UA-010', status: 'closed' });
    assert.equal(combined.body.sprints.length, 0);
  });

  it('un sprint finalizado es de solo lectura (salvo edición por admin)', async () => {
    const addTask = await agent
      .post(`/api/sprints/${closedId}/tasks`)
      .send({ key: 'UA-900', title: 'X' });
    assert.equal(addTask.status, 409);

    const run = await agent.post('/api/runs').send({ suite: 'sprint', sprintId: closedId });
    assert.equal(run.status, 409);

    // El usuario de prueba es admin: puede corregir las fechas
    const edit = await agent
      .patch(`/api/sprints/${closedId}`)
      .send({ name: 'Sprint viejo (corregido)' });
    assert.equal(edit.status, 200);
  });
});
