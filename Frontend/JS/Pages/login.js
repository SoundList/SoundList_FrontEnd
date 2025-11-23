// Login Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si ya hay una sesión activa (token guardado)
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
        // Si ya hay token, redirigir a home
        window.location.href = 'home.html';
        return;
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
        
        // Usar el gateway directamente
        const GATEWAY_BASE_URL = 'http://localhost:5000';
        const loginEndpoint = `${GATEWAY_BASE_URL}/api/gateway/users/login`;
        
        axios.post(loginEndpoint, {
            Usuario: username,
            Password: password
        })
        .then(response => {
            const token = response.data.token || response.data.Token;
            const userId = response.data.userId || response.data.UserId;
            const usernameResp = response.data.username || response.data.Username;

            if (token) localStorage.setItem('authToken', token);
            if (userId) localStorage.setItem('userId', userId);
            if (usernameResp) localStorage.setItem('username', usernameResp);

            showAlert('¡Inicio de sesión exitoso!', 'success');
            setButtonLoading(submitButton, false);
            // Redirigir a home después de un breve delay para que se vea el mensaje
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1000);
        })
        .catch(error => {
            // Manejar errores
            let message = 'Usuario o contraseña inválidos';
            
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;
                
                // Detectar error 500 con problema de base de datos
                if (status === 500) {
                    let errorText = '';
                    if (typeof errorData === 'string') {
                        errorText = errorData;
                    } else if (errorData.message) {
                        errorText = errorData.message;
                    } else if (errorData.title) {
                        errorText = errorData.title;
                    } else if (errorData.error) {
                        errorText = errorData.error;
                    }
                    
                    // Detectar específicamente el error de PasswordResetToken
                    if (errorText.includes('PasswordResetToken') || 
                        errorText.includes('does not exist') || 
                        errorText.includes('column')) {
                        message = 'Error de configuración de base de datos: Falta la columna PasswordResetToken. El backend necesita aplicar una migración de Entity Framework. Contacta al administrador del backend.';
                    } else {
                        message = 'Error del servidor (500). Por favor, intenta nuevamente o contacta al administrador.';
                    }
                } else if (error.response.data) {
                    if (typeof errorData === 'string') {
                        message = sanitizeErrorMessage(errorData);
                    } else if (errorData.message) {
                        message = sanitizeErrorMessage(errorData.message);
                    } else if (errorData.error) {
                        message = sanitizeErrorMessage(errorData.error);
                    }
                }
            } else {
                message = 'No se pudo conectar al servidor. Por favor, verifica que el gateway esté corriendo.';
            }
            
            showAlert(message, 'danger');
            setButtonLoading(submitButton, false);
        });
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

    // Función para limpiar errores técnicos y mostrar mensajes amigables
    function sanitizeErrorMessage(errorMessage) {
        if (!errorMessage || typeof errorMessage !== 'string') {
            return 'Ocurrió un error. Por favor, intenta nuevamente.';
        }

        // Si el mensaje es muy largo o contiene stack traces, reemplazarlo
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

        // Si es un mensaje de base de datos, mostrar mensaje genérico
        if (errorMessage.includes('Failed to connect') || 
            errorMessage.includes('database') ||
            errorMessage.includes('connection')) {
            return 'Error de conexión con el servidor. Por favor, intenta nuevamente.';
        }

        // Devolver el mensaje original si es corto y legible
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
