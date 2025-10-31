document.addEventListener('DOMContentLoaded', function() {
    const verifyForm = document.getElementById('verifyForm');
    const tokenInput = document.getElementById('token');

    const API_BASE_URL = 'https://localhost:32771';

    // Si viene ?token= en la URL, lo colocamos y disparamos verificación automática
    const params = new URLSearchParams(window.location.search);
    const tokenFromQuery = params.get('token');
    if (tokenFromQuery) {
        tokenInput.value = tokenFromQuery;
        verifyToken(tokenFromQuery);
    }

    verifyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        let token = tokenInput.value.trim();
        if (!token) {
            showAlert('El token es requerido', 'danger');
            return;
        }
        verifyToken(token);
    });

    function verifyToken(token) {
        showAlert('Verificando token...', 'info');
        axios.get(`${API_BASE_URL}/api/User/VerifyEmail`, { params: { token } })
            .then(() => {
                showAlert('¡Cuenta verificada! Redirigiendo al inicio de sesión...', 'success');
                setTimeout(() => { window.location.href = 'login.html'; }, 1500);
            })
            .catch((error) => {
                const message = (error.response && error.response.data)
                    ? (typeof error.response.data === 'string' ? error.response.data : (error.response.data.message || error.response.data.error || 'Token inválido'))
                    : 'Token inválido';
                showAlert(message, 'danger');
            });
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


