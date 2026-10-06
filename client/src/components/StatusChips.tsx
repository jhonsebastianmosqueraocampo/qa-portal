import { Chip, CircularProgress } from '@mui/material';
import type { RunStatus, SprintStatus, TestState } from '../api/types';

type ChipColor = 'default' | 'success' | 'error' | 'warning' | 'info' | 'primary';

const RUN_STATUS: Record<RunStatus, { label: string; color: ChipColor }> = {
  queued: { label: 'En cola', color: 'default' },
  running: { label: 'En curso', color: 'info' },
  passed: { label: 'Pasó', color: 'success' },
  failed: { label: 'Falló', color: 'error' },
};

export function RunStatusChip({ status }: { status: RunStatus }) {
  const { label, color } = RUN_STATUS[status];
  const active = status === 'queued' || status === 'running';
  return (
    <Chip
      label={label}
      color={color}
      icon={active ? <CircularProgress size={12} color="inherit" /> : undefined}
    />
  );
}

const TEST_STATE: Record<TestState, { label: string; color: ChipColor }> = {
  passed: { label: 'Pasó', color: 'success' },
  failed: { label: 'Falló', color: 'error' },
  pending: { label: 'Pendiente', color: 'default' },
  skipped: { label: 'Omitida', color: 'default' },
};

export function TestStateChip({ state }: { state: TestState }) {
  const { label, color } = TEST_STATE[state];
  return <Chip label={label} color={color} variant="outlined" />;
}

const SPRINT_STATUS: Record<SprintStatus, { label: string; color: ChipColor }> = {
  planned: { label: 'Pendiente', color: 'default' },
  active: { label: 'Activo', color: 'primary' },
  closed: { label: 'Finalizado', color: 'default' },
};

export function SprintStatusChip({ status }: { status: SprintStatus }) {
  const { label, color } = SPRINT_STATUS[status];
  return <Chip label={label} color={color} variant={status === 'active' ? 'filled' : 'outlined'} />;
}
