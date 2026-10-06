import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import { useState, type FormEvent } from 'react';
import { errorMessage, fieldErrors } from '../api/client';
import { useSaveSprint } from '../api/hooks';
import type { Sprint } from '../api/types';
import { toDateInput } from '../utils/format';
import { useNotify } from './notify';

/** Crear o editar un sprint (datos + enlaces de pruebas exploratorias en Confluence). */
export function SprintFormDialog(props: {
  open: boolean;
  sprint?: Sprint;
  suggestedNumber?: number;
  onClose: () => void;
  onSaved?: (sprint: Sprint) => void;
}) {
  const { sprint } = props;
  const save = useSaveSprint();
  const notify = useNotify();
  const [form, setForm] = useState(() => ({
    number: String(sprint?.number ?? props.suggestedNumber ?? 1),
    name: sprint?.name ?? `Sprint ${String(props.suggestedNumber ?? 1).padStart(2, '0')}`,
    startDate: toDateInput(sprint?.startDate),
    endDate: toDateInput(sprint?.endDate),
    testDesign: sprint?.links.testDesign ?? '',
    testExecution: sprint?.links.testExecution ?? '',
    regressionSummary: sprint?.links.regressionSummary ?? '',
  }));

  const errors = fieldErrors(save.error);
  const set = (field: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(
      {
        id: sprint?._id,
        data: {
          number: Number(form.number),
          name: form.name.trim(),
          startDate: form.startDate,
          endDate: form.endDate,
          links: {
            testDesign: form.testDesign.trim(),
            testExecution: form.testExecution.trim(),
            regressionSummary: form.regressionSummary.trim(),
          },
        },
      },
      {
        onSuccess: ({ sprint: saved }) => {
          notify(sprint ? 'Sprint actualizado' : 'Sprint creado');
          props.onSaved?.(saved);
          props.onClose();
        },
      },
    );
  };

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{sprint ? 'Editar sprint' : 'Nuevo sprint'}</DialogTitle>
        <DialogContent>
          {save.error && !Object.keys(errors).length && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage(save.error)}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Número"
                type="number"
                value={form.number}
                onChange={set('number')}
                required
                fullWidth
                error={!!errors.number}
                helperText={errors.number ?? `Carpeta sprint-${form.number.padStart(2, '0')}`}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 9 }}>
              <TextField
                label="Nombre"
                value={form.name}
                onChange={set('name')}
                required
                fullWidth
                error={!!errors.name}
                helperText={errors.name}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Inicio"
                type="date"
                value={form.startDate}
                onChange={set('startDate')}
                required
                fullWidth
                error={!!errors.startDate}
                helperText={errors.startDate}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Fin"
                type="date"
                value={form.endDate}
                onChange={set('endDate')}
                required
                fullWidth
                error={!!errors.endDate}
                helperText={errors.endDate}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={12}>
              <Typography variant="caption" color="text.secondary">
                El estado se calcula con las fechas: pendiente antes del inicio, activo entre inicio
                y fin, y finalizado (solo lectura) después del fin.
              </Typography>
            </Grid>
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Documentación en Confluence
              </Typography>
            </Grid>
            <Grid size={12}>
              <TextField
                label="Pruebas exploratorias: diseño de casos"
                placeholder="https://tu-empresa.atlassian.net/wiki/..."
                value={form.testDesign}
                onChange={set('testDesign')}
                fullWidth
                error={!!errors['links.testDesign']}
                helperText={errors['links.testDesign']}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Pruebas exploratorias: ejecución"
                placeholder="https://tu-empresa.atlassian.net/wiki/..."
                value={form.testExecution}
                onChange={set('testExecution')}
                fullWidth
                error={!!errors['links.testExecution']}
                helperText={errors['links.testExecution']}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Resumen de pruebas de regresión"
                placeholder="https://tu-empresa.atlassian.net/wiki/..."
                value={form.regressionSummary}
                onChange={set('regressionSummary')}
                fullWidth
                error={!!errors['links.regressionSummary']}
                helperText={
                  errors['links.regressionSummary'] ?? 'Se muestra en el informe del sprint'
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={save.isPending}>
            {sprint ? 'Guardar cambios' : 'Crear sprint'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
