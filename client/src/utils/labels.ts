import type { RunTrigger, SprintStatus } from '../api/types';

export const TRIGGER_LABEL: Record<RunTrigger, string> = {
  manual: 'Manual',
  nightly: 'Nocturna',
  deploy: 'Tras despliegue',
};

export const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = {
  planned: 'Pendiente',
  active: 'Activo',
  closed: 'Finalizado',
};
