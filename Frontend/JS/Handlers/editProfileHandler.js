
function setupEditProfileButton() {
    const editBtn = document.querySelector(".btn-edit"); 

    if (!editBtn) {
        return; 
    }

    editBtn.addEventListener("click", () => {
        console.log("🟣 Botón 'Editar Perfil' clickeado");
        const token = localStorage.getItem("authToken");

        if (!token) {

            console.log("Usuario no logueado. Redirigiendo a login...");

            if (typeof window.showAlert === 'function') {
                window.showAlert("Debes iniciar sesión para editar tu perfil.", "Acción Requerida");
            } else {
                alert("Debes iniciar sesión para editar tu perfil.");
            }

            window.location.href = '../login.html'; 

        } else {

            console.log("Usuario logueado. Redirigiendo a página de edición...");
            window.location.href = '../local.html'; 
        }
    });
}

document.addEventListener("DOMContentLoaded", setupEditProfileButton);