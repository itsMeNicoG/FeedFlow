/**
 * Funciones de autenticación y control de acceso
 */

const API_BASE_URL = 'http://localhost:3000';

/**
 * Verifica si el usuario está autenticado
 * @returns {boolean} true si está autenticado, false si no
 */
function verificarAutenticacion() {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Por favor, inicia sesión.");
        window.location.href = "Login.html";
        return false;
    }
    return true;
}

/**
 * Verifica si el usuario tiene el rol requerido para acceder a la página
 * @param {string[]} rolesPermitidos - Array de roles permitidos (ej: ['admin', 'creator'])
 * @returns {boolean} true si tiene acceso, false si no
 */
function verificarAccesoRol(rolesPermitidos) {
    const userRole = localStorage.getItem("userRole");
    
    if (!userRole) {
        alert("Sesión inválida. Por favor, inicia sesión nuevamente.");
        window.location.href = "Login.html";
        return false;
    }

    if (!rolesPermitidos.includes(userRole)) {
        alert("No tienes permisos para acceder a esta página.");
        window.location.href = "MenuPrincipal.html";
        return false;
    }

    return true;
}

/**
 * Cierra la sesión del usuario
 */
function cerrarSesion() {
    localStorage.clear();
    window.location.href = "Login.html";
}

/**
 * Obtiene el token JWT almacenado
 * @returns {string|null} Token JWT o null si no existe
 */
function obtenerToken() {
    return localStorage.getItem("token");
}

/**
 * Obtiene el rol del usuario actual
 * @returns {string|null} Rol del usuario o null si no existe
 */
function obtenerRolUsuario() {
    return localStorage.getItem("userRole");
}

/**
 * Obtiene el nombre del usuario actual
 * @returns {string|null} Nombre del usuario o null si no existe
 */
function obtenerNombreUsuario() {
    return localStorage.getItem("userName");
}
