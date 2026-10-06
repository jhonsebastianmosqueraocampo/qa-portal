import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useState, type FormEvent } from 'react';
import { errorMessage } from '../api/client';
import { useSetManualResult } from '../api/hooks';
import type { ManualResult, Task, TaskCoverage } from '../api/types';
import { useNotify } from './notify';

const RESULT: Record<ManualResult, { label: string; color: 'success' | 'error' | 'default' }> = {
  passed: { label: 'Pasó', color: 'success' },
  failed: { label: 'Falló', color: 'error' },
  pending: { label: 'Pendiente', color: 'default' },
};

/** Automatizada: su ID aparece en los resultados de Cypress. Manual: no aparece. */
export function TaskTypeChip({ type }: { type: TaskCoverage['type'] }) {
  return type === 'automated' ? (
    <Chip label="Automatizada" color="primary" variant="outlined" />
  ) : (
    <Chip label="Manual" variant="outlined" />
  );
}

export function TaskResultChip({ result }: { result: ManualResult }) {
  const { label, color } = RESULT[result];
  return (
    <Chip label={label} color={color} variant={result === 'pending' ? 'outlined' : 'filled'} />
  );
}

/** Registrar el resultado de la prueba manual de una tarea. */
export function ManualResultDialog(props: { sprintId: string; task: Task; onClose: () => void }) {
  const { task } = props;
  const save = useSetManualResult(props.sprintId);
  const notify = useNotify();
  const [result, setResult] = useState<ManualResult>(task.manualResult);
  const [comment, setComment] = useState(task.manualComment);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(
      { taskId: task._id, result, comment: comment.trim() },
      {
        onSuccess: () => {
          notify(`Resultado de ${task.key} guardado`);
          props.onClose();
        },
      },
    );
  };

  return (
    <Dialog open onClose={props.onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Prueba manual · {task.key}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {task.title}
          </Typography>
          {save.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage(save.error)}
            </Alert>
          )}
          <Stack spacing={2}>
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={result}
              onChange={(_event, value: ManualResult | null) => value && setResult(value)}
              aria-label="Resultado de la prueba manual"
            >
              <ToggleButton value="pending">Pendiente</ToggleButton>
              <ToggleButton value="passed" color="success">
                Pasó
              </ToggleButton>
              <ToggleButton value="failed" color="error">
                Falló
              </ToggleButton>
            </ToggleButtonGroup>
            <TextField
              label="Comentario (opcional)"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              multiline
              minRows={2}
              placeholder="Navegadores probados, bug creado, observaciones…"
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={save.isPending}>
            Guardar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
