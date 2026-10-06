import { z } from 'zod';
import { RUN_STATUSES, RUN_SUITES, RUN_TRIGGERS } from '../models/Run.js';
import { objectId, optionalLink } from './common.js';

/** Petición del portal para ejecutar pruebas (botón "Ejecutar pruebas"). */
export const createRunBody = z
  .object({
    suite: z.enum(['regression', 'sprint']),
    sprintId: objectId.optional(),
  })
  .refine((data) => data.suite !== 'sprint' || data.sprintId, {
    message: 'sprintId es obligatorio cuando suite = sprint',
    path: ['sprintId'],
  });

/** Filtros del historial de ejecuciones. */
export const listRunsQuery = z.object({
  suite: z.enum(RUN_SUITES).optional(),
  sprintId: objectId.optional(),
  status: z.enum(RUN_STATUSES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const latestRunQuery = z.object({
  suite: z.enum(['regression', 'sprint']).default('regression'),
  sprintId: objectId.optional(),
});

/**
 * Payload que envía el pipeline (qa-automation/scripts/ci/report-to-portal.js).
 * Debe coincidir con ese script: es el "contrato" entre los dos proyectos.
 */
export const ciResultBody = z.object({
  runId: objectId.nullable().optional(),
  suite: z.enum(RUN_SUITES),
  sprintId: z.string().regex(/^\d+$/).nullable().optional(), // número de sprint: "01"
  trigger: z.enum(RUN_TRIGGERS).default('manual'),
  status: z.enum(['running', 'passed', 'failed']),
  ci: z
    .object({
      provider: z.string().optional(),
      pipelineId: z.coerce.string().optional(),
      // Los enlaces se muestran para hacer clic en el portal: solo http(s).
      pipelineUrl: optionalLink.optional(),
      jobId: z.coerce.string().optional(),
      jobUrl: optionalLink.optional(),
      commitSha: z.string().optional(),
      ref: z.string().optional(),
    })
    .default({}),
  reportUrl: optionalLink.nullable().optional(),
  stats: z
    .object({
      total: z.number().int().min(0),
      passed: z.number().int().min(0),
      failed: z.number().int().min(0),
      pending: z.number().int().min(0).default(0),
      skipped: z.number().int().min(0).default(0),
      durationMs: z.number().min(0).default(0),
    })
    .nullable()
    .optional(),
  tests: z
    .array(
      z.object({
        title: z.string().min(1),
        file: z.string().optional(),
        group: z.string().optional(),
        state: z.enum(['passed', 'failed', 'pending', 'skipped']),
        durationMs: z.number().min(0).optional(),
      }),
    )
    .max(5000)
    .default([]),
  startedAt: z.coerce.date().nullable().optional(),
  finishedAt: z.coerce.date().nullable().optional(),
});
