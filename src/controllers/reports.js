/**
 * @fileoverview Report generation controller - Aggregates and analyzes survey responses
 * @module controllers/reports
 */

import { db } from "../db/connection.js";
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';

/**
 * Generates aggregated report for a specific survey
 * @param {import('hono').Context} c - Hono context object
 * @returns {Response} JSON response with aggregated survey results
 * @throws {Error} If survey not found or doesn't belong to company
 * 
 * @description
 * Aggregates responses by question type:
 * - Choice/Rating questions: Frequency count per option
 * - Text/Number questions: List of all responses with metadata
 * 
 * @example
 * GET /reports/1?survey_id=10
 * Response: {
 *   "survey": { "id": 10, "title": "...", "total_responses": 50 },
 *   "results": [
 *     { "question": "...", "type": "single_choice", "breakdown": [{"option": "Yes", "count": 30}] }
 *   ]
 * }
 */
export const getCompanyReports = (c) => {
  try {
    // Obtener company_id del usuario autenticado
    const payload = c.get('jwtPayload');
    const companyId = payload.company_id;
    
    // Obtener surveyId del parámetro de la URL
    const surveyId = c.req.param('surveyId');

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

/**
 * Helper function to fetch and process report data
 * @private
 * @param {string} surveyId - Survey ID
 * @param {string} companyId - Company ID
 * @returns {Object} Processed report data with survey info and results
 * @throws {Error} If survey not found or doesn't belong to company
 */
const getReportData = (surveyId, companyId) => {
  // Verificar que la encuesta pertenezca a la empresa
  const survey = db.query("SELECT * FROM surveys WHERE id = ? AND company_id = ?").get(surveyId, companyId);
  
  if (!survey) {
    throw new Error("Encuesta no encontrada o no pertenece a esta empresa.");
  }

  // Obtener todas las respuestas
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

  // Procesar y agrupar los datos
  const report = {};

  rawData.forEach(row => {
    if (!report[row.question_id]) {
      report[row.question_id] = {
        question: row.question_text,
        type: row.question_type,
        total_answers: 0,
        data: []
      };
    }

    report[row.question_id].total_answers++;

    if (['single_choice', 'multiple_choice', 'rating'].includes(row.question_type)) {
      if (Array.isArray(report[row.question_id].data)) {
        report[row.question_id].data = {};
      }
      
      const values = row.value.split(',');
      values.forEach(val => {
        const cleanVal = val.trim();
        report[row.question_id].data[cleanVal] = (report[row.question_id].data[cleanVal] || 0) + 1;
      });
    } else {
      report[row.question_id].data.push({
        value: row.value,
        date: row.submitted_at,
        channel: row.channel
      });
    }
  });

  // Formatear resultados
  const formattedResults = Object.values(report).map(q => {
    if (!Array.isArray(q.data)) {
      q.breakdown = Object.entries(q.data).map(([option, count]) => ({ option, count }));
      delete q.data;
    }
    return q;
  });

  return {
    survey: {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      total_responses: new Set(rawData.map(r => r.submitted_at)).size
    },
    results: formattedResults
  };
};

/**
 * Exports survey report as Excel file (.xlsx)
 * @async
 * @param {import('hono').Context} c - Hono context object
 * @returns {Promise<Response>} Excel file as binary stream
 * @throws {Error} If survey not found or export fails
 * 
 * @description
 * Generates Excel workbook with:
 * - Survey metadata (title, total responses)
 * - One section per question with aggregated results
 * - Formatted tables with colors and styling
 * 
 * @example
 * GET /reports/1/export?survey_id=10&format=xlsx
 * Response: Binary Excel file (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
 */
export const exportReportExcel = async (c) => {
  try {
    // Obtener company_id del usuario autenticado
    const payload = c.get('jwtPayload');
    const companyId = payload.company_id;
    
    // Obtener surveyId del parámetro de la URL
    const surveyId = c.req.param('surveyId');

    const reportData = getReportData(surveyId, companyId);

    // Crear libro de Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');

    // Configurar columnas
    worksheet.columns = [
      { header: 'Pregunta / Opción', key: 'label', width: 50 },
      { header: 'Valor / Cantidad', key: 'value', width: 20 }
    ];

    // Título del reporte
    worksheet.addRow(['REPORTE DE ENCUESTA']);
    worksheet.addRow([reportData.survey.title]);
    worksheet.addRow([`Total de respuestas: ${reportData.survey.total_responses}`]);
    worksheet.addRow([]); // Espacio

    // Estilo para el título
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    worksheet.getCell('A2').font = { size: 14 };
    worksheet.getCell('A3').font = { size: 12, italic: true };

    // Agregar datos de cada pregunta
    reportData.results.forEach((question, index) => {
      // Encabezado de pregunta
      const questionRow = worksheet.addRow([`Pregunta ${index + 1}: ${question.question}`, `Total: ${question.total_answers}`]);
      questionRow.font = { bold: true };
      questionRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Datos de la pregunta
      if (question.breakdown) {
        // Preguntas de selección
        question.breakdown.forEach(item => {
          worksheet.addRow([`  ${item.option}`, item.count]);
        });
      } else if (question.data) {
        // Preguntas de texto
        question.data.forEach(item => {
          worksheet.addRow([`  ${item.value}`, new Date(item.submitted_at).toLocaleString()]);
        });
      }

      worksheet.addRow([]); // Espacio entre preguntas
    });

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Retornar como descarga
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="reporte_${reportData.survey.id}_${Date.now()}.xlsx"`
      }
    });

  } catch (error) {
    console.error("Error en exportación Excel:", error);
    return c.json({ error: error.message }, 500);
  }
};

/**
 * Exports survey report as PDF file
 * @async
 * @param {import('hono').Context} c - Hono context object
 * @returns {Promise<Response>} PDF file as binary stream
 * @throws {Error} If survey not found or export fails
 * 
 * @description
 * Generates PDF document with:
 * - Survey title and metadata
 * - Formatted tables for each question
 * - Automatic page breaks and pagination
 * 
 * @example
 * GET /reports/1/export?survey_id=10&format=pdf
 * Response: Binary PDF file (application/pdf)
 */
export const exportReportPDF = async (c) => {
  try {
    // Obtener company_id del usuario autenticado
    const payload = c.get('jwtPayload');
    const companyId = payload.company_id;
    
    // Obtener surveyId del parámetro de la URL
    const surveyId = c.req.param('surveyId');

    const reportData = getReportData(surveyId, companyId);

    // Crear documento PDF
    const doc = new jsPDF();

    // Función helper para dibujar tablas manualmente
    const drawTable = (headers, rows, startY) => {
      const pageWidth = doc.internal.pageSize.width;
      const margin = 14;
      const tableWidth = pageWidth - (margin * 2);
      const colWidth = tableWidth / headers.length;
      const rowHeight = 8;
      let currentY = startY;

      // Header
      doc.setFillColor(66, 139, 202);
      doc.setTextColor(255, 255, 255);
      doc.rect(margin, currentY, tableWidth, rowHeight, 'F');
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      headers.forEach((header, i) => {
        doc.text(header, margin + (i * colWidth) + 2, currentY + 5.5);
      });
      
      currentY += rowHeight;

      // Rows
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      rows.forEach((row, rowIndex) => {
        // Alternar color de fondo
        if (rowIndex % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, currentY, tableWidth, rowHeight, 'F');
        }

        row.forEach((cell, i) => {
          const text = String(cell);
          const maxWidth = colWidth - 4;
          const cellText = doc.splitTextToSize(text, maxWidth);
          doc.text(cellText[0], margin + (i * colWidth) + 2, currentY + 5.5);
        });

        currentY += rowHeight;

        // Check for page overflow
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }
      });

      // Bordes de la tabla
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, startY, tableWidth, (rows.length + 1) * rowHeight);

      return currentY + 5;
    };

    // Título
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text('REPORTE DE ENCUESTA', 14, 20);

    doc.setFontSize(14);
    doc.text(reportData.survey.title, 14, 30);

    doc.setFontSize(11);
    doc.text(`Total de respuestas: ${reportData.survey.total_responses}`, 14, 38);

    let yPosition = 50;

    // Agregar cada pregunta
    reportData.results.forEach((question, index) => {
      // Verificar si necesitamos nueva página
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // Título de pregunta
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Pregunta ${index + 1}: ${question.question}`, 14, yPosition);
      yPosition += 10;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);

      // Tabla de resultados
      if (question.breakdown) {
        // Preguntas de selección
        const tableData = question.breakdown.map(item => [item.option, item.count.toString()]);
        yPosition = drawTable(['Opción', 'Cantidad'], tableData, yPosition);
      } else if (question.data) {
        // Preguntas de texto (mostrar máximo 5 respuestas)
        const tableData = question.data.slice(0, 5).map(item => [
          item.value.substring(0, 60) + (item.value.length > 60 ? '...' : ''),
          new Date(item.submitted_at).toLocaleDateString()
        ]);

        yPosition = drawTable(['Respuesta', 'Fecha'], tableData, yPosition);

        if (question.data.length > 5) {
          doc.setFontSize(9);
          doc.setTextColor(128, 128, 128);
          doc.text(`... y ${question.data.length - 5} respuestas más`, 14, yPosition);
          doc.setTextColor(0, 0, 0);
          yPosition += 10;
        }
      }
    });

    // Generar buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Retornar como descarga
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte_${reportData.survey.id}_${Date.now()}.pdf"`
      }
    });

  } catch (error) {
    console.error("Error en exportación PDF:", error);
    return c.json({ error: error.message }, 500);
  }
};

