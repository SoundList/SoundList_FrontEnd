import { API_BASE_URL } from "../APIs/configApi.js";
document.addEventListener('DOMContentLoaded', function() {
    const verifyForm = document.getElementById('verifyForm');
    const tokenInput = document.getElementById('token');

    // Solo permitir números en el input
    tokenInput.addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

    verifyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        let code = tokenInput.value.trim();
        
        if (!code) {
            showAlert('El código es requerido', 'danger');
            return;
        }

        // Validar que sea un código de 6 dígitos
        if (!/^\d{6}$/.test(code)) {
            showAlert('El código debe tener exactamente 6 dígitos', 'danger');
            return;
        }

        // Usar el gateway directamente
        const GATEWAY_BASE_URL = API_BASE_URL;
        const verifyEmailEndpoint = `${GATEWAY_BASE_URL}/api/gateway/users/verify-email`;
        
        axios.get(verifyEmailEndpoint, { params: { token: code } })
            .then(() => {
                showAlert('¡Cuenta verificada! Redirigiendo al inicio de sesión...', 'success');
                setTimeout(() => { window.location.href = 'login.html'; }, 1500);
            })
            .catch((error) => {
                // Manejar errores
                let message = 'Código inválido';
                
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
            });
    });


    

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
        closeBtn.addEventListener('click', () => { alertDiv.remove(); });

        setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 6000);
    }
});


