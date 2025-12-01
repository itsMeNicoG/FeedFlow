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

// Variables para tests de admin
let adminCompanyId;
let adminId;
let adminToken;
let secondCompanyId;
let secondAdminToken;
let createdUserId;

// Variable para admin de Test Corp (tests originales)
let testCorpAdminToken;

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

  // =====================================================
  // TESTS DE REGISTRO Y ADMINISTRACIÓN DE USUARIOS
  // =====================================================

  test("POST /register - Debe registrar empresa + admin exitosamente", async () => {
    const res = await app.request("/register", {
      method: "POST",
      body: JSON.stringify({
        company_name: "Admin Test Corp",
        nit: "888888888",
        admin_name: "Super Admin",
        admin_email: "admin@admintest.com",
        admin_password: "admin123"
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    
    expect(json.data.company).toBeDefined();
    expect(json.data.admin).toBeDefined();
    expect(json.data.admin.role).toBe("admin");
    
    adminCompanyId = json.data.company.id;
    adminId = json.data.admin.id;
  });

  test("POST /register - Debe rechazar NIT duplicado", async () => {
    const res = await app.request("/register", {
      method: "POST",
      body: JSON.stringify({
        company_name: "Otra Empresa",
        nit: "888888888", // Mismo NIT
        admin_name: "Otro Admin",
        admin_email: "otro@test.com",
        admin_password: "123456"
      }),
    });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("Ya existe una empresa");
  });

  test("POST /register - Debe rechazar email duplicado", async () => {
    const res = await app.request("/register", {
      method: "POST",
      body: JSON.stringify({
        company_name: "Empresa Nueva",
        nit: "777777777",
        admin_name: "Admin Nuevo",
        admin_email: "admin@admintest.com", // Email ya usado
        admin_password: "123456"
      }),
    });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("Ya existe un usuario");
  });

  test("POST /register - Debe validar campos obligatorios", async () => {
    const res = await app.request("/register", {
      method: "POST",
      body: JSON.stringify({
        company_name: "Incompleta",
        // Faltan campos
      }),
    });

    expect(res.status).toBe(400);
  });

  test("POST /auth/login - Admin puede hacer login", async () => {
    const res = await app.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ 
        email: "admin@admintest.com", 
        password: "admin123" 
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    
    expect(json.token).toBeDefined();
    expect(json.user.role).toBe("admin");
    expect(json.user.company_id).toBe(adminCompanyId);
    
    adminToken = json.token;
  });

  test("POST /users - Admin puede crear usuarios para su empresa", async () => {
    const res = await app.request("/users", {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: "Usuario Creado",
        email: "creado@admintest.com",
        role: "creator",
        password: "password123"
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    
    expect(json.data.role).toBe("creator");
    expect(json.data.status).toBe("active");
    
    createdUserId = json.data.id;
  });

  test("POST /users - Admin puede crear otro admin", async () => {
    const res = await app.request("/users", {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: "Segundo Admin",
        email: "admin2@admintest.com",
        role: "admin",
        password: "password123"
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.role).toBe("admin");
  });

  test("POST /users - Rechaza rol inválido", async () => {
    const res = await app.request("/users", {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: "Usuario Malo",
        email: "malo@test.com",
        role: "superuser", // Rol inválido
        password: "password123"
      }),
    });

    expect(res.status).toBe(400);
  });

  test("POST /users - Usuario no-admin NO puede crear usuarios", async () => {
    // Primero hacer login con el usuario creator que creamos
    const loginRes = await app.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ 
        email: "creado@admintest.com", 
        password: "password123" 
      }),
    });
    const { token: creatorToken } = await loginRes.json();

    // Intentar crear usuario (debe fallar)
    const res = await app.request("/users", {
      method: "POST",
      headers: { "Authorization": `Bearer ${creatorToken}` },
      body: JSON.stringify({
        name: "Intento Fallido",
        email: "fallido@test.com",
        role: "analyst",
        password: "password123"
      }),
    });

    expect(res.status).toBe(403);
  });

  test("GET /users - Admin puede ver usuarios de su empresa", async () => {
    const res = await app.request("/users", {
      headers: { "Authorization": `Bearer ${adminToken}` }
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    
    // Debe tener al menos 3 usuarios (admin original + creator + segundo admin)
    expect(json.data.length).toBeGreaterThanOrEqual(3);
    
    // Todos deben ser de la misma empresa
    json.data.forEach(user => {
      expect(user.company_id).toBe(adminCompanyId);
    });
  });

  test("GET /users - Usuario no-admin NO puede listar usuarios", async () => {
    const loginRes = await app.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ 
        email: "creado@admintest.com", 
        password: "password123" 
      }),
    });
    const { token } = await loginRes.json();

    const res = await app.request("/users", {
      headers: { "Authorization": `Bearer ${token}` }
    });

    expect(res.status).toBe(403);
  });

  test("PATCH /users/:id/status - Admin puede cambiar estado de usuario de su empresa", async () => {
    const res = await app.request(`/users/${createdUserId}/status`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${adminToken}` },
      body: JSON.stringify({ status: "inactive" })
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("inactive");

    // Reactivar
    await app.request(`/users/${createdUserId}/status`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${adminToken}` },
      body: JSON.stringify({ status: "active" })
    });
  });

  test("PATCH /users/:id/status - Admin NO puede modificar usuarios de otra empresa", async () => {
    // Crear segunda empresa
    const registerRes = await app.request("/register", {
      method: "POST",
      body: JSON.stringify({
        company_name: "Segunda Empresa",
        nit: "666666666",
        admin_name: "Admin Segundo",
        admin_email: "admin@segunda.com",
        admin_password: "123456"
      }),
    });
    const registerJson = await registerRes.json();
    secondCompanyId = registerJson.data.company.id;

    // Login con segundo admin
    const loginRes = await app.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ 
        email: "admin@segunda.com", 
        password: "123456" 
      }),
    });
    const loginJson = await loginRes.json();
    secondAdminToken = loginJson.token;

    // Intentar modificar usuario de la primera empresa
    const res = await app.request(`/users/${createdUserId}/status`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${secondAdminToken}` },
      body: JSON.stringify({ status: "inactive" })
    });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("otra empresa");
  });

  // =====================================================
  // TESTS ORIGINALES (mantener compatibilidad)
  // =====================================================

  // ...existing code...

  test("Setup Inicial - Crear Empresa y Usuarios (Admin, Creador y Analista)", async () => {
    // Insertamos empresa
    const insertComp = db.prepare("INSERT INTO companies (name, nit) VALUES (?, ?) RETURNING id");
    const comp = insertComp.get("Test Corp", "999999");
    companyId = comp.id;

    const hashedPassword = await Bun.password.hash("123456");
    const insertUser = db.prepare("INSERT INTO users (company_id, name, email, password, role) VALUES (?, ?, ?, ?, ?) RETURNING id");
    
    // Usuario Admin para Test Corp
    const admin = insertUser.get(companyId, "Admin Test", "admintestcorp@test.com", hashedPassword, "admin");
    
    // Usuario Creador
    const creator = insertUser.get(companyId, "Creator Test", "creator@test.com", hashedPassword, "creator");
    creatorId = creator.id;

    // Usuario Analista
    const analyst = insertUser.get(companyId, "Analyst Test", "analyst@test.com", hashedPassword, "analyst");
    analystId = analyst.id;

    expect(admin.id).toBeDefined();
    expect(creatorId).toBeDefined();
    expect(analystId).toBeDefined();
  });

  // --- TEST: LOGIN (Todos los roles) ---
  test("POST /auth/login - Debe devolver tokens para todos los roles", async () => {
    // Login Admin de Test Corp
    const resAdmin = await app.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admintestcorp@test.com", password: "123456" }),
    });
    const jsonAdmin = await resAdmin.json();
    testCorpAdminToken = jsonAdmin.token;

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

    expect(testCorpAdminToken).toBeDefined();
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
  test("GET /reports/:surveyId - Analista puede ver, Creador NO", async () => {
    // Intento de Creador (Debe fallar)
    const resFail = await app.request(`/reports/${surveyId}`, {
      headers: { "Authorization": `Bearer ${creatorToken}` }
    });
    expect(resFail.status).toBe(403);

    // Intento de Analista (Debe funcionar)
    const resSuccess = await app.request(`/reports/${surveyId}`, {
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

  // --- TEST: MODIFICAR ENCUESTA (Solo Creador) ---
  test("PUT /surveys/:id - Creador puede modificar encuesta", async () => {
    const res = await app.request(`/surveys/${surveyId}`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${creatorToken}` },
      body: JSON.stringify({
        title: "Encuesta Modificada",
        description: "Descripción actualizada"
      })
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.title).toBe("Encuesta Modificada");
  });

  // --- TEST: LISTAR USUARIOS (Solo Admin) ---
  test("GET /users - Admin puede listar usuarios de su empresa", async () => {
    const res = await app.request(`/users`, {
      headers: { "Authorization": `Bearer ${testCorpAdminToken}` }
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.length).toBe(3); // Admin, Creador y Analista
  });

  // --- TEST: CAMBIAR ESTADO DE USUARIO (Solo Admin) ---
  test("PATCH /users/:id/status - Admin puede cambiar estado del usuario", async () => {
    const res = await app.request(`/users/${analystId}/status`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${testCorpAdminToken}` },
      body: JSON.stringify({ status: "inactive" })
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("inactive");

    // Reactivar para no romper otros tests
    await app.request(`/users/${analystId}/status`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${testCorpAdminToken}` },
      body: JSON.stringify({ status: "active" })
    });
  });

  // --- TEST: ACCESO POR LINK CORTO ---
  test("GET /s/:slug - Debe retornar encuesta por link corto (público)", async () => {
    // Primero obtener el slug de la encuesta
    const surveyData = db.query("SELECT link_slug FROM surveys WHERE id = ?").get(surveyId);
    
    const res = await app.request(`/s/${surveyData.link_slug}`);
    
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe(surveyId);
    expect(json.data.questions).toBeDefined();
  });

  // --- TEST: EXPORTAR A EXCEL ---
  test("GET /reports/:surveyId/export?format=xlsx - Analista puede exportar a Excel", async () => {
    const res = await app.request(`/reports/${surveyId}/export?format=xlsx`, {
      headers: { "Authorization": `Bearer ${analystToken}` }
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('spreadsheet');
  });

  // --- TEST: EXPORTAR A PDF ---
  test("GET /reports/:surveyId/export?format=pdf - Analista puede exportar a PDF", async () => {
    const res = await app.request(`/reports/${surveyId}/export?format=pdf`, {
      headers: { "Authorization": `Bearer ${analystToken}` }
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
  });

});
