import { Hono } from 'hono';
import { createCompany } from '../controllers/companies.js';

const app = new Hono();

// Definir la ruta POST /companies
app.post('/', createCompany);

export default app;
