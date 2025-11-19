import { db } from "../db/connection.js";

// Función auxiliar para generar un slug aleatorio (para el link corto)
const generateSlug = () => Math.random().toString(36).substring(2, 10);

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
