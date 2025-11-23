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
