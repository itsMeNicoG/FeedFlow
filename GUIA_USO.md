# FeedFlow API - Guía de Uso

Documentación completa de los endpoints de la API de FeedFlow.

## 🔐 Autenticación y Roles

La API utiliza **JWT (JSON Web Tokens)**. Debes incluir el token en el header `Authorization` para los endpoints protegidos:

```
Authorization: Bearer <tu_token>
```

### Roles Disponibles

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| **admin** | Administrador de la empresa | Total (Usuarios, Encuestas, Reportes) |
| **creator** | Creador de contenido | Encuestas (Crear, Editar, Borrar). **NO ve reportes.** |
| **analyst** | Analista de datos | Reportes (Ver, Exportar). **NO edita encuestas.** |

---

## 🔓 Endpoints Públicos

### 1. Login
**POST** `/auth/login`

Inicia sesión y obtiene el token de acceso.

**Body:**
```json
{
  "email": "usuario@empresa.com",
  "password": "123456"
}
```

**Response (200 OK):**
```json
{
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUz...",
  "user": {
    "id": 1,
    "name": "Juan Perez",
    "role": "admin",
    "company_id": 1
  }
}
```

### 2. Registro de Empresa
**POST** `/register`

Registra una nueva empresa y su primer usuario administrador.

**Body:**
```json
{
  "company_name": "Mi Empresa S.A.",
  "nit": "900123456",
  "admin_name": "Admin Principal",
  "admin_email": "admin@miempresa.com",
  "admin_password": "password123"
}
```

### 3. Ver Encuesta (Público)
**GET** `/s/:slug`

Obtiene los datos de una encuesta para ser respondida.

**Parámetros:**
- `slug`: Identificador único de la encuesta (ej: `a1b2c3d4`)

### 4. Enviar Respuesta
**POST** `/submit/:surveyId`

Envía las respuestas de una encuesta.

**Body:**
```json
{
  "responses": [
    { "question_id": 1, "value": "Opción A" },
    { "question_id": 2, "value": "Respuesta de texto" }
  ]
}
```

---

## 👥 Gestión de Usuarios (Solo Admin)

### 5. Listar Usuarios
**GET** `/users`

Obtiene todos los usuarios de la empresa.

### 6. Crear Usuario
**POST** `/users`

Crea un nuevo usuario (Creator o Analyst) en la empresa.

**Body:**
```json
{
  "name": "Nuevo Usuario",
  "email": "nuevo@empresa.com",
  "password": "123456",
  "role": "creator" // o "analyst"
}
```

### 7. Cambiar Estado
**PATCH** `/users/:id/status`

Activa o desactiva un usuario.

**Body:**
```json
{
  "active": false // true para activar
}
```

---

## 📝 Gestión de Encuestas (Creator y Admin)

> **Nota:** Los usuarios con rol `analyst` NO tienen acceso a estos endpoints.

### 8. Listar Encuestas
**GET** `/surveys`

Lista todas las encuestas de la empresa.

### 9. Detalle de Encuesta
**GET** `/surveys/:id`

Obtiene el detalle completo de una encuesta.

### 10. Crear Encuesta (Solo Creator/Admin)
**POST** `/surveys`

**Body:**
```json
{
  "title": "Encuesta de Satisfacción",
  "description": "Breve descripción...",
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "questions": [
    {
      "text": "¿Te gusta el servicio?",
      "type": "single_choice",
      "options": ["Sí", "No"]
    }
  ]
}
```

### 11. Editar Encuesta (Solo Creator/Admin)
**PUT** `/surveys/:id`

Actualiza título, descripción o fechas.

### 12. Eliminar Encuesta (Solo Creator/Admin)
**DELETE** `/surveys/:id`

Elimina una encuesta y sus respuestas.

### 13. Duplicar Encuesta (Solo Creator/Admin)
**POST** `/surveys/:id/duplicate`

Crea una copia exacta de una encuesta existente.

---

## 📊 Reportes (Analyst y Admin)

> **Nota:** Los usuarios con rol `creator` NO tienen acceso a estos endpoints.

### 14. Ver Reporte Agregado
**GET** `/reports/:surveyId`

Obtiene estadísticas y conteos de respuestas agrupados por pregunta.

### 15. Ver Respuestas Individuales
**GET** `/reports/:surveyId/responses`

Obtiene el listado plano de todas las respuestas recibidas.

### 16. Exportar Reporte
**GET** `/reports/:surveyId/export`

Descarga el reporte en formato archivo.

**Query Params:**
- `format`: `xlsx` (Excel) o `pdf` (PDF)

**Ejemplo:**
`/reports/1/export?format=pdf`
