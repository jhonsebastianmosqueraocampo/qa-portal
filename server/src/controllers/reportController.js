import { getSprintReports } from '../services/reportService.js';

export async function sprints(_req, res) {
  res.json({ reports: await getSprintReports() });
}