/**
 * Gets individual responses for a survey
 * @param {import('hono').Context} c - Hono context object
 * @returns {Response} JSON response with individual responses organized by response_id
 * @throws {Error} If survey not found or doesn't belong to company
 * 
 * @description
 * Returns raw individual responses rather than aggregated data.
 * Each response includes all answers from one submission.
 * 
 * @example
 * GET /reports/10/responses
 * Response: {
 *   "survey": { "id": 10, "title": "...", "total_responses": 50 },
 *   "questions": [{"id": 1, "text": "...", "type": "text"}],
 *   "responses": [
 *     {
 *       "response_id": 1,
 *       "submitted_at": "2024-01-15T10:30:00",
 *       "channel": "web",
 *       "answers": {"1": "Answer text", "2": "Option A"}
 *     }
 *   ]
 * }
 */
export const getIndividualResponses = (c) => {
  try {
    // Obtener company_id del usuario autenticado
    const payload = c.get('jwtPayload');
    const companyId = payload.company_id;
    
    // Obtener surveyId del parámetro de la URL
    const surveyId = c.req.param('surveyId');

    // Verificar que la encuesta pertenezca a la empresa
    const survey = db.query("SELECT * FROM surveys WHERE id = ? AND company_id = ?").get(surveyId, companyId);
    
    if (!survey) {
      return c.json({ error: "Encuesta no encontrada o no pertenece a esta empresa." }, 404);
    }

    // Obtener todas las preguntas de la encuesta
    const questions = db.query(`
      SELECT id, text, type, "order"
      FROM questions
      WHERE survey_id = ?
      ORDER BY "order" ASC
    `).all(surveyId);

    // Obtener todas las respuestas individuales
    const rawResponses = db.query(`
      SELECT 
        r.id as response_id,
        r.channel,
        r.submitted_at,
        a.question_id,
        a.value
      FROM responses r
      LEFT JOIN answers a ON r.id = a.response_id
      WHERE r.survey_id = ?
      ORDER BY r.submitted_at DESC, a.question_id ASC
    `).all(surveyId);

    // Agrupar respuestas por response_id
    const responsesMap = new Map();

    rawResponses.forEach(row => {
      if (!responsesMap.has(row.response_id)) {
        responsesMap.set(row.response_id, {
          response_id: row.response_id,
          submitted_at: row.submitted_at,
          channel: row.channel,
          answers: {}
        });
      }

      // Agregar la respuesta a la pregunta correspondiente
      if (row.question_id) {
        responsesMap.get(row.response_id).answers[row.question_id] = row.value;
      }
    });

    const responses = Array.from(responsesMap.values());

    return c.json({
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        total_responses: responses.length
      },
      questions: questions,
      responses: responses
    });

  } catch (error) {
    console.error("Error al obtener respuestas individuales:", error);
    return c.json({ error: error.message }, 500);
  }
};
