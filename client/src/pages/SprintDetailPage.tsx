import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Alert, Breadcrumbs, Button, Grid, Link, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router';
import { errorMessage } from '../api/client';
import { useDeleteTask, useMe, useSprint } from '../api/hooks';
import type { Coverage, Task } from '../api/types';
import { ACTIVE_STATUSES } from '../api/types';
import { EmptyState, ErrorState, Loading, PageHeader, Section } from '../components/common';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ExploratoryMenu } from '../components/ExploratoryMenu';
import { useNotify } from '../components/notify';
import { RunHistory } from '../components/RunHistory';
import { RunButton, RunSummary, RunTestsTable } from '../components/runs';
import { SprintFormDialog } from '../components/SprintFormDialog';
import { SprintTasksTable } from '../components/SprintTasksTable';
import { SprintStatusChip } from '../components/StatusChips';
import { TaskFormDialog } from '../components/TaskFormDialog';
import { ManualResultDialog, type ManualTarget } from '../components/TaskResults';
import { formatSprintDates } from '../utils/format';

export function SprintDetailPage() {
  const { id = '' } = useParams();
  const { data, isPending, error, refetch } = useSprint(id);
  const { data: user } = useMe();
  const deleteTask = useDeleteTask(id);
  const notify = useNotify();

  const [editingSprint, setEditingSprint] = useState(false);
  const [taskDialog, setTaskDialog] = useState<{ task?: Task } | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [manualTarget, setManualTarget] = useState<ManualTarget | null>(null);

  if (isPending) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  const { sprint, coverage, lastRun } = data;
  const runActive = !!lastRun && ACTIVE_STATUSES.includes(lastRun.status);
  // Finalizado = solo lectura. Un admin puede editar los datos del sprint (p. ej. corregir fechas).
  const readOnly = sprint.isClosed;
  const canEditSprint = !readOnly || user?.role === 'admin';

  const confirmDelete = () => {
    if (!taskToDelete) return;
    deleteTask.mutate(taskToDelete._id, {
      onSuccess: () => notify(`Tarea ${taskToDelete.key} eliminada`),
      onError: (err) => notify(errorMessage(err), 'error'),
      onSettled: () => setTaskToDelete(null),
    });
  };

  return (
    <>
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link component={RouterLink} to="/sprints" underline="hover" color="inherit">
          Sprints
        </Link>
        <Typography color="text.primary">{sprint.name}</Typography>
      </Breadcrumbs>

      <PageHeader
        title={
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <span>{sprint.name}</span>
            <SprintStatusChip status={sprint.status} />
          </Stack>
        }
        subtitle={`${formatSprintDates(sprint.startDate, sprint.endDate)} · pruebas en cypress/e2e/sprints/${sprint.folder}`}
        actions={
          <>
            <ExploratoryMenu links={sprint.links} />
            {canEditSprint && (
              <Button
                variant="outlined"
                startIcon={<EditOutlinedIcon />}
                onClick={() => setEditingSprint(true)}
              >
                Editar sprint
              </Button>
            )}
            {!readOnly && <RunButton suite="sprint" sprintId={sprint._id} busy={runActive} />}
          </>
        }
      />

      {readOnly && (
        <Alert severity="info" icon={<LockOutlinedIcon />} sx={{ mb: 3 }}>
          Sprint finalizado: es de solo lectura. No se pueden modificar tareas, registrar resultados
          ni ejecutar pruebas.
          {user?.role === 'admin' &&
            ' Como administrador puedes editar sus fechas si hubo un error.'}
        </Alert>
      )}

      <Section title="Resumen de pruebas">
        <TestSummary coverage={coverage} />
      </Section>

      <Section
        title="Tareas"
        action={
          !readOnly && (
            <Button startIcon={<AddIcon />} onClick={() => setTaskDialog({})}>
              Agregar tarea
            </Button>
          )
        }
      >
        {sprint.tasks.length === 0 ? (
          <EmptyState title="Este sprint no tiene tareas">
            {!readOnly &&
              'Usa el mismo ID de Jira que pondrás al inicio del nombre de cada prueba de Cypress.'}
          </EmptyState>
        ) : (
          <SprintTasksTable
            tasks={sprint.tasks}
            coverage={coverage}
            readOnly={readOnly}
            onEdit={(task) => setTaskDialog({ task })}
            onDelete={setTaskToDelete}
            onManualResult={setManualTarget}
          />
        )}
      </Section>

      <Section title="Última ejecución">
        {lastRun ? (
          <Stack spacing={2}>
            <RunSummary run={lastRun} />
            {!runActive && <RunTestsTable tests={lastRun.tests} />}
          </Stack>
        ) : (
          <EmptyState title="Este sprint no tiene ejecuciones">
            {!readOnly && `Pulsa «Ejecutar pruebas» para correr las pruebas de ${sprint.folder}.`}
          </EmptyState>
        )}
      </Section>

      {lastRun && (
        <Section title="Historial del sprint">
          <RunHistory suite="sprint" sprintId={sprint._id} compact />
        </Section>
      )}

      {editingSprint && (
        <SprintFormDialog open sprint={sprint} onClose={() => setEditingSprint(false)} />
      )}
      {taskDialog && (
        <TaskFormDialog
          open
          sprintId={sprint._id}
          task={taskDialog.task}
          onClose={() => setTaskDialog(null)}
        />
      )}
      {manualTarget && (
        <ManualResultDialog
          sprintId={sprint._id}
          target={manualTarget}
          onClose={() => setManualTarget(null)}
        />
      )}
      <ConfirmDialog
        open={!!taskToDelete}
        title={`¿Eliminar la tarea ${taskToDelete?.key}?`}
        message="Se quita del sprint. Las pruebas de Cypress y el historial de ejecuciones no se modifican."
        loading={deleteTask.isPending}
        onConfirm={confirmDelete}
        onClose={() => setTaskToDelete(null)}
      />
    </>
  );
}

function TestSummary({ coverage }: { coverage: Coverage }) {
  const { cases } = coverage;
  const bloques = [
    {
      titulo: 'Automatizados (Cypress)',
      total: cases.automated.total,
      detalle: `${cases.automated.passed} pasaron · ${cases.automated.failed} fallaron en la última ejecución`,
    },
    {
      titulo: 'Por automatizar',
      total: cases.pending.total,
      detalle: `Mientras tanto a mano: ${cases.pending.passed} pasaron · ${cases.pending.failed} fallaron · ${cases.pending.pending} sin probar`,
    },
    {
      titulo: 'Manuales',
      total: cases.manual.total,
      detalle: `${cases.manual.passed} pasaron · ${cases.manual.failed} fallaron · ${cases.manual.pending} sin probar`,
    },
  ];
  const sinCasos = coverage.tasks.filter((t) => t.type === 'none').length;

  return (
    <>
      <Grid container spacing={3}>
        {bloques.map((b) => (
          <Grid key={b.titulo} size={{ xs: 12, md: 4 }}>
            <Typography variant="body2" color="text.secondary">
              {b.titulo}
            </Typography>
            <Typography sx={{ fontSize: '1.6rem', fontWeight: 700 }}>
              {b.total} {b.total === 1 ? 'caso' : 'casos'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {b.detalle}
            </Typography>
          </Grid>
        ))}
      </Grid>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        {cases.total} casos en {coverage.totalTasks} tareas
        {sinCasos > 0 && ` · ${sinCasos} tarea(s) aún sin casos en Cypress`}. El tipo de cada caso
        viene de qa-automation: it() automatizado, pendiente() por automatizar y manual() manual.
      </Typography>
    </>
  );
}
