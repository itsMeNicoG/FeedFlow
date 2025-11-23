# FeedFlow API

Backend para el sistema de gestión de encuestas FeedFlow. Este proyecto utiliza **Bun** como runtime de alto rendimiento, **SQLite** como base de datos, **Hono** como framework web, y **ExcelJS/jsPDF** para exportación de reportes.

## Requisitos Previos

- [Bun](https://bun.sh/) (v1.0 o superior)
- Windows (PowerShell) o Linux/Mac

## Instalación

1. Clonar el repositorio o descargar los archivos.
2. Abrir una terminal en la carpeta del proyecto.
3. Instalar las dependencias:
   ```bash
   bun install
   ```
4. **Configurar variables de entorno:**
   ```bash
   # Copiar el archivo de ejemplo
   cp .env.example .env
   
   # Editar .env y configurar JWT_SECRET
   # Puedes generar un secreto seguro con:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

## Configuración de Base de Datos

El proyecto utiliza SQLite. Para crear las tablas necesarias, ejecuta:

```bash
bun run db:setup
```

Esto creará un archivo `feedflow.sqlite` en la raíz del proyecto.

## Ejecución

Para iniciar el servidor en modo desarrollo (se reinicia automáticamente al guardar cambios):

```bash
bun run dev
```

El servidor estará corriendo (por defecto) en `http://localhost:3000`.

## Estructura del Proyecto

```
FeedFlow/
├── src/
│   ├── index.js                 # Entry point - Hono server setup
│   ├── controllers/             # Business logic layer
│   │   ├── auth.js             # Authentication (login, JWT generation)
│   │   ├── companies.js        # Company management
│   │   ├── users.js            # User creation and management
│   │   ├── surveys.js          # Survey CRUD + duplication
│   │   ├── questions.js        # Survey question management
│   │   ├── responses.js        # Response submission (web + WhatsApp)
│   │   └── reports.js          # Analytics and aggregation
│   ├── routes/                  # Route definitions (HTTP endpoints)
│   │   ├── auth.js             # POST /auth/login
│   │   ├── companies.js        # POST /companies
│   │   ├── users.js            # POST /users
│   │   ├── surveys.js          # GET/POST/DELETE /surveys (RBAC protected)
│   │   └── reports.js          # GET /reports/:companyId (Analyst only)
│   ├── middleware/              # Reusable middleware functions
│   │   └── auth.js             # JWT verification + Role-based access control
│   └── db/                      # Database layer
│       ├── connection.js       # SQLite connection singleton
│       └── setup.js            # Schema initialization script
├── tests/
│   └── integration.test.js     # Full API integration tests
├── package.json                 # Dependencies and scripts
└── README.md                    # This file
```

## Arquitectura

### Capas de la Aplicación

1. **Routes Layer** (`src/routes/`): Define endpoints HTTP y aplica middleware de autenticación/autorización.
2. **Controllers Layer** (`src/controllers/`): Contiene la lógica de negocio y validaciones.
3. **Database Layer** (`src/db/`): Maneja conexiones y esquema de la base de datos.
4. **Middleware Layer** (`src/middleware/`): Funciones reutilizables para autenticación, autorización y validación.

### Flujo de una Request

```
Client Request
    ↓
[Route Handler] (src/routes/)
    ↓
[Auth Middleware] (JWT verification + Role check)
    ↓
[Controller] (Business logic + DB queries)
    ↓
[Database] (SQLite with prepared statements)
    ↓
JSON Response
```

## Seguridad

### Autenticación
- **JWT (JSON Web Tokens)**: Stateless authentication con expiración de 24 horas
- **Password Hashing**: Bun's native Argon2/Bcrypt implementation
- **Active Status Check**: Token validation includes real-time user status verification

### Autorización (RBAC)
- **Creator Role**: Can create/edit/delete surveys and questions
- **Analyst Role**: Read-only access to reports and analytics
- Middleware: `requireRole('creator')` and `requireRole('analyst')`

### SQL Injection Prevention
- **100% Prepared Statements**: All database queries use parameterized queries (`?` placeholders)
- **No String Concatenation**: Never concatenates user input into SQL strings
- Example: `db.query("SELECT * FROM users WHERE email = ?").get(email)`

## Convenciones de Código

### Naming Conventions
- **Files**: camelCase (e.g., `auth.js`, `companies.js`)
- **Functions**: camelCase (e.g., `createSurvey`, `getCompanyReports`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `JWT_SECRET`)
- **Database Tables**: snake_case (e.g., `company_id`, `created_at`)

### JSDoc Documentation
Todos los módulos incluyen JSDoc comments con:
- `@fileoverview`: Descripción del módulo
- `@module`: Nombre del módulo
- `@param`: Parámetros de función
- `@returns`: Tipo de retorno
- `@throws`: Excepciones posibles
- `@example`: Ejemplos de uso

### Error Handling
```javascript
try {
  // Database operations
  return c.json({ data: result }, 201);
} catch (error) {
  return c.json({ error: error.message }, 500);
}
```

### Database Transactions
Para operaciones atómicas (ej: crear pregunta + opciones):
```javascript
const transaction = db.transaction(() => {
  // Multiple operations
});
transaction();
```

## Testing

Ejecutar todos los tests de integración:
```bash
bun test
```

Los tests usan `feedflow_test.sqlite` (aislado de la base de datos de desarrollo).

## Despliegue en Producción

### Generar Bundle Optimizado

Para crear una versión optimizada sin comentarios JSDoc ni espacios innecesarios:

```bash
bun run build
```

Esto generará un archivo minificado en `./dist/index.js` (~248 KB).

**🎯 Optimización de dependencias**: Las librerías pesadas (ExcelJS ~20MB, jsPDF ~28MB) se marcan como `external` y se cargan desde `node_modules` en runtime, reduciendo el bundle del **97%** (de ~9MB a 248KB).

### Ejecutar en Producción

```bash
bun run start:prod
```

O directamente:
```bash
NODE_ENV=production bun run dist/index.js
```

**⚠️ Importante**: Asegúrate de que `node_modules` esté disponible en el servidor de producción, ya que las dependencias externalizadas se cargan en runtime.

### Características del Bundle de Producción

- ✅ **Minificación**: Elimina espacios en blanco y optimiza sintaxis
- ✅ **Sin comentarios**: JSDoc removido automáticamente
- ✅ **Tree-shaking**: Código no utilizado eliminado
- ✅ **Source maps**: Incluye `.map` para debugging si es necesario
- ✅ **Dependencias externalizadas**: ExcelJS, jsPDF y SQLite se cargan desde node_modules
- ✅ **Bundle ultra-ligero**: Solo 248 KB vs 9+ MB sin optimización

### Variables de Entorno para Producción

Antes de desplegar, considera:

1. **JWT_SECRET**: Mover a variables de entorno
   ```javascript
   const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
   ```

2. **Database Path**: Configurar ruta de producción
   ```javascript
   const dbName = process.env.DB_PATH || "feedflow.sqlite";
   ```

3. **Port**: Configurar puerto desde env
   ```javascript
   const port = process.env.PORT || 3000;
   ```

## Endpoints Principales

### Autenticación
- `POST /auth/login` - Login y obtención de token JWT

### Empresas
- `POST /companies` - Crear empresa

### Usuarios
- `POST /users` - Crear usuario (creator/analyst)
- `GET /users?company_id=X` - Listar usuarios de una empresa (**Protected**)
- `PATCH /users/:id/status` - Activar/desactivar usuario (**Protected**)

### Encuestas (Protected)
- `GET /surveys?company_id=X` - Listar encuestas
- `GET /surveys/:id` - Obtener encuesta con preguntas
- `POST /surveys` - Crear encuesta (**Creator only**)
- `PUT /surveys/:id` - Modificar encuesta (título, descripción, fechas) (**Creator only**)
- `DELETE /surveys/:id` - Eliminar encuesta (**Creator only**)
- `POST /surveys/:id/duplicate` - Duplicar encuesta (**Creator only**)
- `POST /surveys/:id/questions` - Agregar pregunta (**Creator only**)

### Reportes (Protected)
- `GET /reports/:companyId?survey_id=X` - Generar reporte (**Analyst only**)
- `GET /reports/:companyId/export?survey_id=X&format=xlsx` - Exportar a Excel (**Analyst only**)
- `GET /reports/:companyId/export?survey_id=X&format=pdf` - Exportar a PDF (**Analyst only**)

### Respuestas (Public)
- `POST /submit/:surveyId` - Enviar respuestas (no requiere autenticación)
- `GET /s/:slug` - Acceder a encuesta por link corto (no requiere autenticación)

## Funcionalidades Avanzadas

### 1. Modificación de Encuestas

Los usuarios con rol **Creator** pueden actualizar encuestas existentes.

**Endpoint**: `PUT /surveys/:id`

**Request Headers**:
```
Authorization: Bearer <jwt_token>
```

**Request Body**:
```json
{
  "title": "Nuevo título",
  "description": "Nueva descripción",
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2025-12-31T23:59:59Z"
}
```

**Response** (200):
```json
{
  "message": "Encuesta actualizada",
  "survey": {
    "id": 1,
    "title": "Nuevo título",
    "description": "Nueva descripción",
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-12-31T23:59:59Z"
  }
}
```

### 2. Gestión de Usuarios

#### Listar Usuarios de una Empresa

**Endpoint**: `GET /users?company_id=X`

**Request Headers**:
```
Authorization: Bearer <jwt_token>
```

**Response** (200):
```json
{
  "users": [
    {
      "id": 1,
      "name": "Juan Pérez",
      "email": "juan@empresa.com",
      "role": "creator",
      "active": true,
      "created_at": "2025-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "name": "María García",
      "email": "maria@empresa.com",
      "role": "analyst",
      "active": true,
      "created_at": "2025-01-16T14:20:00Z"
    }
  ]
}
```

#### Cambiar Estado de Usuario

**Endpoint**: `PATCH /users/:id/status`

**Request Headers**:
```
Authorization: Bearer <jwt_token>
```

**Request Body**:
```json
{
  "active": false
}
```

**Response** (200):
```json
{
  "message": "Estado del usuario actualizado",
  "user": {
    "id": 2,
    "active": false
  }
}
```

### 3. Links Cortos para Encuestas

Cada encuesta tiene un **slug** único generado automáticamente (ej: `abc123def456`). Los usuarios pueden acceder a la encuesta sin autenticación usando este link.

**Endpoint**: `GET /s/:slug`

**Ejemplo**: `GET /s/abc123def456`

**Response** (200):
```json
{
  "survey": {
    "id": 10,
    "title": "Encuesta de Satisfacción",
    "description": "Queremos conocer tu opinión",
    "start_date": "2025-01-01",
    "end_date": "2025-12-31"
  },
  "questions": [
    {
      "id": 1,
      "text": "¿Cómo calificarías nuestro servicio?",
      "type": "single_choice",
      "required": true,
      "options": [
        { "id": 1, "text": "Excelente", "order_num": 1 },
        { "id": 2, "text": "Bueno", "order_num": 2 },
        { "id": 3, "text": "Regular", "order_num": 3 }
      ]
    }
  ]
}
```

**Uso**: Puedes compartir este link público en redes sociales, email o WhatsApp para que los encuestados accedan directamente al formulario.

### 4. Exportación de Reportes

Los usuarios con rol **Analyst** pueden exportar reportes en formato **Excel** o **PDF**.

#### Exportar a Excel

**Endpoint**: `GET /reports/:companyId/export?survey_id=X&format=xlsx`

**Request Headers**:
```
Authorization: Bearer <jwt_token>
```

**Response**: Archivo binario `.xlsx` (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

**Características del Excel**:
- ✅ **Título y metadatos** de la encuesta
- ✅ **Tablas formateadas** para cada pregunta con headers en negrita y color azul
- ✅ **Anchos de columna automáticos** para mejor legibilidad
- ✅ **Datos agregados**: Frecuencia de opciones para preguntas de selección
- ✅ **Respuestas completas**: Para preguntas de texto/número

**Estructura del archivo**:
```
Sheet: "Reporte de Encuesta"
---------------------------------
| Título de la encuesta        |
| Total de respuestas: 50      |
|                               |
| Pregunta 1: ¿Te gusta...?    |
| Opción          | Cantidad    |
| Sí              | 35          |
| No              | 15          |
|                               |
| Pregunta 2: Comentarios      |
| Respuesta       | Fecha       |
| Excelente...    | 2025-01-15  |
| ...             | ...         |
```

#### Exportar a PDF

**Endpoint**: `GET /reports/:companyId/export?survey_id=X&format=pdf`

**Request Headers**:
```
Authorization: Bearer <jwt_token>
```

**Response**: Archivo binario `.pdf` (application/pdf)

**Características del PDF**:
- ✅ **Formato profesional** con título y fecha
- ✅ **Tablas visuales** con bordes y colores alternados
- ✅ **Paginación automática** cuando el contenido es extenso
- ✅ **Headers coloreados** (azul) para mejor visualización
- ✅ **Optimizado para impresión** (formato A4)

**Ejemplo de uso en frontend**:
```javascript
// Descargar Excel
const response = await fetch(`/reports/1/export?survey_id=10&format=xlsx`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `reporte_${Date.now()}.xlsx`;
a.click();

// Descargar PDF
const response = await fetch(`/reports/1/export?survey_id=10&format=pdf`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `reporte_${Date.now()}.pdf`;
a.click();
```

## Dependencias del Proyecto

### Core
- **bun** - Runtime JavaScript de alto rendimiento
- **hono** - Framework web minimalista y rápido
- **better-sqlite3** - Driver SQLite para Bun

### Seguridad
- **hono/jwt** - Middleware JWT para autenticación
- **argon2** (built-in Bun) - Hashing de contraseñas

### Exportación de Datos
- **exceljs** - Generación de archivos Excel (.xlsx)
- **jspdf** - Generación de documentos PDF

### Development
- **bun:test** - Test runner nativo de Bun
