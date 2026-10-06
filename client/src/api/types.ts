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

export interface TaskCoverage {
  taskId: string;
  key: string;
  /** automated = su ID aparece en los resultados de Cypress; manual = no aparece */
  type: 'automated' | 'manual';
  testCount: number;
  result: ManualResult;
  /** Casos de prueba de Cypress de la tarea (una tarea puede tener varios) */
  tests: Pick<TestResult, 'title' | 'description' | 'state' | 'durationMs' | 'group'>[];
}

export interface TypeSummary {
  total: number;
  passed: number;
  failed: number;
  pending?: number;
}

export interface Coverage {
  totalTasks: number;
  automated: TypeSummary;
  manual: TypeSummary;
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
  tasks: { total: number; automated: TypeSummary; manual: TypeSummary };
  sprintRuns: RunGroupSummary;
  regression: RunGroupSummary;
}
