import { Stack } from '@mui/material';
import { useLatestRun } from '../api/hooks';
import { ACTIVE_STATUSES } from '../api/types';
import { EmptyState, ErrorState, Loading, PageHeader, Section } from '../components/common';
import { RunHistory } from '../components/RunHistory';
import { RunButton, RunSummary, RunTestsTable } from '../components/runs';

export function RegressionPage() {
  const { data: latest, isPending, error, refetch } = useLatestRun('regression');
  const runActive = !!latest && ACTIVE_STATUSES.includes(latest.status);

  return (
    <>
      <PageHeader
        title="Regresión"
        subtitle="Pruebas de cypress/e2e/regression. Se ejecutan cada noche y cuando lo necesites."
        actions={<RunButton suite="regression" busy={runActive} label="Ejecutar regresión" />}
      />

      <Section title="Última ejecución">
        {isPending && <Loading />}
        {error && <ErrorState error={error} onRetry={() => refetch()} />}
        {!isPending && !error && !latest && (
          <EmptyState title="Aún no hay ejecuciones de regresión">
            Pulsa «Ejecutar regresión» o espera la ejecución nocturna.
          </EmptyState>
        )}
        {latest && (
          <Stack spacing={2}>
            <RunSummary run={latest} />
            {!runActive && <RunTestsTable tests={latest.tests} />}
          </Stack>
        )}
      </Section>

      <Section title="Historial">
        <RunHistory suite="regression" />
      </Section>
    </>
  );
}
