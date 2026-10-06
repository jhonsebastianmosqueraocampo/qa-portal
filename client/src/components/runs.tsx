import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { ApiError, errorMessage } from '../api/client';
import { useCancelRun, useTriggerRun } from '../api/hooks';
import type { Run, TestResult } from '../api/types';
import { ACTIVE_STATUSES } from '../api/types';
import { formatDateTime, formatDuration } from '../utils/format';
import { EmptyState, ExternalLink } from './common';
import { useNotify } from './notify';
import { RunStatusChip, TestStateChip } from './StatusChips';
import { TRIGGER_LABEL } from '../utils/labels';

/** Botón "Ejecutar pruebas". No ejecuta nada en el navegador: pide al backend que dispare el CI. */
export function RunButton(props: {
  suite: 'regression' | 'sprint';
  sprintId?: string;
  busy?: boolean;
  label?: string;
}) {
  const trigger = useTriggerRun();
  const notify = useNotify();
  const running = props.busy || trigger.isPending;

  const handleClick = () => {
    trigger.mutate(
      { suite: props.suite, sprintId: props.sprintId },
      {
        onSuccess: () => notify('Ejecución solicitada. El estado se actualiza automáticamente.'),
        onError: (error) =>
          notify(
            error instanceof ApiError && error.status === 409
              ? 'Ya hay una ejecución en curso. Espera a que termine.'
              : errorMessage(error),
            'error',
          ),
      },
    );
  };

  return (
    <Button
      variant="contained"
      startIcon={<PlayArrowIcon />}
      onClick={handleClick}
      disabled={running}
    >
      {running ? 'Ejecutando…' : (props.label ?? 'Ejecutar pruebas')}
    </Button>
  );
}

/** Resumen de una ejecución: estado, fecha, origen, conteos, duración y enlaces. */
export function RunSummary({ run }: { run: Run }) {
  const active = ACTIVE_STATUSES.includes(run.status);
  const cancel = useCancelRun();
  const notify = useNotify();
  const { stats } = run;

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1, mb: 1.5 }}
      >
        <RunStatusChip status={run.status} />
        <Typography variant="body2" color="text.secondary">
          {formatDateTime(run.createdAt)} · {TRIGGER_LABEL[run.trigger]}
          {run.triggeredBy && ` por ${run.triggeredBy.name}`}
          {!active && stats.durationMs > 0 && ` · ${formatDuration(stats.durationMs)}`}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {!active && stats.total > 0 && (
          <Stack direction="row" spacing={1}>
            <Chip label={`${stats.passed} pasaron`} color="success" variant="outlined" />
            {stats.failed > 0 && (
              <Chip label={`${stats.failed} fallaron`} color="error" variant="outlined" />
            )}
          </Stack>
        )}
        {run.reportUrl && <ExternalLink href={run.reportUrl}>Reporte completo</ExternalLink>}
        {run.ci.pipelineUrl && <ExternalLink href={run.ci.pipelineUrl}>Pipeline</ExternalLink>}
      </Stack>
      {active && (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {run.status === 'queued'
              ? 'Esperando a que GitLab inicie las pruebas…'
              : 'Las pruebas se están ejecutando…'}
          </Typography>
          <Button
            size="small"
            color="inherit"
            disabled={cancel.isPending}
            onClick={() =>
              cancel.mutate(run._id, {
                onSuccess: () => notify('Ejecución cancelada en el portal', 'info'),
                onError: (error) => notify(errorMessage(error), 'error'),
              })
            }
          >
            Cancelar
          </Button>
        </Stack>
      )}
      {run.error && (
        <Alert severity={run.error.startsWith('Cancelada') ? 'warning' : 'error'}>
          {run.error.startsWith('Cancelada')
            ? run.error
            : `No se pudo iniciar la ejecución: ${run.error}`}
        </Alert>
      )}
    </Box>
  );
}

/** Lista de pruebas de una ejecución: ID de Jira, descripción, resultado y duración. */
export function RunTestsTable({ tests }: { tests?: TestResult[] }) {
  if (!tests?.length) {
    return <EmptyState title="Aún no hay resultados de pruebas" />;
  }
  // Primero las fallidas: es lo que hay que revisar.
  const sorted = [...tests].sort(
    (a, b) => Number(b.state === 'failed') - Number(a.state === 'failed'),
  );

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 110 }}>ID</TableCell>
            <TableCell>Descripción de la prueba</TableCell>
            <TableCell sx={{ width: 110 }}>Resultado</TableCell>
            <TableCell sx={{ width: 100 }} align="right">
              Duración
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((test) => (
            <TableRow key={test.title} hover>
              <TableCell sx={{ fontFamily: 'monospace' }}>
                {test.jiraKeys.join(', ') || '—'}
              </TableCell>
              <TableCell>{test.description}</TableCell>
              <TableCell>
                <TestStateChip state={test.state} />
              </TableCell>
              <TableCell align="right">{formatDuration(test.durationMs)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
