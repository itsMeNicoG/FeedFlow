/**
 * @fileoverview Authentication controller - Handles user login and JWT token generation
 * @module controllers/auth
 */

import { db } from "../db/connection.js";
import { sign } from "hono/jwt";

/** 
 * JWT Secret key for signing tokens
 * @constant {string}
 * @description Loaded from environment variable JWT_SECRET. Falls back to development secret if not set.
 * @see .env.example for configuration template
 */
const JWT_SECRET = process.env.JWT_SECRET || "desarrollo-inseguro-cambiar-en-produccion";

// Security warning in development
if (!process.env.JWT_SECRET) {
  console.warn("⚠️  JWT_SECRET no está configurado en las variables de entorno.");
  console.warn("⚠️  Usando secreto por defecto (INSEGURO para producción).");
}

/**
 * Authenticates a user and generates a JWT token
 * @async
 * @param {import('hono').Context} c - Hono context object
 * @returns {Promise<Response>} JSON response with token and user data or error
 * @throws {Error} If database query fails
 * 
 * @example
 * POST /auth/login
 * Body: { "email": "user@example.com", "password": "123456" }
 * Response: { "token": "jwt...", "user": { "id": 1, "name": "John", "role": "creator" } }
 */
export const login = async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: "Email y contraseña requeridos" }, 400);
    }

    // 1. Buscar usuario por email
    const user = db.query("SELECT * FROM users WHERE email = ?").get(email);

    if (!user) {
      return c.json({ error: "Credenciales inválidas" }, 401);
    }

    // 2. Verificar contraseña
    const isMatch = await Bun.password.verify(password, user.password);

    if (!isMatch) {
      return c.json({ error: "Credenciales inválidas" }, 401);
    }

    // 3. Verificar si está activo
    if (user.status !== 'active') {
      return c.json({ error: "Usuario inactivo. Contacte al administrador." }, 403);
    }

    // 4. Generar Token (El "brazalete" del club)
    // Incluimos el ID, Rol y Company ID en el token
    const payload = {
      id: user.id,
      role: user.role,
      company_id: user.company_id,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // Expira en 24 horas
    };

    const token = await sign(payload, JWT_SECRET);

    return c.json({
      message: "Login exitoso",
      token: token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        company_id: user.company_id
      }
    });

  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};
