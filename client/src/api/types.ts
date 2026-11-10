// Tipos de los datos que devuelve la API (qa-portal/server).
// Si el backend cambia la forma de una respuesta, TypeScript señala aquí cada lugar afectado.

export type Role = 'admin' | 'qa';
export type SprintStatus = 'planned' | 'active' | 'closed';
export type RunSuite = 'regression' | 'sprint' | 'all';
export type RunStatus = 'queued' | 'running' | 'passed' | 'failed';
export type RunTrigger = 'manual' | 'nightly' | 'deploy';
export type TestState = 'passed' | 'failed' | 'pending' | 'skipped';

export interface User {
  _id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
}

export type ManualResult = 'pending' | 'passed' | 'failed';

export interface Task {
  _id: string;
  key: string;
  title: string;
  jiraUrl: string;
  manualResult: ManualResult;
  manualComment: string;
  manualTestedAt: string | null;
  manualTestedBy: { _id: string; name: string } | string | null;
}

export interface SprintLinks {
  testDesign: string;
  testExecution: string;
  regressionSummary: string;
}

export interface Sprint {
  _id: string;
  number: number;
  name: string;
  startDate?: string | null;
  endDate?: string | null;
  status: SprintStatus;
  links: SprintLinks;
  tasks: Task[];
  folder: string;
  /** Finalizado: solo lectura (se calcula con la fecha de fin) */
  isClosed: boolean;
}

export type SprintListItem = Omit<Sprint, 'tasks'> & {
  taskCount: number;
  /** Tareas que coinciden con la búsqueda (vacío si no se buscó) */
  matchedTasks: Pick<Task, '_id' | 'key' | 'title'>[];
};

export interface TestResult {
  title: string;
  description: string;
  jiraKeys: string[];
  group: string;
  file: string;
  state: TestState;
  durationMs: number;
  kind?: CaseKind;
  reason?: string;
}

export interface RunStats {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  skipped: number;
  durationMs: number;
}

export interface Run {
  _id: string;
  suite: RunSuite;
  sprint: { _id: string; number: number; name: string } | string | null;
  sprintNumber: number | null;
  status: RunStatus;
  trigger: RunTrigger;
  triggeredBy: { _id: string; name: string; email: string } | null;
  stats: RunStats;
  tests?: TestResult[];
  reportUrl: string;
  ci: { provider: string; pipelineId: string; pipelineUrl: string; jobUrl: string };
  error: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

/** Cómo está declarado el caso en qa-automation: it() | pendiente() | manual() */
export type CaseKind = 'automated' | 'pending' | 'manual';
/** notRun: automatizado pero no corrió en la última ejecución (p. ej. caso sensible no activado) */
export type CaseResult = 'passed' | 'failed' | 'pending' | 'notRun';

export interface TaskCase {
  description: string;
  kind: CaseKind;
  /** Motivo de pendiente / manual / sensible */
  reason: string;
  group: string;
  durationMs: number;
  result: CaseResult;
  /** Registro manual (solo casos pendientes y manuales) */
  manual?: { comment: string; testedAt: string | null; testedBy: string } | null;
}

export interface KindSummary {
  total: number;
  passed: number;
  failed: number;
  /** Sin resultado todavía (sin probar o sin ejecutar) */
  pending: number;
}

export interface CasesSummary {
  total: number;
  automated: KindSummary;
  pending: KindSummary;
  manual: KindSummary;
}

/** automated: todos sus casos en Cypress · manual: todos a mano · mixed · none: sin casos */
export type TaskType = 'automated' | 'manual' | 'mixed' | 'none';

export interface TaskCoverage {
  taskId: string;
  key: string;
  type: TaskType;
  result: ManualResult;
  summary: CasesSummary;
  cases: TaskCase[];
}

export interface Coverage {
  totalTasks: number;
  cases: CasesSummary;
  tasks: TaskCoverage[];
}

export interface SprintDetail {
  sprint: Sprint;
  coverage: Coverage;
  lastRun: Run | null;
}

export interface RunList {
  runs: Run[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Ejecuciones que todavía no terminan (el portal las consulta periódicamente). */
export const ACTIVE_STATUSES: RunStatus[] = ['queued', 'running'];

export interface ReportRun {
  _id: string;
  createdAt: string;
  status: RunStatus;
  trigger: RunTrigger;
  stats: RunStats;
  reportUrl: string;
  successRate: number | null;
}

export interface RunGroupSummary {
  total: number;
  passedRuns: number;
  testsExecuted: number;
  testsPassed: number;
  successRate: number | null;
  lastRunAt: string | null;
  runs: ReportRun[];
}

export interface SprintReport {
  sprint: Pick<
    Sprint,
    '_id' | 'number' | 'name' | 'folder' | 'status' | 'startDate' | 'endDate' | 'links'
  >;
  tasks: { total: number; withoutCases: number };
  cases: CasesSummary;
  sprintRuns: RunGroupSummary;
  regression: RunGroupSummary;
}
