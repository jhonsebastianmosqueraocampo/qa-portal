import { Button } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import { EmptyState } from '../components/common';

export function NotFoundPage() {
  return (
    <EmptyState title="Página no encontrada">
      <Button component={RouterLink} to="/sprints" sx={{ mt: 2 }}>
        Ir a Sprints
      </Button>
    </EmptyState>
  );
}
