/**
 * @fileoverview Report generation routes with RBAC
 * @module routes/reports
 * @description
 * All report routes are restricted to 'analyst' role only
 */

import { Hono } from 'hono';
import { getCompanyReports } from '../controllers/reports.js';
import { requireRole } from '../middleware/auth.js';

const app = new Hono();

/**
 * GET /reports/:companyId - Generate aggregated survey report
 * @access analyst role only
 * @param {number} companyId - Company ID
 * @query {number} survey_id - Required: Survey to generate report for
 */
app.get('/:companyId', requireRole('analyst'), getCompanyReports);

export default app;
