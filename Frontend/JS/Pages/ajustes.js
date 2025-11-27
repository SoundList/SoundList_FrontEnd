import {API_BASE_URL} from './../APIs/configApi.js';
// Ajustes Page JavaScript

// Funciones auxiliares - Definir ANTES de DOMContentLoaded para que estén disponibles
function showSection(sectionId) {
    console.log('📂 showSection llamado con:', sectionId);
    
    if (!sectionId) {
        console.error('❌ showSection: sectionId es undefined o vacío');
        return;
    }
    
    // Ocultar todas las secciones
    const allSections = document.querySelectorAll('.setting-section');
    console.log('📋 Total de secciones encontradas:', allSections.length);
    allSections.forEach(section => {
        section.classList.add('hidden');
        section.style.display = 'none';
        console.log('👁️ Ocultando sección:', section.id);
    });

    // Mostrar la sección objetivo
    const targetSectionId = `section-${sectionId}`;
    const targetSection = document.getElementById(targetSectionId);
    console.log('🔍 Buscando sección:', targetSectionId, 'Encontrada:', !!targetSection);
    
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.style.display = 'block';
        console.log('✅ Sección mostrada:', sectionId);
    } else {
        console.error('❌ Sección no encontrada:', targetSectionId);
        // Listar todas las secciones disponibles para debugging
        const allSectionsList = document.querySelectorAll('.setting-section');
        console.log('📋 Secciones disponibles:', Array.from(allSectionsList).map(s => s.id));
    }

    // Actualizar botones activos del sidebar
    const allSidebarButtons = document.querySelectorAll('.sidebar button');
    console.log('📋 Total de botones en sidebar:', allSidebarButtons.length);
    allSidebarButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Buscar botón por data-section o por ID
    let activeButton = document.querySelector(`.sidebar button[data-section="${sectionId}"]`);
    console.log('🔍 Buscando botón con data-section:', sectionId, 'Encontrado:', !!activeButton);
    
    if (!activeButton) {
        // Fallback: buscar por ID específico
        if (sectionId === 'email') {
            activeButton = document.getElementById('btn-change-email');
        } else if (sectionId === 'password') {
            activeButton = document.getElementById('btn-change-password');
        } else if (sectionId === 'delete') {
            activeButton = document.getElementById('btn-delete-account');
        }
        console.log('🔍 Buscando botón por ID, encontrado:', !!activeButton);
    }
    
    if (activeButton) {
        activeButton.classList.add('active');
        console.log('✅ Botón activado:', sectionId, 'ID:', activeButton.id);
    } else {
        console.warn('⚠️ Botón del sidebar no encontrado para sección:', sectionId);
        // Listar todos los botones disponibles para debugging
        const allButtons = document.querySelectorAll('.sidebar button');
        console.log('📋 Botones disponibles:', Array.from(allButtons).map(b => ({ id: b.id, dataSection: b.getAttribute('data-section') })));
    }
}

