import { API_BASE_URL } from "../APIs/configApi.js";
// Forgot Password Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const emailInput = document.getElementById('email');

    forgotPasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();

        if (!email) {
            showFieldError(emailInput, 'El correo electrónico es requerido');
            return;
        }

        if (!isValidEmail(email)) {
            showFieldError(emailInput, 'Ingresa un correo electrónico válido');
            return;
        }

        const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');
        setButtonLoading(submitButton, true);
        showAlert('Enviando enlace de recuperación...', 'info');
        
        // Usar el gateway directamente
        const GATEWAY_BASE_URL = API_BASE_URL;
        const forgotPasswordEndpoint = `${GATEWAY_BASE_URL}/api/gateway/users/forgot-password`;
        
        axios.post(forgotPasswordEndpoint, {
            Email: email
        })
        .then(response => {
            showAlert('Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.', 'success');
            setButtonLoading(submitButton, false);
            
            // Limpiar el formulario
            emailInput.value = '';
            
            // Opcional: redirigir después de unos segundos
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 5000);
        })
        .catch(error => {
            // Manejar errores
            let message = 'No se pudo enviar el enlace de recuperación';
            
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                if (typeof errorData === 'string') {
                    message = sanitizeErrorMessage(errorData);
                } else if (errorData.message) {
                    message = sanitizeErrorMessage(errorData.message);
                } else if (errorData.error) {
                    message = sanitizeErrorMessage(errorData.error);
                }
            } else if (!error.response) {
                message = 'No se pudo conectar al servidor. Por favor, verifica que el gateway esté corriendo.';
            }
            
            showAlert(message, 'danger');
            setButtonLoading(submitButton, false);
        });
    });

    // Email validation function
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Show field error function
    function showFieldError(field, message) {
        clearFieldError(field);
        field.classList.add('is-invalid');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        
        field.parentElement.appendChild(errorDiv);
    }

    // Clear field error function
    function clearFieldError(field) {
        field.classList.remove('is-invalid');
        const existingError = field.parentElement.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    // Clear errors when user starts typing
    emailInput.addEventListener('input', function() {
        clearFieldError(this);
    });

    function setButtonLoading(button, loading = true) {
        if (loading) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';
        } else {
            button.disabled = false;
            button.innerHTML = 'Enviar enlace de recuperación';
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
        }, 8000);
    }
});

