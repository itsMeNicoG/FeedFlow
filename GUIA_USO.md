# Guía de Uso - Nuevas Funcionalidades FeedFlow API

Esta guía proporciona ejemplos prácticos de cómo usar las nuevas funcionalidades implementadas en FeedFlow API v2.0.

---

## 📋 Tabla de Contenidos
1. [Modificar Encuestas](#1-modificar-encuestas)
2. [Gestión de Usuarios](#2-gestión-de-usuarios)
3. [Links Cortos Públicos](#3-links-cortos-públicos)
4. [Exportar Reportes](#4-exportar-reportes)

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

| Endpoint                      | Creator | Analyst |
|-------------------------------|---------|---------|
| `PUT /surveys/:id`            | ✅      | ❌      |
| `GET /users`                  | ✅      | ✅      |
| `PATCH /users/:id/status`     | ✅      | ✅      |
| `GET /reports/export`         | ❌      | ✅      |

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
