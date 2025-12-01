/**
 * Funciones de navegación y menú
 */

/**
 * Muestra u oculta elementos del menú según el rol del usuario
 */
function mostrarMenuSegunRol() {
    const userRole = localStorage.getItem("userRole");
    
    // Obtener elementos del menú
    const menuUsuarios = document.getElementById('menu-usuarios');
    const menuEncuestas = document.getElementById('menu-encuestas');
    const menuReportes = document.getElementById('menu-reportes');
    
    // Ocultar todos por defecto
    if (menuUsuarios) menuUsuarios.style.display = 'none';
    if (menuEncuestas) menuEncuestas.style.display = 'none';
    if (menuReportes) menuReportes.style.display = 'none';
    
    // Mostrar según rol
    if (userRole === 'admin') {
        // Admin ve todo
        if (menuUsuarios) menuUsuarios.style.display = '';
        if (menuEncuestas) menuEncuestas.style.display = '';
        if (menuReportes) menuReportes.style.display = '';
    } else if (userRole === 'creator') {
        // Creator solo ve encuestas (sin reportes)
        if (menuEncuestas) menuEncuestas.style.display = '';
    } else if (userRole === 'analyst') {
        // Analyst solo ve reportes
        if (menuReportes) menuReportes.style.display = '';
    }
}

/**
 * Genera el HTML del menú de navegación completo
 * @returns {string} HTML del menú de navegación
 */
function generarMenuNavegacion() {
    return `
        <nav class="nav-principal contenedor">
            <li><a class="enlacenav" href="MenuPrincipal.html">Inicio</a></li>
            <li id="menu-usuarios" style="display: none;"><a href="#">Gestión de usuarios</a>
                <ul>
                    <li><a href="CrearUsuarios.html">Crear usuarios</a></li>
                    <li><a href="Consultarusuarios.html">Consultar, editar y eliminar</a></li>
                </ul>
            </li>
            <li id="menu-encuestas" style="display: none;"><a href="#">Gestión encuestas</a>
                <ul>
                    <li><a href="CrearEncuestas.html">Crear encuestas</a></li>
                    <li><a href="ConsultarEncuestas.html">Consultar, editar y eliminar encuestas</a></li>
                </ul>
            </li>
            <li id="menu-reportes" style="display: none;"><a href="Reportes.html">Reportes</a></li>
        </nav>
    `;
}

/**
 * Genera el HTML del header con logo y botón de cerrar sesión
 * @returns {string} HTML del header
 */
function generarHeader() {
    return `
        <header class="inicio">
            <img class="logo" src="IMG/Logo.png">
            <h1 class="nombre-sitio"> Feed <span> Flow </span> </h1>
            <button onclick="cerrarSesion()" style="position: absolute; right: 20px; top: 20px; padding: 10px 20px; background-color: #ff4444; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">Cerrar Sesión</button>
        </header>
    `;
}

/**
 * Inicializa el menú de navegación en la página actual
 * Debe ser llamada después de que el DOM esté cargado
 */
function inicializarNavegacion() {
    mostrarMenuSegunRol();
}
