import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ChecklistIcon from '@mui/icons-material/Checklist';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Button, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { useState, type ReactNode } from 'react';
import type { SprintLinks } from '../api/types';

const OPTIONS: { key: keyof SprintLinks; label: string; icon: ReactNode }[] = [
  {
    key: 'testDesign',
    label: 'Diseño de casos de prueba',
    icon: <ChecklistIcon fontSize="small" />,
  },
  { key: 'testExecution', label: 'Ejecución de pruebas', icon: <FactCheckIcon fontSize="small" /> },
];

/** Botón "Pruebas exploratorias" que despliega los dos enlaces de Confluence del sprint. */
export function ExploratoryMenu({ links }: { links: SprintLinks }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Button
        variant="outlined"
        endIcon={<ArrowDropDownIcon />}
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
      >
        Pruebas exploratorias
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {OPTIONS.map(({ key, label, icon }) => {
          const href = links[key];
          return href ? (
            <MenuItem
              key={key}
              component="a"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setAnchor(null)}
            >
              <ListItemIcon>{icon}</ListItemIcon>
              <ListItemText>{label}</ListItemText>
              <OpenInNewIcon sx={{ fontSize: 16, ml: 2, color: 'text.secondary' }} />
            </MenuItem>
          ) : (
            <MenuItem key={key} disabled>
              <ListItemIcon>{icon}</ListItemIcon>
              <ListItemText primary={label} secondary="Sin enlace: agrégalo en Editar sprint" />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
