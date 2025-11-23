/**
 * @fileoverview Authentication and Authorization middleware
 * @module middleware/auth
 * @description
 * Provides JWT verification, user status validation, and role-based access control
 */

import { jwt } from 'hono/jwt';
import { db } from "../db/connection.js";

/**
 * JWT Secret for token signing/verification
 * @constant {string}
 * @description Loaded from environment variable JWT_SECRET. Falls back to development secret if not set.
 * @see .env.example for configuration template
 */
const JWT_SECRET = process.env.JWT_SECRET || "desarrollo-inseguro-cambiar-en-produccion";

// Security warning in development
if (!process.env.JWT_SECRET) {
  console.warn("⚠️  JWT_SECRET no está configurado en las variables de entorno.");
  console.warn("⚠️  Usando secreto por defecto (INSEGURO para producción).");
  console.warn("⚠️  Configura JWT_SECRET en tu archivo .env");
}

/**
 * Hono middleware to verify JWT signature
 * @type {import('hono').MiddlewareHandler}
 * @see {@link https://hono.dev/middleware/builtin/jwt}
 */
export const authMiddleware = jwt({ secret: JWT_SECRET });

/**
 * Middleware to verify user still exists and is active in database
 * @async
 * @param {import('hono').Context} c - Hono context
 * @param {Function} next - Next middleware in chain
 * @returns {Promise<Response|void>} Error response if validation fails, otherwise calls next()
 * 
 * @description
 * Validates that the authenticated user (from JWT) hasn't been deleted or deactivated
 * since the token was issued. Should be chained after authMiddleware.
 */
export const checkUserActive = async (c, next) => {
  const payload = c.get('jwtPayload'); // Hono guarda el payload decodificado aquí
  
  if (!payload) {
    return c.json({ error: "Token inválido" }, 401);
  }

  const user = db.query("SELECT status FROM users WHERE id = ?").get(payload.id);

  if (!user) {
    return c.json({ error: "Usuario no encontrado" }, 401);
  }

  if (user.status !== 'active') {
    return c.json({ error: "Su cuenta ha sido desactivada" }, 403);
  }

  // Si todo está bien, continuamos
  await next();
};

/**
 * Higher-order middleware factory for role-based access control
 * @param {string} allowedRole - Required role ('creator' or 'analyst')
 * @returns {Function} Hono middleware that checks user role from JWT payload
 * 
 * @description
 * Validates that the authenticated user has the required role.
 * Must be chained after authMiddleware to access jwtPayload.
 * 
 * @example
 * app.post('/surveys', requireRole('creator'), createSurvey);
 */
export const requireRole = (allowedRole) => async (c, next) => {
  const payload = c.get('jwtPayload');
  
  if (payload.role !== allowedRole) {
    return c.json({ error: `Acceso denegado. Se requiere el rol de '${allowedRole}'.` }, 403);
  }

  await next();
};
