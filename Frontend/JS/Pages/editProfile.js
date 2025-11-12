// ===============================================
// ⚙️ JS/Pages/editProfile.js
// (ACTUALIZADO: Con bloque 'finally' para resetear el botón)
// ===============================================

// Referencia al archivo de imagen seleccionado por el usuario
let selectedAvatarFile = null;

/**
 * Muestra la sección de ajustes correspondiente y actualiza el menú.
 * @param {string} sectionId - 'description', 'image', 'email', 'password'
 */
function showSection(sectionId) {
// ... (código existente... omitido por brevedad) ...
    // Ocultar todas las secciones
    document.querySelectorAll('.setting-section').forEach(section => {
        section.classList.add('hidden');
    });
    // Mostrar la sección requerida
    const targetSection = document.getElementById(`section-${sectionId}`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }

    // Actualizar el estado 'active' del menú
    document.querySelectorAll('.sidebar button').forEach(button => {
        button.classList.remove('active');
    });
    const activeButton = document.querySelector(`.sidebar button[data-section="${sectionId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

/**
 * Carga los datos actuales del perfil desde el backend y los muestra en la UI.
 */
async function loadCurrentProfileData() {
// ... (código existente... omitido por brevedad) ...
    try {
        const currentUserId = localStorage.getItem('userId');
        if (!currentUserId) {
            window.showAlert("Sesión no encontrada. Redirigiendo a login.", "danger");
            window.location.href = '../login.html';
            return;
        }

        const profile = await window.userApi.getUserProfile(currentUserId); 
        const defaultAvatar = "../../Assets/default-avatar.png";
        
        const descTextarea = document.getElementById('current-description');
        if (descTextarea) {
            descTextarea.value = profile.userQuote || profile.quote || "Sin frase personal";
        }

        const avatarPreview = document.getElementById('avatar-preview');
        const imageUploadPreview = document.getElementById('image-upload-preview');
        const avatarUrl = profile.avatar || defaultAvatar;

        if (avatarPreview) avatarPreview.src = avatarUrl;
        if (imageUploadPreview) imageUploadPreview.src = avatarUrl;
        
    } catch (error) {
        console.error("Error al cargar datos del perfil:", error);
        // Usamos alert() como fallback si showAlert no existe
        (window.showAlert || alert)("Error al cargar datos actuales. Por favor, verifica tu sesión.", "danger");
    }
}

/**
 * Maneja el envío del formulario de Edición de Descripción.
 */
async function handleDescriptionSubmit(e) {
// ... (código existente... omitido por brevedad) ...
    e.preventDefault();
    const form = e.target;
    const newDescriptionInput = document.getElementById('new-description');
    const newQuote = newDescriptionInput.value.trim();

    if (!newQuote) {
        (window.showAlert || alert)("La nueva descripción no puede estar vacía.", "warning");
        return;
    }
    
    const currentUserId = localStorage.getItem('userId');
    if (!currentUserId) {
         (window.showAlert || alert)("Error de sesión.", "danger");
         return;
    }

    const confirmBtn = form.querySelector('button[type="submit"]');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Guardando...';
    
    // 💡 Bandera para saber si tuvimos éxito
    let isSuccess = false; 

    try {
        const updateData = { userQuote: newQuote };
        await window.userApi.updateUserProfile(currentUserId, updateData);

        // --- 💡 ¡LÓGICA DE FEEDBACK VISUAL! ---
        (window.showAlert || alert)("Descripción actualizada exitosamente.", "success");
        newDescriptionInput.value = ''; // 1. Limpiar el input

        // 2. Cambiar estado del botón
        confirmBtn.innerHTML = '<i class="fa-solid fa-check me-2"></i> ¡Guardado!';
        confirmBtn.classList.add('btn-success-feedback'); 
        isSuccess = true; // 💡 Marcamos como éxito

        // 3. ¡Recargar los datos del servidor!
        await loadCurrentProfileData(); 
        
        // 4. Volver al estado normal después de 2 segundos
        setTimeout(() => {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = 'Confirmar';
            confirmBtn.classList.remove('btn-success-feedback');
        }, 2000);
        // --- Fin del Feedback ---

    } catch (error) {
        console.error("Error al guardar la descripción:", error);
        (window.showAlert || alert)("Error al actualizar la descripción.", "danger");
    
    } finally {
        // 💡 ¡NUEVO BLOQUE FINALLY!
        // Si la operación NO fue exitosa (isSuccess es false),
        // reseteamos el botón inmediatamente.
        if (!isSuccess) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = 'Confirmar';
        }
    }
}

/**
 * Maneja el envío del formulario de Edición de Imagen.
 */
async function handleImageSubmit(e) {
// ... (código existente... omitido por brevedad) ...
    e.preventDefault();
    
    if (!selectedAvatarFile) {
        (window.showAlert || alert)("Por favor, selecciona una imagen primero.", "warning");
        return;
    }
    
    const currentUserId = localStorage.getItem('userId');
    if (!currentUserId) {
         (window.showAlert || alert)("Error de sesión.", "danger");
         return;
    }

    const confirmBtn = document.getElementById('confirm-image-btn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Subiendo...';

    // 💡 Bandera para saber si tuvimos éxito
    let isSuccess = false;

    try {
        const reader = new FileReader();
        reader.readAsDataURL(selectedAvatarFile);
        await new Promise((resolve, reject) => {
            reader.onload = resolve;
            reader.onerror = reject;
        });

        const base64Image = reader.result; 
        const updateData = { avatarUrl: base64Image };
        
        await window.userApi.updateUserProfile(currentUserId, updateData);
        
        // --- 💡 ¡LÓGICA DE FEEDBACK VISUAL! ---
        document.getElementById('avatar-preview').src = base64Image;
        document.getElementById('image-upload-preview').src = base64Image;
        localStorage.setItem('userAvatar', base64Image); 
        selectedAvatarFile = null;

        confirmBtn.innerHTML = '<i class="fa-solid fa-check me-2"></i> ¡Guardado!';
        confirmBtn.classList.add('btn-success-feedback');
        (window.showAlert || alert)("Imagen de perfil actualizada.", "success");
        isSuccess = true; // 💡 Marcamos como éxito
        
        setTimeout(() => {
            confirmBtn.disabled = true; 
            confirmBtn.innerHTML = 'Confirmar Cambio de Imagen';
            confirmBtn.classList.remove('btn-success-feedback');
        }, 2000);
        // --- Fin del Feedback ---

    } catch (error) {
        console.error("Error al subir la imagen:", error);
        (window.showAlert || alert)("Error al actualizar la imagen.", "danger");

    } finally {
        // 💡 ¡NUEVO BLOQUE FINALLY!
        if (!isSuccess) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = 'Confirmar Cambio de Imagen';
        }
    }
}

// --- Setup inicial ---
document.addEventListener("DOMContentLoaded", () => {
// ... (código existente... omitido por brevedad) ...
    
    // 1. Cargar datos actuales
    loadCurrentProfileData();
    
    // 2. Configurar listeners del menú lateral
    document.querySelectorAll('.sidebar button').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.getAttribute('data-section');
            if (section) {
                showSection(section);
            }
        });
    });

    // 3. Configurar formulario de Descripción
    const descForm = document.getElementById('form-edit-description');
    if (descForm) {
        descForm.addEventListener('submit', handleDescriptionSubmit);
    }
    
    // 4. Configurar formulario de Imagen
    const imageForm = document.getElementById('form-edit-image');
    const avatarInput = document.getElementById('avatar-input');
    const confirmImageBtn = document.getElementById('confirm-image-btn');

    if (avatarInput) {
        avatarInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                selectedAvatarFile = this.files[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('image-upload-preview').src = e.target.result;
                    confirmImageBtn.disabled = false;
                };
                reader.readAsDataURL(this.files[0]);
            } else {
                 selectedAvatarFile = null;
                 confirmImageBtn.disabled = true;
            }
        });
    }

    if (imageForm) {
        imageForm.addEventListener('submit', handleImageSubmit);
    }
    
    // (Omitimos las simulaciones de email/contraseña que tenías)
    
});