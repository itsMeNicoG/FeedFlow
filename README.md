# FeedFlow API

Backend para el sistema de gestión de encuestas FeedFlow. Este proyecto utiliza **Bun** como runtime de alto rendimiento, **SQLite** como base de datos y **Hono** como framework web.

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

Esto generará un archivo minificado en `./dist/index.js` (~55 KB vs ~40 KB del código fuente + comentarios).

### Ejecutar en Producción

```bash
bun run start:prod
```

O directamente:
```bash
NODE_ENV=production bun run dist/index.js
```

### Características del Bundle de Producción

- ✅ **Minificación**: Elimina espacios en blanco y optimiza sintaxis
- ✅ **Sin comentarios**: JSDoc removido automáticamente
- ✅ **Tree-shaking**: Código no utilizado eliminado
- ✅ **Source maps**: Incluye `.map` para debugging si es necesario
- ✅ **Single file**: Todo en un solo archivo para deployment sencillo

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

### Encuestas (Protected)
- `GET /surveys?company_id=X` - Listar encuestas
- `GET /surveys/:id` - Obtener encuesta con preguntas
- `POST /surveys` - Crear encuesta (**Creator only**)
- `DELETE /surveys/:id` - Eliminar encuesta (**Creator only**)
- `POST /surveys/:id/duplicate` - Duplicar encuesta (**Creator only**)
- `POST /surveys/:id/questions` - Agregar pregunta (**Creator only**)

### Reportes (Protected)
- `GET /reports/:companyId?survey_id=X` - Generar reporte (**Analyst only**)

### Respuestas (Public)
- `POST /submit/:surveyId` - Enviar respuestas (no requiere autenticación)
