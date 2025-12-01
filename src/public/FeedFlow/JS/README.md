# Archivos JavaScript Comunes - FeedFlow

Este directorio contiene archivos JavaScript reutilizables que centralizan la funcionalidad común entre todas las páginas de FeedFlow.

## Archivos

### `auth.js`
Funciones de autenticación y control de acceso.

**Funciones disponibles:**
- `verificarAutenticacion()` - Verifica si el usuario está autenticado
- `verificarAccesoRol(rolesPermitidos)` - Verifica si el usuario tiene permiso para acceder a la página
- `cerrarSesion()` - Cierra la sesión del usuario
- `obtenerToken()` - Obtiene el token JWT almacenado
- `obtenerRolUsuario()` - Obtiene el rol del usuario actual
- `obtenerNombreUsuario()` - Obtiene el nombre del usuario actual

**Ejemplo de uso:**
```javascript
// Verificar autenticación al cargar la página
if (!verificarAutenticacion()) return;

// Verificar que solo admin y creator puedan acceder
if (!verificarAccesoRol(['admin', 'creator'])) return;

// Obtener datos del usuario
const token = obtenerToken();
const userRole = obtenerRolUsuario();
```

### `navigation.js`
Funciones del menú de navegación.

**Funciones disponibles:**
- `mostrarMenuSegunRol()` - Muestra u oculta elementos del menú según el rol del usuario
- `generarMenuNavegacion()` - Genera el HTML del menú de navegación completo
- `generarHeader()` - Genera el HTML del header con logo y botón de cerrar sesión
- `inicializarNavegacion()` - Inicializa el menú de navegación

**Ejemplo de uso:**
```javascript
document.addEventListener('DOMContentLoaded', function () {
    // Verificar autenticación
    if (!verificarAutenticacion()) return;
    
    // Mostrar menú según rol
    mostrarMenuSegunRol();
    
    // ... resto del código de la página
});
```

## Roles y Permisos

### Admin
- Acceso total al sistema
- Puede ver: Gestión de usuarios, Gestión de encuestas, Reportes

### Creator
- Puede crear y gestionar encuestas
- Puede ver: Gestión de encuestas (sin acceso a reportes)

### Analyst
- Solo puede ver reportes
- Puede ver: Reportes

## Cómo usar en una página nueva

1. Incluir los archivos en el `<head>` de tu HTML:
```html
<script src="JS/auth.js"></script>
<script src="JS/navigation.js"></script>
```

2. Verificar autenticación y permisos al inicio:
```javascript
document.addEventListener('DOMContentLoaded', function () {
    // Verificar autenticación
    if (!verificarAutenticacion()) return;
    
    // Verificar permisos (opcional, según la página)
    if (!verificarAccesoRol(['admin', 'creator'])) return;
    
    // Mostrar menú según rol
    mostrarMenuSegunRol();
    
    // ... tu código aquí
});
```

3. Usar `obtenerToken()` en lugar de `localStorage.getItem("token")` para las peticiones API:
```javascript
const token = obtenerToken();
fetch('/api/endpoint', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});
```

## Estructura del Menú HTML

El menú de navegación debe tener los siguientes IDs para que `mostrarMenuSegunRol()` funcione:
- `menu-usuarios` - Sección de gestión de usuarios
- `menu-encuestas` - Sección de gestión de encuestas
- `menu-reportes` - Sección de reportes

Ejemplo:
```html
<nav class="nav-principal contenedor">
    <li><a href="MenuPrincipal.html">Inicio</a></li>
    <li id="menu-usuarios" style="display: none;">
        <a href="#">Gestión de usuarios</a>
        <!-- submenu -->
    </li>
    <li id="menu-encuestas" style="display: none;">
        <a href="#">Gestión encuestas</a>
        <!-- submenu -->
    </li>
    <li id="menu-reportes" style="display: none;">
        <a href="Reportes.html">Reportes</a>
    </li>
</nav>
```

## Beneficios

✅ **Código centralizado** - Un solo lugar para modificar la lógica de autenticación y navegación
✅ **Consistencia** - Todas las páginas usan la misma lógica
✅ **Mantenibilidad** - Cambios en permisos o roles se reflejan en todas las páginas automáticamente
✅ **Menos código duplicado** - Las páginas son más limpias y fáciles de leer
