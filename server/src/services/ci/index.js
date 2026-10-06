// Punto único de acceso al proveedor de CI.
//
// El resto del código solo conoce esta interfaz:
//   triggerPipeline({ runId, suite, sprintNumber }) → Promise<{ pipelineId, pipelineUrl }>
// Cambiar de GitLab a otro proveedor (Jenkins, Azure DevOps...) es escribir un archivo
// nuevo con esa misma función y registrarlo aquí; controladores y modelos no cambian.
import { env } from '../../config/env.js';
import { createGitlabProvider } from './gitlabProvider.js';
import { createMockProvider } from './mockProvider.js';

const providers = {
  gitlab: () =>
    createGitlabProvider({
      apiUrl: env.GITLAB_API_URL,
      projectId: env.GITLAB_PROJECT_ID,
      triggerToken: env.GITLAB_TRIGGER_TOKEN,
      ref: env.GITLAB_REF,
    }),
  mock: () => createMockProvider(),
};

export const ciProvider = providers[env.CI_PROVIDER]();
