/**
 * @fileoverview Report generation routes with RBAC
 * @module routes/reports
 * @description
 * All report routes are restricted to 'analyst' role only
 */

import { Hono } from 'hono';
import { getCompanyReports, exportReportExcel, exportReportPDF } from '../controllers/reports.js';
import { requireRole } from '../middleware/auth.js';

const app = new Hono();

/**
 * GET /reports/:companyId - Generate aggregated survey report (JSON)
 * @access analyst role only
 * @param {number} companyId - Company ID
 * @query {number} survey_id - Required: Survey to generate report for
 */
app.get('/:companyId', requireRole('analyst'), getCompanyReports);

/**
 * GET /reports/:companyId/export - Export survey report as Excel or PDF
 * @access analyst role only
 * @param {number} companyId - Company ID
 * @query {number} survey_id - Required: Survey to generate report for
 * @query {string} format - Required: 'xlsx' or 'pdf'
 */
app.get('/:companyId/export', requireRole('analyst'), async (c) => {
  const format = c.req.query('format');
  
  if (!format) {
    return c.json({ error: "Se requiere el parámetro 'format' (xlsx o pdf)" }, 400);
  }

  if (format === 'xlsx') {
    return exportReportExcel(c);
  } else if (format === 'pdf') {
    return exportReportPDF(c);
  } else {
    return c.json({ error: "Formato no válido. Use 'xlsx' o 'pdf'" }, 400);
  }
});

export default app;
