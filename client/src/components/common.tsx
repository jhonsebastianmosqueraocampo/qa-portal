// Piezas pequeñas reutilizadas en varias pantallas.
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { errorMessage } from '../api/client';

/** Título de página con acciones a la derecha. */
export function PageHeader(props: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' }, mb: 3 }}
    >
      <Box>
        <Typography variant="h1">{props.title}</Typography>
        {props.subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {props.subtitle}
          </Typography>
        )}
      </Box>
      {props.actions && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {props.actions}
        </Stack>
      )}
    </Stack>
  );
}

/** Tarjeta con título de sección. */
export function Section(props: { title: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
        >
          <Typography variant="h2">{props.title}</Typography>
          {props.action}
        </Stack>
        {props.children}
      </CardContent>
    </Card>
  );
}

/** Enlace externo: siempre en pestaña nueva y sin dar acceso a esta página (noopener). */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
    >
      {children}
      <OpenInNewIcon sx={{ fontSize: 14 }} aria-hidden />
    </Link>
  );
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ alignItems: 'center', py: 4, justifyContent: 'center' }}
    >
      <CircularProgress size={22} />
      <Typography color="text.secondary">{label}</Typography>
    </Stack>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Alert
      severity="error"
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            Reintentar
          </Button>
        )
      }
    >
      {errorMessage(error)}
    </Alert>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Box sx={{ textAlign: 'center', py: 5 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {children && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {children}
        </Typography>
      )}
    </Box>
  );
}
