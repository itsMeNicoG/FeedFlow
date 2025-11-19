import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { app } from "../src/index.js";
import { db } from "../src/db/connection.js";
import { initDB } from "../src/db/setup.js";

// IDs para usar entre tests
let companyId;
let userId;
let surveyId;
let questionId;

describe("FeedFlow API Integration Tests", () => {
  
  // 1. Preparar la base de datos de prueba antes de empezar
  beforeAll(() => {
    console.log("🧪 Iniciando tests con DB:", db.filename);
    initDB(db);
    
    // Limpiar datos de pruebas anteriores
    db.run("DELETE FROM answers");
    db.run("DELETE FROM responses");
    db.run("DELETE FROM options");
    db.run("DELETE FROM questions");
    db.run("DELETE FROM surveys");
    db.run("DELETE FROM users");
    db.run("DELETE FROM companies");
  });

  // 2. Limpiar después (opcional, ya que usamos un archivo separado)
  afterAll(() => {
    // db.close();
  });

  // --- TEST: CREAR EMPRESA ---
  test("POST /companies - Debe crear una empresa", async () => {
    const res = await app.request("/companies", {
      method: "POST",
      body: JSON.stringify({ name: "Test Corp", nit: "999999" }),
    });
    
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe("Test Corp");
    companyId = json.data.id;
  });

  // --- TEST: CREAR USUARIO ---
  test("POST /users - Debe crear un usuario creador", async () => {
    const res = await app.request("/users", {
      method: "POST",
      body: JSON.stringify({ 
        company_id: companyId, 
        name: "Admin Test", 
        email: "admin@test.com", 
        role: "creator" 
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.email).toBe("admin@test.com");
    userId = json.data.id;
  });

  // --- TEST: CREAR ENCUESTA ---
  test("POST /surveys - Debe crear una encuesta", async () => {
    const res = await app.request("/surveys", {
      method: "POST",
      body: JSON.stringify({
        company_id: companyId,
        created_by: userId,
        title: "Encuesta de Prueba",
        description: "Testing...",
        start_date: "2025-01-01",
        end_date: "2025-12-31"
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.title).toBe("Encuesta de Prueba");
    expect(json.data.links.short_link).toBeDefined();
    surveyId = json.data.id;
  });

  // --- TEST: AGREGAR PREGUNTA ---
  test("POST /surveys/:id/questions - Debe agregar una pregunta", async () => {
    const res = await app.request(`/surveys/${surveyId}/questions`, {
      method: "POST",
      body: JSON.stringify({
        text: "¿Te gusta Bun?",
        type: "single_choice",
        options: ["Sí", "No", "Mucho"]
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.text).toBe("¿Te gusta Bun?");
    questionId = json.data.id;
  });

  // --- TEST: RESPONDER ENCUESTA (WEB) ---
  test("POST /submit/:id - Debe guardar respuestas", async () => {
    const res = await app.request(`/submit/${surveyId}`, {
      method: "POST",
      body: JSON.stringify({
        respondent_identifier: "tester@demo.com",
        answers: [
          { question_id: questionId, value: "Mucho" }
        ]
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.message).toBe("Respuestas guardadas exitosamente");
  });

  // --- TEST: VER REPORTES ---
  test("GET /reports/:companyId - Debe mostrar resultados", async () => {
    const res = await app.request(`/reports/${companyId}?survey_id=${surveyId}`);
    
    expect(res.status).toBe(200);
    const json = await res.json();
    
    expect(json.survey.total_responses).toBe(1);
    expect(json.results[0].question).toBe("¿Te gusta Bun?");
    // Verificar que contó "Mucho" como 1
    const optionCount = json.results[0].breakdown.find(o => o.option === "Mucho");
    expect(optionCount.count).toBe(1);
  });

  // --- TEST: DUPLICAR ENCUESTA ---
  test("POST /surveys/:id/duplicate - Debe duplicar encuesta y preguntas", async () => {
    const res = await app.request(`/surveys/${surveyId}/duplicate`, {
      method: "POST",
      body: JSON.stringify({ title: "Encuesta Duplicada" })
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.title).toBe("Encuesta Duplicada");
    
    // Verificar que se copiaron las preguntas
    const newSurveyId = json.data.id;
    const resGet = await app.request(`/surveys/${newSurveyId}`);
    const jsonGet = await resGet.json();
    
    expect(jsonGet.data.questions.length).toBe(1);
    expect(jsonGet.data.questions[0].text).toBe("¿Te gusta Bun?");
  });

});
