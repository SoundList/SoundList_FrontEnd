// ===============================================
// ⚙️ JS/edit-profile.js
// Lógica para la página de edición de perfil
// ===============================================

document.addEventListener('DOMContentLoaded', function() {
    // --- Elementos del DOM ---
    const editProfileForm = document.getElementById('editProfileForm');
    const currentUsernameInput = document.getElementById('currentUsername');
    const newUsernameInput = document.getElementById('newUsername');
    const currentDescriptionTextarea = document.getElementById('currentDescription');
    const newDescriptionTextarea = document.getElementById('newDescription');
    const currentAvatarImg = document.getElementById('currentAvatarImg');
    const newAvatarInput = document.getElementById('newAvatar');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const saveProfileBtn = document.getElementById('saveProfileBtn');

    // Elementos de la barra lateral para actualizar el avatar y nombre
    const sidebarProfileAvatar = document.querySelector('.profile-summary .profile-avatar');
    const sidebarUsername = document.getElementById('sidebarUsername');
    const headerProfileAvatar = document.querySelector('.header .profile-dropdown .avatar-sm');
    const headerLogoImage = document.getElementById('headerLogoImage');


    // --- URL del Gateway (como lo usa tu compañera) ---
    const API_BASE_URL = 'https://localhost:32769'; 

    // --- Cargar datos del usuario al iniciar la página ---
    function loadUserData() {
        const userId = localStorage.getItem('userId');
        const authToken = localStorage.getItem('authToken');

        if (!userId || !authToken) {
            window.showAlert('No has iniciado sesión. Redirigiendo...', 'warning');
            setTimeout(() => {
                // Asumiendo que estamos en Pages y login.html está en la raíz superior
                window.location.href = '../login.html'; 
            }, 1500);
            return;
        }

        // MOCK de datos del usuario (reemplazar con llamada a la API real)
        const mockUserData = {
            id: userId,
            username: localStorage.getItem('username') || 'Usuario SoundList',
            description: '¡Hola! Soy un usuario de prueba en SoundList. Me encanta la música y compartir mis opiniones.',
            avatarUrl: localStorage.getItem('userAvatar') || '../Assets/default-avatar.png'
        };

        // --- Rellenar el formulario con datos actuales ---
        currentUsernameInput.value = mockUserData.username;
        currentDescriptionTextarea.value = mockUserData.description;
        currentAvatarImg.src = mockUserData.avatarUrl;
        
        // Actualizar avatar y nombre en el header y sidebar
        if (sidebarProfileAvatar) sidebarProfileAvatar.src = mockUserData.avatarUrl;
        if (sidebarUsername) sidebarUsername.textContent = mockUserData.username;
        if (headerProfileAvatar) headerProfileAvatar.src = mockUserData.avatarUrl;
        if (headerLogoImage) headerLogoImage.src = mockUserData.avatarUrl;

        // Si hay una descripción vacía en el mock, que no se muestre en el campo de descripción actual
        if (currentDescriptionTextarea.value === '') {
            currentDescriptionTextarea.value = 'Aún no tienes una descripción. ¡Anímate a añadir una!';
        }
        
        // Cargar datos en el campo editable si aún no se ha escrito nada
        if (newDescriptionTextarea.value === '') {
            newDescriptionTextarea.value = mockUserData.description;
        }


        // Reemplazar con la llamada real a la API para obtener el perfil del usuario
        /*
        axios.get(`${API_BASE_URL}/api/User/${userId}/Profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        })
        .then(response => {
            const userData = response.data;
            currentUsernameInput.value = userData.username;
            newUsernameInput.value = userData.username; // Opcional: precargar el nuevo campo
            // ... (resto de la lógica)
        })
        .catch(error => {
            console.error('Error al cargar datos del usuario:', error);
            window.showAlert('Error al cargar tu perfil.', 'danger');
        });
        */
    }

    // --- Previsualizar nuevo avatar ---
    newAvatarInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2 MB
                window.showAlert('El archivo es demasiado grande (máx. 2MB).', 'danger');
                newAvatarInput.value = ''; // Limpiar el input
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                currentAvatarImg.src = e.target.result; // Previsualiza en el mismo lugar
            };
            reader.readAsDataURL(file);
        }
    });

    // --- Manejar el envío del formulario (Guardar Cambios) ---
    editProfileForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        clearErrors(); // Limpiar errores previos

        const userId = localStorage.getItem('userId');
        const authToken = localStorage.getItem('authToken');

        if (!userId || !authToken) {
            window.showAlert('No has iniciado sesión. Redirigiendo...', 'warning');
            setTimeout(() => {
                window.location.href = '../login.html';
            }, 1500);
            return;
        }

        const newUsername = newUsernameInput.value.trim();
        const newDescription = newDescriptionTextarea.value.trim();
        const avatarFile = newAvatarInput.files[0];

        let hasChanges = false;
        const formData = new FormData(); // Usamos FormData para enviar archivos

        // Validar y añadir nombre de usuario
        if (newUsername && newUsername !== currentUsernameInput.value) {
            if (!isValidUsername(newUsername)) {
                showFieldError(newUsernameInput, 'El nombre de usuario debe tener entre 3 y 20 caracteres y solo puede contener letras, números y guiones.');
                return;
            }
            formData.append('username', newUsername);
            hasChanges = true;
        }

        // Validar y añadir descripción
        if (newDescription !== currentDescriptionTextarea.value && newDescription !== 'Aún no tienes una descripción. ¡Anímate a añadir una!') {
             if (newDescription.length > 250) { // Ejemplo de límite
                showFieldError(newDescriptionTextarea, 'La descripción no puede exceder los 250 caracteres.');
                return;
            }
            formData.append('description', newDescription);
            hasChanges = true;
        }

        // Añadir avatar
        if (avatarFile) {
            formData.append('avatarFile', avatarFile); // El nombre 'avatarFile' debe coincidir con el esperado por tu API
            hasChanges = true;
        }

        if (!hasChanges) {
            window.showAlert('No hay cambios para guardar.', 'info');
            return;
        }

        setButtonLoading(saveProfileBtn, true, 'Guardando...');

        try {
            // Reemplazar con la llamada real a la API
            console.warn("--- SIMULACIÓN DE ACTUALIZACIÓN DE PERFIL ---");
            console.log("Datos a enviar:", Object.fromEntries(formData.entries()));

            await new Promise(resolve => setTimeout(resolve, 1500)); // Simular delay de red

            // Si la simulación es exitosa:
            window.showAlert('Perfil actualizado exitosamente (simulado)!', 'success');

            // Actualizar localStorage y la interfaz con los nuevos datos (simulados)
            if (newUsername) localStorage.setItem('username', newUsername);
            
            if (avatarFile) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    localStorage.setItem('userAvatar', e.target.result);
                };
                reader.readAsDataURL(avatarFile);
            }
            
            // Recargar datos para reflejar los cambios (especialmente los disabled)
            loadUserData();
            newUsernameInput.value = ''; // Limpiar campos editables después de guardar
            newDescriptionTextarea.value = '';
            newAvatarInput.value = ''; // Limpiar input de archivo
            
        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            const errorMessage = (error.response && error.response.data && (error.response.data.message || error.response.data.error))
                ? error.response.data.message || error.response.data.error
                : 'Error al actualizar el perfil. Intenta de nuevo.';
            window.showAlert(errorMessage, 'danger');
        } finally {
            setButtonLoading(saveProfileBtn, false, 'Guardar Cambios');
        }
    });

    // --- Cancelar edición ---
    cancelEditBtn.addEventListener('click', function() {
        // Podrías preguntar si desea descartar cambios
        if (window.confirm('¿Deseas descartar los cambios no guardados?')) {
            loadUserData(); // Recargar los datos originales
            newUsernameInput.value = '';
            newDescriptionTextarea.value = '';
            newAvatarInput.value = '';
            clearErrors();
            window.showAlert('Cambios descartados.', 'info');
            // Redirigir de vuelta al perfil si es necesario:
            // window.location.href = 'profile.html'; 
        }
    });

    // --- Funciones de utilidad ---

    function isValidUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
        return usernameRegex.test(username);
    }

    function showFieldError(field, message) {
        field.classList.add('is-invalid');
        const feedbackElement = field.parentElement.querySelector('.invalid-feedback');
        if (feedbackElement) {
            feedbackElement.textContent = message;
            feedbackElement.style.display = 'block';
        }
    }

    function clearErrors() {
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.querySelectorAll('.invalid-feedback').forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
    }

    function setButtonLoading(button, loading = true, text = 'Cargando...') {
        if (loading) {
            button.disabled = true;
            button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${text}`;
        } else {
            button.disabled = false;
            button.innerHTML = text; // Restaurar el texto original del botón
        }
    }

    // --- Inicialización ---
    loadUserData();
});