# FeedFlow API - Referencia Completa

> **Documentación oficial para desarrolladores frontend**  
> Versión: 2.0 | Última actualización: Noviembre 2025

Esta guía contiene la documentación completa de todos los endpoints de FeedFlow API con ejemplos de request/response listos para usar.

---

## 📋 Índice

### Endpoints Públicos (Sin autenticación)
1. [Acceso a Encuesta por Slug](#1-get-sslug)
2. [Enviar Respuestas](#2-post-submitsurveyid)

### Autenticación
3. [Login](#3-post-authlogin)

### Empresas
4. [Crear Empresa](#4-post-companies)

### Usuarios
5. [Crear Usuario](#5-post-users)
6. [Listar Usuarios](#6-get-users)
7. [Cambiar Estado de Usuario](#7-patch-usersidstatus)

### Encuestas (Protegido)
8. [Listar Encuestas](#8-get-surveys)
9. [Obtener Encuesta Específica](#9-get-surveysid)
10. [Crear Encuesta](#10-post-surveys)
11. [Modificar Encuesta](#11-put-surveysid)
12. [Eliminar Encuesta](#12-delete-surveysid)
13. [Duplicar Encuesta](#13-post-surveysidduplicate)
14. [Agregar Pregunta a Encuesta](#14-post-surveysidquestions)

### Reportes (Protegido - Analyst only)
15. [Generar Reporte](#15-get-reportscompanyid)
16. [Exportar Reporte a Excel](#16-get-reportscompanyidexportformatxlsx)
17. [Exportar Reporte a PDF](#17-get-reportscompanyidexportformatpdf)

---

## 🌐 URL Base

```
http://localhost:3000
```

Para producción, reemplaza con tu dominio:
```
https://api.feedflow.com
```

---

## 🔓 Endpoints Públicos

### 1. GET /s/:slug

Obtiene una encuesta por su slug único (link corto). No requiere autenticación.

**URL**: `/s/{slug}`

**Método**: `GET`

**Parámetros de URL**:
- `slug` (string, requerido): Identificador único de la encuesta (ej: `abc123def456`)

**Headers**: Ninguno

**Response 200 OK**:
```json
{
  "survey": {
    "id": 5,
    "title": "Encuesta de Satisfacción 2025",
    "description": "Queremos conocer tu opinión sobre nuestros servicios",
    "start_date": "2025-01-01T00:00:00.000Z",
    "end_date": "2025-12-31T23:59:59.000Z"
  },
  "questions": [
    {
      "id": 10,
      "text": "¿Cómo calificarías nuestro servicio?",
      "type": "single_choice",
      "required": true,
      "order_num": 1,
      "options": [
        {
          "id": 25,
          "text": "Excelente",
          "order_num": 1
        },
        {
          "id": 26,
          "text": "Bueno",
          "order_num": 2
        },
        {
          "id": 27,
          "text": "Regular",
          "order_num": 3
        },
        {
          "id": 28,
          "text": "Malo",
          "order_num": 4
        }
      ]
    },
    {
      "id": 11,
      "text": "¿Cuál es tu nivel de satisfacción? (1-5)",
      "type": "rating",
      "required": true,
      "order_num": 2,
      "options": null
    },
    {
      "id": 12,
      "text": "Comentarios adicionales",
      "type": "text",
      "required": false,
      "order_num": 3,
      "options": null
    }
  ]
}
```

**Errores**:

404 Not Found:
```json
{
  "error": "Encuesta no encontrada"
}
```

**Ejemplo cURL**:
```bash
curl -X GET http://localhost:3000/s/abc123def456
```

**Ejemplo JavaScript**:
```javascript
const slug = 'abc123def456';
const response = await fetch(`http://localhost:3000/s/${slug}`);
const data = await response.json();
console.log(data.survey.title);
console.log(data.questions);
```

**Ejemplo React**:
```jsx
function SurveyPublicView() {
  const { slug } = useParams();
  const [survey, setSurvey] = useState(null);
  
  useEffect(() => {
    fetch(`http://localhost:3000/s/${slug}`)
      .then(res => res.json())
      .then(data => setSurvey(data))
      .catch(err => console.error(err));
  }, [slug]);
  
  return (
    <div>
      <h1>{survey?.survey.title}</h1>
      {/* Renderizar preguntas */}
    </div>
  );
}
```

---

### 2. POST /submit/:surveyId

Envía respuestas a una encuesta. No requiere autenticación.

**URL**: `/submit/{surveyId}`

**Método**: `POST`

**Parámetros de URL**:
- `surveyId` (integer, requerido): ID de la encuesta

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "responses": [
    {
      "question_id": 10,
      "value": "Excelente"
    },
    {
      "question_id": 11,
      "value": "5"
    },
    {
      "question_id": 12,
      "value": "Muy buen servicio, seguir así"
    }
  ]
}
```

**Campos del body**:
- `responses` (array, requerido): Lista de respuestas
  - `question_id` (integer, requerido): ID de la pregunta
  - `value` (string, requerido): Respuesta del usuario

**Response 201 Created**:
```json
{
  "message": "Respuestas guardadas exitosamente",
  "submission_id": 123
}
```

**Errores**:

400 Bad Request:
```json
{
  "error": "Se requiere el array 'responses'"
}
```

404 Not Found:
```json
{
  "error": "Encuesta no encontrada"
}
```

**Ejemplo cURL**:
```bash
curl -X POST http://localhost:3000/submit/5 \
  -H "Content-Type: application/json" \
  -d '{
    "responses": [
      {"question_id": 10, "value": "Excelente"},
      {"question_id": 11, "value": "5"},
      {"question_id": 12, "value": "Muy buen servicio"}
    ]
  }'
```

**Ejemplo JavaScript**:
```javascript
async function submitSurvey(surveyId, responses) {
  const response = await fetch(`http://localhost:3000/submit/${surveyId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ responses })
  });
  
  if (!response.ok) {
    throw new Error('Error al enviar respuestas');
  }
  
  return await response.json();
}

// Uso
const responses = [
  { question_id: 10, value: 'Excelente' },
  { question_id: 11, value: '5' }
];
await submitSurvey(5, responses);
```

---

### 3. POST /register  (Público — Bootstrap de Empresa + Admin)

Permite que una nueva empresa se registre junto con su primer usuario administrador. Este endpoint es público y **solo** funcionará si el NIT enviado no existe aún en la base de datos (evita duplicados y bootstrap no autorizado).

**URL**: `/register`

**Método**: `POST`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "company_name": "Mi Empresa S.A.",
  "nit": "900123456",
  "admin_name": "Juan Admin",
  "admin_email": "admin@miempresa.com",
  "admin_password": "ContraseñaSegura123!"
}
```

**Notas**:
- Si ya existe una empresa con el mismo `nit`, el servidor retornará `409 Conflict`.
- Si el `email` del admin ya está en uso, el servidor retorna `409 Conflict`.
- Este endpoint crea **dos recursos** en una sola operación: la fila en `companies` y la fila en `users` con rol `admin`.

**Response 201 Created**:
```json
{
  "message": "Empresa y administrador creados exitosamente",
  "data": {
    "company": { "id": 10, "name": "Mi Empresa S.A.", "nit": "900123456" },
    "admin": { "id": 42, "name": "Juan Admin", "email": "admin@miempresa.com", "role": "admin", "status": "active" }
  }
}
```

**Errores**:

409 Conflict:
```json
{
  "error": "Ya existe una empresa registrada con este NIT"
}
```

400 Bad Request:
```json
{
  "error": "Faltan campos obligatorios"
}
```

**Ejemplo cURL**:
```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Mi Empresa S.A.",
    "nit": "900123456",
    "admin_name": "Juan Admin",
    "admin_email": "admin@miempresa.com",
    "admin_password": "ContraseñaSegura123!"
  }'
```

---

## 🔐 Autenticación

### 3. POST /auth/login

Inicia sesión y obtiene un token JWT.

**URL**: `/auth/login`

**Método**: `POST`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "email": "usuario@empresa.com",
  "password": "password123"
}
```

**Response 200 OK**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidXN1YXJpb0BlbXByZXNhLmNvbSIsInJvbGUiOiJjcmVhdG9yIiwiY29tcGFueUlkIjoxLCJpYXQiOjE2ODk2ODUyMDAsImV4cCI6MTY4OTc3MTYwMH0.signature",
  "user": {
    "id": 1,
    "name": "Juan Pérez",
    "email": "usuario@empresa.com",
    "role": "creator",
    "company_id": 1
  }
}
```

**Errores**:

400 Bad Request:
```json
{
  "error": "Email y contraseña son requeridos"
}
```

401 Unauthorized:
```json
{
  "error": "Credenciales inválidas"
}
```

403 Forbidden (usuario desactivado):
```json
{
  "error": "Usuario desactivado. Contacta al administrador"
}
```

**Ejemplo cURL**:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@empresa.com",
    "password": "password123"
  }'
```

**Ejemplo JavaScript**:
```javascript
async function login(email, password) {
  const response = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }
  
  const data = await response.json();
  
  // Guardar token en localStorage
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  
  return data;
}
```

**Nota**: El token expira en 24 horas. Guárdalo en localStorage o sessionStorage y inclúyelo en el header `Authorization: Bearer {token}` en todas las peticiones protegidas.

---

## 🏢 Empresas

### 4. POST /companies

Crea una nueva empresa.

**URL**: `/companies`

**Método**: `POST`

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "name": "Mi Empresa S.A.S."
}
```

**Response 201 Created**:
```json
{
  "message": "Empresa creada exitosamente",
  "company": {
    "id": 1,
    "name": "Mi Empresa S.A.S.",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**Errores**:

400 Bad Request:
```json
{
  "error": "El nombre de la empresa es requerido"
}
```

**Ejemplo cURL**:
```bash
curl -X POST http://localhost:3000/companies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mi Empresa S.A.S."
  }'
```

---

## 👥 Usuarios
### 5. POST /users (Admin only)

Ahora la creación de usuarios es una operación **administrativa**: solo usuarios con el rol `admin` pueden crear nuevos usuarios para su propia empresa.

**URL**: `/users`

**Método**: `POST`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body**:
```json
{
  "name": "Juan Pérez",
  "email": "juan@empresa.com",
  "password": "password123",
  "role": "creator"
}
```

**Notas**:
- El `company_id` NO se envía en el body: el servidor toma la empresa del `JWT` del admin autenticado.
- Roles válidos: `admin`, `creator`, `analyst`.

**Response 201 Created**:
```json
{
  "message": "Usuario creado exitosamente",
  "user": {
    "id": 1,
    "name": "Juan Pérez",
    "email": "juan@empresa.com",
    "role": "creator",
    "company_id": 1,
    "status": "active",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**Errores**:

401 Unauthorized:
```json
{
  "error": "Token inválido o ausente"
}
```

403 Forbidden:
```json
{
  "error": "Acceso denegado. Se requiere el rol de 'admin'"
}
```

400 Bad Request (rol inválido):
```json
{
  "error": "Rol inválido. Debe ser 'admin', 'creator' o 'analyst'"
}
```

**Ejemplo cURL**:
```bash
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer <token_admin>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Pérez",
    "email": "juan@empresa.com",
    "password": "password123",
    "role": "creator"
  }'
```

---

### 6. GET /users (Admin only)

Lista todos los usuarios de la empresa del admin autenticado. Este endpoint **requiere** que el solicitante tenga rol `admin`.

**URL**: `/users`

**Método**: `GET`

**Headers**:
```
Authorization: Bearer {token}
```

**Response 200 OK**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Juan Pérez",
      "email": "juan@empresa.com",
      "role": "creator",
      "status": "active",
      "company_id": 1,
      "created_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Notas**:
- El `company_id` se obtiene del `JWT` del admin; no se acepta `company_id` por query.
- Solo devuelve usuarios pertenecientes a la misma empresa del admin.

**Errores**:

401 Unauthorized:
```json
{
  "error": "Token inválido o expirado"
}
```

403 Forbidden:
```json
{
  "error": "Acceso denegado. Se requiere el rol de 'admin'"
}
```

---

### 7. PATCH /users/:id/status

Activa o desactiva un usuario. **Requiere autenticación**.

**URL**: `/users/{userId}/status`

**Método**: `PATCH`

**Parámetros de URL**:
- `userId` (integer, requerido): ID del usuario

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body**:
```json
{
  "active": false
}
```

**Campos**:
- `active` (boolean, requerido): `true` para activar, `false` para desactivar

**Response 200 OK**:
```json
{
  "message": "Estado del usuario actualizado",
  "user": {
    "id": 3,
    "name": "Carlos López",
    "email": "carlos@empresa.com",
    "role": "creator",
    "active": false
  }
}
```

**Errores**:

400 Bad Request:
```json
{
  "error": "Se requiere el campo 'active' (true o false)"
}
```

404 Not Found:
```json
{
  "error": "Usuario no encontrado o no pertenece a esta empresa"
}
```

**Ejemplo cURL**:
```bash
# Desactivar usuario
curl -X PATCH http://localhost:3000/users/3/status \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"active": false}'

# Reactivar usuario
curl -X PATCH http://localhost:3000/users/3/status \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"active": true}'
```

**Ejemplo JavaScript**:
```javascript
async function toggleUserStatus(userId, active, token) {
  const response = await fetch(
    `http://localhost:3000/users/${userId}/status`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ active })
    }
  );
  
  if (!response.ok) {
    throw new Error('Error al cambiar estado del usuario');
  }
  
  return await response.json();
}

// Desactivar usuario
await toggleUserStatus(3, false, token);
```

---

## 📊 Encuestas

Todos los endpoints de encuestas requieren autenticación. Los endpoints marcados con **(Creator only)** solo pueden ser accedidos por usuarios con rol `creator`.

---

## 1. Modificar Encuestas

### Caso de Uso
Un usuario Creator necesita actualizar el título y las fechas de una encuesta ya creada.

### Request

```bash
curl -X PUT http://localhost:3000/surveys/5 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Encuesta de Satisfacción Q1 2025",
    "description": "Actualizada con nuevas preguntas",
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-03-31T23:59:59Z"
  }'
```

### Response (200 OK)

```json
{
  "message": "Encuesta actualizada",
  "survey": {
    "id": 5,
    "title": "Encuesta de Satisfacción Q1 2025",
    "description": "Actualizada con nuevas preguntas",
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-03-31T23:59:59Z",
    "company_id": 1,
    "slug": "abc123def456"
  }
}
```

### Validaciones
- ✅ Solo el **Creator** que pertenece a la empresa puede modificar
- ✅ La encuesta debe existir y pertenecer a la empresa del usuario
- ✅ Token JWT válido requerido

### Errores Comunes

**401 Unauthorized**
```json
{
  "error": "Token inválido o expirado"
}
```

**403 Forbidden**
```json
{
  "error": "Acceso denegado. Se requiere rol: creator"
}
```

**404 Not Found**
```json
{
  "error": "Encuesta no encontrada o no pertenece a esta empresa"
}
```

---

## 2. Gestión de Usuarios

### 2.1 Listar Usuarios de una Empresa

#### Caso de Uso
Un administrador necesita ver todos los usuarios de su empresa con sus roles y estados.

#### Request

```bash
curl -X GET "http://localhost:3000/users?company_id=1" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Response (200 OK)

```json
{
  "users": [
    {
      "id": 1,
      "name": "Carlos Rodriguez",
      "email": "carlos@empresa.com",
      "role": "creator",
      "active": true,
      "company_id": 1,
      "created_at": "2025-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "name": "Ana Martínez",
      "email": "ana@empresa.com",
      "role": "analyst",
      "active": true,
      "company_id": 1,
      "created_at": "2025-01-16T14:20:00Z"
    },
    {
      "id": 3,
      "name": "Luis García",
      "email": "luis@empresa.com",
      "role": "creator",
      "active": false,
      "company_id": 1,
      "created_at": "2025-01-17T09:15:00Z"
    }
  ]
}
```

#### Seguridad
- ✅ Las **contraseñas NO se incluyen** en el response
- ✅ Solo usuarios autenticados pueden listar
- ✅ Solo se muestran usuarios de la empresa del token

---

### 2.2 Cambiar Estado de Usuario (Activar/Desactivar)

#### Caso de Uso
Desactivar temporalmente a un usuario que dejó la empresa (sin eliminar su historial).

#### Request - Desactivar Usuario

```bash
curl -X PATCH http://localhost:3000/users/3/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "active": false
  }'
```

#### Response (200 OK)

```json
{
  "message": "Estado del usuario actualizado",
  "user": {
    "id": 3,
    "name": "Luis García",
    "email": "luis@empresa.com",
    "role": "creator",
    "active": false
  }
}
```

#### Request - Reactivar Usuario

```bash
curl -X PATCH http://localhost:3000/users/3/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "active": true
  }'
```

#### Validaciones
- ✅ Solo usuarios de la **misma empresa** pueden ser modificados
- ✅ El usuario desactivado **no podrá iniciar sesión** hasta ser reactivado
- ✅ Tokens existentes del usuario desactivado son rechazados por el middleware

#### Errores Comunes

**404 Not Found**
```json
{
  "error": "Usuario no encontrado o no pertenece a esta empresa"
}
```

**400 Bad Request**
```json
{
  "error": "Se requiere el campo 'active' (true o false)"
}
```

---

## 3. Links Cortos Públicos

### Caso de Uso
Compartir una encuesta en redes sociales sin que los usuarios necesiten iniciar sesión.

### 3.1 Obtener el Slug de una Encuesta

El slug se genera automáticamente al crear la encuesta. Para obtenerlo:

```bash
curl -X GET http://localhost:3000/surveys/5 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Response:
```json
{
  "id": 5,
  "title": "Encuesta de Satisfacción",
  "slug": "abc123def456",
  ...
}
```

### 3.2 Acceder a la Encuesta por Slug (Público)

#### Request

```bash
curl -X GET http://localhost:3000/s/abc123def456
```

**⚠️ Nota**: Este endpoint **NO requiere autenticación**.

#### Response (200 OK)

```json
{
  "survey": {
    "id": 5,
    "title": "Encuesta de Satisfacción",
    "description": "Queremos conocer tu opinión sobre nuestros servicios",
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-12-31T23:59:59Z"
  },
  "questions": [
    {
      "id": 10,
      "text": "¿Cómo calificarías nuestro servicio?",
      "type": "single_choice",
      "required": true,
      "order_num": 1,
      "options": [
        {
          "id": 25,
          "text": "Excelente",
          "order_num": 1
        },
        {
          "id": 26,
          "text": "Bueno",
          "order_num": 2
        },
        {
          "id": 27,
          "text": "Regular",
          "order_num": 3
        }
      ]
    },
    {
      "id": 11,
      "text": "Comentarios adicionales",
      "type": "text",
      "required": false,
      "order_num": 2
    }
  ]
}
```

### 3.3 Enviar Respuestas

Una vez obtenida la encuesta, el usuario puede enviar sus respuestas:

```bash
curl -X POST http://localhost:3000/submit/5 \
  -H "Content-Type: application/json" \
  -d '{
    "responses": [
      {
        "question_id": 10,
        "value": "Excelente"
      },
      {
        "question_id": 11,
        "value": "Muy buen servicio, gracias"
      }
    ]
  }'
```

### Casos de Uso Reales

**WhatsApp**:
```
¡Ayúdanos a mejorar! 🙏
Completa nuestra encuesta:
https://feedflow.com/s/abc123def456
```

**Email**:
```html
<a href="https://feedflow.com/s/abc123def456">
  Completar Encuesta
</a>
```

**QR Code**: Genera un código QR con la URL del slug para imprimir en productos o flyers.

---

## 4. Exportar Reportes

### 4.1 Exportar a Excel (.xlsx)

#### Caso de Uso
Un Analista necesita descargar los resultados de una encuesta en Excel para análisis avanzado.

#### Request

```bash
curl -X GET "http://localhost:3000/reports/1/export?survey_id=5&format=xlsx" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  --output reporte.xlsx
```

#### Response
- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Content-Disposition**: `attachment; filename="reporte_5_1706234567890.xlsx"`
- **Body**: Archivo binario Excel

#### Estructura del Archivo Excel

```
┌─────────────────────────────────────────────────┐
│ REPORTE DE ENCUESTA                             │
│ Encuesta de Satisfacción Q1 2025               │
│ Total de respuestas: 50                         │
│                                                  │
│ Pregunta 1: ¿Cómo calificarías nuestro servicio?│
│ ┌───────────────┬───────────┐                  │
│ │ Opción        │ Cantidad  │  ← Headers azules│
│ ├───────────────┼───────────┤                  │
│ │ Excelente     │ 30        │                  │
│ │ Bueno         │ 15        │                  │
│ │ Regular       │ 5         │                  │
│ └───────────────┴───────────┘                  │
│                                                  │
│ Pregunta 2: Comentarios adicionales             │
│ ┌────────────────────────┬──────────────┐     │
│ │ Respuesta              │ Fecha        │     │
│ ├────────────────────────┼──────────────┤     │
│ │ Muy buen servicio...   │ 15/01/2025   │     │
│ │ Excelente atención...  │ 16/01/2025   │     │
│ └────────────────────────┴──────────────┘     │
└─────────────────────────────────────────────────┘
```

#### Características
- ✅ **Headers en negrita** con fondo azul (#428BCA)
- ✅ **Anchos de columna automáticos** según contenido
- ✅ **Fecha y hora** formateadas en formato local
- ✅ **Separación visual** entre preguntas
- ✅ **Compatible** con Excel, Google Sheets, LibreOffice

#### Ejemplo en JavaScript (Frontend)

```javascript
async function descargarExcel(companyId, surveyId, token) {
  try {
    const response = await fetch(
      `http://localhost:3000/reports/${companyId}/export?survey_id=${surveyId}&format=xlsx`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Error al descargar el archivo');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_encuesta_${surveyId}_${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    console.log('✅ Excel descargado exitosamente');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Uso
descargarExcel(1, 5, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
```

---

### 4.2 Exportar a PDF

#### Caso de Uso
Generar un reporte profesional en PDF para presentar a la gerencia o imprimir.

#### Request

```bash
curl -X GET "http://localhost:3000/reports/1/export?survey_id=5&format=pdf" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  --output reporte.pdf
```

#### Response
- **Content-Type**: `application/pdf`
- **Content-Disposition**: `attachment; filename="reporte_5_1706234567890.pdf"`
- **Body**: Archivo binario PDF

#### Características del PDF
- ✅ **Formato A4** (210x297mm) estándar para impresión
- ✅ **Título grande** (18pt) con metadata de la encuesta
- ✅ **Tablas con bordes** y colores alternados en filas
- ✅ **Headers azules** (#428BCA) para mejor visualización
- ✅ **Paginación automática** cuando el contenido excede una página
- ✅ **Fuente legible** (10-12pt) optimizada para lectura
- ✅ **Márgenes estándar** (14mm) para impresión

#### Vista Previa del PDF

```
┌────────────────────────────────────────────┐
│                                             │
│   REPORTE DE ENCUESTA                       │
│   Encuesta de Satisfacción Q1 2025         │
│   Total de respuestas: 50                   │
│                                             │
│   Pregunta 1: ¿Cómo calificarías nuestro  │
│   servicio?                                 │
│   ┌──────────────┬──────────┐              │
│   │ Opción       │ Cantidad │ ← Azul       │
│   ├──────────────┼──────────┤              │
│   │ Excelente    │ 30       │ ← Gris claro │
│   │ Bueno        │ 15       │              │
│   │ Regular      │ 5        │ ← Gris claro │
│   └──────────────┴──────────┘              │
│                                             │
│   Pregunta 2: Comentarios adicionales       │
│   ┌──────────────────────┬──────────────┐ │
│   │ Respuesta            │ Fecha        │ │
│   ├──────────────────────┼──────────────┤ │
│   │ Muy buen servicio... │ 15/1/2025    │ │
│   │ Excelente atención...│ 16/1/2025    │ │
│   └──────────────────────┴──────────────┘ │
│                                    Página 1 │
└────────────────────────────────────────────┘
```

#### Ejemplo en React

```jsx
import React, { useState } from 'react';

function ReporteExportButton({ companyId, surveyId, token }) {
  const [loading, setLoading] = useState(false);

  const descargarPDF = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(
        `http://localhost:3000/reports/${companyId}/export?survey_id=${surveyId}&format=pdf`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al generar el PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${surveyId}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);

      alert('✅ PDF descargado exitosamente');
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={descargarPDF} 
      disabled={loading}
      className="btn btn-primary"
    >
      {loading ? 'Generando PDF...' : '📄 Descargar PDF'}
    </button>
  );
}

export default ReporteExportButton;
```

---

## 🔐 Notas de Seguridad

### Autenticación Requerida
Los siguientes endpoints **requieren token JWT válido**:
- `PUT /surveys/:id`
- `GET /users`
- `PATCH /users/:id/status`
- `GET /reports/:companyId/export` (ambos formatos)

### Endpoints Públicos
Los siguientes endpoints **NO requieren autenticación**:
- `GET /s/:slug` - Acceso público a encuestas
- `POST /submit/:surveyId` - Envío de respuestas

### RBAC (Control de Acceso Basado en Roles)

| Endpoint                      | Admin | Creator | Analyst |
|-------------------------------|:-----:|:-------:|:-------:|
| `PUT /surveys/:id`            | ❌    | ✅      | ❌      |
| `GET /users`                  | ✅    | ❌      | ❌      |
| `PATCH /users/:id/status`     | ✅    | ❌      | ❌      |
| `GET /reports/:companyId`     | ❌    | ❌      | ✅      |

---

## 📊 Casos de Uso Completos

### Flujo 1: Actualizar Encuesta y Compartir Link Corto

```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "creator@empresa.com", "password": "password123"}' \
  | jq -r '.token')

# 2. Actualizar encuesta
curl -X PUT http://localhost:3000/surveys/5 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Encuesta de Satisfacción 2025 - Actualizada",
    "description": "Con nuevas preguntas mejoradas"
  }'

# 3. Obtener el slug
SLUG=$(curl -X GET http://localhost:3000/surveys/5 \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.slug')

# 4. Compartir link público
echo "Link público: http://feedflow.com/s/$SLUG"
```

### Flujo 2: Gestionar Usuarios y Exportar Reportes

```bash
# 1. Login como Analyst
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "analyst@empresa.com", "password": "password123"}' \
  | jq -r '.token')

# 2. Listar usuarios de la empresa
curl -X GET "http://localhost:3000/users?company_id=1" \
  -H "Authorization: Bearer $TOKEN"

# 3. Desactivar un usuario
curl -X PATCH http://localhost:3000/users/3/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"active": false}'

# 4. Exportar reporte en Excel
curl -X GET "http://localhost:3000/reports/1/export?survey_id=5&format=xlsx" \
  -H "Authorization: Bearer $TOKEN" \
  --output reporte_final.xlsx

# 5. Exportar reporte en PDF
curl -X GET "http://localhost:3000/reports/1/export?survey_id=5&format=pdf" \
  -H "Authorization: Bearer $TOKEN" \
  --output reporte_final.pdf
```

---

## ❓ Preguntas Frecuentes

### ¿Puedo modificar las preguntas de una encuesta existente?
No, actualmente solo se puede modificar el título, descripción y fechas. Para cambiar preguntas, recomendamos duplicar la encuesta y editarla.

### ¿Los links cortos expiran?
No, los slugs son permanentes mientras exista la encuesta. La validación de fechas (`start_date`/`end_date`) se maneja en el frontend.

### ¿Puedo exportar múltiples encuestas a la vez?
No, cada exportación es por encuesta individual. Para múltiples encuestas, debes hacer requests separados.

### ¿Los reportes exportados se guardan en el servidor?
No, los archivos Excel y PDF se generan dinámicamente en cada request y se envían directamente al cliente sin almacenarse.

### ¿Qué pasa si un usuario desactivado intenta usar su token?
El middleware de autenticación valida el estado `active` del usuario en cada request. Si está desactivado, el token será rechazado con error 403.

---

## 📞 Soporte

Para más información o reportar issues:
- **Email**: soporte@feedflow.com
- **Documentación completa**: Ver `README.md`
- **Changelog**: Ver `CHANGELOG.md`
##  Encuestas

Todos los endpoints de encuestas requieren autenticación. Los endpoints marcados con **(Creator only)** solo pueden ser accedidos por usuarios con rol `creator`.

### 8. GET /surveys

Lista todas las encuestas de una empresa. **Requiere autenticación**.

**URL**: `/surveys?company_id={companyId}`

**Método**: `GET`

**Headers**:
```
Authorization: Bearer {token}
```

**Query Parameters**:
- `company_id` (integer, requerido): ID de la empresa

**Response 200 OK**:
```json
{
  "surveys": [
    {
      "id": 1,
      "title": "Encuesta de Satisfacción Q1 2025",
      "description": "Evaluación trimestral de servicios",
      "start_date": "2025-01-01T00:00:00.000Z",
      "end_date": "2025-03-31T23:59:59.000Z",
      "company_id": 1,
      "slug": "abc123def456",
      "created_at": "2025-01-10T08:00:00.000Z"
    },
    {
      "id": 2,
      "title": "Encuesta de Clima Laboral",
      "description": "Medición anual del ambiente de trabajo",
      "start_date": "2025-01-15T00:00:00.000Z",
      "end_date": "2025-12-31T23:59:59.000Z",
      "company_id": 1,
      "slug": "xyz789ghi012",
      "created_at": "2025-01-12T10:30:00.000Z"
    }
  ]
}
```

**Ejemplo JavaScript**:
```javascript
async function getSurveys(companyId, token) {
  const response = await fetch(
    `http://localhost:3000/surveys?company_id=${companyId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  return await response.json();
}
```

---

### 9. GET /surveys/:id

Obtiene una encuesta específica con todas sus preguntas. **Requiere autenticación**.

**URL**: `/surveys/{surveyId}`

**Método**: `GET`

**Parámetros de URL**:
- `surveyId` (integer, requerido): ID de la encuesta

**Headers**:
```
Authorization: Bearer {token}
```

**Response 200 OK**:
```json
{
  "id": 1,
  "title": "Encuesta de Satisfacción Q1 2025",
  "description": "Evaluación trimestral de servicios",
  "start_date": "2025-01-01T00:00:00.000Z",
  "end_date": "2025-03-31T23:59:59.000Z",
  "company_id": 1,
  "slug": "abc123def456",
  "created_at": "2025-01-10T08:00:00.000Z",
  "questions": [
    {
      "id": 1,
      "text": "¿Cómo calificarías nuestro servicio?",
      "type": "single_choice",
      "required": true,
      "order_num": 1,
      "options": [
        { "id": 1, "text": "Excelente", "order_num": 1 },
        { "id": 2, "text": "Bueno", "order_num": 2 },
        { "id": 3, "text": "Regular", "order_num": 3 },
        { "id": 4, "text": "Malo", "order_num": 4 }
      ]
    },
    {
      "id": 2,
      "text": "¿Cuántos años llevas con nosotros?",
      "type": "number",
      "required": false,
      "order_num": 2,
      "options": null
    }
  ]
}
```

---

### 10. POST /surveys

Crea una nueva encuesta. **Creator only**.

**URL**: `/surveys`

**Método**: `POST`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body**:
```json
{
  "title": "Encuesta de Satisfacción 2025",
  "description": "Evaluación anual de servicios",
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2025-12-31T23:59:59Z",
  "company_id": 1
}
```

**Campos**:
- `title` (string, requerido): Título de la encuesta
- `description` (string, opcional): Descripción
- `start_date` (string ISO 8601, requerido): Fecha de inicio
- `end_date` (string ISO 8601, requerido): Fecha de fin
- `company_id` (integer, requerido): ID de la empresa

**Response 201 Created**:
```json
{
  "message": "Encuesta creada exitosamente",
  "survey": {
    "id": 5,
    "title": "Encuesta de Satisfacción 2025",
    "description": "Evaluación anual de servicios",
    "start_date": "2025-01-01T00:00:00.000Z",
    "end_date": "2025-12-31T23:59:59.000Z",
    "company_id": 1,
    "slug": "k7m9p2q4r6s8",
    "created_at": "2025-01-20T15:45:00.000Z"
  }
}
```

**Nota**: El `slug` se genera automáticamente y es único.

**Errores**:

403 Forbidden:
```json
{
  "error": "Acceso denegado. Se requiere rol: creator"
}
```

---

### 11. PUT /surveys/:id

Modifica una encuesta existente (solo título, descripción y fechas). **Creator only**.

**URL**: `/surveys/{surveyId}`

**Método**: `PUT`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body** (todos los campos opcionales, envía solo los que quieres actualizar):
```json
{
  "title": "Nuevo título actualizado",
  "description": "Nueva descripción",
  "start_date": "2025-02-01T00:00:00Z",
  "end_date": "2025-11-30T23:59:59Z"
}
```

**Response 200 OK**:
```json
{
  "message": "Encuesta actualizada",
  "survey": {
    "id": 5,
    "title": "Nuevo título actualizado",
    "description": "Nueva descripción",
    "start_date": "2025-02-01T00:00:00.000Z",
    "end_date": "2025-11-30T23:59:59.000Z",
    "company_id": 1,
    "slug": "k7m9p2q4r6s8"
  }
}
```

**Errores**:

404 Not Found:
```json
{
  "error": "Encuesta no encontrada o no pertenece a esta empresa"
}
```

**Ejemplo JavaScript**:
```javascript
async function updateSurvey(surveyId, updates, token) {
  const response = await fetch(
    `http://localhost:3000/surveys/${surveyId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }
  );
  return await response.json();
}

// Actualizar solo título
await updateSurvey(5, { title: 'Nuevo título' }, token);
```

---

### 12. DELETE /surveys/:id

Elimina una encuesta y todas sus preguntas asociadas. **Creator only**.

**URL**: `/surveys/{surveyId}`

**Método**: `DELETE`

**Headers**:
```
Authorization: Bearer {token}
```

**Response 200 OK**:
```json
{
  "message": "Encuesta eliminada exitosamente"
}
```

---

### 13. POST /surveys/:id/duplicate

Duplica una encuesta con todas sus preguntas y opciones. **Creator only**.

**URL**: `/surveys/{surveyId}/duplicate`

**Método**: `POST`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body** (opcional):
```json
{
  "new_title": "Copia - Encuesta de Satisfacción"
}
```

Si no se proporciona `new_title`, se usará el título original con prefijo "Copia - ".

**Response 201 Created**:
```json
{
  "message": "Encuesta duplicada exitosamente",
  "new_survey": {
    "id": 6,
    "title": "Copia - Encuesta de Satisfacción 2025",
    "description": "Evaluación anual de servicios",
    "start_date": "2025-01-01T00:00:00.000Z",
    "end_date": "2025-12-31T23:59:59.000Z",
    "company_id": 1,
    "slug": "a1b2c3d4e5f6",
    "created_at": "2025-01-21T09:15:00.000Z"
  },
  "questions_copied": 5
}
```

---

### 14. POST /surveys/:id/questions

Agrega una nueva pregunta a una encuesta. **Creator only**.

**URL**: `/surveys/{surveyId}/questions`

**Método**: `POST`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body para pregunta de selección**:
```json
{
  "text": "¿Cuál es tu nivel de satisfacción?",
  "type": "single_choice",
  "required": true,
  "options": [
    "Muy satisfecho",
    "Satisfecho",
    "Neutral",
    "Insatisfecho",
    "Muy insatisfecho"
  ]
}
```

**Body para pregunta de texto/número/rating**:
```json
{
  "text": "¿Cuál es tu edad?",
  "type": "number",
  "required": false
}
```

**Tipos de pregunta válidos**:
- `single_choice` - Opción única (requiere `options`)
- `multiple_choice` - Múltiple selección (requiere `options`)
- `rating` - Escala numérica (no requiere `options`)
- `text` - Respuesta abierta (no requiere `options`)
- `number` - Número (no requiere `options`)

**Response 201 Created**:
```json
{
  "message": "Pregunta agregada exitosamente",
  "question": {
    "id": 15,
    "survey_id": 5,
    "text": "¿Cuál es tu nivel de satisfacción?",
    "type": "single_choice",
    "required": true,
    "order_num": 3
  },
  "options": [
    { "id": 45, "text": "Muy satisfecho", "order_num": 1 },
    { "id": 46, "text": "Satisfecho", "order_num": 2 },
    { "id": 47, "text": "Neutral", "order_num": 3 },
    { "id": 48, "text": "Insatisfecho", "order_num": 4 },
    { "id": 49, "text": "Muy insatisfecho", "order_num": 5 }
  ]
}
```

---

##  Reportes

Todos los endpoints de reportes requieren autenticación y rol **Analyst**.

### 15. GET /reports/:companyId

Genera un reporte agregado para una encuesta específica. **Analyst only**.

**URL**: `/reports/{companyId}?survey_id={surveyId}`

**Método**: `GET`

**Parámetros de URL**:
- `companyId` (integer, requerido): ID de la empresa

**Query Parameters**:
- `survey_id` (integer, requerido): ID de la encuesta

**Headers**:
```
Authorization: Bearer {token}
```

**Response 200 OK**:
```json
{
  "survey": {
    "id": 5,
    "title": "Encuesta de Satisfacción 2025",
    "total_responses": 50
  },
  "results": [
    {
      "question_id": 10,
      "question": "¿Cómo calificarías nuestro servicio?",
      "type": "single_choice",
      "breakdown": [
        { "option": "Excelente", "count": 30 },
        { "option": "Bueno", "count": 15 },
        { "option": "Regular", "count": 5 },
        { "option": "Malo", "count": 0 }
      ]
    },
    {
      "question_id": 11,
      "question": "Comentarios adicionales",
      "type": "text",
      "data": [
        {
          "value": "Muy buen servicio, seguir así",
          "submitted_at": "2025-01-15T10:30:00.000Z"
        },
        {
          "value": "Excelente atención al cliente",
          "submitted_at": "2025-01-16T14:20:00.000Z"
        }
      ]
    }
  ]
}
```

**Descripción de campos**:
- Para preguntas de tipo `single_choice`, `multiple_choice`, `rating`: se incluye `breakdown` con conteo por opción
- Para preguntas tipo `text`, `number`: se incluye `data` con todas las respuestas y fechas

---

### 16. GET /reports/:companyId/export?format=xlsx

Exporta un reporte a Excel. **Analyst only**.

**URL**: `/reports/{companyId}/export?survey_id={surveyId}&format=xlsx`

**Método**: `GET`

**Query Parameters**:
- `survey_id` (integer, requerido): ID de la encuesta
- `format` (string, requerido): `"xlsx"`

**Headers**:
```
Authorization: Bearer {token}
```

**Response 200 OK**:
- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Content-Disposition**: `attachment; filename="reporte_{surveyId}_{timestamp}.xlsx"`
- **Body**: Archivo binario Excel

**Ejemplo JavaScript para descargar**:
```javascript
async function downloadExcel(companyId, surveyId, token) {
  const response = await fetch(
    `http://localhost:3000/reports/${companyId}/export?survey_id=${surveyId}&format=xlsx`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  if (!response.ok) {
    throw new Error('Error al exportar');
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte_${surveyId}_${Date.now()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
```

---

### 17. GET /reports/:companyId/export?format=pdf

Exporta un reporte a PDF. **Analyst only**.

**URL**: `/reports/{companyId}/export?survey_id={surveyId}&format=pdf`

**Método**: `GET`

**Query Parameters**:
- `survey_id` (integer, requerido): ID de la encuesta
- `format` (string, requerido): `"pdf"`

**Headers**:
```
Authorization: Bearer {token}
```

**Response 200 OK**:
- **Content-Type**: `application/pdf`
- **Content-Disposition**: `attachment; filename="reporte_{surveyId}_{timestamp}.pdf"`
- **Body**: Archivo binario PDF

**Ejemplo React**:
```jsx
function ExportButton({ companyId, surveyId, token }) {
  const [loading, setLoading] = useState(false);
  
  const exportPDF = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3000/reports/${companyId}/export?survey_id=${surveyId}&format=pdf`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${Date.now()}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error al exportar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <button onClick={exportPDF} disabled={loading}>
      {loading ? 'Exportando...' : 'Descargar PDF'}
    </button>
  );
}
```

---

##  Autenticación y Seguridad

### Headers Requeridos

Todos los endpoints protegidos requieren el header:
```
Authorization: Bearer {token}
```

### Obtener el Token

1. Llama a `POST /auth/login` con credenciales válidas
2. Guarda el `token` en localStorage o sessionStorage
3. Incluye el token en todas las peticiones protegidas

```javascript
// Guardar token después del login
const loginData = await fetch('/auth/login', { /* ... */ });
const { token } = await loginData.json();
localStorage.setItem('token', token);

// Usar token en peticiones
const token = localStorage.getItem('token');
fetch('/surveys?company_id=1', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Control de Acceso por Rol

| Endpoint | Admin | Creator | Analyst | Público |
|----------|:-----:|:-------:|:-------:|:------:|
| POST /surveys | ❌ | ✅ | ❌ | ❌ |
| PUT /surveys/:id | ❌ | ✅ | ❌ | ❌ |
| DELETE /surveys/:id | ❌ | ✅ | ❌ | ❌ |
| POST /surveys/:id/duplicate | ❌ | ✅ | ❌ | ❌ |
| POST /surveys/:id/questions | ❌ | ✅ | ❌ | ❌ |
| GET /reports/:companyId | ❌ | ❌ | ✅ | ❌ |
| GET /reports/:companyId/export | ❌ | ❌ | ✅ | ❌ |
| GET /surveys | ❌ | ✅ | ✅ | ❌ |
| GET /users | ✅ | ❌ | ❌ | ❌ |
| PATCH /users/:id/status | ✅ | ❌ | ❌ | ❌ |
| GET /s/:slug | ❌ | ❌ | ❌ | ✅ |
| POST /submit/:id | ❌ | ❌ | ❌ | ✅ |

---

##  Manejo de Errores

Todos los endpoints devuelven errores en formato JSON:

```json
{
  "error": "Mensaje descriptivo del error"
}
```

### Códigos de Estado HTTP

- `200 OK` - Petición exitosa
- `201 Created` - Recurso creado exitosamente
- `400 Bad Request` - Parámetros inválidos o faltantes
- `401 Unauthorized` - Token inválido, expirado o ausente
- `403 Forbidden` - Usuario sin permisos (rol incorrecto o usuario desactivado)
- `404 Not Found` - Recurso no encontrado
- `500 Internal Server Error` - Error del servidor

### Ejemplo de Manejo de Errores

```javascript
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error desconocido');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error.message);
    throw error;
  }
}

// Uso
try {
  const surveys = await apiRequest(
    'http://localhost:3000/surveys?company_id=1',
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
} catch (error) {
  // Mostrar error al usuario
  alert(error.message);
}
```

---

##  Soporte

Para más información sobre el proyecto, ver **[README.md](./README.md)**.

Para historial de cambios, ver **[CHANGELOG.md](./CHANGELOG.md)**.

## ✅ Pruebas (Tests)

Se agregaron pruebas de integración que cubren el nuevo flujo de registro y las restricciones por rol (admin). Archivo principal de tests:

- `tests/integration.test.js`

Comando para ejecutar las pruebas (usa Bun):

```powershell
cd "c:\Users\nico2\OneDrive - Politécnico Grancolombiano\2025-2\Desarrollo de software en equipo\Entrega 3\FeedFlow\Backend"
bun test
```

En mi ejecución local las pruebas de integración pasaron todas: `26 passed, 0 failed`.
