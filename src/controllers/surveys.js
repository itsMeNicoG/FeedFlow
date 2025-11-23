/**
 * @fileoverview Survey management controller - CRUD operations and duplication
 * @module controllers/surveys
 */

import { db } from "../db/connection.js";

/**
 * Generates a random alphanumeric slug for short links
 * @returns {string} 8-character random string
 * @private
 */
const generateSlug = () => Math.random().toString(36).substring(2, 10);

/**
 * Creates a new survey with generated short link and QR code
 * @async
 * @param {import('hono').Context} c - Hono context object
 * @returns {Promise<Response>} JSON response with survey data including short link and QR code URL
 * @throws {Error} If required fields are missing or database operation fails
 * 
 * @example
 * POST /surveys
 * Body: { "company_id": 1, "created_by": 5, "title": "Customer Satisfaction", "start_date": "2025-01-01" }
 * Response: { "data": { "id": 10, "links": { "short_link": "...", "qr_code": "..." } } }
 */
export const createSurvey = async (c) => {
  try {
    const body = await c.req.json();
    const { company_id, created_by, title, description, start_date, end_date } = body;

    if (!company_id || !created_by || !title) {
      return c.json({ error: "Faltan campos obligatorios" }, 400);
    }

    const slug = generateSlug();

    const query = db.query(`
      INSERT INTO surveys (company_id, created_by, title, description, start_date, end_date, link_slug)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING id, link_slug
    `);

    const result = query.get(company_id, created_by, title, description, start_date, end_date, slug);

    return c.json({
      message: "Encuesta creada exitosamente",
      data: {
        ...result,
        title,
        description,
        start_date,
        end_date,
        company_id,
        created_by,
        links: {
          short_link: `https://feedflow.app/s/${result.link_slug}`,
          qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://feedflow.app/s/${result.link_slug}`
        }
      }
    }, 201);

  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};

/**
 * Retrieves all surveys for a given company
 * @param {import('hono').Context} c - Hono context object
 * @returns {Response} JSON response with array of surveys ordered by creation date (newest first)
 * @throws {Error} If company_id query parameter is missing
 * 
 * @example
 * GET /surveys?company_id=1
 * Response: { "data": [{ "id": 1, "title": "...", "created_at": "..." }] }
 */
export const getSurveys = (c) => {
  try {
    const company_id = c.req.query('company_id');
    
    if (!company_id) {
      return c.json({ error: "Se requiere el parámetro company_id" }, 400);
    }

    const query = db.query("SELECT * FROM surveys WHERE company_id = ? ORDER BY created_at DESC");
    const surveys = query.all(company_id);

    return c.json({ data: surveys });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};

/**
 * Retrieves a survey by ID with all its questions and options
 * @param {import('hono').Context} c - Hono context object
 * @returns {Response} JSON response with survey, questions nested with their options
 * @throws {Error} If survey not found
 * 
 * @example
 * GET /surveys/1
 * Response: { "data": { "id": 1, "title": "...", "questions": [{ "id": 5, "text": "...", "options": [...] }] } }
 */
export const getSurveyById = (c) => {
  try {
    const id = c.req.param('id');
    
    // 1. Obtener la encuesta
    const querySurvey = db.query("SELECT * FROM surveys WHERE id = ?");
    const survey = querySurvey.get(id);

    if (!survey) {
      return c.json({ error: "Encuesta no encontrada" }, 404);
    }

    // 2. Obtener las preguntas
    const queryQuestions = db.query("SELECT * FROM questions WHERE survey_id = ? ORDER BY \"order\" ASC, id ASC");
    const questions = queryQuestions.all(id);

    // 3. Obtener las opciones para esas preguntas
    // (Hacemos esto para evitar N+1 queries si fueran muchas preguntas, aunque SQLite es rápido)
    const questionIds = questions.map(q => q.id);
    let options = [];
    if (questionIds.length > 0) {
      // Truco para hacer WHERE IN (?) con array en bun:sqlite
      const placeholders = questionIds.map(() => '?').join(',');
      const queryOptions = db.query(`SELECT * FROM options WHERE question_id IN (${placeholders})`);
      options = queryOptions.all(...questionIds);
    }

    // 4. Anidar opciones dentro de sus preguntas
    const questionsWithOptions = questions.map(q => {
      return {
        ...q,
        options: options.filter(o => o.question_id === q.id)
      };
    });

    return c.json({ 
      data: {
        ...survey,
        questions: questionsWithOptions
      } 
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};

/**
 * Deletes a survey and all related data (cascades to questions, options, responses)
 * @param {import('hono').Context} c - Hono context object
 * @returns {Response} JSON confirmation message
 * @throws {Error} If database operation fails
 */
export const deleteSurvey = (c) => {
  try {
    const id = c.req.param('id');
    const query = db.query("DELETE FROM surveys WHERE id = ?");
    query.run(id);

    return c.json({ message: "Encuesta eliminada" });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};

/**
 * Duplicates a survey including all questions and options (transactional)
 * @async
 * @param {import('hono').Context} c - Hono context object
 * @returns {Promise<Response>} JSON response with new survey ID
 * @throws {Error} If original survey not found or transaction fails
 * 
 * @description
 * Accepts optional body parameters to override original survey properties:
 * - title: New title (defaults to "[Original Title] (Copia)")
 * - company_id, created_by, description, start_date, end_date: Override values
 * 
 * @example
 * POST /surveys/1/duplicate
 * Body: { "title": "Survey 2025 Q2" }
 * Response: { "data": { "id": 15, "title": "Survey 2025 Q2" } }
 */
export const duplicateSurvey = async (c) => {
  try {
    const id = c.req.param('id');
    
    // Intentar leer el body por si vienen parámetros para sobrescribir
    let overrides = {};
    try {
      overrides = await c.req.json();
    } catch (e) {
      // Si no hay body o es inválido, simplemente no sobrescribimos nada
    }

    // 1. Obtener la encuesta original
    const original = db.query("SELECT * FROM surveys WHERE id = ?").get(id);
    
    if (!original) {
      return c.json({ error: "Encuesta original no encontrada" }, 404);
    }

    // 2. Preparar los datos de la copia (Original + Sobrescritura)
    const newSlug = generateSlug();
    
    // Si el usuario manda un título, usamos ese. Si no, agregamos "(Copia)" al original
    const newTitle = overrides.title || `${original.title} (Copia)`;
    
    // Para el resto de campos, usamos el valor del override si existe, sino el original
    const company_id = overrides.company_id || original.company_id;
    const created_by = overrides.created_by || original.created_by;
    const description = overrides.description !== undefined ? overrides.description : original.description;
    const start_date = overrides.start_date || original.start_date;
    const end_date = overrides.end_date || original.end_date;

    const insertQuery = db.query(`
      INSERT INTO surveys (company_id, created_by, title, description, start_date, end_date, link_slug)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `);

    const result = insertQuery.get(
      company_id, 
      created_by, 
      newTitle, 
      description, 
      start_date, 
      end_date, 
      newSlug
    );

    // 3. Duplicar Preguntas y Opciones
    const originalQuestions = db.query("SELECT * FROM questions WHERE survey_id = ?").all(id);
    
    if (originalQuestions.length > 0) {
      const insertQuestion = db.prepare("INSERT INTO questions (survey_id, text, type, \"order\") VALUES (?, ?, ?, ?) RETURNING id");
      const insertOption = db.prepare("INSERT INTO options (question_id, text, value) VALUES (?, ?, ?)");
      const getOptions = db.prepare("SELECT * FROM options WHERE question_id = ?");

      // Usamos una transacción para que sea atómico y rápido
      const duplicateQuestionsTransaction = db.transaction((questions) => {
        for (const q of questions) {
          // Insertar la pregunta copiada vinculada a la nueva encuesta
          const newQ = insertQuestion.get(result.id, q.text, q.type, q.order);
          
          // Obtener opciones de la pregunta original
          const options = getOptions.all(q.id);
          
          // Insertar opciones copiadas vinculadas a la nueva pregunta
          for (const opt of options) {
            insertOption.run(newQ.id, opt.text, opt.value);
          }
        }
      });

      duplicateQuestionsTransaction(originalQuestions);
    }

    return c.json({ 
      message: "Encuesta duplicada exitosamente",
      data: { id: result.id, title: newTitle }
    }, 201);

  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};
