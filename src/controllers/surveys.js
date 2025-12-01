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
 * Body: { 
 *   "title": "Customer Satisfaction", 
 *   "description": "...", 
 *   "questions": [
 *     {"text": "How satisfied?", "type": "seleccion", "options": ["Yes", "No"]}
 *   ]
 * }
 * Response: { "data": { "id": 10, "links": { "short_link": "...", "qr_code": "..." } } }
 */
export const createSurvey = async (c) => {
  try {
    const body = await c.req.json();
    const { title, description, start_date, end_date, questions } = body;

    // Validación detallada de campos obligatorios
    const missingFields = [];
    if (!title) missingFields.push('title');
    
    if (missingFields.length > 0) {
      return c.json({ 
        error: "Faltan campos obligatorios",
        missing_fields: missingFields,
        hint: "El campo 'title' es obligatorio"
      }, 400);
    }

    // Validar preguntas si se proporcionan
    if (questions) {
      if (!Array.isArray(questions)) {
        return c.json({ 
          error: "El campo 'questions' debe ser un array",
          hint: "Formato esperado: questions: [{text: '...', type: '...', options: [...]}]"
        }, 400);
      }

      // Validar cada pregunta
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.text || !q.type) {
          return c.json({ 
            error: `La pregunta #${i + 1} está incompleta`,
            missing_fields: !q.text ? ['text'] : ['type'],
            hint: "Cada pregunta debe tener 'text' y 'type'"
          }, 400);
        }

        // Mapear tipos en español a inglés para compatibilidad con frontend
        const typeMapping = {
          'seleccion': 'single_choice',
          'texto': 'text',
          'fecha': 'date',
          'numero': 'number',
          'calificacion': 'rating',
          'multiple': 'multiple_choice'
        };
        
        if (typeMapping[q.type]) {
          q.type = typeMapping[q.type];
        }

        const validTypes = ['text', 'number', 'single_choice', 'multiple_choice', 'rating', 'date'];
        if (!validTypes.includes(q.type)) {
          return c.json({ 
            error: `Tipo de pregunta inválido en pregunta #${i + 1}: '${q.type}'`,
            hint: `Tipos permitidos: text, number, single_choice, multiple_choice, rating, date (o sus equivalentes en español: texto, numero, seleccion, multiple, calificacion, fecha)`
          }, 400);
        }

        // Validar opciones para preguntas de selección
        if (['single_choice', 'multiple_choice'].includes(q.type)) {
          if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
            return c.json({ 
              error: `La pregunta #${i + 1} de tipo '${q.type}' requiere opciones`,
              hint: "Debe proporcionar un array 'options' con al menos una opción"
            }, 400);
          }
        }
      }
    }

    // Obtener company_id y user id del JWT
    const payload = c.get('jwtPayload');
    const company_id = payload.company_id;
    const created_by = payload.id;

    const slug = generateSlug();

    // Usar transacción para crear encuesta y preguntas atómicamente
    const transaction = db.transaction(() => {
      // 1. Crear la encuesta
      const insertSurvey = db.prepare(`
        INSERT INTO surveys (company_id, created_by, title, description, start_date, end_date, link_slug)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING id, link_slug
      `);
      
      const survey = insertSurvey.get(company_id, created_by, title, description, start_date, end_date, slug);

      // 2. Crear las preguntas si existen
      const createdQuestions = [];
      if (questions && questions.length > 0) {
        const insertQuestion = db.prepare("INSERT INTO questions (survey_id, text, type, \"order\") VALUES (?, ?, ?, ?) RETURNING id");
        const insertOption = db.prepare("INSERT INTO options (question_id, text, value) VALUES (?, ?, ?)");

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          
          // Insertar pregunta
          const question = insertQuestion.get(survey.id, q.text, q.type, i);

          // Insertar opciones si existen
          const questionOptions = [];
          if (q.options && q.options.length > 0) {
            for (const opt of q.options) {
              const optText = typeof opt === 'object' ? opt.text : opt;
              const optValue = typeof opt === 'object' ? opt.value : opt;
              insertOption.run(question.id, optText, optValue);
              questionOptions.push({ text: optText, value: optValue });
            }
          }

          createdQuestions.push({
            id: question.id,
            text: q.text,
            type: q.type,
            order: i,
            options: questionOptions
          });
        }
      }

      return { survey, questions: createdQuestions };
    });

    const result = transaction();

    return c.json({
      message: "Encuesta creada exitosamente",
      data: {
        id: result.survey.id,
        link_slug: result.survey.link_slug,
        title,
        description,
        start_date,
        end_date,
        company_id,
        created_by,
        questions: result.questions,
        links: {
          short_link: `https://feedflow.app/s/${result.survey.link_slug}`,
          qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://feedflow.app/s/${result.survey.link_slug}`
        }
      }
    }, 201);

  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};

