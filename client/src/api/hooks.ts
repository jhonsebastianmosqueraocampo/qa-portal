// Hooks de datos con TanStack Query. Cada pantalla usa estos hooks en vez de llamar a fetch:
// Query se encarga del estado de carga/error, la caché, los reintentos y el polling.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './client';
import type {
  ManualResult,
  Run,
  RunList,
  Sprint,
  SprintDetail,
  SprintReport,
  SprintStatus,
  SprintListItem,
  Task,
  User,
} from './types';
import { ACTIVE_STATUSES } from './types';

/** Intervalo del polling mientras una ejecución está en cola o en curso. */
const POLL_MS = 3000;
const isActive = (run?: Run | null) => !!run && ACTIVE_STATUSES.includes(run.status);

// Claves de caché: identifican cada dato para poder refrescarlo después de un cambio.
export const keys = {
  me: ['me'] as const,
  sprints: ['sprints'] as const,
  sprint: (id: string) => ['sprints', id] as const,
  runs: ['runs'] as const,
  run: (id: string) => ['runs', 'detail', id] as const,
  reports: ['reports'] as const,
};

// ---------- Sesión ----------

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: async () => {
      try {
        return (await api<{ user: User }>('/auth/me')).user;
      } catch (error) {
        // 401 = no hay sesión (mostrar login). Otros errores (servidor caído) se muestran.
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: Infinity,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      api<{ user: User }>('/auth/login', { method: 'POST', body: credentials }),
    onSuccess: ({ user }) => queryClient.setQueryData(keys.me, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(keys.me, null);
    },
  });
}

// ---------- Sprints ----------

export interface SprintFilters {
  status?: SprintStatus;
  q?: string;
}

export function useSprints(filters: SprintFilters = {}) {
  return useQuery({
    queryKey: [...keys.sprints, 'list', filters],
    queryFn: async () =>
      (await api<{ sprints: SprintListItem[] }>('/sprints', { query: { ...filters } })).sprints,
    placeholderData: (previous) => previous, // mantiene la lista mientras se busca
  });
}

export function useSprint(id: string) {
  return useQuery({
    queryKey: keys.sprint(id),
    queryFn: () => api<SprintDetail>(`/sprints/${id}`),
    // Polling simple: mientras la última ejecución no termine, se consulta cada 3 s.
    refetchInterval: (query) => (isActive(query.state.data?.lastRun) ? POLL_MS : false),
  });
}

export type SprintInput = Partial<Pick<Sprint, 'number' | 'name' | 'links'>> & {
  startDate?: string;
  endDate?: string;
};

export function useSaveSprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: SprintInput }) =>
      id
        ? api<{ sprint: Sprint }>(`/sprints/${id}`, { method: 'PATCH', body: data })
        : api<{ sprint: Sprint }>('/sprints', { method: 'POST', body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.sprints }),
  });
}

export function useDeleteSprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/sprints/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.sprints }),
  });
}

export type TaskInput = Pick<Task, 'key' | 'title' | 'jiraUrl'>;

export function useSaveTask(sprintId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId?: string; data: TaskInput }) =>
      taskId
        ? api<{ task: Task }>(`/sprints/${sprintId}/tasks/${taskId}`, {
            method: 'PATCH',
            body: data,
          })
        : api<{ task: Task }>(`/sprints/${sprintId}/tasks`, { method: 'POST', body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.sprints }),
  });
}

export function useDeleteTask(sprintId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      api<void>(`/sprints/${sprintId}/tasks/${taskId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.sprints }),
  });
}

/** Resultado de la prueba manual de una tarea (Pendiente / Pasó / Falló). */
export function useSetManualResult(sprintId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      result,
      comment,
    }: {
      taskId: string;
      result: ManualResult;
      comment: string;
    }) =>
      api<{ task: Task }>(`/sprints/${sprintId}/tasks/${taskId}/manual-result`, {
        method: 'PUT',
        body: { result, comment },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.sprints }),
  });
}

/** Resultado manual de un caso concreto (pendiente o manual) de una tarea. */
export function useSetManualCaseResult(sprintId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      taskKey: string;
      caseDescription: string;
      result: ManualResult;
      comment: string;
    }) => api(`/sprints/${sprintId}/cases/manual-result`, { method: 'PUT', body: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.sprints }),
  });
}

// ---------- Ejecuciones ----------

export interface RunFilters {
  suite?: 'regression' | 'sprint';
  sprintId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function useRuns(filters: RunFilters) {
  return useQuery({
    queryKey: [...keys.runs, 'list', filters],
    queryFn: () => api<RunList>('/runs', { query: { ...filters } }),
    placeholderData: (previous) => previous, // evita "parpadeo" al cambiar de página
    refetchInterval: (query) => (query.state.data?.runs.some(isActive) ? POLL_MS : false),
  });
}

export function useLatestRun(suite: 'regression') {
  return useQuery({
    queryKey: [...keys.runs, 'latest', suite],
    queryFn: async () => (await api<{ run: Run | null }>('/runs/latest', { query: { suite } })).run,
    refetchInterval: (query) => (isActive(query.state.data) ? POLL_MS : false),
  });
}

export function useRun(id: string) {
  return useQuery({
    queryKey: keys.run(id),
    queryFn: async () => (await api<{ run: Run }>(`/runs/${id}`)).run,
    refetchInterval: (query) => (isActive(query.state.data) ? POLL_MS : false),
  });
}

/** Botón "Ejecutar pruebas": pide al backend que dispare el pipeline. */
export function useTriggerRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { suite: 'regression' | 'sprint'; sprintId?: string }) =>
      api<{ run: Run }>('/runs', { method: 'POST', body: data }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.runs });
      queryClient.invalidateQueries({ queryKey: keys.sprints });
    },
  });
}

/** Cancela en el portal una ejecución atascada en "En cola" o "En curso". */
export function useCancelRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => api<{ run: Run }>(`/runs/${runId}/cancel`, { method: 'POST' }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.runs });
      queryClient.invalidateQueries({ queryKey: keys.sprints });
    },
  });
}

// ---------- Informes ----------

export function useSprintReports() {
  return useQuery({
    queryKey: keys.reports,
    queryFn: async () => (await api<{ reports: SprintReport[] }>('/reports/sprints')).reports,
    // Se recalcula cada vez que se abre la pantalla (refleja ejecuciones y cambios recientes).
    staleTime: 0,
  });
}
