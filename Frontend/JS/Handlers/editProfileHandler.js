// ================================
// ⚙️ JS/Handlers/editProfileHandler.js
// (CORREGIDO para verificar login ANTES de redirigir)
// ================================

function setupEditProfileButton() {
    // Busca el botón por su clase (como en tu código original)
    const editBtn = document.querySelector(".btn-edit"); 

    if (!editBtn) {
        return; // No estamos en la página que tiene este botón
    }

    editBtn.addEventListener("click", () => {
        console.log("🟣 Botón 'Editar Perfil' clickeado");

        // 💡 ¡NUEVA LÓGICA DE VERIFICACIÓN!
        // 1. Revisa si existe el token en localStorage
        const token = localStorage.getItem("authToken");

        if (!token) {
            // 2. Si NO hay token:
            console.log("Usuario no logueado. Redirigiendo a login...");
            
            // Muestra un alerta (usando la misma función de tus otros archivos)
            if (typeof window.showAlert === 'function') {
                window.showAlert("Debes iniciar sesión para editar tu perfil.", "Acción Requerida");
            } else {
                // Fallback por si la función no está disponible
                alert("Debes iniciar sesión para editar tu perfil.");
            }
            
            // Redirige a la página de login
            // (Ajusta esta ruta si es necesario)
            window.location.href = '../login.html'; 

        } else {
            // 3. Si SÍ hay token:
            // El usuario está logueado, procede a la página de edición.
            console.log("Usuario logueado. Redirigiendo a página de edición...");
            
            // Esta era tu acción original
            window.location.href = '../local.html'; 
        }
    });
}

// Se ejecuta cuando el HTML está listo
document.addEventListener("DOMContentLoaded", setupEditProfileButton);