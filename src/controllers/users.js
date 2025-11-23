/**
 * @fileoverview User management controller
 * @module controllers/users
 */

import { db } from "../db/connection.js";

/**
 * Creates a new user with hashed password
 * @async
 * @param {import('hono').Context} c - Hono context object
 * @returns {Promise<Response>} JSON response with created user data (password excluded)
 * @throws {Error} If validation fails or email already exists
 * 
 * @description
 * Valid roles: 'creator' (can create/manage surveys) or 'analyst' (can view reports).
 * Passwords are hashed using Bun's native Argon2 implementation.
 * Users are created with 'active' status by default.
 * 
 * @example
 * POST /users
 * Body: { "company_id": 1, "name": "John", "email": "john@acme.com", "role": "creator", "password": "secure123" }
 * Response: { "data": { "id": 5, "name": "John", "email": "john@acme.com", "role": "creator", "status": "active" } }
 */
export const createUser = async (c) => {
  try {
    const body = await c.req.json();
    const { company_id, name, email, role, password } = body;

    // Validaciones
    if (!company_id || !name || !email || !role || !password) {
      return c.json({ error: "Faltan campos obligatorios (company_id, name, email, role, password)" }, 400);
    }

    if (!['creator', 'analyst'].includes(role)) {
      return c.json({ error: "El rol debe ser 'creator' o 'analyst'" }, 400);
    }

    // Hashear la contraseña usando la función nativa de Bun
    const hashedPassword = await Bun.password.hash(password);

    // Insertar usuario (por defecto status es 'active')
    const query = db.query(`
      INSERT INTO users (company_id, name, email, role, password) 
      VALUES (?, ?, ?, ?, ?) 
      RETURNING id, status, created_at
    `);
    
    const result = query.get(company_id, name, email, role, hashedPassword);

    return c.json({
      message: "Usuario creado exitosamente",
      data: { 
        id: result.id, 
        name, 
        email, 
        role, 
        status: result.status 
      }
    }, 201);

  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};

/**
 * Retrieves all users for a specific company
 * @param {import('hono').Context} c - Hono context object
 * @returns {Response} JSON response with array of users (passwords excluded)
 * @throws {Error} If company_id query parameter is missing
 * 
 * @description
 * Returns all authorized users (creators and analysts) for a company.
 * Passwords are excluded from response for security.
 * Results are ordered by creation date (newest first).
 * 
 * @example
 * GET /users?company_id=1
 * Response: { "data": [{ "id": 1, "name": "John", "email": "...", "role": "creator", "status": "active" }] }
 */
export const getUsers = (c) => {
  try {
    const company_id = c.req.query('company_id');
    
    if (!company_id) {
      return c.json({ error: "Se requiere el parámetro company_id" }, 400);
    }

    // Seleccionar todos los campos excepto password
    const query = db.query(`
      SELECT id, company_id, name, email, role, status, created_at 
      FROM users 
      WHERE company_id = ? 
      ORDER BY created_at DESC
    `);
    
    const users = query.all(company_id);

    return c.json({ data: users });

  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};

/**
 * Updates a user's status (active/inactive)
 * @async
 * @param {import('hono').Context} c - Hono context object
 * @returns {Promise<Response>} JSON response with updated user data
 * @throws {Error} If user not found or validation fails
 * 
 * @description
 * Allows toggling user status between 'active' and 'inactive'.
 * Inactive users cannot login or perform any operations.
 * Only status field can be updated via this endpoint.
 * 
 * @example
 * PATCH /users/5/status
 * Body: { "status": "inactive" }
 * Response: { "message": "Estado actualizado", "data": { "id": 5, "status": "inactive" } }
 */
export const updateUserStatus = async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { status } = body;

    // Validación
    if (!status) {
      return c.json({ error: "Se requiere el campo 'status'" }, 400);
    }

    if (!['active', 'inactive'].includes(status)) {
      return c.json({ error: "El status debe ser 'active' o 'inactive'" }, 400);
    }

    // Verificar que el usuario existe
    const existing = db.query("SELECT id FROM users WHERE id = ?").get(id);
    
    if (!existing) {
      return c.json({ error: "Usuario no encontrado" }, 404);
    }

    // Actualizar estado
    const updateQuery = db.query(`
      UPDATE users 
      SET status = ? 
      WHERE id = ?
      RETURNING id, name, email, role, status
    `);

    const result = updateQuery.get(status, id);

    return c.json({
      message: "Estado del usuario actualizado exitosamente",
      data: result
    });

  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};
