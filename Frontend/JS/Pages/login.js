// ===============================================
// ⚙️ JS/login.js (CORREGIDO)
// ===============================================
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si ya hay una sesión activa (token guardado)
    const authToken = localStorage.getItem('authToken');
    const loggedInUserId = localStorage.getItem('userId'); // 💡 LEER TAMBIÉN EL ID

    if (authToken && loggedInUserId) { // 💡 CORRECCIÓN AQUÍ (Asegurarse que ambos existan)
        // Si ya hay token Y ID, redirigir al perfil DE ESE ID
        window.location.href = `./Pages/profile.html?userId=${loggedInUserId}`; // 💡 CORRECCIÓN AQUÍ
        return;
    } else if (authToken && !loggedInUserId) {
        // Si hay token pero no ID (estado corrupto), limpiar
        localStorage.clear();
    }

    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            if (!username) showFieldError(usernameInput, 'Este campo es requerido');
            if (!password) showFieldError(passwordInput, 'Este campo es requerido');
            return;
        }

        const submitButton = loginForm.querySelector('button[type="submit"]');
        setButtonLoading(submitButton, true);
        showAlert('Iniciando sesión...', 'info');

        // --- 💡 INICIO DEL MODO DE PRUEBA (MOCK) ---
        if (username === "mock@user.com" && password === "password") {
            console.warn("--- MODO DE PRUEBA (MOCK) ACTIVADO ---");
            
            setTimeout(() => {
                showAlert('¡Inicio de sesión SIMULADO exitoso!', 'success');
                
                const mockUserId = '11111111-1111-1111-1111-111111111111';
                
                localStorage.setItem('authToken', 'mock-token-123456789');
                localStorage.setItem('userId', mockUserId); 
                localStorage.setItem('username', 'Usuario de Prueba');
                localStorage.setItem('userAvatar', 'https://placehold.co/150x150/EBF8FF/1A202C?text=Mock');

                setButtonLoading(submitButton, false);
                
                // Redirige a la página de perfil (AÑADIENDO EL ID)
                window.location.href = `./Pages/profile.html?userId=${mockUserId}`; // 💡 CORRECCIÓN AQUÍ
            }, 1000); 
            return; 
        }
        // --- FIN DEL MODO DE PRUEBA ---


        // --- INICIO DE LA CONEXIÓN REAL AL GATEWAY ---
        const API_BASE_URL = 'http://localhost:5000'; 
        const LOGIN_PATH = '/api/gateway/users/login';

        axios.post(`${API_BASE_URL}${LOGIN_PATH}`, {
            Usuario: username, 
            Password: password
        })
        .then(response => {
            const token = response.data.token || response.data.Token;
            const userId = response.data.userId || response.data.UserId;
            const usernameResp = response.data.username || response.data.Username;
            const avatarResp = response.data.avatar || response.data.Avatar || response.data.imgProfile;

            if (token) localStorage.setItem('authToken', token);
            if (userId) localStorage.setItem('userId', userId);
            if (usernameResp) localStorage.setItem('username', usernameResp);
            if (avatarResp) localStorage.setItem('userAvatar', avatarResp);

            showAlert('¡Inicio de sesión exitoso!', 'success');
            
            // Redirigir a la página de perfil (AÑADIENDO EL ID)
            if (userId) {
                window.location.href = `./Pages/profile.html?userId=${userId}`; // 💡 CORRECCIÓN AQUÍ
            } else {
                showAlert('Error: No se recibió un ID de usuario del servidor.', 'danger');
                setButtonLoading(submitButton, false);
            }
        })
        .catch(error => {
            let message = 'Usuario o contraseña inválidos';
            if (error.code === 'ERR_NETWORK' || !error.response) {
                message = 'No se pudo conectar al servidor. ¿Está el Gateway corriendo en el puerto 5000?';
            } else if (error.response && error.response.data) {
                message = error.response.data.message || error.response.data.error || message;
            }
            showAlert(message, 'danger');
        })
        .finally(() => {
            // Solo desactivar si no hubo redirección exitosa
            if (!window.location.href.includes('profile.html')) {
                 setButtonLoading(submitButton, false);
            }
        });
        // --- FIN DE LA CONEXIÓN REAL ---
    });

    const googleButton = document.querySelector('.btn-alternative');
    googleButton.addEventListener('click', function() {
        showAlert('Funcionalidad de login con Google en desarrollo', 'info');
    });

    function showFieldError(field, message) {
        clearFieldError(field);
        field.classList.add('is-invalid');

        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;

        field.parentElement.appendChild(errorDiv);
    }

    function clearFieldError(field) {
        field.classList.remove('is-invalid');
        const existingError = field.parentElement.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
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

        const form = document.querySelector('.login-form');
        form.insertBefore(alertDiv, form.firstChild);

        const closeBtn = alertDiv.querySelector('.alert-close');
        closeBtn.addEventListener('click', () => {
            alertDiv.remove();
        });

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    const formInputs = document.querySelectorAll('.form-control');
    formInputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });

        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.classList.remove('focused');
            }
        });

        input.addEventListener('input', function() {
            clearFieldError(this);
        });
    });

    function setButtonLoading(button, loading = true) {
        if (loading) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Cargando...';
        } else {
            button.disabled = false;
            button.innerHTML = 'Continuar';
        }
    }
});