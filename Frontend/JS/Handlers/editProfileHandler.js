// ================================
// ⚙️ JS/Handlers/editProfileHandler.js
// (CORREGIDO para redirigir a la vista de edición)
// ================================

function setupEditProfileButton() {
    const editBtn = document.querySelector(".btn-edit"); // Asume que este botón está en la pág.

    if (!editBtn) {
        return; // No estamos en la página de perfil
    }

    editBtn.addEventListener("click", () => {
        console.log("🟣 Botón 'Editar Perfil' clickeado");

        // 💡 CAMBIO:
        // Ya no muestra un prompt.
        // Simplemente redirige a la página de ajustes.
        
        // Asume que 'settings.html' está en la misma carpeta (Pages)
        // Si está en /HTML/settings.html, usa: '../settings.html'
        window.location.href = './settings.html'; 
    });
}

// Se ejecuta cuando el HTML está listo
document.addEventListener("DOMContentLoaded", setupEditProfileButton);