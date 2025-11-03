// ================================
// 💬 JS/Components/header.js
// (ACTUALIZADO: El logo ahora es un link)
// ================================

/**
 * Crea el HTML del header.
 * Muestra la campana siempre.
 * Muestra "Iniciar Sesión" O el menú de usuario.
 */
window.createHeader = function() {
    
    const token = localStorage.getItem("authToken");
    const defaultUserAvatar = "../../Assets/default-avatar.png";
    const userAvatar = localStorage.getItem("userAvatar") || defaultUserAvatar;

    return `
    <header class="header">
        
        <!-- 💡 CAMBIO: Espacio ajustado a 2rem -->
        <div class="left-section" style="gap: 2rem;">
            
            <!-- 💡 CAMBIO: Ahora es un <img> con tu avatar por defecto -->
            <div class="page-logo">
                <img src="../../Assets/default-avatar.png" alt="Logo">
            </div>
            
            <div class="search-bar">
                <input type="text" placeholder="Buscar canción, artista, usuario..." id="searchInput">
                <i class="fa-solid fa-magnifying-glass search-icon" id="searchIcon"></i>
            </div>
        </div>

        <div class="nav-buttons">
            <button class="btn-nav" id="btnInicio">INICIO</button>
            <button class="btn-nav" id="btnRankings">RANKINGS</button>
            <button class="btn-nav" id="btnExplorar">EXPLORAR</button>
        </div>

        <!-- 💡 CAMBIO: Espacio ajustado a 1rem -->
        <div class="right-icons" style="gap: 1rem;">
            
            <div class="notification-wrapper">
                <div class="notification-icon" id="notificationBell">
                    <i class="fa-regular fa-bell"></i>
                    <span class="notification-badge" id="notificationBadge" style="display: none;"></span>
                </div>
                <div class="notification-dropdown" id="notificationDropdown">
                    <ul id="notificationList">
                    </ul>
                    <p class="no-notifications" style="display: none;">No hay notificaciones.</p>
                </div>
            </div>

            <div class="user-menu-wrapper">
                ${ token ? `
                    <!-- ESTADO: LOGUEADO -->
                    <img src="${userAvatar}" alt="Avatar" class="user-avatar-icon" id="userMenuButton" />
                    <div class="user-menu-dropdown" id="userMenuDropdown">
                        <a href="profile.html"><i class="fa-solid fa-user"></i> Perfil</a>
                        <a href="settings.html"><i class="fa-solid fa-gear"></i> Ajustes</a>
                        <a href="#" id="logoutButton"><i class="fa-solid fa-right-from-bracket"></i> Cerrar Sesión</a>
                    </div>
                ` : `
                    <!-- ESTADO: INVITADO -->
                    <a href="../login.html" class="btn-nav btn-login">Iniciar Sesión</a>
                ` }
            </div>
        </div>
    </header>
    `;
};
