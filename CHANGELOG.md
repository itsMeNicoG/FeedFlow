# Changelog - FeedFlow API

## [2.0.0] - 2025-01-XX - API Robusta Completa

### 🎉 Nuevas Funcionalidades

#### 1. Modificación de Encuestas
- **Endpoint**: `PUT /surveys/:id`
- **Descripción**: Los Creadores pueden actualizar título, descripción y fechas de encuestas existentes
- **Controlador**: `src/controllers/surveys.js::updateSurvey()`
- **Tests**: ✅ Implementados y pasando

#### 2. Gestión de Usuarios
- **Endpoint**: `GET /users?company_id=X`
  - Lista todos los usuarios de una empresa
  - Excluye contraseñas del response por seguridad
  - Requiere autenticación JWT
  
- **Endpoint**: `PATCH /users/:id/status`
  - Activa o desactiva usuarios
  - Solo puede modificar usuarios de la misma empresa
  - Requiere autenticación JWT

- **Controlador**: `src/controllers/users.js`
- **Tests**: ✅ Implementados y pasando

#### 3. Links Cortos Públicos
- **Endpoint**: `GET /s/:slug`
- **Descripción**: Acceso público a encuestas mediante slug único
- **Ejemplo**: `/s/abc123def456`
- **Sin autenticación**: Ideal para compartir en redes sociales y WhatsApp
- **Controlador**: `src/controllers/surveys.js::getSurveyBySlug()`
- **Tests**: ✅ Implementados y pasando

#### 4. Exportación de Reportes

##### Excel (.xlsx)
- **Endpoint**: `GET /reports/:companyId/export?survey_id=X&format=xlsx`
- **Tecnología**: ExcelJS v4.4.0
- **Características**:
  - Tablas formateadas con headers en color azul
  - Anchos de columna automáticos
  - Datos agregados por pregunta
  - Respuestas completas con fechas
- **Controlador**: `src/controllers/reports.js::exportReportExcel()`
- **Tests**: ✅ Implementados y pasando

##### PDF
- **Endpoint**: `GET /reports/:companyId/export?survey_id=X&format=pdf`
- **Tecnología**: jsPDF v3.0.4 (sin autoTable - implementación manual de tablas)
- **Características**:
  - Formato profesional A4
  - Tablas con bordes y colores alternados
  - Paginación automática
  - Headers coloreados (azul #428BCA)
  - Optimizado para impresión
- **Controlador**: `src/controllers/reports.js::exportReportPDF()`
- **Tests**: ✅ Implementados y pasando

### 🔧 Mejoras Técnicas

#### Refactorización
- **Helper function**: `getReportData()` en `src/controllers/reports.js`
  - Centraliza lógica de obtención de datos de reportes
  - Reutilizado por endpoints JSON, Excel y PDF
  - Evita duplicación de código

#### Rutas Actualizadas
- **src/routes/surveys.js**: Agregado PUT y endpoint de slug
- **src/routes/reports.js**: Agregado endpoint de exportación
- **src/routes/users.js**: Agregados endpoints GET y PATCH
- **src/index.js**: Agregada ruta pública `/s/:slug`

### 📚 Documentación

#### JSDoc Completo
- ✅ Todos los nuevos controladores documentados
- ✅ Parámetros con tipos TypeScript
- ✅ Ejemplos de request/response
- ✅ Descripción de excepciones

#### README.md Actualizado
- ✅ Sección de "Funcionalidades Avanzadas"
- ✅ Ejemplos de uso de cada endpoint
- ✅ Código JavaScript para descargas en frontend
- ✅ Lista completa de dependencias
- ✅ Endpoints actualizados con nuevas rutas

### 🧪 Testing

#### Nuevos Tests de Integración
1. ✅ `PUT /surveys/:id` - Modificación de encuestas
2. ✅ `GET /users` - Listado de usuarios
3. ✅ `PATCH /users/:id/status` - Cambio de estado
4. ✅ `GET /s/:slug` - Acceso por link corto
5. ✅ `GET /reports/export?format=xlsx` - Exportación Excel
6. ✅ `GET /reports/export?format=pdf` - Exportación PDF

**Resultado**: 13/13 tests pasando (100% success rate)

### 📦 Dependencias Nuevas
- **exceljs**: ^4.4.0 - Generación de archivos Excel
- **jspdf**: ^3.0.4 - Generación de documentos PDF
- ~~**jspdf-autotable**: REMOVIDO~~ (incompatibilidad con Bun, implementación manual)

### 🐛 Correcciones

#### Issue #1: jspdf-autotable compatibility
- **Problema**: Plugin autoTable no se cargaba correctamente en Bun
- **Error**: `TypeError: doc.autoTable is not a function`
- **Solución**: Implementación manual de tablas con jsPDF nativo
- **Resultado**: Más control sobre el diseño, sin dependencias externas problemáticas

#### Issue #2: Bundle size optimization
- **Problema**: Bundle de producción pesaba 9.4 MB (ExcelJS + jsPDF embebidos)
- **Impacto**: Cold start lento, deploy pesado, mayor uso de memoria
- **Solución**: Externalizar dependencias pesadas en `build.js`
  - `exceljs` (~20 MB)
  - `jspdf` (~28 MB)  
  - `better-sqlite3` (driver nativo)
- **Resultado**: Bundle reducido a **248 KB** (reducción del 97.4%)
- **Trade-off**: Requiere `node_modules` en producción (estándar en deploys Node.js)

### 🔒 Seguridad

#### Mantenida en Todos los Nuevos Endpoints
- ✅ JWT authentication requerido (excepto rutas públicas)
- ✅ RBAC enforcement (Creator/Analyst roles)
- ✅ Prepared statements (SQL injection prevention)
- ✅ Validación de company_id en todas las operaciones
- ✅ Exclusión de contraseñas en endpoints de usuarios

### 📊 Métricas

#### Cobertura de Funcionalidades
- **Requerimientos del proyecto**: 100% implementados
- **Endpoints totales**: 16 (vs 10 anteriormente)
- **Tests de integración**: 13 (vs 7 anteriormente)
- **Documentación JSDoc**: 100% de cobertura

#### Performance
- **Build size**: 248 KB (optimizado, era 9.4 MB sin externalización)
- **Reducción de bundle**: 97.4%
- **Test execution**: ~760ms para 13 tests
- **Database**: SQLite con prepared statements optimizados
- **Cold start**: < 100ms (con bundle optimizado)

---

## [1.0.0] - Versión Inicial

### ✨ Funcionalidades Base
- Autenticación JWT con Argon2 password hashing
- RBAC (Creator/Analyst roles)
- CRUD completo de encuestas
- Sistema de preguntas con tipos múltiples
- Envío de respuestas (público)
- Generación de reportes (JSON)
- Duplicación de encuestas
- Base de datos SQLite con prepared statements

### 🛠️ Stack Tecnológico
- **Runtime**: Bun 1.3.2
- **Framework**: Hono
- **Database**: SQLite (better-sqlite3)
- **Auth**: JWT + Argon2

### 📄 Documentación
- README.md completo
- JSDoc en todos los módulos principales
- Tests de integración básicos
