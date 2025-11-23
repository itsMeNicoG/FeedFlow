/**
 * @fileoverview User management routes
 * @module routes/users
 */

import { Hono } from 'hono';
import { createUser } from '../controllers/users.js';

const app = new Hono();

/**
 * POST /users - Create a new user with hashed password
 * @see {@link module:controllers/users~createUser}
 */
app.post('/', createUser);

export default app;
