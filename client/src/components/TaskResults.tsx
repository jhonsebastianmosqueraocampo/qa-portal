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
import { useSetManualCaseResult, useSetManualResult } from '../api/hooks';
import type { CaseKind, CaseResult, ManualResult, Task, TaskType } from '../api/types';
import { useNotify } from './notify';

type ChipColor = 'success' | 'error' | 'default' | 'primary' | 'warning' | 'info';

const RESULT: Record<CaseResult, { label: string; color: ChipColor }> = {
  passed: { label: 'Pasó', color: 'success' },
  failed: { label: 'Falló', color: 'error' },
  pending: { label: 'Sin probar', color: 'default' },
  notRun: { label: 'No se ejecutó', color: 'default' },
};

const TASK_TYPE: Record<TaskType, { label: string; color: ChipColor }> = {
  automated: { label: 'Automatizada', color: 'primary' },
  mixed: { label: 'Mixta', color: 'info' },
  manual: { label: 'Manual', color: 'default' },
  none: { label: 'Sin casos', color: 'warning' },
};

const CASE_KIND: Record<CaseKind, { label: string; color: ChipColor }> = {
  automated: { label: 'Automatizado', color: 'primary' },
  pending: { label: 'Por automatizar', color: 'warning' },
  manual: { label: 'Manual', color: 'default' },
};

/** Tipo de la tarea según sus casos en qa-automation. */
export function TaskTypeChip({ type }: { type: TaskType }) {
  const { label, color } = TASK_TYPE[type];
  return <Chip label={label} color={color} variant="outlined" />;
}

/** Tipo de un caso: automatizado (it), por automatizar (pendiente) o manual. */
export function CaseKindChip({ kind }: { kind: CaseKind }) {
  const { label, color } = CASE_KIND[kind];
  return <Chip label={label} color={color} variant="outlined" />;
}

export function TaskResultChip({ result }: { result: CaseResult }) {
  const { label, color } = RESULT[result];
  const filled = result === 'passed' || result === 'failed';
  return <Chip label={label} color={color} variant={filled ? 'filled' : 'outlined'} />;
}

/** A quién se le registra el resultado manual: un caso concreto o la tarea completa. */
export type ManualTarget =
  | { type: 'case'; taskKey: string; description: string; result: ManualResult; comment: string }
  | { type: 'task'; task: Task };

/**
 * Registrar el resultado de una prueba manual (Pendiente / Pasó / Falló + comentario).
 * - Caso: casos pendiente() o manual() de qa-automation.
 * - Tarea: tareas que aún no tienen ningún caso en Cypress.
 */
export function ManualResultDialog(props: {
  sprintId: string;
  target: ManualTarget;
  onClose: () => void;
}) {
  const { target } = props;
  const saveCase = useSetManualCaseResult(props.sprintId);
  const saveTask = useSetManualResult(props.sprintId);
  const save = target.type === 'case' ? saveCase : saveTask;
  const notify = useNotify();

  const initial =
    target.type === 'case'
      ? { result: target.result, comment: target.comment }
      : { result: target.task.manualResult, comment: target.task.manualComment };
  const [result, setResult] = useState<ManualResult>(initial.result);
  const [comment, setComment] = useState(initial.comment);

  const titulo = target.type === 'case' ? target.taskKey : target.task.key;
  const subtitulo = target.type === 'case' ? target.description : target.task.title;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const onSuccess = () => {
      notify(`Resultado de ${titulo} guardado`);
      props.onClose();
    };
    if (target.type === 'case') {
      saveCase.mutate(
        {
          taskKey: target.taskKey,
          caseDescription: target.description,
          result,
          comment: comment.trim(),
        },
        { onSuccess },
      );
    } else {
      saveTask.mutate({ taskId: target.task._id, result, comment: comment.trim() }, { onSuccess });
    }
  };

  return (
    <Dialog open onClose={props.onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Prueba manual · {titulo}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {subtitulo}
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
              <ToggleButton value="pending">Sin probar</ToggleButton>
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
