import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { useState, type FormEvent } from 'react';
import { errorMessage, fieldErrors } from '../api/client';
import { useSaveTask } from '../api/hooks';
import type { Task } from '../api/types';
import { useNotify } from './notify';

/** Agregar o editar una tarea del sprint (clave de Jira, título y enlace). */
export function TaskFormDialog(props: {
  open: boolean;
  sprintId: string;
  task?: Task;
  onClose: () => void;
}) {
  const { task } = props;
  const save = useSaveTask(props.sprintId);
  const notify = useNotify();
  const [form, setForm] = useState({
    key: task?.key ?? '',
    title: task?.title ?? '',
    jiraUrl: task?.jiraUrl ?? '',
  });
  const errors = fieldErrors(save.error);

  const set = (field: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(
      {
        taskId: task?._id,
        data: { key: form.key.trim(), title: form.title.trim(), jiraUrl: form.jiraUrl.trim() },
      },
      {
        onSuccess: () => {
          notify(task ? 'Tarea actualizada' : 'Tarea agregada');
          props.onClose();
        },
      },
    );
  };

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{task ? 'Editar tarea' : 'Agregar tarea'}</DialogTitle>
        <DialogContent>
          {save.error && !Object.keys(errors).length && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage(save.error)}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="ID de Jira"
              placeholder="UA-123"
              value={form.key}
              onChange={set('key')}
              required
              autoFocus
              error={!!errors.key}
              helperText={
                errors.key ??
                'Debe coincidir con el ID al inicio del nombre de las pruebas de Cypress'
              }
            />
            <TextField
              label="Título"
              value={form.title}
              onChange={set('title')}
              required
              error={!!errors.title}
              helperText={errors.title}
            />
            <TextField
              label="Enlace a Jira"
              placeholder="https://tu-empresa.atlassian.net/browse/UA-123"
              value={form.jiraUrl}
              onChange={set('jiraUrl')}
              error={!!errors.jiraUrl}
              helperText={errors.jiraUrl ?? 'Pega aquí el enlace de la tarea'}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={save.isPending}>
            {task ? 'Guardar cambios' : 'Agregar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
