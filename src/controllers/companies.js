/**
 * @fileoverview Company management controller
 * @module controllers/companies
 */

import { db } from "../db/connection.js";

/**
 * Creates a new company in the database
 * @async
 * @param {import('hono').Context} c - Hono context object
 * @returns {Promise<Response>} JSON response with created company data
 * @throws {Error} If company name is missing or database constraint violated (e.g., duplicate NIT)
 * 
 * @example
 * POST /companies
 * Body: { "name": "Acme Corp", "nit": "900123456" }
 * Response: { "data": { "id": 1, "name": "Acme Corp", "nit": "900123456" } }
 */
export const createCompany = async (c) => {
  try {
    // 1. Obtener los datos que envía el usuario (JSON)
    const body = await c.req.json();
    const { name, nit } = body;

    // 2. Validar datos básicos
    if (!name) {
      return c.json({ error: "El nombre de la empresa es obligatorio" }, 400);
    }

    // 3. Insertar en la base de datos
    // Usamos RETURNING id para que SQLite nos devuelva el ID recién creado
    const query = db.query("INSERT INTO companies (name, nit) VALUES (?, ?) RETURNING id");
    const result = query.get(name, nit);

    // 4. Responder al cliente
    return c.json({ 
      message: "Empresa creada exitosamente",
      data: { id: result.id, name, nit } 
    }, 201);

  } catch (error) {
    // Manejo de errores (ej: NIT duplicado)
    return c.json({ error: error.message }, 500);
  }
};
