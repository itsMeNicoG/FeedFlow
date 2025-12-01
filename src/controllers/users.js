/**
 * @fileoverview User management controller
 * @module controllers/users
 */

import { db } from "../db/connection.js";

/**
 * Creates a new user with hashed password (Admin only)
 * @async
 * @param {import('hono').Context} c - Hono context object
 * @returns {Promise<Response>} JSON response with created user data (password excluded)
 * @throws {Error} If validation fails or email already exists
 * 
 * @description
 * Valid roles: 'admin', 'creator' (can create/manage surveys) or 'analyst' (can view reports).
 * Passwords are hashed using Bun's native Argon2 implementation.
 * Users are created with 'active' status by default.
 * Only users with 'admin' role can access this endpoint.
 * 
 * @example
 * POST /users
 * Body: { "company_id": 1, "name": "John", "email": "john@acme.com", "role": "creator", "password": "secure123" }
 * Response: { "data": { "id": 5, "name": "John", "email": "john@acme.com", "role": "creator", "status": "active" } }
 */
export const createUser = async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, role, password } = body;
    
    // Obtener company_id del usuario autenticado (admin)
    const payload = c.get('jwtPayload');
    const company_id = payload.company_id;

    // Validaciones
    if (!name || !email || !role || !password) {
      return c.json({ error: "Faltan campos obligatorios (name, email, role, password)" }, 400);
    }

    if (!['admin', 'creator', 'analyst'].includes(role)) {
      return c.json({ error: "El rol debe ser 'admin', 'creator' o 'analyst'" }, 400);
    }

    // Hashear la contraseña usando la función nativa de Bun
    const hashedPassword = await Bun.password.hash(password, {
      algorithm: "bcrypt",
      cost: 10
    });

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
 * Retrieves all users for the authenticated user's company
 * @param {import('hono').Context} c - Hono context object
 * @returns {Response} JSON response with array of users (passwords excluded)
 * 
 * @description
 * Returns all users for the company of the authenticated user.
 * Passwords are excluded from response for security.
 * Results are ordered by creation date (newest first).
 * 
 * @example
 * GET /users
 * Response: { "data": [{ "id": 1, "name": "John", "email": "...", "role": "creator", "status": "active" }] }
 */
export const getUsers = (c) => {
  try {
    // Obtener company_id del token JWT
    const payload = c.get('jwtPayload');
    const company_id = payload.company_id;

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
/**
 * Registers a new company with its first admin user (Public endpoint)
 * @async
 * @param {import('hono').Context} c - Hono context object
 * @returns {Promise<Response>} JSON response with created company and admin data
 * @throws {Error} If NIT already exists or validation fails
 * 
 * @description
 * This is a PUBLIC endpoint for company self-registration.
 * Creates a new company and its first admin user in a single transaction.
 * Only works if the company NIT does not already exist in the database.
 * 
 * @example
 * POST /register
 * Body: { 
 *   "company_name": "Acme Corp", 
 *   "nit": "900123456",
 *   "admin_name": "John Admin",
 *   "admin_email": "admin@acme.com",
 *   "admin_password": "secure123"
 * }
 */
export const registerCompanyAdmin = async (c) => {
  try {
    const body = await c.req.json();
    const { company_name, nit, admin_name, admin_email, admin_password } = body;

    // Validaciones
    if (!company_name || !nit || !admin_name || !admin_email || !admin_password) {
      return c.json({ 
        error: "Faltan campos obligatorios (company_name, nit, admin_name, admin_email, admin_password)" 
      }, 400);
    }

    // Verificar que el NIT no exista
    const existingCompany = db.query("SELECT id, name FROM companies WHERE nit = ?").get(nit);
    
    if (existingCompany) {
      return c.json({ 
        error: "Ya existe una empresa registrada con este NIT",
        existing_company: existingCompany.name
      }, 409); // 409 Conflict
    }

    // Verificar que el email no exista
    const existingUser = db.query("SELECT id FROM users WHERE email = ?").get(admin_email);
    
    if (existingUser) {
      return c.json({ error: "Ya existe un usuario con este email" }, 409);
    }

    // Crear la empresa
    const companyQuery = db.query("INSERT INTO companies (name, nit) VALUES (?, ?) RETURNING id");
    const company = companyQuery.get(company_name, nit);

    // Hashear la contraseña
    const hashedPassword = await Bun.password.hash(admin_password, {
      algorithm: "bcrypt",
      cost: 10
    });

    // Crear el usuario admin
    const userQuery = db.query(`
      INSERT INTO users (company_id, name, email, role, password) 
      VALUES (?, ?, ?, 'admin', ?) 
      RETURNING id, status, created_at
    `);
    
    const adminUser = userQuery.get(company.id, admin_name, admin_email, hashedPassword);

    return c.json({
      message: "Empresa y administrador creados exitosamente",
      data: {
        company: {
          id: company.id,
          name: company_name,
          nit
        },
        admin: {
          id: adminUser.id,
          name: admin_name,
          email: admin_email,
          role: 'admin',
          status: adminUser.status
        }
      }
    }, 201);

  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};

export const updateUserStatus = async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { status } = body;

    // Obtener company_id del admin autenticado
    const payload = c.get('jwtPayload');
    const adminCompanyId = payload.company_id;

    // Validación
    if (!status) {
      return c.json({ error: "Se requiere el campo 'status'" }, 400);
    }

    if (!['active', 'inactive'].includes(status)) {
      return c.json({ error: "El status debe ser 'active' o 'inactive'" }, 400);
    }

    // Verificar que el usuario existe y pertenece a la misma empresa
    const existing = db.query("SELECT id, company_id FROM users WHERE id = ?").get(id);
    
    if (!existing) {
      return c.json({ error: "Usuario no encontrado" }, 404);
    }

    // Verificar que el usuario pertenece a la empresa del admin
    if (existing.company_id !== adminCompanyId) {
      return c.json({ error: "No tiene permiso para modificar usuarios de otra empresa" }, 403);
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
