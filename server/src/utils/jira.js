// Utilidades para las claves de Jira en los títulos de las pruebas.
// Convención de qa-automation: it('UA-123 descripción', ...)

const JIRA_KEY = /\b[A-Z][A-Z0-9]+-\d+\b/g;
const LEADING_KEYS = /^(\s*[A-Z][A-Z0-9]+-\d+[\s,]*)+/;

/** "UA-1 UA-2 hace algo" → ["UA-1", "UA-2"] */
export function extractJiraKeys(title) {
  return [...new Set(title.match(JIRA_KEY) || [])];
}

/** "UA-1 UA-2 hace algo" → "hace algo" */
export function describeTest(title) {
  const description = title.replace(LEADING_KEYS, '').trim();
  return description || title;
}
