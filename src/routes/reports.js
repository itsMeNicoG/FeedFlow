import { Hono } from 'hono';
import { getCompanyReports } from '../controllers/reports.js';

const app = new Hono();

// GET /reports/:companyId?survey_id=123
app.get('/:companyId', getCompanyReports);

export default app;
