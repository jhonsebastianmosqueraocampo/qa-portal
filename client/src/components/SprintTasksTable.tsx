import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {
  Box,
  Button,
  Collapse,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { Fragment, useState } from 'react';
import type { Coverage, Task, TaskCase, TaskCoverage } from '../api/types';
import { formatDateTime, formatDuration } from '../utils/format';
import { resumenCasos } from '../utils/casos';
import { ExternalLink } from './common';
import { CaseKindChip, TaskResultChip, TaskTypeChip, type ManualTarget } from './TaskResults';

/**
 * Tabla de tareas del sprint. Cada tarea se despliega para ver sus casos de prueba, tal como
 * están declarados en qa-automation (automatizado, por automatizar o manual). Los casos por
 * automatizar y los manuales se registran a mano, caso por caso.
 */
export function SprintTasksTable(props: {
  tasks: Task[];
  coverage: Coverage;
  readOnly: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onManualResult: (target: ManualTarget) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const coverageByTask = new Map(props.coverage.tasks.map((item) => [item.taskId, item]));
  const columns = props.readOnly ? 6 : 7;

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 48 }} />
            <TableCell sx={{ width: 100 }}>ID</TableCell>
            <TableCell>Tarea</TableCell>
            <TableCell sx={{ width: 120 }}>Tipo</TableCell>
            <TableCell sx={{ width: 230 }}>Casos</TableCell>
            <TableCell sx={{ width: 150 }}>Resultado</TableCell>
            {!props.readOnly && <TableCell sx={{ width: 90 }} />}
          </TableRow>
        </TableHead>
        <TableBody>
          {props.tasks.map((task) => {
            const coverage = coverageByTask.get(task._id);
            const hasCases = !!coverage && coverage.cases.length > 0;
            const isOpen = expanded === task._id;
            return (
              <Fragment key={task._id}>
                <TableRow hover sx={{ '& > td': { borderBottom: isOpen ? 'none' : undefined } }}>
                  <TableCell>
                    {hasCases && (
                      <IconButton
                        size="small"
                        onClick={() => setExpanded(isOpen ? null : task._id)}
                        aria-label={isOpen ? 'Ocultar casos de prueba' : 'Ver casos de prueba'}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                      </IconButton>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{task.key}</TableCell>
                  <TableCell>
                    {task.title}
                    {task.jiraUrl && (
                      <Box>
                        <ExternalLink href={task.jiraUrl}>Jira</ExternalLink>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <TaskTypeChip type={coverage?.type ?? 'none'} />
                  </TableCell>
                  <TableCell>
                    <CasesCell coverage={coverage} />
                  </TableCell>
                  <TableCell>
                    <TaskResultCell
                      task={task}
                      coverage={coverage}
                      readOnly={props.readOnly}
                      onManualResult={() => props.onManualResult({ type: 'task', task })}
                    />
                  </TableCell>
                  {!props.readOnly && (
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => props.onEdit(task)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" onClick={() => props.onDelete(task)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
                {hasCases && (
                  <TableRow>
                    <TableCell colSpan={columns} sx={{ py: 0 }}>
                      <Collapse in={isOpen} unmountOnExit>
                        <CasesTable
                          taskKey={task.key}
                          cases={coverage.cases}
                          readOnly={props.readOnly}
                          onManualResult={props.onManualResult}
                        />
                      </Collapse>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function CasesCell({ coverage }: { coverage?: TaskCoverage }) {
  if (!coverage || coverage.cases.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        Aún no hay casos en Cypress con este ID
      </Typography>
    );
  }
  const { summary } = coverage;
  const sinProbar = summary.pending.pending + summary.manual.pending;
  return (
    <>
      <Typography variant="body2">{resumenCasos(summary)}</Typography>
      {sinProbar > 0 && (
        <Typography variant="caption" color="warning.main">
          {sinProbar} por probar a mano
        </Typography>
      )}
    </>
  );
}

function TaskResultCell(props: {
  task: Task;
  coverage?: TaskCoverage;
  readOnly: boolean;
  onManualResult: () => void;
}) {
  const { task, coverage } = props;
  // Tarea con casos: su resultado resume los de sus casos.
  if (coverage && coverage.cases.length > 0) return <TaskResultChip result={coverage.result} />;

  // Tarea sin casos en Cypress: se registra a nivel de tarea.
  const testedBy =
    task.manualTestedBy && typeof task.manualTestedBy === 'object' ? task.manualTestedBy.name : '';
  return (
    <>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <TaskResultChip result={task.manualResult} />
        {!props.readOnly && (
          <Button size="small" onClick={props.onManualResult}>
            Registrar
          </Button>
        )}
      </Stack>
      {task.manualTestedAt && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {testedBy} · {formatDateTime(task.manualTestedAt)}
        </Typography>
      )}
    </>
  );
}

const KIND_ORDER = { automated: 0, pending: 1, manual: 2 };

function CasesTable(props: {
  taskKey: string;
  cases: TaskCase[];
  readOnly: boolean;
  onManualResult: (target: ManualTarget) => void;
}) {
  const cases = [...props.cases].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  return (
    <Box sx={{ py: 1.5, pl: { sm: 6 } }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Casos de prueba
      </Typography>
      <Table size="small">
        <TableBody>
          {cases.map((caso) => (
            <TableRow key={`${caso.kind}-${caso.description}`}>
              <TableCell sx={{ border: 0 }}>
                {caso.description}
                {caso.reason && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {caso.reason}
                  </Typography>
                )}
              </TableCell>
              <TableCell sx={{ border: 0, width: 150 }}>
                <CaseKindChip kind={caso.kind} />
              </TableCell>
              <TableCell sx={{ border: 0, width: 140 }}>
                <TaskResultChip result={caso.result} />
              </TableCell>
              <TableCell sx={{ border: 0, width: 230 }}>
                <CaseDetail caso={caso} />
              </TableCell>
              <TableCell sx={{ border: 0, width: 110 }} align="right">
                {caso.kind !== 'automated' && !props.readOnly && (
                  <Button
                    size="small"
                    onClick={() =>
                      props.onManualResult({
                        type: 'case',
                        taskKey: props.taskKey,
                        description: caso.description,
                        result: caso.result === 'notRun' ? 'pending' : caso.result,
                        comment: caso.manual?.comment ?? '',
                      })
                    }
                  >
                    Registrar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function CaseDetail({ caso }: { caso: TaskCase }) {
  if (caso.kind === 'automated') {
    return (
      <Typography variant="caption" color="text.secondary">
        {caso.result === 'notRun'
          ? 'No corrió en la última ejecución'
          : `${formatDuration(caso.durationMs)} · ${caso.group === 'regression' ? 'en regresión' : caso.group}`}
      </Typography>
    );
  }
  if (!caso.manual?.testedAt) {
    return (
      <Typography variant="caption" color="text.secondary">
        Se prueba a mano
      </Typography>
    );
  }
  return (
    <Typography variant="caption" color="text.secondary">
      {caso.manual.testedBy} · {formatDateTime(caso.manual.testedAt)}
      {caso.manual.comment && (
        <Box component="span" sx={{ display: 'block' }}>
          «{caso.manual.comment}»
        </Box>
      )}
    </Typography>
  );
}
