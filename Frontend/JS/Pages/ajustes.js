let settingsState = {
    userId: null,
    email: '',
    username: '',
    avatar: ''
};

const DEFAULT_AVATAR = "../../Assets/default-avatar.png";

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setButtonLoading(button, isLoading, loadingText = 'Guardando...') {
    if (!button) return;

    if (isLoading) {
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.innerHTML;
        }
        button.disabled = true;
        button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${loadingText}`;
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || 'Confirmar';
    }
}

async function loadSettingsSummary() {
    if (!settingsState.userId || !window.userApi) return;

    try {
        const profile = await window.userApi.getUserProfile(settingsState.userId);
        settingsState.email = profile?.email || profile?.Email || '';
        settingsState.username = profile?.username || profile?.Username || 'Cuenta';
        settingsState.avatar = profile?.imgProfile || profile?.avatar || localStorage.getItem('userAvatar') || DEFAULT_AVATAR;

        const emailInput = document.getElementById('current-email');
        if (emailInput) {
            emailInput.value = settingsState.email;
        }

        const usernameEl = document.getElementById('settings-username');
        if (usernameEl) {
            usernameEl.textContent = settingsState.username;
        }

        const avatarEl = document.getElementById('settings-avatar');
        if (avatarEl) {
            avatarEl.src = settingsState.avatar || DEFAULT_AVATAR;
            avatarEl.onerror = () => { avatarEl.src = DEFAULT_AVATAR; };
        }
    } catch (error) {
        console.error("Error al cargar los datos de ajustes:", error);
        (window.showAlert || alert)("No pudimos cargar tu información. Intenta nuevamente.", "danger");
    }
}

async function handleEmailSubmit(event) {
    event.preventDefault();

    if (!settingsState.userId) return;

    const currentEmail = document.getElementById('current-email')?.value.trim();
    const newEmailInput = document.getElementById('new-email');
    const confirmEmailInput = document.getElementById('confirm-email');
    const newEmail = newEmailInput?.value.trim();
    const confirmEmail = confirmEmailInput?.value.trim();
    const submitBtn = document.getElementById('confirm-email-btn');

    if (!newEmail || !confirmEmail) {
        (window.showAlert || alert)("Completa todos los campos.", "warning");
        return;
    }

    if (!isValidEmail(newEmail)) {
        (window.showAlert || alert)("Ingresa un mail válido.", "warning");
        return;
    }

    if (!isValidEmail(confirmEmail)) {
        (window.showAlert || alert)("El mail de confirmación debe ser válido.", "warning");
        return;
    }

    if (newEmail.toLowerCase() !== confirmEmail.toLowerCase()) {
        (window.showAlert || alert)("La confirmación no coincide con el nuevo mail.", "warning");
        return;
    }

    if (currentEmail && currentEmail.toLowerCase() === newEmail.toLowerCase()) {
        (window.showAlert || alert)("El nuevo mail debe ser distinto al actual.", "info");
        return;
    }

    try {
        setButtonLoading(submitBtn, true, 'Actualizando...');
        await window.userApi.updateUserEmail(settingsState.userId, currentEmail, newEmail);
        (window.showAlert || alert)("Mail actualizado correctamente.", "success");
        if (newEmailInput) newEmailInput.value = '';
        if (confirmEmailInput) confirmEmailInput.value = '';
        await loadSettingsSummary();
        localStorage.setItem('userEmail', newEmail);
    } catch (error) {
        console.error("Error al actualizar el mail:", error);
        const message = error.response?.data?.message || "No pudimos actualizar el mail. Revisa los datos e intenta nuevamente.";
        (window.showAlert || alert)(message, "danger");
    } finally {
        setButtonLoading(submitBtn, false, 'Confirmar cambio de mail');
    }
}

async function handlePasswordSubmit(event) {
    event.preventDefault();

    if (!settingsState.userId) return;

    const currentPassword = document.getElementById('current-password')?.value.trim();
    const newPassword = document.getElementById('new-password')?.value.trim();
    const confirmPassword = document.getElementById('confirm-password')?.value.trim();
    const submitBtn = document.getElementById('confirm-password-btn');

    if (!currentPassword || !newPassword || !confirmPassword) {
        (window.showAlert || alert)("Completa todos los campos.", "warning");
        return;
    }

    if (newPassword.length < 8) {
        (window.showAlert || alert)("La nueva contraseña debe tener al menos 8 caracteres.", "warning");
        return;
    }

    if (newPassword !== confirmPassword) {
        (window.showAlert || alert)("La confirmación no coincide con la nueva contraseña.", "warning");
        return;
    }

    if (currentPassword === newPassword) {
        (window.showAlert || alert)("Usa una contraseña distinta a la actual.", "info");
        return;
    }

    try {
        setButtonLoading(submitBtn, true, 'Guardando...');
        await window.userApi.updateUserPassword(settingsState.userId, currentPassword, newPassword);
        (window.showAlert || alert)("Contraseña actualizada correctamente.", "success");
        document.getElementById('form-change-password')?.reset();
    } catch (error) {
        console.error("Error al actualizar la contraseña:", error);
        const message = error.response?.data?.message || "No pudimos actualizar la contraseña. Verifica los datos.";
        (window.showAlert || alert)(message, "danger");
    } finally {
        setButtonLoading(submitBtn, false, 'Actualizar contraseña');
    }
}

function showSettingsPanel(panel) {
    const emailPanel = document.getElementById('email-panel');
    const passwordPanel = document.getElementById('password-panel');
    const deletePanel = document.getElementById('delete-panel');
    const emailBtn = document.getElementById('sidebar-email-btn');
    const passwordBtn = document.getElementById('sidebar-password-btn');
    const deleteBtn = document.getElementById('sidebar-delete-btn');

    if (!emailPanel || !passwordPanel || !deletePanel || !emailBtn || !passwordBtn || !deleteBtn) return;

    // Ocultar todos los paneles y desactivar todos los botones
    emailPanel.classList.add('hidden');
    passwordPanel.classList.add('hidden');
    deletePanel.classList.add('hidden');
    emailBtn.classList.remove('active');
    passwordBtn.classList.remove('active');
    deleteBtn.classList.remove('active');

    // Mostrar el panel seleccionado y activar su botón
    if (panel === 'password') {
        passwordPanel.classList.remove('hidden');
        passwordBtn.classList.add('active');
    } else if (panel === 'delete') {
        deletePanel.classList.remove('hidden');
        deleteBtn.classList.add('active');
    } else {
        emailPanel.classList.remove('hidden');
        emailBtn.classList.add('active');
    }
}

function initializeSidebarShortcuts() {
    const emailBtn = document.getElementById('sidebar-email-btn');
    const passwordBtn = document.getElementById('sidebar-password-btn');
    const deleteBtn = document.getElementById('sidebar-delete-btn');

    if (emailBtn) {
        emailBtn.addEventListener('click', () => showSettingsPanel('email'));
    }

    if (passwordBtn) {
        passwordBtn.addEventListener('click', () => showSettingsPanel('password'));
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => showSettingsPanel('delete'));
    }

    showSettingsPanel('email');
}

function showDeleteAccountModal() {
    const modal = document.getElementById('deleteAccountModalOverlay');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideDeleteAccountModal() {
    const modal = document.getElementById('deleteAccountModalOverlay');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function handleDeleteAccount() {
    if (!settingsState.userId) return;

    const passwordInput = document.getElementById('delete-confirm-password');
    const password = passwordInput?.value.trim();

    if (!password) {
        (window.showAlert || alert)("Por favor, ingresa tu contraseña para confirmar.", "warning");
        return;
    }

    // Mostrar modal de confirmación
    showDeleteAccountModal();
}

async function confirmDeleteAccount() {
    if (!settingsState.userId) return;

    const passwordInput = document.getElementById('delete-confirm-password');
    const password = passwordInput?.value.trim();

    if (!password) {
        (window.showAlert || alert)("Por favor, ingresa tu contraseña para confirmar.", "warning");
        hideDeleteAccountModal();
        return;
    }

    const confirmBtn = document.getElementById('confirmDeleteAccountBtn');
    setButtonLoading(confirmBtn, true, 'Eliminando...');

    try {
        // TODO: Aquí se llamará al endpoint del backend cuando esté listo
        // await window.userApi.deleteUserAccount(settingsState.userId, password);
        
        (window.showAlert || alert)("Funcionalidad en desarrollo. El backend aún no está implementado.", "info");
        hideDeleteAccountModal();
        
        // Cuando el backend esté listo, descomentar esto:
        // (window.showAlert || alert)("Cuenta eliminada exitosamente.", "success");
        // localStorage.clear();
        // setTimeout(() => {
        //     window.location.href = '../login.html';
        // }, 2000);
    } catch (error) {
        console.error("Error al eliminar la cuenta:", error);
        const message = error.response?.data?.message || "No se pudo eliminar la cuenta. Intenta nuevamente.";
        (window.showAlert || alert)(message, "danger");
    } finally {
        setButtonLoading(confirmBtn, false, 'Sí, eliminar cuenta');
    }
}

function initializeDeleteAccountModal() {
    const confirmBtn = document.getElementById('confirmDeleteAccountBtn');
    const cancelBtn = document.getElementById('cancelDeleteAccountBtn');
    const modal = document.getElementById('deleteAccountModalOverlay');
    const deleteAccountBtn = document.getElementById('confirm-delete-btn');

    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', handleDeleteAccount);
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmDeleteAccount);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideDeleteAccountModal);
    }

    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideDeleteAccountModal();
            }
        });
    }
}

async function initializeSettingsPage() {
    const authToken = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');

    if (!authToken || !userId) {
        if (typeof window.showLoginRequiredModal === 'function') {
            window.showLoginRequiredModal();
        } else {
            window.location.href = '../login.html';
        }
        return;
    }

    settingsState.userId = userId;
    await loadSettingsSummary();
    initializeSidebarShortcuts();
    initializeDeleteAccountModal();

    const emailForm = document.getElementById('form-change-email');
    if (emailForm) {
        emailForm.addEventListener('submit', handleEmailSubmit);
    }

    const passwordForm = document.getElementById('form-change-password');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordSubmit);
    }
}

document.addEventListener('DOMContentLoaded', initializeSettingsPage);

