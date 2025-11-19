import { db } from "../db/connection.js";

export const getCompanyReports = (c) => {
  try {
    const companyId = c.req.param('companyId');
    const surveyId = c.req.query('survey_id');

    if (!surveyId) {
      return c.json({ error: "Por favor seleccione una encuesta (survey_id) para generar el reporte." }, 400);
    }

    // 1. Verificar que la encuesta pertenezca a la empresa
    const survey = db.query("SELECT * FROM surveys WHERE id = ? AND company_id = ?").get(surveyId, companyId);
    
    if (!survey) {
      return c.json({ error: "Encuesta no encontrada o no pertenece a esta empresa." }, 404);
    }

    // 2. Obtener todas las respuestas de esa encuesta
    // Hacemos un JOIN para traer el texto de la pregunta y el tipo
    const query = db.query(`
      SELECT 
        q.id as question_id,
        q.text as question_text,
        q.type as question_type,
        a.value,
        r.channel,
        r.submitted_at
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      JOIN responses r ON a.response_id = r.id
      WHERE r.survey_id = ?
      ORDER BY q."order" ASC, r.submitted_at DESC
    `);

    const rawData = query.all(surveyId);

    // 3. Procesar y agrupar los datos
    const report = {};

    rawData.forEach(row => {
      if (!report[row.question_id]) {
        report[row.question_id] = {
          question: row.question_text,
          type: row.question_type,
          total_answers: 0,
          data: [] // Para texto/números guardamos los valores, para selección guardamos conteo
        };
      }

      report[row.question_id].total_answers++;

      // Lógica de agrupación según tipo
      if (['single_choice', 'multiple_choice', 'rating'].includes(row.question_type)) {
        // Inicializar estructura de conteo si no existe
        if (Array.isArray(report[row.question_id].data)) {
           report[row.question_id].data = {}; // Cambiamos a objeto para contar frecuencias
        }
        
        // Manejar respuestas múltiples (separadas por coma)
        const values = row.value.split(',');
        values.forEach(val => {
          const cleanVal = val.trim();
          report[row.question_id].data[cleanVal] = (report[row.question_id].data[cleanVal] || 0) + 1;
        });

      } else {
        // Para texto abierto o números, listamos las respuestas
        report[row.question_id].data.push({
          value: row.value,
          date: row.submitted_at,
          channel: row.channel
        });
      }
    });

    // 4. Formatear para respuesta final
    const formattedResults = Object.values(report).map(q => {
      // Si es de selección, convertimos el objeto de conteo a array para que sea más fácil de consumir
      if (!Array.isArray(q.data)) {
        q.breakdown = Object.entries(q.data).map(([option, count]) => ({ option, count }));
        delete q.data;
      }
      return q;
    });

    return c.json({
      company: companyId,
      survey: {
        id: survey.id,
        title: survey.title,
        total_responses: new Set(rawData.map(r => r.submitted_at)).size // Estimado de respuestas únicas
      },
      results: formattedResults
    });

  } catch (error) {
    console.error("Error en reportes:", error);
    return c.json({ error: error.message }, 500);
  }
};