// Hacer showSection disponible globalmente para debugging
window.showSection = showSection;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOMContentLoaded - Inicializando ajustes.js');
    
    // Verificar si el usuario está logueado
    const authToken = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    
    console.log('🔐 Verificando autenticación:', {
        hasToken: !!authToken,
        hasUserId: !!userId,
        userId: userId
    });
    
    if (!authToken || !userId) {
        showAlert('Debes iniciar sesión para acceder a los ajustes', 'danger');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }

    // Función auxiliar para cargar userApi
    async function ensureUserApi() {
        if (window.userApi && window.userApi.getUserProfile) {
            return window.userApi;
        }
        
        // Esperar un poco para que el script se cargue si es necesario
        let attempts = 0;
        while (attempts < 10 && (!window.userApi || !window.userApi.getUserProfile)) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.userApi && window.userApi.getUserProfile) {
            return window.userApi;
        }
        
        // Si aún no está disponible, intentar importarlo dinámicamente
        try {
            await import('../APIs/userApi.js');
            if (window.userApi && window.userApi.getUserProfile) {
                return window.userApi;
            }
        } catch (e) {
            console.warn("No se pudo importar userApi dinámicamente:", e);
        }
        
        throw new Error("userApi no está disponible");
    }

    // Función para inicializar navegación
    function initializeNavigation() {
        console.log('🔧 Inicializando navegación...');
        
        // Navegación entre secciones - Usar IDs específicos para mayor confiabilidad
        const emailBtn = document.getElementById('btn-change-email');
        const passwordBtn = document.getElementById('btn-change-password');
        const deleteBtn = document.getElementById('btn-delete-account');
        
        console.log('📋 Botones encontrados:', {
            email: !!emailBtn,
            password: !!passwordBtn,
            delete: !!deleteBtn
        });
        
        if (emailBtn) {
            emailBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔘 Botón Email clickeado');
                showSection('email');
            });
        } else {
            console.error('❌ Botón btn-change-email no encontrado');
        }
        
        if (passwordBtn) {
            passwordBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔘 Botón Password clickeado');
                showSection('password');
            });
        } else {
            console.error('❌ Botón btn-change-password no encontrado');
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔘 Botón Delete clickeado');
                showSection('delete');
            });
        } else {
            console.error('❌ Botón btn-delete-account no encontrado');
        }
        
        // También mantener el selector genérico como fallback
        const allButtons = document.querySelectorAll('.sidebar button[data-section]');
        console.log('📋 Total de botones con data-section:', allButtons.length);
        allButtons.forEach(button => {
            if (!button.id || (button.id !== 'btn-change-email' && button.id !== 'btn-change-password' && button.id !== 'btn-delete-account')) {
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const sectionId = this.getAttribute('data-section');
                    console.log('🔘 Botón clickeado (fallback), sección:', sectionId);
                    if (sectionId) {
                        showSection(sectionId);
                    } else {
                        console.warn('⚠️ Botón sin data-section:', this);
                    }
                });
            }
        });
        
        // Asegurar que la sección de email esté visible por defecto
        const emailSection = document.getElementById('section-email');
        if (emailSection) {
            emailSection.classList.remove('hidden');
            emailSection.style.display = 'block';
            console.log('✅ Sección email visible por defecto');
        } else {
            console.error('❌ Sección section-email no encontrada');
        }
    }
    
    // Inicializar navegación inmediatamente
    initializeNavigation();
    
    // Cargar datos del usuario (esperar a que userApi esté disponible)
    ensureUserApi().then(() => {
        console.log('✅ userApi disponible, cargando datos...');
        loadUserData();
    }).catch(error => {
        console.error('❌ Error cargando userApi:', error);
        showAlert('Error al inicializar. Por favor, recarga la página.', 'danger');
    });

    // Formulario de cambio de email
    const emailForm = document.getElementById('form-change-email');
    if (emailForm) {
        emailForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const newEmail = document.getElementById('new-email').value.trim();
            const confirmEmail = document.getElementById('confirm-email').value.trim();

            // Validaciones
            if (!newEmail || !confirmEmail) {
                showAlert('Por favor, completa ambos campos de email', 'danger');
                return;
            }

            if (!isValidEmail(newEmail)) {
                showAlert('Ingresa un email válido', 'danger');
                return;
            }

            if (newEmail !== confirmEmail) {
                showAlert('Los emails no coinciden', 'danger');
                return;
            }

            const currentEmail = document.getElementById('current-email').value.trim();
            if (newEmail === currentEmail) {
                showAlert('El nuevo email debe ser diferente al actual', 'danger');
                return;
            }

            const submitButton = emailForm.querySelector('button[type="submit"]');
            setButtonLoading(submitButton, true);
            showAlert('Cambiando email...', 'info');

            try {
                await updateUserEmail(userId, newEmail, confirmEmail);
                showAlert('¡Email actualizado exitosamente!', 'success');
                
                // Recargar datos del usuario
                setTimeout(() => {
                    loadUserData();
                    // Resetear formulario
                    document.getElementById('new-email').value = '';
                    document.getElementById('confirm-email').value = '';
                }, 1500);
            } catch (error) {
                showAlert(getErrorMessage(error), 'danger');
            } finally {
                setButtonLoading(submitButton, false);
            }
        });
    }
