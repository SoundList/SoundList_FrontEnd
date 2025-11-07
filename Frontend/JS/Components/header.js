
window.createHeader = function() {
    
    const token = localStorage.getItem("authToken");
    const defaultUserAvatar = "../../Assets/default-avatar.png"; 
    const userAvatar = localStorage.getItem("userAvatar") || defaultUserAvatar;

    return `
    <header class="header">
        
        <div class="left-section">
            <!-- 1. TU logo (como pediste) -->
            <div class="page-logo">
                <img src="${defaultUserAvatar}" alt="Logo" class="logo-avatar-img">
            </div>

            <!-- 2. 💡 ¡CAMBIO! Esta es la ESTRUCTURA del buscador de tu compañera -->
            <div class="search-container">
                <i class="fa-solid fa-magnifying-glass search-icon"></i>
                <input type="text" id="searchInput" class="search-input" placeholder="Buscar canción, artista, usuario...">
                <button id="searchClear" class="search-clear" style="display: none;">&times;</button>
                <div id="searchDropdown" class="search-dropdown">
                    <!-- searchHandler.js llenará esto -->
                </div>
            </div>
        </div>

        <div class="nav-buttons">
            <button class="btn-nav" id="btnInicio">INICIO</button>
            <button class="btn-nav" id="btnRankings">RANKINGS</button>
            <button class="btn-nav" id="btnExplorar">EXPLORAR</button>
        </div>

        <div class="right-icons">
            
            <div class="notification-wrapper">
                <div class="notification-icon" id="notificationBell">
                    <i class="fa-regular fa-bell"></i>
                    <span class="notification-badge" id="notificationBadge" style="display: none;"></span>
                </div>
                <div class="notification-dropdown" id="notificationDropdown">
                    <ul id="notificationList"></ul>
                    <p class="no-notifications" style="display: none;">No hay notificaciones.</p>
                </div>
            </div>

            <!-- 3. Tu lógica de Login/Logout (está bien) -->
            <div class="user-menu-wrapper">
                ${ token ? `
                    <img src="${userAvatar}" alt="Avatar" class="user-avatar-icon" id="userMenuButton" />
                    <div class="user-menu-dropdown" id="userMenuDropdown">
                        <a href="profile.html"><i class="fa-solid fa-user"></i> Perfil</a>
                        <a href="settings.html"><i class="fa-solid fa-gear"></i> Ajustes</a>
                        <a href="#" id="logoutButton"><i class="fa-solid fa-right-from-bracket"></i> Cerrar Sesión</a>
                    </div>
                ` : `
                    <a href="../login.html" class="btn-nav btn-login">Iniciar Sesión</a>
                ` }
            </div>
        </div>
    </header>
    `;
};