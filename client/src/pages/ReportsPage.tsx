import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router';
import { useSprintReports } from '../api/hooks';
import type { RunGroupSummary, SprintReport } from '../api/types';
import { EmptyState, ErrorState, ExternalLink, Loading, PageHeader } from '../components/common';
import { RunStatusChip, SprintStatusChip } from '../components/StatusChips';
import { formatDateTime, formatSprintDates } from '../utils/format';
import { ejecutadas, resumenCasos } from '../utils/casos';
import { TRIGGER_LABEL } from '../utils/labels';

/** Cuántas ejecuciones se listan por sprint en el informe (el resto, en la página del sprint). */
const MAX_RUNS = 5;

/** Informes sprint a sprint: tareas automatizadas y manuales, ejecuciones y regresión. */
export function ReportsPage() {
  const { data: reports, isPending, error, refetch } = useSprintReports();

  return (
    <>
      <PageHeader
        title="Informes"
        subtitle="Resumen sprint a sprint de las tareas, sus pruebas automatizadas y la documentación de pruebas."
      />
      {isPending && <Loading />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {reports?.length === 0 && (
        <Card>
          <EmptyState title="Aún no hay sprints">Crea un sprint para ver su informe.</EmptyState>
        </Card>
      )}
      {reports?.map((report) => (
        <SprintReportAccordion key={report.sprint._id} report={report} />
      ))}
    </>
  );
}

function SuccessChip({ rate, label = 'Éxito' }: { rate: number | null; label?: string }) {
  if (rate === null) return <Chip label="Sin ejecuciones" variant="outlined" />;
  const color = rate >= 90 ? 'success' : rate >= 70 ? 'warning' : 'error';
  return <Chip label={`${label} ${rate}%`} color={color} variant="outlined" />;
}

function SprintReportAccordion({ report }: { report: SprintReport }) {
  const { sprint, tasks, sprintRuns, regression } = report;

  return (
    <Accordion defaultExpanded={sprint.status === 'active'} disableGutters sx={{ mb: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ width: '100%', alignItems: { sm: 'center' }, pr: 1 }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 700 }}>{sprint.name}</Typography>
            <SprintStatusChip status={sprint.status} />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
            {formatSprintDates(sprint.startDate, sprint.endDate)}
          </Typography>
          <Stack direction="row" spacing={1}>
            <SuccessChip rate={sprintRuns.successRate} />
            <Chip label={resumenCasos(report.cases)} variant="outlined" />
          </Stack>
        </Stack>
      </AccordionSummary>

      <AccordionDetails>
        <CaseTiles tasks={tasks} cases={report.cases} />

        <Box sx={{ mt: 3 }}>
          <Typography variant="h2" sx={{ mb: 0.5 }}>
            Ejecuciones de las pruebas del sprint
          </Typography>
          <RunGroupLine group={sprintRuns} />
          <RunsTable group={sprintRuns} />
          {sprintRuns.total > MAX_RUNS && (
            <Link component={RouterLink} to={`/sprints/${sprint._id}`} variant="body2">
              Ver las {sprintRuns.total} ejecuciones en la página del sprint
            </Link>
          )}
        </Box>

        <Stack direction="row" spacing={2} sx={{ mt: 3, mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Pruebas exploratorias:
          </Typography>
          {sprint.links.testDesign ? (
            <ExternalLink href={sprint.links.testDesign}>Diseño de casos</ExternalLink>
          ) : (
            <Typography variant="body2" color="text.disabled">
              Diseño sin enlace
            </Typography>
          )}
          {sprint.links.testExecution ? (
            <ExternalLink href={sprint.links.testExecution}>Ejecución</ExternalLink>
          ) : (
            <Typography variant="body2" color="text.disabled">
              Ejecución sin enlace
            </Typography>
          )}
        </Stack>

        <Accordion variant="outlined" disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'center', width: '100%', pr: 1 }}
            >
              <Typography sx={{ fontWeight: 600, flexGrow: 1 }}>Pruebas de regresión</Typography>
              <SuccessChip rate={regression.successRate} />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            {sprint.links.regressionSummary ? (
              <Button
                variant="outlined"
                endIcon={<OpenInNewIcon />}
                href={sprint.links.regressionSummary}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir resumen de regresión en Confluence
              </Button>
            ) : (
              <Alert severity="info">
                Este sprint no tiene enlace al resumen de regresión. Agrégalo en{' '}
                <Link component={RouterLink} to={`/sprints/${sprint._id}`}>
                  Editar sprint
                </Link>
                .
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {sprint.startDate && sprint.endDate
                ? 'Regresiones automatizadas ejecutadas dentro de las fechas del sprint:'
                : 'Define las fechas del sprint para ver las regresiones ejecutadas en ese periodo.'}
            </Typography>
            {sprint.startDate && sprint.endDate && (
              <>
                <RunGroupLine group={regression} />
                <RunsTable group={regression} />
              </>
            )}
          </AccordionDetails>
        </Accordion>
      </AccordionDetails>
    </Accordion>
  );
}

function CaseTiles({ tasks, cases }: Pick<SprintReport, 'tasks' | 'cases'>) {
  const aMano = cases.pending.total + cases.manual.total;
  const probadasAMano =
    cases.pending.passed + cases.pending.failed + cases.manual.passed + cases.manual.failed;
  const tiles = [
    {
      label: 'Tareas',
      value: tasks.total,
      detail: tasks.withoutCases
        ? `${tasks.withoutCases} sin casos en Cypress`
        : `${cases.total} casos`,
    },
    {
      label: 'Casos automatizados',
      value: cases.automated.total,
      detail: `${cases.automated.passed} pasaron · ${cases.automated.failed} fallaron`,
    },
    {
      label: 'Por automatizar',
      value: cases.pending.total,
      detail: `${cases.pending.passed + cases.pending.failed} probados a mano`,
    },
    {
      label: 'Manuales',
      value: cases.manual.total,
      detail: `${cases.manual.passed} pasaron · ${cases.manual.failed} fallaron · ${cases.manual.pending} sin probar`,
    },
  ];
  const progreso = aMano ? Math.round((probadasAMano / aMano) * 100) : null;

  return (
    <>
      <Grid container spacing={2}>
        {tiles.map((tile) => (
          <Grid key={tile.label} size={{ xs: 6, md: 3 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {tile.label}
                </Typography>
                <Typography sx={{ fontSize: '1.6rem', fontWeight: 700 }}>{tile.value}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {tile.detail}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {progreso !== null && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Pruebas a mano (por automatizar + manuales): {probadasAMano} de {aMano} registradas
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progreso}
            sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
          />
        </Box>
      )}
    </>
  );
}

function RunGroupLine({ group }: { group: RunGroupSummary }) {
  if (group.total === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Sin ejecuciones.
      </Typography>
    );
  }
  return (
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
      {group.total} ejecuciones · {group.testsPassed} de {group.testsExecuted} pruebas pasaron (
      {group.successRate}%) · última: {formatDateTime(group.lastRunAt)}
    </Typography>
  );
}

function RunsTable({ group }: { group: RunGroupSummary }) {
  if (group.total === 0) return null;
  return (
    <TableContainer sx={{ mb: 1 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Fecha</TableCell>
            <TableCell>Origen</TableCell>
            <TableCell>Resultado</TableCell>
            <TableCell align="right">Pasaron</TableCell>
            <TableCell align="right">Tasa de éxito</TableCell>
            <TableCell>Reporte</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {group.runs.slice(0, MAX_RUNS).map((run) => (
            <TableRow key={run._id} hover>
              <TableCell>
                <Link component={RouterLink} to={`/ejecuciones/${run._id}`} underline="hover">
                  {formatDateTime(run.createdAt)}
                </Link>
              </TableCell>
              <TableCell>{TRIGGER_LABEL[run.trigger]}</TableCell>
              <TableCell>
                <RunStatusChip status={run.status} />
              </TableCell>
              <TableCell align="right">
                {run.stats.passed} / {ejecutadas(run.stats)}
              </TableCell>
              <TableCell align="right">
                {run.successRate === null ? '—' : `${run.successRate}%`}
              </TableCell>
              <TableCell>
                {run.reportUrl ? <ExternalLink href={run.reportUrl}>Abrir</ExternalLink> : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
