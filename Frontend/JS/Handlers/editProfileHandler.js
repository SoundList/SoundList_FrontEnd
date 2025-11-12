/**
 * Configura el botón "Editar Perfil" en la página de perfil.
 * 💡 (ACTUALIZADO: El enlace ahora apunta a edit_profile.html)
 */
function setupEditProfileButton() {
    const editBtn = document.querySelector(".btn-edit"); 

    if (!editBtn) {
        return; 
    }

    // --- LÓGICA DE VISIBILIDAD (Solo el Dueño ve el botón) ---

    // 1. ¿De quién es este perfil? (Leído de la URL: ?userId=123)
    const urlParams = new URLSearchParams(window.location.search);
    const profileOwnerId = urlParams.get('userId'); 

    // 2. ¿Quién está viendo la página? (Leído de localStorage)
    const loggedInUserId = localStorage.getItem("userId"); 

    // 3. Comparamos: Si estoy logueado Y mi ID coincide con el ID del perfil de la URL.
    if (loggedInUserId && profileOwnerId && loggedInUserId === profileOwnerId) {
        
        // --- CASO 1: SÍ soy el dueño ---
        console.log("Visitante es el dueño del perfil. Mostrando botón 'Editar Perfil'.");
        
        editBtn.style.display = 'block'; 

        editBtn.addEventListener("click", () => {
            console.log("Redirigiendo a página de edición...");
            
            // 💡 ¡CAMBIO IMPORTANTE!
            // Apuntamos a la nueva página de edición que creamos.
            window.location.href = 'editProfile.html'; 
        });

    } else {
        
        // --- CASO 2: Usuario no logueado O usuario logueado pero no es dueño ---
        console.log("Visitante NO es el dueño. Ocultando botón 'Editar Perfil'.");
        
        editBtn.style.display = 'none';
    }
}

document.addEventListener("DOMContentLoaded", setupEditProfileButton);