
function setupEditProfileButton() {
    const editBtn = document.querySelector(".btn-edit"); 

    if (!editBtn) {
        return; 
    }

    const urlParams = new URLSearchParams(window.location.search);
    const profileOwnerId = urlParams.get('userId'); 

    const loggedInUserId = localStorage.getItem("userId"); 

    if (loggedInUserId && profileOwnerId && loggedInUserId === profileOwnerId) {

        console.log("Visitante es el dueño del perfil. Mostrando botón 'Editar Perfil'.");
        
        editBtn.style.display = 'block'; 

        editBtn.addEventListener("click", () => {
            console.log("Redirigiendo a página de edición...");

            window.location.href = 'editProfile.html'; 
        });

    } else {

        console.log("Visitante NO es el dueño. Ocultando botón 'Editar Perfil'.");
        
        editBtn.style.display = 'none';
    }
}

document.addEventListener("DOMContentLoaded", setupEditProfileButton);