const backBtn = document.getElementById('btn-back-profile');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = 'index.html'; 
            }
        });
    }
    // Formulario de cambio de contraseña
    const passwordForm = document.getElementById('form-change-password');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const currentPassword = document.getElementById('current-password').value.trim();
            const newPassword = document.getElementById('new-password').value.trim();
            const confirmPassword = document.getElementById('confirm-password').value.trim();

            // Validaciones
            if (!currentPassword || !newPassword || !confirmPassword) {
                showAlert('Por favor, completa todos los campos', 'danger');
                return;
            }

            if (newPassword.length < 8) {
                showAlert('La contraseña debe tener al menos 8 caracteres', 'danger');
                return;
            }

            if (newPassword !== confirmPassword) {
                showAlert('Las contraseñas no coinciden', 'danger');
                return;
            }

            if (currentPassword === newPassword) {
                showAlert('La nueva contraseña debe ser diferente a la actual', 'danger');
                return;
            }

            const submitButton = passwordForm.querySelector('button[type="submit"]');
            setButtonLoading(submitButton, true);
            showAlert('Cambiando contraseña...', 'info');

            try {
                await updateUserPassword(userId, currentPassword, newPassword);
                showAlert('¡Contraseña actualizada exitosamente!', 'success');
                
                // Resetear formulario
                setTimeout(() => {
                    document.getElementById('current-password').value = '';
                    document.getElementById('new-password').value = '';
                    document.getElementById('confirm-password').value = '';
                }, 1500);
            } catch (error) {
                showAlert(getErrorMessage(error), 'danger');
            } finally {
                setButtonLoading(submitButton, false);
            }
        });
    }



