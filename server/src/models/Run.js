import mongoose from 'mongoose';

export const RUN_SUITES = ['regression', 'sprint', 'all'];
export const RUN_STATUSES = ['queued', 'running', 'passed', 'failed'];
export const RUN_TRIGGERS = ['manual', 'nightly', 'deploy'];
export const FINAL_STATUSES = ['passed', 'failed'];

// Resultado de una prueba individual dentro de una ejecución.
const testResultSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }, // "UA-004 cierra sesión y vuelve al login"
    description: { type: String, required: true }, // "cierra sesión y vuelve al login"
    // Tipo de caso según cómo está escrito en qa-automation: it() | pendiente() | manual()
    kind: { type: String, enum: ['automated', 'pending', 'manual'], default: 'automated' },
    reason: { type: String, default: '' }, // motivo de pendiente/manual/sensible
    jiraKeys: { type: [String], default: [] }, // ["UA-004"]
    group: { type: String, default: 'regression' }, // "regression" | "sprint-01"...
    file: { type: String, default: '' },
    state: { type: String, enum: ['passed', 'failed', 'pending', 'skipped'], required: true },
    durationMs: { type: Number, default: 0 },
  },
  { _id: false },
);

const runSchema = new mongoose.Schema(
  {
    suite: { type: String, enum: RUN_SUITES, required: true },
    sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint', default: null },
    sprintNumber: { type: Number, default: null },
    status: { type: String, enum: RUN_STATUSES, default: 'queued' },
    trigger: { type: String, enum: RUN_TRIGGERS, default: 'manual' },
    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    stats: {
      total: { type: Number, default: 0 },
      passed: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      durationMs: { type: Number, default: 0 },
    },
    tests: { type: [testResultSchema], default: [] },
    reportUrl: { type: String, default: '' },
    ci: {
      provider: { type: String, default: '' },
      pipelineId: { type: String, default: '' },
      pipelineUrl: { type: String, default: '' },
      jobUrl: { type: String, default: '' },
      commitSha: { type: String, default: '' },
      ref: { type: String, default: '' },
    },
    error: { type: String, default: '' }, // motivo si no se pudo disparar el pipeline
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Índices para las consultas frecuentes: historial por fecha y filtros por suite/sprint.
runSchema.index({ createdAt: -1 });
runSchema.index({ suite: 1, sprint: 1, createdAt: -1 });
runSchema.index({ 'ci.pipelineId': 1 });

export const Run = mongoose.model('Run', runSchema);
