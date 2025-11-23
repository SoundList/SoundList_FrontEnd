// Ajustes Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario está logueado
    const authToken = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    
    if (!authToken || !userId) {
        showAlert('Debes iniciar sesión para acceder a los ajustes', 'danger');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }

    // Cargar datos del usuario
    loadUserData();

    // Navegación entre secciones
    document.querySelectorAll('.sidebar button[data-section]').forEach(button => {
        button.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section');
            showSection(sectionId);
        });
    });

    // Formulario de cambio de email
    const emailForm = document.getElementById('form-change-email');
    if (emailForm) {
        emailForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const newEmail = document.getElementById('new-email').value.trim();
            const confirmEmail = document.getElementById('confirm-email').value.trim();

            // Validaciones
            if (!newEmail || !confirmEmail) {
                showAlert('Por favor, completa ambos campos de email', 'danger');
                return;
            }

            if (!isValidEmail(newEmail)) {
                showAlert('Ingresa un email válido', 'danger');
                return;
            }

            if (newEmail !== confirmEmail) {
                showAlert('Los emails no coinciden', 'danger');
                return;
            }

            const currentEmail = document.getElementById('current-email').value.trim();
            if (newEmail === currentEmail) {
                showAlert('El nuevo email debe ser diferente al actual', 'danger');
                return;
            }

            const submitButton = emailForm.querySelector('button[type="submit"]');
            setButtonLoading(submitButton, true);
            showAlert('Cambiando email...', 'info');

            try {
                await updateUserEmail(userId, newEmail, confirmEmail);
                showAlert('¡Email actualizado exitosamente!', 'success');
                
                // Recargar datos del usuario
                setTimeout(() => {
                    loadUserData();
                    // Resetear formulario
                    document.getElementById('new-email').value = '';
                    document.getElementById('confirm-email').value = '';
                }, 1500);
            } catch (error) {
                showAlert(getErrorMessage(error), 'danger');
            } finally {
                setButtonLoading(submitButton, false);
            }
        });
    }
