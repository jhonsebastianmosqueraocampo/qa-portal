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
import type { Coverage, Task, TaskCoverage } from '../api/types';
import { formatDateTime, formatDuration } from '../utils/format';
import { ExternalLink } from './common';
import { TestStateChip } from './StatusChips';
import { TaskResultChip, TaskTypeChip } from './TaskResults';

/**
 * Tabla de tareas del sprint. Las tareas automatizadas se pueden desplegar para ver cada
 * caso de prueba de Cypress que lleva su ID (una tarea puede tener varios).
 */
export function SprintTasksTable(props: {
  tasks: Task[];
  coverage: Coverage;
  readOnly: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onManualResult: (task: Task) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const coverageByTask = new Map(props.coverage.tasks.map((item) => [item.taskId, item]));
  const columns = props.readOnly ? 5 : 6;

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 48 }} />
            <TableCell sx={{ width: 100 }}>ID</TableCell>
            <TableCell>Tarea</TableCell>
            <TableCell sx={{ width: 130 }}>Tipo</TableCell>
            <TableCell sx={{ width: 240 }}>Resultado</TableCell>
            {!props.readOnly && <TableCell sx={{ width: 90 }} />}
          </TableRow>
        </TableHead>
        <TableBody>
          {props.tasks.map((task) => {
            const coverage = coverageByTask.get(task._id);
            const isOpen = expanded === task._id;
            return (
              <Fragment key={task._id}>
                <TableRow hover sx={{ '& > td': { borderBottom: isOpen ? 'none' : undefined } }}>
                  <TableCell>
                    {coverage?.type === 'automated' && (
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
                    <TaskTypeChip type={coverage?.type ?? 'manual'} />
                  </TableCell>
                  <TableCell>
                    <ResultCell
                      task={task}
                      coverage={coverage}
                      readOnly={props.readOnly}
                      onManualResult={() => props.onManualResult(task)}
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
                {coverage?.type === 'automated' && (
                  <TableRow>
                    <TableCell colSpan={columns} sx={{ py: 0 }}>
                      <Collapse in={isOpen} unmountOnExit>
                        <TestCases tests={coverage.tests} />
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

function ResultCell(props: {
  task: Task;
  coverage?: TaskCoverage;
  readOnly: boolean;
  onManualResult: () => void;
}) {
  const { task, coverage } = props;

  if (coverage?.type === 'automated') {
    return (
      <>
        <TaskResultChip result={coverage.result} />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {coverage.testCount === 1 ? '1 caso de prueba' : `${coverage.testCount} casos de prueba`}{' '}
          en Cypress
        </Typography>
      </>
    );
  }

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
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {task.manualTestedAt
          ? `${testedBy} · ${formatDateTime(task.manualTestedAt)}`
          : 'Prueba manual sin registrar'}
      </Typography>
      {task.manualComment && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          «{task.manualComment}»
        </Typography>
      )}
    </>
  );
}

function TestCases({ tests }: { tests: TaskCoverage['tests'] }) {
  return (
    <Box sx={{ py: 1.5, pl: { sm: 7 } }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Casos de prueba (última ejecución)
      </Typography>
      <Table size="small">
        <TableBody>
          {tests.map((test) => (
            <TableRow key={test.title}>
              <TableCell sx={{ border: 0 }}>{test.description}</TableCell>
              <TableCell sx={{ border: 0, width: 120 }}>
                <TestStateChip state={test.state} />
              </TableCell>
              <TableCell sx={{ border: 0, width: 80 }} align="right">
                {formatDuration(test.durationMs)}
              </TableCell>
              <TableCell sx={{ border: 0, width: 110 }}>
                <Typography variant="caption" color="text.secondary">
                  {test.group === 'regression' ? 'En regresión' : test.group}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
