import { db } from "../db/connection.js";

export const createUser = async (c) => {
  try {
    const body = await c.req.json();
    const { company_id, name, email, role } = body;

    // Validaciones
    if (!company_id || !name || !email || !role) {
      return c.json({ error: "Faltan campos obligatorios (company_id, name, email, role)" }, 400);
    }

    if (!['creator', 'analyst'].includes(role)) {
      return c.json({ error: "El rol debe ser 'creator' o 'analyst'" }, 400);
    }

    // Insertar usuario (por defecto status es 'active')
    const query = db.query(`
      INSERT INTO users (company_id, name, email, role) 
      VALUES (?, ?, ?, ?) 
      RETURNING id, status, created_at
    `);
    
    const result = query.get(company_id, name, email, role);

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
