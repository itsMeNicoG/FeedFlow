/**
 * @fileoverview User management routes
 * @module routes/users
 */

import { Hono } from 'hono';
import { createUser, getUsers, updateUserStatus } from '../controllers/users.js';
import { requireRole } from '../middleware/auth.js';

const app = new Hono();

/**
 * POST /users - Create a new user (Admin only)
 * @description Only users with 'admin' role can create new users for their company
 * @see {@link module:controllers/users~createUser}
 */
app.post('/', requireRole('admin'), createUser);

/**
 * GET /users - List all users for the admin's company (Admin only)
 * @description Returns all users belonging to the authenticated admin's company
 * @see {@link module:controllers/users~getUsers}
 */
app.get('/', requireRole('admin'), getUsers);

/**
 * PATCH /users/:id/status - Update user status (Admin only)
 * @param {number} id - User ID (must belong to admin's company)
 * @description Only admins can change status, and only for users in their company
 * @see {@link module:controllers/users~updateUserStatus}
 */
app.patch('/:id/status', requireRole('admin'), updateUserStatus);

export default app;
