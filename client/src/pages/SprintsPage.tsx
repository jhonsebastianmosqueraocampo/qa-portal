import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import {
  Button,
  Card,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useSprints } from '../api/hooks';
import type { SprintStatus } from '../api/types';
import { EmptyState, ErrorState, Loading, PageHeader } from '../components/common';
import { SprintFormDialog } from '../components/SprintFormDialog';
import { SprintStatusChip } from '../components/StatusChips';
import { formatSprintDates } from '../utils/format';

const STATUS_FILTERS: { value: SprintStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'planned', label: 'Pendientes' },
  { value: 'closed', label: 'Finalizados' },
];
const SEARCH_DELAY_MS = 300;

export function SprintsPage() {
  // Los filtros viven en la URL (?estado=active&q=UA-010): se pueden compartir y sobreviven
  // a recargar la página.
  const [params, setParams] = useSearchParams();
  const status = (params.get('estado') as SprintStatus | null) ?? undefined;
  const q = params.get('q') ?? '';

  const [search, setSearch] = useState(q);
  const { data: sprints, isPending, isFetching, error, refetch } = useSprints({ status, q });
  const { data: allSprints } = useSprints(); // para sugerir el número del próximo sprint
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  // "Debounce": espera a que el usuario deje de escribir antes de buscar en el servidor.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() === q) return;
      setParams(
        (current) => {
          if (search.trim()) current.set('q', search.trim());
          else current.delete('q');
          return current;
        },
        { replace: true },
      );
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search, q, setParams]);

  const setStatus = (value: SprintStatus | 'all') =>
    setParams(
      (current) => {
        if (value === 'all') current.delete('estado');
        else current.set('estado', value);
        return current;
      },
      { replace: true },
    );

  const nextNumber = Math.max(0, ...(allSprints ?? []).map((sprint) => sprint.number)) + 1;
  const filtering = !!status || !!q;

  return (
    <>
      <PageHeader
        title="Sprints"
        subtitle="Tareas de cada sprint, sus pruebas automatizadas y la documentación de pruebas exploratorias."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
            Nuevo sprint
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          placeholder="Buscar por sprint, ID de tarea (UA-123) o descripción"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
            htmlInput: { 'aria-label': 'Buscar sprints y tareas' },
          }}
        />
        <ToggleButtonGroup
          exclusive
          size="small"
          value={status ?? 'all'}
          onChange={(_event, value: SprintStatus | 'all' | null) => value && setStatus(value)}
          aria-label="Filtrar por estado"
        >
          {STATUS_FILTERS.map((filter) => (
            <ToggleButton key={filter.value} value={filter.value}>
              {filter.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {isPending && <Loading />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}

      {sprints && (
        <Card sx={{ opacity: isFetching ? 0.7 : 1, transition: 'opacity 150ms' }}>
          {sprints.length === 0 ? (
            filtering ? (
              <EmptyState title="No hay sprints que coincidan">
                Prueba con otro texto o cambia el filtro de estado.
              </EmptyState>
            ) : (
              <EmptyState title="Crea tu primer sprint">
                Registra el sprint y sus tareas para ver sus pruebas.
              </EmptyState>
            )
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Sprint</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Fechas</TableCell>
                    <TableCell align="right">Tareas</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sprints.map((sprint) => (
                    <TableRow
                      key={sprint._id}
                      hover
                      onClick={() => navigate(`/sprints/${sprint._id}`)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Typography sx={{ fontWeight: 600 }}>{sprint.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {sprint.folder}
                        </Typography>
                        {sprint.matchedTasks.map((task) => (
                          <Typography
                            key={task._id}
                            variant="body2"
                            color="primary"
                            sx={{ display: 'block' }}
                          >
                            {task.key} · {task.title}
                          </Typography>
                        ))}
                      </TableCell>
                      <TableCell>
                        <SprintStatusChip status={sprint.status} />
                      </TableCell>
                      <TableCell>{formatSprintDates(sprint.startDate, sprint.endDate)}</TableCell>
                      <TableCell align="right">{sprint.taskCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      )}

      {creating && (
        <SprintFormDialog
          open
          suggestedNumber={nextNumber}
          onClose={() => setCreating(false)}
          onSaved={(sprint) => navigate(`/sprints/${sprint._id}`)}
        />
      )}
    </>
  );
}
