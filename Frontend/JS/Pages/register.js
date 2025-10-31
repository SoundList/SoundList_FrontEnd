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

        // Basic validation
        if (!username || !email || !password) {
            if (!username) showFieldError(usernameInput, 'Este campo es requerido');
            if (!email) showFieldError(emailInput, 'Este campo es requerido');
            if (!password) showFieldError(passwordInput, 'Este campo es requerido');
            return;
        }

        if (!isValidUsername(username)) {
            showFieldError(usernameInput, 'El nombre de usuario debe tener entre 3 y 20 caracteres y solo puede contener letras, números y guiones');
            return;
        }

        if (!isValidEmail(email)) {
            showFieldError(emailInput, 'Ingresa un email válido');
            return;
        }

        if (password.length < 8) {
            showFieldError(passwordInput, 'La contraseña debe tener al menos 8 caracteres');
            return;
        }

        const submitButton = registerForm.querySelector('button[type="submit"]');
        setButtonLoading(submitButton, true);
        showAlert('Creando cuenta...', 'info');

        const API_BASE_URL = 'https://localhost:32771';
        axios.post(`${API_BASE_URL}/api/User`, {
            username: username,
            email: email,
            password: password
        })
        .then(response => {
            showAlert('¡Cuenta creada! Te enviamos un mail con el token de verificación. Revisa tu bandeja o spam.', 'info');
            setTimeout(() => {
                window.location.href = 'verify.html';
            }, 1500);
        })
        .catch(error => {
            const message = (error.response && error.response.data && (error.response.data.message || error.response.data.error))
                ? error.response.data.message || error.response.data.error
                : 'No se pudo crear la cuenta';
            showAlert(message, 'danger');
        })
        .finally(() => {
            setButtonLoading(submitButton, false);
        });
    });

    // Alternative registration method
    const googleButton = document.querySelector('.btn-alternative');

    googleButton.addEventListener('click', function() {
        showAlert('Funcionalidad de registro con Google en desarrollo', 'info');
    });

    // Username validation function
    function isValidUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
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
