// Login Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
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

        // --- 💡 INICIO DE LA SIMULACIÓN (MOCK) ---
        // Si usas "mock" / "mock", te loguea como el Dueño (ID 1)
        if (username === "mock" && password === "mock") {
            console.warn("--- MODO DE PRUEBA (MOCK) ACTIVADO ---");
            
            // Simula una respuesta exitosa
            setTimeout(() => {
                showAlert('¡Inicio de sesión SIMULADO exitoso!', 'success');
                
                // Guarda los datos de prueba del "dueño" (para TuUsuarioDePrueba)
                localStorage.setItem('authToken', 'mock_token_123456789');
                localStorage.setItem('userId', '1'); // 💡 ID del dueño (coincide con los mocks)
                localStorage.setItem('username', 'TuUsuarioDePrueba');
                localStorage.setItem('userAvatar', '../../Assets/default-avatar.png');

                setButtonLoading(submitButton, false);
                
                // Redirige a la página de perfil
                // (Asumiendo que login.html está en /HTML/ y profile.html está en /HTML/Pages/)
                window.location.href = './Pages/profile.html'; 
            }, 1000); // Simula 1 segundo de carga

        } else {
            // --- INICIO DEL CÓDIGO ORIGINAL (API REAL) ---
            // (Si no es "mock", intenta conectar con el backend real)
            const API_BASE_URL = 'https://localhost:32769';
            axios.post(`${API_BASE_URL}/api/User/Login`, {
                Usuario: username,
                Password: password
            })
            .then(response => {
                const token = response.data.token || response.data.Token;
                const userId = response.data.userId || response.data.UserId;
                const usernameResp = response.data.username || response.data.Username;
                // 💡 ¡AÑADIDO! Guarda el avatar si la API lo envía
                const avatarResp = response.data.avatar || response.data.Avatar;


                if (token) localStorage.setItem('authToken', token);
                if (userId) localStorage.setItem('userId', userId);
                if (usernameResp) localStorage.setItem('username', usernameResp);
                if (avatarResp) localStorage.setItem('userAvatar', avatarResp); // 💡 Añadido

                showAlert('¡Inicio de sesión exitoso!', 'success');
                
                // 💡 Redirección corregida
                window.location.href = './Pages/profile.html';
            })
            .catch(error => {
                const message = (error.response && error.response.data && (error.response.data.message || error.response.data.error))
                    ? error.response.data.message || error.response.data.error
                    : 'Usuario o contraseña inválidos';
                showAlert(message, 'danger');
            })
            .finally(() => {
                setButtonLoading(submitButton, false);
            });
            // --- FIN DEL CÓDIGO ORIGINAL (API REAL) ---
        }
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