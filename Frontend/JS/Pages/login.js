// Login Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Form submission handler
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        // Basic validation
        if (!email || !password) {
            if (!email) showFieldError(emailInput, 'Este campo es requerido');
            if (!password) showFieldError(passwordInput, 'Este campo es requerido');
            return;
        }

        if (!isValidEmail(email)) {
            showFieldError(emailInput, 'Ingresa un email válido');
            return;
        }

        // Simulate login process
        showAlert('Iniciando sesión...', 'info');
        
        // Here you would typically make an API call to your backend
        // For now, we'll simulate a successful login
        setTimeout(() => {
            showAlert('¡Inicio de sesión exitoso!', 'success');
            // Redirect to main page or dashboard
            // window.location.href = 'dashboard.html';
        }, 1500);
    });

    // Alternative login methods
    const googleButton = document.querySelector('.btn-alternative');

    googleButton.addEventListener('click', function() {
        showAlert('Funcionalidad de login con Google en desarrollo', 'info');
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
        const form = document.querySelector('.login-form');
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
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Cargando...';
        } else {
            button.disabled = false;
            button.innerHTML = 'Continuar';
        }
    }
});
