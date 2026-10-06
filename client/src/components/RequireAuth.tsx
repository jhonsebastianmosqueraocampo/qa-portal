import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useMe } from '../api/hooks';
import { ErrorState, Loading } from './common';

/** Protege las rutas internas: sin sesión, redirige al login recordando a dónde ibas. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: user, isPending, error, refetch } = useMe();
  const location = useLocation();

  if (isPending) return <Loading label="Verificando sesión…" />;
  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <ErrorState error={error} onRetry={() => refetch()} />
      </Box>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
