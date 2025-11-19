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

- `src/db`: Configuración de base de datos y scripts de inicio.
- `src/routes`: Definición de los endpoints de la API.
- `src/controllers`: Lógica de negocio de cada endpoint.
