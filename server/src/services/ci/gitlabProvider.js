import { AppError } from '../../utils/AppError.js';

/**
 * Dispara el pipeline de qa-automation en GitLab con la "Pipeline trigger API".
 * Docs: https://docs.gitlab.com/ci/triggers/
 *
 * El trigger token solo permite crear pipelines en ese proyecto (permiso mínimo):
 * no da acceso al código ni a otras acciones de la API.
 */
export function createGitlabProvider({ apiUrl, projectId, triggerToken, ref }) {
  return {
    name: 'gitlab',

    async triggerPipeline({ runId, suite, sprintNumber }) {
      const url = `${apiUrl}/projects/${encodeURIComponent(projectId)}/trigger/pipeline`;
      const variables = {
        SUITE: suite,
        RUN_ID: runId,
        TRIGGER_SOURCE: 'manual',
        ...(sprintNumber && { SPRINT_ID: String(sprintNumber).padStart(2, '0') }),
      };

      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: triggerToken, ref, variables }),
          signal: AbortSignal.timeout(15_000),
        });
      } catch (error) {
        throw new AppError(502, `No se pudo contactar a GitLab: ${error.message}`);
      }

      if (!response.ok) {
        // No se reenvía el cuerpo completo al cliente: podría contener datos internos.
        console.error('GitLab respondió', response.status, await response.text());
        throw new AppError(502, `GitLab rechazó la ejecución (HTTP ${response.status})`);
      }

      const pipeline = await response.json();
      return { pipelineId: String(pipeline.id), pipelineUrl: pipeline.web_url };
    },
  };
}
