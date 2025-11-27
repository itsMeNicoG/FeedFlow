/**
 * @fileoverview Database schema initialization
 * @module db/setup
 * @description
 * Creates all tables with proper foreign keys and constraints.
 * Can be run directly: `bun run src/db/setup.js`
 */

import { Database } from "bun:sqlite";

/**
 * Initializes the database schema with all required tables
 * @param {Database} db - Bun SQLite database instance
 * @returns {void}
 * 
 * @description
 * Creates 7 tables in the following order:
 * 1. companies - Root entity
 * 2. users - With password hashing and role-based access
 * 3. surveys - Linked to companies and created by users
 * 4. questions - Survey questions with ordering
 * 5. options - Answer choices for selection-based questions
 * 6. responses - Response metadata (channel, respondent)
 * 7. answers - Individual question answers
 * 
 * All foreign keys have CASCADE DELETE for referential integrity.
 */
export const initDB = (db) => {
  // Habilitar claves foráneas
  db.run("PRAGMA foreign_keys = ON;");

  // 1. Tabla de Empresas
  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      nit TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Tabla de Usuarios (Admin, Creadores y Analistas)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, -- Nueva columna para la contraseña hasheada
      role TEXT CHECK(role IN ('admin', 'creator', 'analyst')) NOT NULL,
      status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);

  // 3. Tabla de Encuestas
  db.run(`
    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      created_by INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      start_date DATETIME,
      end_date DATETIME,
      link_slug TEXT UNIQUE, -- Para el link corto
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  // 4. Tabla de Preguntas
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      type TEXT CHECK(type IN ('text', 'number', 'single_choice', 'multiple_choice', 'rating')) NOT NULL,
      "order" INTEGER DEFAULT 0,
      FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
    );
  `);

  // 5. Tabla de Opciones (para preguntas de selección)
  db.run(`
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      value TEXT,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );
  `);

  // 6. Tabla de Respuestas (Cabecera)
  db.run(`
    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id INTEGER NOT NULL,
      channel TEXT CHECK(channel IN ('web', 'whatsapp')) NOT NULL,
      respondent_identifier TEXT, -- Puede ser nulo si es anónimo o el número de tel si es WhatsApp
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
    );
  `);

  // 7. Tabla de Valores de Respuestas (Detalle)
  db.run(`
    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      response_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      value TEXT, -- Guardamos la respuesta como texto siempre
      FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );
  `);
};

// Si se ejecuta directamente este archivo (bun run src/db/setup.js)
if (import.meta.main) {
  const db = new Database("feedflow.sqlite", { create: true });
  console.log("🔄 Inicializando base de datos...");
  initDB(db);
  console.log("✅ Base de datos inicializada correctamente: feedflow.sqlite");
  db.close();
}
