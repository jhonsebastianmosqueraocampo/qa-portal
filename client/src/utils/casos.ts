import type { CasesSummary, RunStats } from '../api/types';

/** "2 automatizados · 1 por automatizar · 1 manual" */
export function resumenCasos(summary: CasesSummary) {
  const partes = [
    [summary.automated.total, 'automatizado', 'automatizados'],
    [summary.pending.total, 'por automatizar', 'por automatizar'],
    [summary.manual.total, 'manual', 'manuales'],
  ]
    .filter(([n]) => Number(n) > 0)
    .map(([n, uno, varios]) => `${n} ${n === 1 ? uno : varios}`);
  return partes.join(' · ') || 'Sin casos';
}

/** Pruebas que se ejecutaron (pasaron o fallaron); las pendientes y manuales no cuentan. */
export const ejecutadas = (stats: RunStats) => stats.passed + stats.failed;
