// ===============================================
// ⚙️ JS/login.js (CORREGIDO)
// ===============================================
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
        
        // Intentar primero el backend directo, luego el gateway como fallback
        const PORTS = [
            { url: 'http://localhost:8003', isGateway: false },
            { url: 'http://localhost:5000', isGateway: true }
        ];
        attemptLoginWithPorts(username, password, PORTS, 0, submitButton);
    });

    const googleButton = document.querySelector('.btn-alternative');
    googleButton.addEventListener('click', function() {
        showAlert('Funcionalidad de login con Google en desarrollo', 'info');
    });

    // TEMPORAL: Botón para simular login sin backend (solo para desarrollo)
    // Esto permite ver la vista de inicio cuando el backend no funciona
    function addDevLoginButton() {
        const form = document.querySelector('.login-form');
        if (!form) return;

        const devButton = document.createElement('button');
        devButton.type = 'button';
        devButton.className = 'btn btn-secondary mt-3';
        devButton.style.cssText = 'width: 100%; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.3); color: rgba(255, 255, 255, 0.7);';
        devButton.innerHTML = '🔧 Modo Desarrollo: Simular Login (sin backend)';
        devButton.addEventListener('click', function() {
            // Simular datos de login (usando formato GUID para userId)
            // Generar un GUID simulado
            function generateGuid() {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    const r = Math.random() * 16 | 0;
                    const v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }
            
            localStorage.setItem('authToken', 'dev-token-' + Date.now());
            localStorage.setItem('userId', generateGuid()); // GUID válido para simulación
            localStorage.setItem('username', 'Usuario Demo');
            
            showAlert('¡Login simulado exitoso! Redirigiendo...', 'success');
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1000);
        });
        
        form.appendChild(devButton);
    }
    
    // Agregar botón de desarrollo
    addDevLoginButton();

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

    function attemptLoginWithPorts(username, password, ports, portIndex, submitButton) {
        if (portIndex >= ports.length) {
            // Todos los puertos fallaron
            showAlert('No se pudo conectar al servidor. Por favor, verifica que el gateway o el backend estén corriendo.', 'danger');
            setButtonLoading(submitButton, false);
            return;
        }

        const currentPort = ports[portIndex];
        const API_BASE_URL = currentPort.url;
        
        // Construir la ruta según si es gateway o no
        const loginEndpoint = currentPort.isGateway 
            ? `${API_BASE_URL}/api/gateway/users/login`
            : `${API_BASE_URL}/api/User/Login`;
        
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
            // Si es un error de conexión y hay más puertos para intentar, probar el siguiente
            const isConnectionError = !error.response || 
                error.code === 'ECONNREFUSED' || 
                error.code === 'ERR_NETWORK' ||
                error.code === 'ERR_FAILED' ||
                error.message?.includes('Network Error') ||
                error.message?.includes('Failed to fetch') ||
                error.message?.includes('ERR_CONNECTION_CLOSED') ||
                error.message?.includes('CORS');

            if (isConnectionError && portIndex < ports.length - 1) {
                // Intentar con el siguiente puerto
                attemptLoginWithPorts(username, password, ports, portIndex + 1, submitButton);
            } else {
                // Si es un error de autenticación o no hay más puertos, mostrar el error
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
                } else if (!error.response && portIndex >= ports.length - 1) {
                    message = 'No se pudo conectar al servidor. Por favor, verifica que el gateway o el backend estén corriendo.';
                }
                
                showAlert(message, 'danger');
                setButtonLoading(submitButton, false);
            }
        });
    }
});
