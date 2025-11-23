# FeedFlow API

Backend para el sistema de gestión de encuestas FeedFlow. Este proyecto utiliza **Bun** como runtime de alto rendimiento, **SQLite** como base de datos, **Hono** como framework web, y **ExcelJS/jsPDF** para exportación de reportes.

---

## 📚 Documentación

- **[GUIA_USO.md](./GUIA_USO.md)** - Referencia completa de la API con todos los endpoints y ejemplos
- **[CHANGELOG.md](./CHANGELOG.md)** - Historial de versiones y cambios

---

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

**Cobertura actual**: 13/13 tests pasando (100%)

---

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

---

## Funcionalidades Principales

### Sistema de Autenticación
- **JWT tokens** con expiración de 24 horas
- **Password hashing** con Argon2 (nativo de Bun)
- **Validación de estado activo** en cada request

### Control de Acceso (RBAC)
- **Creator**: Puede crear, editar y duplicar encuestas
- **Analyst**: Acceso de solo lectura a reportes y exportaciones

### Gestión de Encuestas
- CRUD completo de encuestas
- Sistema de preguntas con múltiples tipos (choice, text, number, rating)
- **Duplicación** de encuestas con todas sus preguntas
- **Modificación** de encuestas existentes (título, descripción, fechas)
- **Links cortos públicos** (slug) para compartir sin autenticación

### Gestión de Usuarios
- Creación de usuarios con roles
- **Listado** de usuarios por empresa
- **Activar/Desactivar** usuarios sin eliminar historial

### Sistema de Respuestas
- Envío de respuestas sin autenticación (público)
- Soporte para respuestas desde web y WhatsApp
- Validación de tipos de datos según tipo de pregunta

### Reportes y Analíticas
- Agregación automática de respuestas
- Frecuencia de opciones para preguntas de selección
- Lista completa de respuestas para preguntas abiertas
- **Exportación a Excel** (.xlsx) con formato profesional
- **Exportación a PDF** con tablas y paginación automática

---

## Resumen de Endpoints

Para documentación completa con ejemplos de request/response, ver **[GUIA_USO.md](./GUIA_USO.md)**.

### Autenticación
- `POST /auth/login` - Login y obtención de token JWT

### Empresas
- `POST /companies` - Crear empresa

### Usuarios
- `POST /users` - Crear usuario (creator/analyst)
- `GET /users?company_id=X` - Listar usuarios (**Protected**)
- `PATCH /users/:id/status` - Activar/desactivar (**Protected**)

### Encuestas
- `GET /surveys?company_id=X` - Listar encuestas (**Protected**)
- `GET /surveys/:id` - Obtener encuesta con preguntas (**Protected**)
- `POST /surveys` - Crear encuesta (**Creator only**)
- `PUT /surveys/:id` - Modificar encuesta (**Creator only**)
- `DELETE /surveys/:id` - Eliminar encuesta (**Creator only**)
- `POST /surveys/:id/duplicate` - Duplicar encuesta (**Creator only**)
- `POST /surveys/:id/questions` - Agregar pregunta (**Creator only**)

### Reportes
- `GET /reports/:companyId?survey_id=X` - Generar reporte (**Analyst only**)
- `GET /reports/:companyId/export?survey_id=X&format=xlsx` - Excel (**Analyst only**)
- `GET /reports/:companyId/export?survey_id=X&format=pdf` - PDF (**Analyst only**)

### Público (Sin autenticación)
- `GET /s/:slug` - Acceder a encuesta por link corto
- `POST /submit/:surveyId` - Enviar respuestas

---

## Dependencias del Proyecto

### Core
- **bun** - Runtime JavaScript de alto rendimiento
- **hono** - Framework web minimalista (~10KB)
- **better-sqlite3** - Driver SQLite optimizado para Bun

### Seguridad
- **hono/jwt** - Middleware JWT para autenticación
- **argon2** (built-in Bun) - Hashing seguro de contraseñas

### Exportación de Datos
- **exceljs** (~20MB) - Generación de archivos Excel (.xlsx)
- **jspdf** (~28MB) - Generación de documentos PDF

### Development
- **bun:test** - Test runner nativo de Bun (sin dependencias externas)

**Nota**: ExcelJS y jsPDF están marcadas como `external` en el build de producción, reduciéndolo de 9.4MB a 248KB.

---

## Rendimiento y Optimización

- **Bundle de producción**: 248 KB (97% de reducción vs sin optimizar)
- **Cold start**: < 100ms
- **Tests**: ~760ms para 13 tests de integración
- **Database**: SQLite con prepared statements (previene SQL injection)
- **Dependencias externalizadas**: Se cargan desde node_modules en runtime

---

## Contribución

Este proyecto fue desarrollado como parte del curso "Desarrollo de Software en Equipo" del Politécnico Grancolombiano.

### Estructura de Commits
- `feat:` - Nuevas funcionalidades
- `fix:` - Corrección de bugs
- `docs:` - Cambios en documentación
- `refactor:` - Refactorización de código
- `test:` - Agregado o modificación de tests

---

## Licencia

Este proyecto es de uso académico.

---

## Contacto y Soporte

Para más información sobre cómo usar cada endpoint, consulta la **[Guía de Uso completa](./GUIA_USO.md)**.
