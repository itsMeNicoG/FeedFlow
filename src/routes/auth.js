/**
 * @fileoverview Authentication routes - Login endpoint
 * @module routes/auth
 */

import { Hono } from 'hono';
import { login } from '../controllers/auth.js';

const app = new Hono();

/**
 * POST /auth/login - Authenticate user and receive JWT token
 * @see {@link module:controllers/auth~login}
 */
app.post('/login', login);

export default app;
