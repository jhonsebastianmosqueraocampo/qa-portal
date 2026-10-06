import {
  Box,
  Button,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useRuns, type RunFilters } from '../api/hooks';
import { formatDateTime, formatDuration } from '../utils/format';
import { EmptyState, ErrorState, ExternalLink, Loading } from './common';
import { RunStatusChip } from './StatusChips';
import { TRIGGER_LABEL } from '../utils/labels';

/** Historial de ejecuciones con filtros (estado, fechas) y paginación del lado del servidor. */
export function RunHistory(props: {
  suite: 'regression' | 'sprint';
  sprintId?: string;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(props.compact ? 5 : 10);
  const [filters, setFilters] = useState({ status: '', from: '', to: '' });

  const query: RunFilters = {
    suite: props.suite,
    sprintId: props.sprintId,
    status: filters.status,
    from: filters.from,
    // "Hasta" incluye todo ese día
    to: filters.to ? `${filters.to}T23:59:59` : undefined,
    page: page + 1,
    limit,
  };
  const { data, isPending, error, refetch } = useRuns(query);

  const setFilter = (field: keyof typeof filters) => (event: { target: { value: string } }) => {
    setFilters((current) => ({ ...current, [field]: event.target.value }));
    setPage(0);
  };
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <Box>
      {!props.compact && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            select
            label="Estado"
            value={filters.status}
            onChange={setFilter('status')}
            sx={{ minWidth: 150 }}
            size="small"
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="passed">Pasó</MenuItem>
            <MenuItem value="failed">Falló</MenuItem>
            <MenuItem value="running">En curso</MenuItem>
            <MenuItem value="queued">En cola</MenuItem>
          </TextField>
          <TextField
            label="Desde"
            type="date"
            size="small"
            value={filters.from}
            onChange={setFilter('from')}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Hasta"
            type="date"
            size="small"
            value={filters.to}
            onChange={setFilter('to')}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {hasFilters && (
            <Button
              onClick={() => {
                setFilters({ status: '', from: '', to: '' });
                setPage(0);
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </Stack>
      )}

      {isPending && <Loading />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}

      {data && data.runs.length === 0 && (
        <EmptyState
          title={hasFilters ? 'No hay ejecuciones con esos filtros' : 'Todavía no hay ejecuciones'}
        />
      )}

      {data && data.runs.length > 0 && (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Origen</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Pasaron</TableCell>
                  <TableCell align="right">Duración</TableCell>
                  <TableCell>Reporte</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.runs.map((run) => (
                  <TableRow
                    key={run._id}
                    hover
                    onClick={() => navigate(`/ejecuciones/${run._id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{formatDateTime(run.createdAt)}</TableCell>
                    <TableCell>
                      {TRIGGER_LABEL[run.trigger]}
                      {run.triggeredBy && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block' }}
                        >
                          {run.triggeredBy.name}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <RunStatusChip status={run.status} />
                    </TableCell>
                    <TableCell align="right">
                      {run.stats.total ? `${run.stats.passed} / ${run.stats.total}` : '—'}
                    </TableCell>
                    <TableCell align="right">{formatDuration(run.stats.durationMs)}</TableCell>
                    {/* stopPropagation: abrir el reporte no debe navegar también al detalle */}
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      {run.reportUrl ? (
                        <ExternalLink href={run.reportUrl}>Abrir</ExternalLink>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data.total}
            page={page}
            onPageChange={(_event, newPage) => setPage(newPage)}
            rowsPerPage={limit}
            onRowsPerPageChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={props.compact ? [5, 10] : [10, 20, 50]}
            labelRowsPerPage="Filas"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          />
        </>
      )}
    </Box>
  );
}
