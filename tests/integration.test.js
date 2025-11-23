import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { app } from "../src/index.js";
import { db } from "../src/db/connection.js";
import { initDB } from "../src/db/setup.js";

// IDs para usar entre tests
let companyId;
let creatorId;
let analystId;
let creatorToken;
let analystToken;
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

  // ...existing code...

  test("Setup Inicial - Crear Empresa y Usuarios (Creador y Analista)", async () => {
    // Insertamos empresa
    const insertComp = db.prepare("INSERT INTO companies (name, nit) VALUES (?, ?) RETURNING id");
    const comp = insertComp.get("Test Corp", "999999");
    companyId = comp.id;

    const hashedPassword = await Bun.password.hash("123456");
    const insertUser = db.prepare("INSERT INTO users (company_id, name, email, password, role) VALUES (?, ?, ?, ?, ?) RETURNING id");
    
    // Usuario Creador
    const creator = insertUser.get(companyId, "Creator Test", "creator@test.com", hashedPassword, "creator");
    creatorId = creator.id;

    // Usuario Analista
    const analyst = insertUser.get(companyId, "Analyst Test", "analyst@test.com", hashedPassword, "analyst");
    analystId = analyst.id;

    expect(creatorId).toBeDefined();
    expect(analystId).toBeDefined();
  });

  // --- TEST: LOGIN (Ambos roles) ---
  test("POST /auth/login - Debe devolver tokens para ambos roles", async () => {
    // Login Creador
    const resCreator = await app.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "creator@test.com", password: "123456" }),
    });
    const jsonCreator = await resCreator.json();
    creatorToken = jsonCreator.token;

    // Login Analista
    const resAnalyst = await app.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "analyst@test.com", password: "123456" }),
    });
    const jsonAnalyst = await resAnalyst.json();
    analystToken = jsonAnalyst.token;

    expect(creatorToken).toBeDefined();
    expect(analystToken).toBeDefined();
  });

  // --- TEST: CREAR ENCUESTA (Solo Creador) ---
  test("POST /surveys - Creador puede crear, Analista NO", async () => {
    // Intento de Analista (Debe fallar)
    const resFail = await app.request("/surveys", {
      method: "POST",
      headers: { "Authorization": `Bearer ${analystToken}` },
      body: JSON.stringify({
        company_id: companyId,
        created_by: analystId,
        title: "Intento Hack",
      }),
    });
    expect(resFail.status).toBe(403);

    // Intento de Creador (Debe funcionar)
    const resSuccess = await app.request("/surveys", {
      method: "POST",
      headers: { "Authorization": `Bearer ${creatorToken}` },
      body: JSON.stringify({
        company_id: companyId,
        created_by: creatorId,
        title: "Encuesta de Prueba",
        description: "Testing...",
        start_date: "2025-01-01",
        end_date: "2025-12-31"
      }),
    });

    expect(resSuccess.status).toBe(201);
    const json = await resSuccess.json();
    surveyId = json.data.id;
  });

  // --- TEST: AGREGAR PREGUNTA (Solo Creador) ---
  test("POST /surveys/:id/questions - Solo Creador puede agregar", async () => {
    const res = await app.request(`/surveys/${surveyId}/questions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${creatorToken}` },
      body: JSON.stringify({
        text: "¿Te gusta Bun?",
        type: "single_choice",
        options: ["Sí", "No", "Mucho"]
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    questionId = json.data.id;
  });

  // --- TEST: RESPONDER ENCUESTA (Público) ---
  test("POST /submit/:id - Debe guardar respuestas (Sin Token)", async () => {
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
  });

  // --- TEST: VER REPORTES (Solo Analista) ---
  test("GET /reports/:companyId - Analista puede ver, Creador NO", async () => {
    // Intento de Creador (Debe fallar)
    const resFail = await app.request(`/reports/${companyId}?survey_id=${surveyId}`, {
      headers: { "Authorization": `Bearer ${creatorToken}` }
    });
    expect(resFail.status).toBe(403);

    // Intento de Analista (Debe funcionar)
    const resSuccess = await app.request(`/reports/${companyId}?survey_id=${surveyId}`, {
      headers: { "Authorization": `Bearer ${analystToken}` }
    });
    
    expect(resSuccess.status).toBe(200);
    const json = await resSuccess.json();
    expect(json.survey.total_responses).toBe(1);
  });

  // --- TEST: DUPLICAR ENCUESTA (Solo Creador) ---
  test("POST /surveys/:id/duplicate - Solo Creador puede duplicar", async () => {
    const res = await app.request(`/surveys/${surveyId}/duplicate`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${creatorToken}` },
      body: JSON.stringify({ title: "Encuesta Duplicada" })
    });

    expect(res.status).toBe(201);
  });

});
