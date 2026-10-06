import { createTheme } from '@mui/material/styles';

// Tema único de la aplicación: colores, tipografía y estilo por defecto de los componentes.
// Cambiar algo aquí lo cambia en todo el portal (consistencia visual).
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#1f5fbf' },
        background: { default: '#f6f7f9', paper: '#ffffff' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#7aa7ec' },
        background: { default: '#121417', paper: '#1b1e22' },
      },
    },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontSize: '1.6rem', fontWeight: 600 },
    h2: { fontSize: '1.15rem', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiCard: { defaultProps: { variant: 'outlined' } },
    MuiTableCell: {
      styleOverrides: {
        head: ({ theme }) => ({ color: theme.palette.text.secondary, fontWeight: 600 }),
      },
    },
    MuiChip: { defaultProps: { size: 'small' } },
  },
});