function customConfirmAsync(message) {
    const modal = document.getElementById('custom-confirm-modal');
    const messageElement = document.getElementById('custom-confirm-message');
    const okButton = document.getElementById('custom-confirm-ok');
    const cancelButton = document.getElementById('custom-confirm-cancel');

    if (!modal || !messageElement || !okButton || !cancelButton) {
        console.error("Error: No se encontraron todos los elementos del modal de confirmación.");
        return Promise.resolve(window.confirm(message));
    }
    
    return new Promise((resolve) => {
        const windowClickHandler = function(event) {
            if (event.target == modal) {
                cleanUp(false);
            }
        };

        const cleanUp = (result) => {
            okButton.onclick = null;
            cancelButton.onclick = null;
            
            window.removeEventListener('click', windowClickHandler);

            modal.style.display = 'none';
            resolve(result);
        };

        messageElement.textContent = message; 

        modal.style.display = 'flex';         
        
        okButton.onclick = () => {
            cleanUp(true);
        };
        
        cancelButton.onclick = () => {
            cleanUp(false);
        };
        window.addEventListener('click', windowClickHandler);
    });
}

    // Formulario de eliminar cuenta
    const deleteAccountForm = document.getElementById('form-delete-account');
    if (deleteAccountForm) {
        deleteAccountForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const confirmPassword = document.getElementById('delete-confirm-password').value.trim();
            const confirmCheckbox = document.getElementById('delete-confirm-checkbox').checked;

            // Validaciones
            if (!confirmPassword) {
                showAlert('Por favor, ingresa tu contraseña', 'danger');
                return;
            }

            if (!confirmCheckbox) {
                showAlert('Debes confirmar que entiendes que esta acción es permanente', 'danger');
                return;
            }

            const confirmationMessage = '¿Estás seguro de que deseas eliminar tu cuenta? Esta acción es permanente y no se puede deshacer.';
            const userConfirm = await customConfirmAsync(confirmationMessage);
            if (!userConfirm) {
                return;
            }

            const submitButton = deleteAccountForm.querySelector('button[type="submit"]');
            setButtonLoading(submitButton, true);
            showAlert('Eliminando cuenta...', 'info');

            try {
                await window.userApi.deleteUserAccount(userId);
                showAlert('Tu cuenta ha sido eliminada exitosamente', 'success');
                
                // Limpiar localStorage y redirigir al login
                setTimeout(() => {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userId');
                    localStorage.removeItem('username');
                    window.location.href = '../login.html';
                }, 2000);
            } catch (error) {
                showAlert(getErrorMessage(error), 'danger');
            } finally {
                setButtonLoading(submitButton, false);
            }
        });
    }


    async function loadUserData() {
        console.log('📥 Iniciando carga de datos del usuario...');
        try {
            // Asegurar que userApi esté disponible
            const userApi = await ensureUserApi();
            console.log('✅ userApi obtenido, llamando getUserProfile...');
            const profile = await userApi.getUserProfile(userId);
            
            console.log('📋 Perfil cargado completo:', profile);
            console.log('📋 Campos disponibles:', Object.keys(profile));
            
            // Mostrar email actual - buscar en múltiples campos posibles
            const currentEmailInput = document.getElementById('current-email');
            console.log('📧 Campo current-email encontrado:', !!currentEmailInput);
            
            if (currentEmailInput) {
                const email = profile.Email || profile.email || profile.emailAddress || profile.EmailAddress || '';
                console.log('📧 Email encontrado en perfil:', email || 'NO ENCONTRADO');
                console.log('📧 Valores probados:', {
                    Email: profile.Email,
                    email: profile.email,
                    emailAddress: profile.emailAddress,
                    EmailAddress: profile.EmailAddress
                });
                
                if (email) {
                    currentEmailInput.value = email;
                    console.log('✅ Email establecido en campo:', email);
                    // Guardar email en localStorage para futuras referencias
                    localStorage.setItem('userEmail', email);
                } else {
                    // Si no hay email, intentar cargarlo de localStorage como fallback
                    const storedEmail = localStorage.getItem('userEmail');
                    if (storedEmail) {
                        currentEmailInput.value = storedEmail;
                        console.log('📧 Email cargado desde localStorage:', storedEmail);
                    } else {
                        console.warn('⚠️ No se encontró email ni en perfil ni en localStorage');
                        currentEmailInput.placeholder = 'Email no disponible';
                    }
                }
            } else {
                console.error('❌ Campo current-email no encontrado en el DOM');
            }

            // Mostrar username
            const usernameDisplay = document.getElementById('settings-username');
            if (usernameDisplay) {
                const username = profile.Username || profile.username || 'Cuenta';
                usernameDisplay.textContent = username;
                console.log('✅ Username establecido:', username);
            } else {
                console.warn('⚠️ Campo settings-username no encontrado');
            }

            // Mostrar avatar
            const avatarPreview = document.getElementById('avatar-preview');
            if (avatarPreview) {
                const defaultAvatar = '../../Assets/default-avatar.png';
                const avatarUrl = profile.imgProfile || profile.avatar || defaultAvatar;
                avatarPreview.src = avatarUrl;
                console.log('✅ Avatar establecido:', avatarUrl);
            } else {
                console.warn('⚠️ Campo avatar-preview no encontrado');
            }
        } catch (error) {
            console.error('❌ Error cargando datos del usuario:', error);
            console.error('❌ Detalles del error:', {
                message: error.message,
                response: error.response,
                stack: error.stack
            });
            showAlert('Error al cargar los datos del usuario', 'danger');
            
            // Intentar cargar email desde localStorage si hay error
            const currentEmailInput = document.getElementById('current-email');
            if (currentEmailInput) {
                const storedEmail = localStorage.getItem('userEmail');
                if (storedEmail) {
                    currentEmailInput.value = storedEmail;
                    console.log('📧 Email cargado desde localStorage (fallback):', storedEmail);
                }
            }
        }
    }


    async function updateUserEmail(userId, newEmail, confirmEmail) {
        const PORTS = [
            { url: API_BASE_URL, isGateway: true },
            { url: 'http://localhost:8003', isGateway: false }
        ];

        for (let i = 0; i < PORTS.length; i++) {
            const port = PORTS[i];
            const API_BASE_URL = port.url;
            
            try {
                const endpoint = port.isGateway 
                    ? `${API_BASE_URL}/api/gateway/users/email`
                    : `${API_BASE_URL}/api/User/email`;
                
                const payload = {
                    Id: userId,
                    NewEmail: newEmail,
                    EmailConfirm: confirmEmail
                };

                const token = localStorage.getItem('authToken');
                const headers = {
                    'Content-Type': 'application/json'
                };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                await axios.put(endpoint, payload, { headers });
                return; // Éxito
            } catch (error) {
                const isConnectionError = !error.response || 
                    error.code === 'ECONNREFUSED' || 
                    error.code === 'ERR_NETWORK' ||
                    error.code === 'ERR_FAILED' ||
                    error.message?.includes('Network Error');
                
                // También tratar 405 (Method Not Allowed) como error que requiere fallback
                const isMethodNotAllowed = error.response && error.response.status === 405;

                if ((isConnectionError || isMethodNotAllowed) && i < PORTS.length - 1) {
                    continue; // Intentar siguiente puerto
                }
                throw error;
            }
        }
    }

    async function updateUserPassword(userId, oldPassword, newPassword) {
        const PORTS = [
            { url: API_BASE_URL, isGateway: true },
            { url: 'http://localhost:8003', isGateway: false }
        ];

        for (let i = 0; i < PORTS.length; i++) {
            const port = PORTS[i];
            const API_BASE_URL = port.url;
            
            try {
                const endpoint = port.isGateway 
                    ? `${API_BASE_URL}/api/gateway/users/password`
                    : `${API_BASE_URL}/api/User/password`;
                
                const payload = {
                    Id: userId,
                    oldPassword: oldPassword,
                    newHashedPassword: newPassword
                };

                const token = localStorage.getItem('authToken');
                const headers = {
                    'Content-Type': 'application/json'
                };
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                await axios.put(endpoint, payload, { headers });
                return; // Éxito
            } catch (error) {
                const isConnectionError = !error.response || 
                    error.code === 'ECONNREFUSED' || 
                    error.code === 'ERR_NETWORK' ||
                    error.code === 'ERR_FAILED' ||
                    error.message?.includes('Network Error');
                
                // También tratar 405 (Method Not Allowed) como error que requiere fallback
                const isMethodNotAllowed = error.response && error.response.status === 405;

                if ((isConnectionError || isMethodNotAllowed) && i < PORTS.length - 1) {
                    continue; // Intentar siguiente puerto
                }
                throw error;
            }
        }
    }


    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function getErrorMessage(error) {
        if (error.response && error.response.data) {
            const errorData = error.response.data;
            if (typeof errorData === 'string') {
                return sanitizeErrorMessage(errorData);
            } else if (errorData.message) {
                return sanitizeErrorMessage(errorData.message);
            } else if (errorData.error) {
                return sanitizeErrorMessage(errorData.error);
            }
        }
        return 'Ocurrió un error. Por favor, intenta nuevamente.';
    }

    function sanitizeErrorMessage(errorMessage) {
        if (!errorMessage || typeof errorMessage !== 'string') {
            return 'Ocurrió un error. Por favor, intenta nuevamente.';
        }

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

        if (errorMessage.includes('Failed to connect') || 
            errorMessage.includes('database') ||
            errorMessage.includes('connection')) {
            return 'Error de conexión con el servidor. Por favor, intenta nuevamente.';
        }

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

        const form = document.querySelector('.settings-content');
        if (form) {
            form.insertBefore(alertDiv, form.firstChild);
        } else {
            document.body.insertBefore(alertDiv, document.body.firstChild);
        }

        const closeBtn = alertDiv.querySelector('.alert-close');
        closeBtn.addEventListener('click', () => { alertDiv.remove(); });

        setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 6000);
    }

    function setButtonLoading(button, isLoading) {
        if (!button) return;
        
        if (isLoading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Cargando...';
        } else {
            button.disabled = false;
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
            }
        }
    }
});

