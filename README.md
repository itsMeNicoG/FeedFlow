# FeedFlow API

Backend de alto rendimiento para el sistema de gestión de encuestas **FeedFlow**. Construido con **Bun**, **Hono** y **SQLite**.

## 🚀 Tecnologías

- **Runtime:** [Bun](https://bun.sh/) (v1.0+)
- **Framework:** [Hono](https://hono.dev/)
- **Base de Datos:** SQLite (vía `bun:sqlite`)
- **Autenticación:** JWT (JSON Web Tokens)
- **Reportes:** ExcelJS y jsPDF

## 📂 Estructura del Proyecto

```
Backend/
├── src/
│   ├── controllers/   # Lógica de negocio
│   ├── db/            # Conexión y scripts de BD
│   ├── middleware/    # Autenticación y validaciones
│   ├── public/        # Frontend (HTML/CSS/JS)
│   ├── routes/        # Definición de endpoints
│   └── index.js       # Punto de entrada
├── tests/             # Tests de integración
├── package.json       # Dependencias y scripts
└── README.md          # Documentación técnica
```

## 🛠️ Instalación y Configuración

1. **Prerrequisitos:**
   - Tener instalado [Bun](https://bun.sh/).

2. **Instalar dependencias:**
   ```bash
   bun install
   ```

3. **Configurar entorno:**
   Crea un archivo `.env` en la raíz (opcional, por defecto usa valores de desarrollo):
   ```env
   PORT=3000
   JWT_SECRET=tu_secreto_super_seguro
   ```

4. **Inicializar Base de Datos:**
   ```bash
   bun run db:setup
   ```
   Esto creará el archivo `feedflow.sqlite` con las tablas necesarias.

## ▶️ Ejecución

- **Modo Desarrollo (con recarga automática):**
  ```bash
  bun run dev
  ```

- **Modo Producción:**
  ```bash
  bun start
  ```

- **Correr Tests:**
  ```bash
  bun test
  ```

## 🔐 Roles y Permisos

El sistema implementa un control de acceso basado en roles (RBAC):

| Rol | Permisos Principales |
|-----|----------------------|
| **Admin** | Acceso total (Usuarios, Encuestas, Reportes) |
| **Creator** | Gestión de Encuestas (Crear, Editar, Eliminar). **SIN acceso a Reportes.** |
| **Analyst** | Visualización y Exportación de Reportes. **SIN acceso a crear/editar Encuestas.** |

## 📚 Documentación de API

Para ver el listado completo de endpoints, ejemplos de petición y respuesta, consulta la **[GUÍA DE USO DE LA API](./GUIA_USO.md)**.
