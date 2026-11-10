import mongoose from 'mongoose';

/**
 * Resultado de la prueba MANUAL de un caso concreto de una tarea del sprint.
 * Aplica a los casos manual() y también a los pendiente(): mientras no estén automatizados,
 * QA los prueba a mano y registra aquí el resultado.
 *
 * Un caso se identifica por sprint + tarea + descripción (la que lleva en qa-automation).
 */
const manualCaseResultSchema = new mongoose.Schema(
  {
    sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint', required: true },
    taskKey: { type: String, required: true, uppercase: true, trim: true },
    caseDescription: { type: String, required: true, trim: true },
    result: { type: String, enum: ['pending', 'passed', 'failed'], default: 'pending' },
    comment: { type: String, trim: true, default: '' },
    testedAt: { type: Date, default: null },
    testedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
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

manualCaseResultSchema.index({ sprint: 1, taskKey: 1, caseDescription: 1 }, { unique: true });

export const ManualCaseResult = mongoose.model('ManualCaseResult', manualCaseResultSchema);
