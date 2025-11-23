
let selectedAvatarFile = null;

function showSection(sectionId) {

    document.querySelectorAll('.setting-section').forEach(section => {
        section.classList.add('hidden');
    });

    const targetSection = document.getElementById(`section-${sectionId}`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }

    document.querySelectorAll('.sidebar button').forEach(button => {
        button.classList.remove('active');
    });
    const activeButton = document.querySelector(`.sidebar button[data-section="${sectionId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

async function loadCurrentProfileData() {
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
            descTextarea.value = profile.userQuote || profile.quote || profile.Bio || profile.bio || profile.description || profile.Description || "Sin frase personal";
        }

        const avatarPreview = document.getElementById('avatar-preview');
        const imageUploadPreview = document.getElementById('image-upload-preview');
        const avatarUrl = profile.imgProfile || profile.avatar || defaultAvatar;

        if (avatarPreview) avatarPreview.src = avatarUrl;
        if (imageUploadPreview) imageUploadPreview.src = avatarUrl;

        const usernameEl = document.getElementById('edit-profile-username');
        if (usernameEl) {
            usernameEl.textContent = profile.username || profile.Username || localStorage.getItem('username') || 'Cuenta';
        }
        
    } catch (error) {
        console.error("Error al cargar datos del perfil:", error);
        (window.showAlert || alert)("Error al cargar datos actuales. Por favor, verifica tu sesión.", "danger");
    }
}

async function handleDescriptionSubmit(e) {
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

    let isSuccess = false; 

    try {
        // Enviar tanto userQuote como bio para compatibilidad con el backend
        const updateData = { 
            userQuote: newQuote,
            bio: newQuote,
            Bio: newQuote
        };
        await window.userApi.updateUserProfile(currentUserId, updateData);

        (window.showAlert || alert)("Descripción actualizada exitosamente.", "success");
        newDescriptionInput.value = ''; 

        confirmBtn.innerHTML = '<i class="fa-solid fa-check me-2"></i> ¡Guardado!';
        confirmBtn.classList.add('btn-success-feedback'); 
        isSuccess = true; 

        await loadCurrentProfileData(); 

        setTimeout(() => {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = 'Confirmar';
            confirmBtn.classList.remove('btn-success-feedback');
        }, 2000);


    } catch (error) {
        console.error("Error al guardar la descripción:", error);
        (window.showAlert || alert)("Error al actualizar la descripción.", "danger");
    
    } finally {

        if (!isSuccess) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = 'Confirmar';
        }
    }
}

async function handleImageSubmit(e) {
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

    let isSuccess = false;

    try {
        const reader = new FileReader();
        reader.readAsDataURL(selectedAvatarFile);
        await new Promise((resolve, reject) => {
            reader.onload = resolve;
            reader.onerror = reject;
        });

        const base64Image = reader.result; 
        const updateData = { imgProfile: base64Image };
        
        await window.userApi.updateUserProfile(currentUserId, updateData);
        
        document.getElementById('avatar-preview').src = base64Image;
        document.getElementById('image-upload-preview').src = base64Image;
        localStorage.setItem('userAvatar', base64Image); 
        selectedAvatarFile = null;

        confirmBtn.innerHTML = '<i class="fa-solid fa-check me-2"></i> ¡Guardado!';
        confirmBtn.classList.add('btn-success-feedback');
        (window.showAlert || alert)
        isSuccess = true; 
        
        // Recargar los datos del perfil para asegurar que todo esté actualizado
        await loadCurrentProfileData();
        
        setTimeout(() => {
            confirmBtn.disabled = true; 
            confirmBtn.innerHTML = 'Confirmar Cambio de Imagen';
            confirmBtn.classList.remove('btn-success-feedback');
        }, 2000);


    } catch (error) {
        console.error("Error al subir la imagen:", error);
        (window.showAlert || alert)("Error al actualizar la imagen.", "danger");

    } finally {
        if (!isSuccess) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = 'Confirmar Cambio de Imagen';
        }
    }
}


document.addEventListener("DOMContentLoaded", () => {


    loadCurrentProfileData();

    document.querySelectorAll('.sidebar button').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.getAttribute('data-section');
            if (section) {
                showSection(section);
            }
        });
    });

    const descForm = document.getElementById('form-edit-description');
    if (descForm) {
        descForm.addEventListener('submit', handleDescriptionSubmit);
    }

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
    const backBtn = document.getElementById('btn-back-profile');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '../../index.html'; 
            }
        });
    }
    
});