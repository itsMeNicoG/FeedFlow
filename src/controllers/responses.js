import { db } from "../db/connection.js";

export const submitResponse = async (c) => {
  try {
    const surveyId = c.req.param('surveyId');
    const body = await c.req.json();
    const { respondent_identifier, answers } = body; // answers es un array de { question_id, value }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return c.json({ error: "Se requieren respuestas para procesar la encuesta" }, 400);
    }

    // Validar que la encuesta exista
    const survey = db.query("SELECT id FROM surveys WHERE id = ?").get(surveyId);
    if (!survey) {
      return c.json({ error: "Encuesta no encontrada" }, 404);
    }

    // Transacción para guardar todo junto
    const transaction = db.transaction(() => {
      // 1. Crear el registro de la respuesta (Cabecera)
      const insertResponse = db.prepare(`
        INSERT INTO responses (survey_id, channel, respondent_identifier)
        VALUES (?, 'web', ?)
        RETURNING id
      `);
      const response = insertResponse.get(surveyId, respondent_identifier || null);

      // 2. Guardar cada respuesta individual
      const insertAnswer = db.prepare(`
        INSERT INTO answers (response_id, question_id, value)
        VALUES (?, ?, ?)
      `);

      for (const ans of answers) {
        // Convertir valor a string si viene como array (ej: multiple choice)
        const valueToSave = Array.isArray(ans.value) ? ans.value.join(',') : String(ans.value);
        insertAnswer.run(response.id, ans.question_id, valueToSave);
      }

      return response;
    });

    const result = transaction();

    return c.json({ 
      message: "Respuestas guardadas exitosamente",
      data: { response_id: result.id }
    }, 201);

  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};

export const webhookWhatsapp = async (c) => {
  try {
    // Simulamos que recibimos un payload de un proveedor de WhatsApp (ej: Twilio/Meta)
    const body = await c.req.json();
    const { from, message, survey_id } = body;

    // Nota: En un caso real, esto sería mucho más complejo (máquina de estados para saber qué pregunta está respondiendo).
    // Para este MVP, asumiremos que el mensaje contiene todas las respuestas en un formato simple o es una sola respuesta.
    // Simplificación: Recibimos un JSON con la estructura lista, simulando que un bot ya procesó la conversación.
    
    const { answers } = body; 

    if (!survey_id || !answers) {
      return c.json({ error: "Payload inválido para simulación WhatsApp" }, 400);
    }

    const transaction = db.transaction(() => {
      const insertResponse = db.prepare(`
        INSERT INTO responses (survey_id, channel, respondent_identifier)
        VALUES (?, 'whatsapp', ?)
        RETURNING id
      `);
      const response = insertResponse.get(survey_id, from);

      const insertAnswer = db.prepare(`
        INSERT INTO answers (response_id, question_id, value)
        VALUES (?, ?, ?)
      `);

      for (const ans of answers) {
        const valueToSave = Array.isArray(ans.value) ? ans.value.join(',') : String(ans.value);
        insertAnswer.run(response.id, ans.question_id, valueToSave);
      }
      
      return response;
    });

    const result = transaction();

    return c.json({ status: "success", response_id: result.id });

  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};