/**
 * Retrieves all surveys for the authenticated user's company
 * @param {import('hono').Context} c - Hono context object
 * @returns {Response} JSON response with array of surveys ordered by creation date (newest first)
 * 
 * @description
 * Returns all surveys for the company of the authenticated user (from JWT payload).
 * Results are ordered by creation date (newest first).
 * 
 * @example
 * GET /surveys
 * Response: { "data": [{ "id": 1, "title": "...", "created_at": "..." }] }
 */
export const getSurveys = (c) => {
  try {
    // Obtener company_id del token JWT del usuario autenticado
    const payload = c.get('jwtPayload');
    const company_id = payload.company_id;

    const query = db.query(`
      SELECT s.*, u.name as creator_name 
      FROM surveys s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.company_id = ? 
      ORDER BY s.created_at DESC
    `);
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
 * Updates an existing survey's metadata
 * @async
 * @param {import('hono').Context} c - Hono context object
 * @returns {Promise<Response>} JSON response with updated survey data
 * @throws {Error} If survey not found or validation fails
 * 
 * @description
 * Allows updating survey metadata (title, description, dates).
 * Does NOT modify questions - use question endpoints for that.
 * Only updates fields provided in request body.
 * 
 * @example
 * PUT /surveys/1
 * Body: { "title": "Updated Title", "end_date": "2025-12-31" }
 * Response: { "message": "Encuesta actualizada", "data": { "id": 1, "title": "Updated Title", ... } }
 */
export const updateSurvey = async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    // Verificar que la encuesta existe
    const existing = db.query("SELECT * FROM surveys WHERE id = ?").get(id);
    
    if (!existing) {
      return c.json({ error: "Encuesta no encontrada" }, 404);
    }

    // Campos permitidos para actualizar
    const allowedFields = ['title', 'description', 'start_date', 'end_date'];
    const updates = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Si no hay campos para actualizar
    if (Object.keys(updates).length === 0) {
      return c.json({ error: "No se proporcionaron campos para actualizar" }, 400);
    }

    // Construir query dinámico
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    const updateQuery = db.query(`
      UPDATE surveys 
      SET ${setClause}
      WHERE id = ?
      RETURNING *
    `);

    const result = updateQuery.get(...values, id);

    return c.json({
      message: "Encuesta actualizada exitosamente",
      data: result
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

/**
 * Retrieves a survey by its short link slug
 * @param {import('hono').Context} c - Hono context object
 * @returns {Response} JSON response with survey and questions (public endpoint)
 * @throws {Error} If survey not found or slug is invalid
 * 
 * @description
 * Public endpoint for accessing surveys via short link.
 * Returns full survey data with questions and options for form rendering.
 * Does NOT require authentication - used for public survey responses.
 * 
 * @example
 * GET /s/abc12345
 * Response: { "data": { "id": 10, "title": "...", "questions": [...] } }
 */
export const getSurveyBySlug = (c) => {
  try {
    const slug = c.req.param('slug');
    
    if (!slug) {
      return c.json({ error: "Slug inválido" }, 400);
    }

    // 1. Obtener la encuesta por slug
    const querySurvey = db.query("SELECT * FROM surveys WHERE link_slug = ?");
    const survey = querySurvey.get(slug);

    if (!survey) {
      return c.json({ error: "Encuesta no encontrada" }, 404);
    }

    // 2. Obtener las preguntas
    const queryQuestions = db.query("SELECT * FROM questions WHERE survey_id = ? ORDER BY \"order\" ASC, id ASC");
    const questions = queryQuestions.all(survey.id);

    // 3. Obtener las opciones
    const questionIds = questions.map(q => q.id);
    let options = [];
    if (questionIds.length > 0) {
      const placeholders = questionIds.map(() => '?').join(',');
      const queryOptions = db.query(`SELECT * FROM options WHERE question_id IN (${placeholders})`);
      options = queryOptions.all(...questionIds);
    }

    // 4. Anidar opciones dentro de preguntas
    const questionsWithOptions = questions.map(q => {
      return {
        ...q,
        options: options.filter(o => o.question_id === q.id)
      };
    });

    return c.json({ 
      data: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        start_date: survey.start_date,
        end_date: survey.end_date,
        questions: questionsWithOptions
      } 
    });

  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};