const backBtn = document.getElementById('btn-back-profile');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = 'index.html'; 
            }
        });
    }
    // Formulario de cambio de contraseña
    const passwordForm = document.getElementById('form-change-password');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const currentPassword = document.getElementById('current-password').value.trim();
            const newPassword = document.getElementById('new-password').value.trim();
            const confirmPassword = document.getElementById('confirm-password').value.trim();

            // Validaciones
            if (!currentPassword || !newPassword || !confirmPassword) {
                showAlert('Por favor, completa todos los campos', 'danger');
                return;
            }

            if (newPassword.length < 8) {
                showAlert('La contraseña debe tener al menos 8 caracteres', 'danger');
                return;
            }

            if (newPassword !== confirmPassword) {
                showAlert('Las contraseñas no coinciden', 'danger');
                return;
            }

            if (currentPassword === newPassword) {
                showAlert('La nueva contraseña debe ser diferente a la actual', 'danger');
                return;
            }

            const submitButton = passwordForm.querySelector('button[type="submit"]');
            setButtonLoading(submitButton, true);
            showAlert('Cambiando contraseña...', 'info');

            try {
                await updateUserPassword(userId, currentPassword, newPassword);
                showAlert('¡Contraseña actualizada exitosamente!', 'success');
                
                // Resetear formulario
                setTimeout(() => {
                    document.getElementById('current-password').value = '';
                    document.getElementById('new-password').value = '';
                    document.getElementById('confirm-password').value = '';
                }, 1500);
            } catch (error) {
                showAlert(getErrorMessage(error), 'danger');
            } finally {
                setButtonLoading(submitButton, false);
            }
        });
    }

    // Formulario de eliminar cuenta
    const deleteAccountForm = document.getElementById('form-delete-account');
    if (deleteAccountForm) {
        deleteAccountForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const confirmPassword = document.getElementById('delete-confirm-password').value.trim();
            const confirmCheckbox = document.getElementById('delete-confirm-checkbox').checked;

            // Validaciones
            if (!confirmPassword) {
                showAlert('Por favor, ingresa tu contraseña', 'danger');
                return;
            }

            if (!confirmCheckbox) {
                showAlert('Debes confirmar que entiendes que esta acción es permanente', 'danger');
                return;
            }

            // Confirmación adicional
            const userConfirm = confirm('¿Estás seguro de que deseas eliminar tu cuenta? Esta acción es permanente y no se puede deshacer.');
            if (!userConfirm) {
                return;
            }

            const submitButton = deleteAccountForm.querySelector('button[type="submit"]');
            setButtonLoading(submitButton, true);
            showAlert('Eliminando cuenta...', 'info');

            try {
                await window.userApi.deleteUserAccount(userId);
                showAlert('Tu cuenta ha sido eliminada exitosamente', 'success');
                
                // Limpiar localStorage y redirigir al login
                setTimeout(() => {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userId');
                    localStorage.removeItem('username');
                    window.location.href = 'login.html';
                }, 2000);
            } catch (error) {
                showAlert(getErrorMessage(error), 'danger');
            } finally {
                setButtonLoading(submitButton, false);
            }
        });
    }

    // Funciones auxiliares
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

    async function loadUserData() {
        try {
            const profile = await window.userApi.getUserProfile(userId);
            
            // Mostrar email actual
            const currentEmailInput = document.getElementById('current-email');
            if (currentEmailInput) {
                currentEmailInput.value = profile.email || profile.Email || '';
            }

            // Mostrar username
            const usernameDisplay = document.getElementById('settings-username');
            if (usernameDisplay) {
                usernameDisplay.textContent = profile.username || profile.Username || 'Cuenta';
            }

            // Mostrar avatar
            const avatarPreview = document.getElementById('avatar-preview');
            if (avatarPreview) {
                const defaultAvatar = '../../Assets/default-avatar.png';
                const avatarUrl = profile.imgProfile || profile.avatar || defaultAvatar;
                avatarPreview.src = avatarUrl;
            }
        } catch (error) {
            console.error('Error cargando datos del usuario:', error);
            showAlert('Error al cargar los datos del usuario', 'danger');
        }
    }


    async function updateUserEmail(userId, newEmail, confirmEmail) {
        const PORTS = [
            { url: 'http://localhost:5000', isGateway: true },
            { url: 'http://localhost:8003', isGateway: false }
        ];

        for (let i = 0; i < PORTS.length; i++) {
            const port = PORTS[i];
            const API_BASE_URL = port.url;
            
            try {
                const endpoint = port.isGateway 
                    ? `${API_BASE_URL}/api/gateway/users/email`
                    : `${API_BASE_URL}/api/User/email`;
                
                const payload = {
                    Id: userId,
                    NewEmail: newEmail,
                    EmailConfirm: confirmEmail
                };

                const token = localStorage.getItem('authToken');
                const headers = {
                    'Content-Type': 'application/json'
                };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                await axios.put(endpoint, payload, { headers });
                return; // Éxito
            } catch (error) {
                const isConnectionError = !error.response || 
                    error.code === 'ECONNREFUSED' || 
                    error.code === 'ERR_NETWORK' ||
                    error.code === 'ERR_FAILED' ||
                    error.message?.includes('Network Error');
                
                // También tratar 405 (Method Not Allowed) como error que requiere fallback
                const isMethodNotAllowed = error.response && error.response.status === 405;

                if ((isConnectionError || isMethodNotAllowed) && i < PORTS.length - 1) {
                    continue; // Intentar siguiente puerto
                }
                throw error;
            }
        }
    }

    async function updateUserPassword(userId, oldPassword, newPassword) {
        const PORTS = [
            { url: 'http://localhost:5000', isGateway: true },
            { url: 'http://localhost:8003', isGateway: false }
        ];

        for (let i = 0; i < PORTS.length; i++) {
            const port = PORTS[i];
            const API_BASE_URL = port.url;
            
            try {
                const endpoint = port.isGateway 
                    ? `${API_BASE_URL}/api/gateway/users/password`
                    : `${API_BASE_URL}/api/User/password`;
                
                const payload = {
                    Id: userId,
                    oldPassword: oldPassword,
                    newHashedPassword: newPassword
                };

                const token = localStorage.getItem('authToken');
                const headers = {
                    'Content-Type': 'application/json'
                };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                await axios.put(endpoint, payload, { headers });
                return; // Éxito
            } catch (error) {
                const isConnectionError = !error.response || 
                    error.code === 'ECONNREFUSED' || 
                    error.code === 'ERR_NETWORK' ||
                    error.code === 'ERR_FAILED' ||
                    error.message?.includes('Network Error');
                
                // También tratar 405 (Method Not Allowed) como error que requiere fallback
                const isMethodNotAllowed = error.response && error.response.status === 405;

                if ((isConnectionError || isMethodNotAllowed) && i < PORTS.length - 1) {
                    continue; // Intentar siguiente puerto
                }
                throw error;
            }
        }
    }


    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function getErrorMessage(error) {
        if (error.response && error.response.data) {
            const errorData = error.response.data;
            if (typeof errorData === 'string') {
                return sanitizeErrorMessage(errorData);
            } else if (errorData.message) {
                return sanitizeErrorMessage(errorData.message);
            } else if (errorData.error) {
                return sanitizeErrorMessage(errorData.error);
            }
        }
        return 'Ocurrió un error. Por favor, intenta nuevamente.';
    }

    function sanitizeErrorMessage(errorMessage) {
        if (!errorMessage || typeof errorMessage !== 'string') {
            return 'Ocurrió un error. Por favor, intenta nuevamente.';
        }

        if (errorMessage.length > 200 || 
            errorMessage.includes('System.') || 
            errorMessage.includes('Exception') ||
            errorMessage.includes('Stack Trace') ||
            errorMessage.includes('at ') ||
            errorMessage.includes('Npgsql') ||
            errorMessage.includes('SocketException') ||
            errorMessage.includes('InvalidOperationException')) {
            return 'Error del servidor. Por favor, intenta nuevamente más tarde.';
        }

        if (errorMessage.includes('Failed to connect') || 
            errorMessage.includes('database') ||
            errorMessage.includes('connection')) {
            return 'Error de conexión con el servidor. Por favor, intenta nuevamente.';
        }

        return errorMessage;
    }

    function showAlert(message, type) {
        const existingAlerts = document.querySelectorAll('.custom-alert');
        existingAlerts.forEach(alert => alert.remove());

        const alertDiv = document.createElement('div');
        alertDiv.className = `custom-alert custom-alert-${type}`;
        alertDiv.innerHTML = `
            <div class="alert-content">
                <i class="alert-icon"></i>
                <span class="alert-message">${message}</span>
                <button type="button" class="alert-close">&times;</button>
            </div>
        `;

        const form = document.querySelector('.settings-content');
        if (form) {
            form.insertBefore(alertDiv, form.firstChild);
        } else {
            document.body.insertBefore(alertDiv, document.body.firstChild);
        }

        const closeBtn = alertDiv.querySelector('.alert-close');
        closeBtn.addEventListener('click', () => { alertDiv.remove(); });

        setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 6000);
    }

    function setButtonLoading(button, isLoading) {
        if (!button) return;
        
        if (isLoading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Cargando...';
        } else {
            button.disabled = false;
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
            }
        }
    }
});

