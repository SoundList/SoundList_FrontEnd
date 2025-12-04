import { API_BASE_URL } from "../APIs/configApi.js";

// Register Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Form submission handler
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        let isValidForm = true;
    if (typeof clearAllErrors === 'function') { 
        clearAllErrors();
    } else {
        clearFieldError(usernameInput);
        clearFieldError(emailInput);
        clearFieldError(passwordInput);
    }
    
    //Validación de Username
    if (!username) {
        showFieldError(usernameInput, 'Este campo es requerido');
        isValidForm = false;
    } else if (!isValidUsername(username)) {
        showFieldError(usernameInput, 'El nombre de usuario debe tener entre 4 y 20 caracteres y solo puede contener letras, números y guiones');
        isValidForm = false;
    }
    // Validación de Email
    if (!email) {
        showFieldError(emailInput, 'Este campo es requerido');
        isValidForm = false;
    } else if (!isValidEmail(email)) {
        showFieldError(emailInput, 'Ingresa un email válido');
        isValidForm = false;
    }
    // 3. Validación de Password
    if (!password) {
        showFieldError(passwordInput, 'Este campo es requerido');
        isValidForm = false;
    } else if (password.length < 8) {
        showFieldError(passwordInput, 'La contraseña debe tener al menos 8 caracteres');
        isValidForm = false;
    }
    if (!isValidForm) {
        return; 
    }

        const submitButton = registerForm.querySelector('button[type="submit"]');
        setButtonLoading(submitButton, true);
        showAlert('Creando cuenta...', 'info');
        
        // Usar el gateway directamente
        const GATEWAY_BASE_URL = API_BASE_URL;
        const registerEndpoint = `${GATEWAY_BASE_URL}/api/gateway/users/register`;
        
        axios.post(registerEndpoint, {
            Username: username,
            Email: email,
            Password: password
        })
        .then(response => {
            showAlert('¡Cuenta creada! Se te envió un código de verificación a tu correo electrónico. Revisa tu bandeja o spam.', 'info');
            setButtonLoading(submitButton, false);
            setTimeout(() => {
                window.location.href = 'verify.html';
            }, 2000);
        })
        .catch(error => {
            // Manejar errores
            let message = 'Error al crear la cuenta. Por favor, intenta nuevamente.';
            
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;
                
                // Error 500 - Internal Server Error
                if (status === 500) {
                    message = 'Error del servidor (500). Posibles causas: problema con el servicio de email, base de datos o configuración. Revisa los logs del backend.';
                    
                    // Intentar extraer el mensaje de error del servidor
                    if (errorData) {
                        if (typeof errorData === 'string') {
                            message = `Error del servidor: ${sanitizeErrorMessage(errorData)}`;
                        } else if (errorData.message) {
                            message = `Error del servidor: ${sanitizeErrorMessage(errorData.message)}`;
                        } else if (errorData.title) {
                            message = `Error del servidor: ${errorData.title}`;
                        } else if (errorData.error) {
                            message = `Error del servidor: ${sanitizeErrorMessage(errorData.error)}`;
                        }
                    }
                }
                // Error 400 - Bad Request (validación)
                else if (status === 400) {
                    if (typeof errorData === 'string') {
                        message = sanitizeErrorMessage(errorData);
                    } else if (errorData.message) {
                        message = sanitizeErrorMessage(errorData.message);
                    } else if (errorData.errors) {
                        // FluentValidation devuelve errores en formato { errors: { campo: [mensajes] } }
                        const errors = errorData.errors;
                        const errorMessages = Object.keys(errors).map(key => 
                            `${key}: ${errors[key].join(', ')}`
                        ).join(' | ');
                        message = errorMessages;
                    } else if (errorData.error) {
                        message = sanitizeErrorMessage(errorData.error);
                    }
                }
                // Otros errores
                else {
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
            
            // Log detallado del error para debugging
            console.error('Error completo del registro:', error);
            console.error('Status:', error.response?.status);
            console.error('Status Text:', error.response?.statusText);
            console.error('Response Data:', error.response?.data);
            console.error('Response Headers:', error.response?.headers);
            
            showAlert(message, 'danger');
            setButtonLoading(submitButton, false);
        });
    });

    // Username validation function
    function isValidUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9_-]{4,20}$/;
        return usernameRegex.test(username);
    }

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

    // Password strength indicator
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const strength = getPasswordStrength(password);
        updatePasswordStrengthIndicator(strength);
    });

    function getPasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        return strength;
    }

    function updatePasswordStrengthIndicator(strength) {
        // Remove existing indicator
        const existingIndicator = document.querySelector('.password-strength');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        if (passwordInput.value.length === 0) return;

        const indicator = document.createElement('div');
        indicator.className = 'password-strength mt-2';
        
        const strengthText = ['Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'];
        const strengthColors = ['#dc3545', '#fd7e14', '#ffc107', '#20c997', '#198754'];
        
        indicator.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="strength-bar me-2">
                    <div class="strength-fill" style="width: ${(strength / 5) * 100}%; background-color: ${strengthColors[strength - 1] || '#6c757d'};"></div>
                </div>
                <small class="strength-text" style="color: ${strengthColors[strength - 1] || '#6c757d'};">${strengthText[strength - 1] || 'Muy débil'}</small>
            </div>
        `;

        passwordInput.parentElement.appendChild(indicator);
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

    // Show alert function
    function showAlert(message, type) {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.custom-alert');
        existingAlerts.forEach(alert => alert.remove());

        // Create new alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `custom-alert custom-alert-${type}`;
        alertDiv.innerHTML = `
            <div class="alert-content">
                <i class="alert-icon"></i>
                <span class="alert-message">${message}</span>
                <button type="button" class="alert-close">&times;</button>
            </div>
        `;

        // Insert alert at the top of the form
        const form = document.querySelector('.register-form');
        form.insertBefore(alertDiv, form.firstChild);

        // Close button functionality
        const closeBtn = alertDiv.querySelector('.alert-close');
        closeBtn.addEventListener('click', () => {
            alertDiv.remove();
        });

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    // Add focus effects to form inputs
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

        // Clear errors when user starts typing
        input.addEventListener('input', function() {
            clearFieldError(this);
        });
    });

    // Add loading state to buttons
    function setButtonLoading(button, loading = true) {
        if (loading) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creando cuenta...';
        } else {
            button.disabled = false;
            button.innerHTML = 'Continuar';
        }
    }

});

// Add CSS for password strength indicator
const style = document.createElement('style');
style.textContent = `
    .password-strength {
        margin-top: 0.5rem;
    }
    
    .strength-bar {
        width: 100px;
        height: 4px;
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        overflow: hidden;
    }
    
    .strength-fill {
        height: 100%;
        transition: all 0.3s ease;
        border-radius: 2px;
    }
    
    .strength-text {
        font-size: 0.75rem;
        font-weight: 500;
    }
`;
document.head.appendChild(style);
