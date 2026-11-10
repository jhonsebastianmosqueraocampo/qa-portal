// Utilidades para los títulos de las pruebas que envía qa-automation.
// Convenciones (ver qa-automation/cypress/support/casos.js):
//   it('UA-123 descripción')                      → caso automatizado
//   pendiente() → '[PENDIENTE] UA-123 descripción — motivo'   (se automatizará)
//   manual()    → '[MANUAL] UA-123 descripción — motivo'      (se prueba a mano)
//   sensible()  → 'UA-123 descripción [SENSIBLE: motivo]'     (automatizado, solo si se activa)

const JIRA_KEY = /\b[A-Z][A-Z0-9]+-\d+\b/g;
const LEADING_KEYS = /^(\s*[A-Z][A-Z0-9]+-\d+[\s,]*)+/;
const MARCA = /^\[(MANUAL|PENDIENTE)\]\s*(.*?)(?:\s+—\s+(.*))?$/s;
const SENSIBLE = /^(.*?)\s*\[SENSIBLE:\s*(.*)\]$/s;

/** "UA-1 UA-2 hace algo" → ["UA-1", "UA-2"] */
export function extractJiraKeys(title) {
  return [...new Set(title.match(JIRA_KEY) || [])];
}

/** "UA-1 UA-2 hace algo" → "hace algo" */
export function describeTest(title) {
  const description = title.replace(LEADING_KEYS, '').trim();
  return description || title;
}

/**
 * Interpreta el título de una prueba y devuelve qué tipo de caso es.
 * @returns {{ kind: 'automated'|'pending'|'manual', name: string, description: string, reason: string }}
 *   name: título sin marcas ni motivo ("UA-123 hace algo"); description: sin las claves.
 */
export function parseTestTitle(title) {
  const marca = title.match(MARCA);
  if (marca) {
    const name = marca[2].trim();
    return {
      kind: marca[1] === 'MANUAL' ? 'manual' : 'pending',
      name,
      description: describeTest(name),
      reason: (marca[3] || '').trim(),
    };
  }
  const sensible = title.match(SENSIBLE);
  const name = (sensible ? sensible[1] : title).trim();
  return {
    kind: 'automated',
    name,
    description: describeTest(name),
    reason: sensible ? `Sensible: ${sensible[2].trim()}` : '',
  };
}
