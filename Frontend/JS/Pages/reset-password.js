// Reset Password Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    // Obtener el token de la URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
        showAlert('Token de restablecimiento no válido. Por favor, solicita un nuevo enlace.', 'danger');
        resetPasswordForm.style.display = 'none';
        setTimeout(() => {
            window.location.href = 'forgot-password.html';
        }, 3000);
        return;
    }

    resetPasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        // Validaciones
        if (!newPassword || !confirmPassword) {
            if (!newPassword) showFieldError(newPasswordInput, 'La nueva contraseña es requerida');
            if (!confirmPassword) showFieldError(confirmPasswordInput, 'La confirmación de contraseña es requerida');
            return;
        }

        if (newPassword.length < 8) {
            showFieldError(newPasswordInput, 'La contraseña debe tener al menos 8 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            showFieldError(confirmPasswordInput, 'Las contraseñas no coinciden');
            return;
        }

        const submitButton = resetPasswordForm.querySelector('button[type="submit"]');
        setButtonLoading(submitButton, true);
        showAlert('Restableciendo contraseña...', 'info');
        
        // Usar el gateway directamente
        const GATEWAY_BASE_URL = 'http://localhost:5000';
        const resetPasswordEndpoint = `${GATEWAY_BASE_URL}/api/gateway/users/reset-password`;
        
        axios.post(resetPasswordEndpoint, {
            Token: token,
            NewPassword: newPassword,
            ConfirmPassword: confirmPassword
        })
        .then(response => {
            showAlert('¡La contraseña ha sido restablecida con éxito! Redirigiendo al inicio de sesión...', 'success');
            setButtonLoading(submitButton, false);
            
            // Redirigir al login después de 2 segundos
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        })
        .catch(error => {
            // Manejar errores
            let message = 'No se pudo restablecer la contraseña';
            
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
    const formInputs = [newPasswordInput, confirmPasswordInput];
    formInputs.forEach(input => {
        input.addEventListener('input', function() {
            clearFieldError(this);
            
            // Validar que las contraseñas coincidan en tiempo real
            if (this.id === 'confirmPassword' && newPasswordInput.value && this.value) {
                if (newPasswordInput.value !== this.value) {
                    showFieldError(this, 'Las contraseñas no coinciden');
                } else {
                    clearFieldError(this);
                }
            }
        });
    });

    function setButtonLoading(button, loading = true) {
        if (loading) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Restableciendo...';
        } else {
            button.disabled = false;
            button.innerHTML = 'Restablecer contraseña';
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

