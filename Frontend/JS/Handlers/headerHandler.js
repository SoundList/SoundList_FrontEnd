// ================================
// ⚙️ JS/Handlers/headerHandler.js
// MANEJA EL MENÚ DE USUARIO Y LOGOUT
// ================================

// Esta función debe ser llamada por el script inyector en tu HTML
function setupHeaderHandlers() {
    
    const userMenuButton = document.getElementById("userMenuButton");
    const userMenuDropdown = document.getElementById("userMenuDropdown");
    const logoutButton = document.getElementById("logoutButton");

    // 1. Manejar el clic en el ícono de usuario (si existe)
    if (userMenuButton) {
        userMenuButton.addEventListener("click", (e) => {
            e.stopPropagation(); // Evita el cierre global
            userMenuDropdown.classList.toggle("show");
        });
    }

    // 2. Manejar el clic en "Cerrar Sesión" (si existe)
    if (logoutButton) {
        logoutButton.addEventListener("click", (e) => {
            e.preventDefault(); // Evita que el '#' navegue
            
            // Limpia el localStorage
            localStorage.removeItem("authToken");
            localStorage.removeItem("userId");
            localStorage.removeItem("username");
            localStorage.removeItem("userAvatar");
            
            alert("Has cerrado sesión.");
            
            // Recarga la página. Al recargar,
            // header.js verá que no hay token y mostrará "Iniciar Sesión".
            window.location.reload(); 
        });
    }

    // 3. Cierre global para ambos menús
    document.addEventListener("click", (e) => {
        // Cierra el menú de usuario
        if (userMenuDropdown && !e.target.closest(".user-menu-wrapper")) {
            userMenuDropdown.classList.remove("show");
        }
        
        // Cierra las notificaciones
        const notifDropdown = document.getElementById("notificationDropdown");
        if (notifDropdown && !e.target.closest(".notification-wrapper")) {
            notifDropdown.classList.remove("show");
        }
    });
}

// (Esta lógica se asegura de que setupHeaderHandlers esté disponible
// para el script inyector en tu profile.html)
document.addEventListener("DOMContentLoaded", () => {
    // Si el header se inyecta (como en profile.html), 
    // el script inyector llamará a 'setupHeaderHandlers'.
    if (!document.getElementById("header-placeholder")) {
        // Si es otra página que NO inyecta el header, lo llama aquí.
        setupHeaderHandlers();
    }
});