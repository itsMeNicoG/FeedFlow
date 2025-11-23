/**
 * @fileoverview Question management controller
 * @module controllers/questions
 */

import { db } from "../db/connection.js";

/**
 * Adds a new question to a survey with optional answer options
 * @async
 * @param {import('hono').Context} c - Hono context object
 * @returns {Promise<Response>} JSON response with created question data
 * @throws {Error} If validation fails or database transaction fails
 * 
 * @description
 * Valid question types: 'text', 'number', 'single_choice', 'multiple_choice', 'rating'
 * For choice-based questions, 'options' array is required.
 * Uses database transaction to ensure atomicity.
 * 
 * @example
 * POST /surveys/1/questions
 * Body: { "text": "How satisfied are you?", "type": "rating", "options": ["1", "2", "3", "4", "5"] }
 * Response: { "data": { "id": 20, "survey_id": 1, "text": "...", "options": [...] } }
 */
export const addQuestion = async (c) => {
  try {
    const surveyId = c.req.param('id');
    const body = await c.req.json();
    const { text, type, options } = body;

    // 1. Validaciones
    if (!text || !type) {
      return c.json({ error: "El texto y el tipo de pregunta son obligatorios" }, 400);
    }

    const validTypes = ['text', 'number', 'single_choice', 'multiple_choice', 'rating'];
    if (!validTypes.includes(type)) {
      return c.json({ error: `Tipo inválido. Tipos permitidos: ${validTypes.join(', ')}` }, 400);
    }

    // Si es de selección, debe tener opciones
    if (['single_choice', 'multiple_choice'].includes(type) && (!options || !Array.isArray(options) || options.length === 0)) {
      return c.json({ error: "Las preguntas de selección deben tener un array de opciones" }, 400);
    }

    // 2. Transacción para guardar pregunta y opciones juntas
    // Bun SQLite permite transacciones síncronas
    const transaction = db.transaction(() => {
      // Insertar Pregunta
      const insertQuestion = db.prepare("INSERT INTO questions (survey_id, text, type) VALUES (?, ?, ?) RETURNING id");
      const question = insertQuestion.get(surveyId, text, type);

      // Insertar Opciones (si las hay)
      if (options && options.length > 0) {
        const insertOption = db.prepare("INSERT INTO options (question_id, text, value) VALUES (?, ?, ?)");
        for (const opt of options) {
          // Si la opción es un string simple, lo usamos como texto y valor. Si es objeto, extraemos.
          const optText = typeof opt === 'object' ? opt.text : opt;
          const optValue = typeof opt === 'object' ? opt.value : opt;
          insertOption.run(question.id, optText, optValue);
        }
      }

      return question;
    });

    const result = transaction();

    return c.json({
      message: "Pregunta agregada exitosamente",
      data: { id: result.id, survey_id: surveyId, text, type, options }
    }, 201);

  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};

/**
 * Deletes a question and all its options (cascade)
 * @param {import('hono').Context} c - Hono context object
 * @returns {Response} JSON confirmation message
 * @throws {Error} If database operation fails
 */
export const deleteQuestion = (c) => {
  try {
    const id = c.req.param('questionId');
    db.run("DELETE FROM questions WHERE id = ?", [id]);
    return c.json({ message: "Pregunta eliminada" });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};
