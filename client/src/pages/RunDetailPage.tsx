import { Breadcrumbs, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useParams } from 'react-router';
import { useRun } from '../api/hooks';
import { ACTIVE_STATUSES } from '../api/types';
import { ErrorState, Loading, PageHeader, Section } from '../components/common';
import { RunSummary, RunTestsTable } from '../components/runs';
import { formatDateTime } from '../utils/format';

/** Detalle de una ejecución del historial: resumen + cada prueba con su resultado. */
export function RunDetailPage() {
  const { id = '' } = useParams();
  const { data: run, isPending, error, refetch } = useRun(id);

  if (isPending) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  const sprint = run.sprint && typeof run.sprint === 'object' ? run.sprint : null;
  const parent = sprint
    ? { to: `/sprints/${sprint._id}`, label: sprint.name }
    : { to: '/regresion', label: 'Regresión' };
  const title =
    run.suite === 'regression'
      ? 'Regresión'
      : run.suite === 'all'
        ? 'Todas las pruebas'
        : `${sprint?.name ?? 'Sprint'}`;

  return (
    <>
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link component={RouterLink} to={parent.to} underline="hover" color="inherit">
          {parent.label}
        </Link>
        <Typography color="text.primary">Ejecución</Typography>
      </Breadcrumbs>
      <PageHeader title={`Ejecución · ${title}`} subtitle={formatDateTime(run.createdAt)} />
      <Section title="Resultado">
        <Stack spacing={2}>
          <RunSummary run={run} />
          {!ACTIVE_STATUSES.includes(run.status) && <RunTestsTable tests={run.tests} />}
        </Stack>
      </Section>
    </>
  );
}
