/**
 * @fileoverview Company management routes
 * @module routes/companies
 */

import { Hono } from 'hono';
import { createCompany } from '../controllers/companies.js';

const app = new Hono();

/**
 * POST /companies - Create a new company
 * @see {@link module:controllers/companies~createCompany}
 */
app.post('/', createCompany);

export default app;
