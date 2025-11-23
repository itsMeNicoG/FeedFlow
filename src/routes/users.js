/**
 * @fileoverview User management routes
 * @module routes/users
 */

import { Hono } from 'hono';
import { createUser, getUsers, updateUserStatus } from '../controllers/users.js';

const app = new Hono();

/**
 * POST /users - Create a new user with hashed password
 * @see {@link module:controllers/users~createUser}
 */
app.post('/', createUser);

/**
 * GET /users - List all users for a company
 * @query {number} company_id - Required
 * @see {@link module:controllers/users~getUsers}
 */
app.get('/', getUsers);

/**
 * PATCH /users/:id/status - Update user status (active/inactive)
 * @param {number} id - User ID
 * @see {@link module:controllers/users~updateUserStatus}
 */
app.patch('/:id/status', updateUserStatus);

export default app;
