import mongoose from 'mongoose';
import { computeSprintStatus } from '../utils/sprintStatus.js';

// Las tareas van EMBEBIDAS en el sprint: siempre se consultan junto con él y son pocas
// (decenas), así que una sola lectura trae todo lo necesario.
const taskSchema = new mongoose.Schema(
  {
    // Clave de Jira (UA-123). Es lo que enlaza la tarea con las pruebas de Cypress.
    key: { type: String, required: true, uppercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    jiraUrl: { type: String, trim: true, default: '' },
    // Resultado de la prueba MANUAL. Solo se muestra si la tarea no tiene prueba automatizada
    // (una tarea es "automatizada" cuando su ID aparece en los resultados de Cypress).
    manualResult: { type: String, enum: ['pending', 'passed', 'failed'], default: 'pending' },
    manualComment: { type: String, trim: true, default: '' },
    manualTestedAt: { type: Date, default: null },
    manualTestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

const sprintSchema = new mongoose.Schema(
  {
    // Número del sprint: 1 → carpeta cypress/e2e/sprints/sprint-01
    number: { type: Number, required: true, unique: true, min: 1 },
    name: { type: String, required: true, trim: true },
    // Las fechas definen el estado (pendiente / activo / finalizado): ver utils/sprintStatus.js
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    // Enlaces de Confluence del sprint
    links: {
      // Pruebas exploratorias (manuales)
      testDesign: { type: String, trim: true, default: '' },
      testExecution: { type: String, trim: true, default: '' },
      // Resumen de las pruebas de regresión del sprint
      regressionSummary: { type: String, trim: true, default: '' },
    },
    tasks: { type: [taskSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

/** Estado calculado con las fechas: planned (pendiente) | active | closed (finalizado). */
sprintSchema.virtual('status').get(function status() {
  return computeSprintStatus(this.startDate, this.endDate);
});

sprintSchema.virtual('isClosed').get(function isClosed() {
  return this.status === 'closed';
});

// Índice para filtrar por estado (que se traduce a rangos de fechas).
sprintSchema.index({ startDate: 1, endDate: 1 });

/** Nombre de la carpeta de pruebas en qa-automation, p. ej. "sprint-01". */
sprintSchema.virtual('folder').get(function folder() {
  return `sprint-${String(this.number).padStart(2, '0')}`;
});

export const Sprint = mongoose.model('Sprint', sprintSchema);
