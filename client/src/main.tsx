import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { ApiError } from './api/client';
import { keys } from './api/hooks';
import { Layout } from './components/Layout';
import { NotifyProvider } from './components/notify';
import { RequireAuth } from './components/RequireAuth';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegressionPage } from './pages/RegressionPage';
import { ReportsPage } from './pages/ReportsPage';
import { RunDetailPage } from './pages/RunDetailPage';
import { SprintDetailPage } from './pages/SprintDetailPage';
import { SprintsPage } from './pages/SprintsPage';
import { theme } from './theme';

const queryClient: QueryClient = new QueryClient({
  // Si cualquier consulta responde 401 (sesión expirada), se marca "sin usuario" y
  // RequireAuth redirige al login automáticamente.
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401)
        queryClient.setQueryData(keys.me, null);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // No reintentar errores del cliente (4xx): repetirlos daría el mismo resultado.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) &&
        failureCount < 2,
    },
  },
});

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/sprints" replace /> },
      { path: 'sprints', element: <SprintsPage /> },
      { path: 'sprints/:id', element: <SprintDetailPage /> },
      { path: 'regresion', element: <RegressionPage /> },
      { path: 'ejecuciones/:id', element: <RunDetailPage /> },
      { path: 'informes', element: <ReportsPage /> },
      { path: 'dashboard', element: <Navigate to="/informes" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <NotifyProvider>
          <RouterProvider router={router} />
        </NotifyProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
