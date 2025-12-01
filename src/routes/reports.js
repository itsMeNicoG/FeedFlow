/**
 * @fileoverview Report generation routes with RBAC
 * @module routes/reports
 * @description
 * All report routes are restricted to 'admin' and 'analyst' roles only (creator excluded)
 */

import { Hono } from 'hono';
import { getCompanyReports, exportReportExcel, exportReportPDF, getIndividualResponses } from '../controllers/reports.js';
import { authMiddleware, checkUserActive, requireRoles } from '../middleware/auth.js';

const app = new Hono();

/**
 * GET /reports/:surveyId - Generate aggregated survey report (JSON)
 * @access admin and analyst roles only
 * @param {number} surveyId - Survey ID
 */
app.get('/:surveyId', authMiddleware, checkUserActive, requireRoles(['admin', 'analyst']), getCompanyReports);

/**
 * GET /reports/:surveyId/responses - Get individual survey responses
 * @access admin and analyst roles only
 * @param {number} surveyId - Survey ID
 */
app.get('/:surveyId/responses', authMiddleware, checkUserActive, requireRoles(['admin', 'analyst']), getIndividualResponses);

/**
 * GET /reports/:surveyId/export - Export survey report as Excel or PDF
 * @access admin and analyst roles only
 * @param {number} surveyId - Survey ID
 * @query {string} format - Required: 'xlsx' or 'pdf'
 */
app.get('/:surveyId/export', authMiddleware, checkUserActive, requireRoles(['admin', 'analyst']), async (c) => {
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
