/*
 * JavaScript/Handlers/headerHandler.js
 *
 * Responsabilidad: Manejar toda la lógica de los elementos compartidos
 * en el <header> (Búsqueda, Perfil, Notificaciones, Navegación, Sesión).
 * Es cargado en TODAS las páginas por main.js.
 */

// --- 1. IMPORTACIONES DE API ---
import { API_BASE_URL } from '../APIs/configApi.js'; 
import { fetchSearchResults } from '../APIs/searchApi.js';
import { 
    getNotifications, 
    getReviews, 
    getReviewReactionCount, 
    getCommentsByReview,
    getUser
} from '../APIs/socialApi.js'; 

// --- 2. VARIABLES GLOBALES DEL HEADER ---
let notificationConnection = null;
let notifications = []; // Array para almacenar notificaciones
let userReviewsState = {}; // Estado para polling
let notificationPollingInterval = null; // Intervalo de polling

function getLoginPath() {
    const currentPath = window.location.pathname || '';
    const currentFile = currentPath.split('/').pop();

    if (currentPath.includes('/Pages/') ||
        currentFile === 'profile.html' ||
        currentFile === 'editProfile.html' ||
        currentFile === 'ajustes.html') {
        return '../login.html';
    }

    return 'login.html';
}

// --- 3. FUNCIÓN DE INICIALIZACIÓN PRINCIPAL ---
/**
 * Inicializa todos los componentes compartidos del header.
 * Esta función es llamada por main.js en CADA carga de página.
 */
export function initializeHeader() {
    // Agregamos el listener que envuelve toda la lógica del header
    
        console.log("Inicializando Header (Búsqueda, Perfil, Notificaciones)...");
        initializeSearch();
        initializeProfileDropdown();
        initializeNavigation();
        loadUserData(); 
        initializeLogoutModal();
        initializeLoginRequiredModal();
        initializeNotificationsDropdown();
        initializeHeaderLogoutButton();
        
        // Hacer showAlert disponible globalmente
        if (typeof window !== 'undefined' && typeof showAlert === 'function') {
            window.showAlert = showAlert;
        }
        
        // Hacer fetchSearchResults disponible globalmente para otros handlers
        if (typeof window !== 'undefined' && typeof fetchSearchResults === 'function') {
            window.fetchSearchResults = fetchSearchResults;
        }
        
        // Hacer funciones de socialApi disponibles globalmente si están disponibles
        if (typeof window !== 'undefined') {
            // Intentar importar y exponer socialApi si no está disponible
            if (!window.socialApi && typeof getCommentsByReview === 'function') {
                window.socialApi = window.socialApi || {};
                window.socialApi.getCommentsByReview = getCommentsByReview;
                window.socialApi.createComment = typeof createComment !== 'undefined' ? createComment : null;
                window.socialApi.updateComment = typeof updateComment !== 'undefined' ? updateComment : null;
                window.socialApi.deleteComment = typeof deleteComment !== 'undefined' ? deleteComment : null;
            }
        }
    
}

// --- 4. SECCIÓN DE BÚSQUEDA ---

function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    const searchDropdown = document.getElementById('searchDropdown');
    
    // Si no hay barra de búsqueda en la página, no hacer nada.
    if (!searchInput || !searchDropdown || !searchClear) return;

    let searchTimeout;
    let currentSearchController = null;

    searchInput.addEventListener('input', function() {
        searchClear.style.display = this.value ? 'block' : 'none';
        if (currentSearchController) {
            currentSearchController.abort();
        }
        clearTimeout(searchTimeout);
        
        if (this.value.length > 0) {
            searchTimeout = setTimeout(() => {
                currentSearchController = new AbortController();
                performSearch(this.value.trim(), currentSearchController.signal);
            }, 500);
        } else {
            searchDropdown.style.display = 'none';
        }
    });

    searchClear.addEventListener('click', function() {
        searchInput.value = '';
        searchClear.style.display = 'none';
        searchDropdown.style.display = 'none';
        if (currentSearchController) {
            currentSearchController.abort();
        }
        clearTimeout(searchTimeout);
        searchInput.focus();
    });

    document.addEventListener('click', function(e) {
        // Comprobación defensiva
        if (searchInput && searchDropdown && !searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.style.display = 'none';
        }
    });
}

async function performSearch(query, signal) {
    const searchDropdown = document.getElementById('searchDropdown');
    if (!query || query.length === 0) {
        if(searchDropdown) searchDropdown.style.display = 'none';
        return;
    }

    searchDropdown.innerHTML = '<div class="search-loading">Buscando...</div>';
    searchDropdown.style.display = 'block';

    try {
        // Llama a la API centralizada
        const results = await fetchSearchResults(query, signal);
        if (results === null) return; // Búsqueda cancelada
        
        displaySearchResults(results, query);

    } catch (error) {
        console.error('Error en la búsqueda:', error);
        searchDropdown.innerHTML = `
            <div class="search-error">
                <i class="fas fa-exclamation-circle"></i>
                <span>Error al buscar. Intenta nuevamente.</span>
            </div>
        `;
        searchDropdown.style.display = 'block';
    }
}

function displaySearchResults(results, query) {
    const searchDropdown = document.getElementById('searchDropdown');
    const searchInput = document.getElementById('searchInput');

    const artists = results.Artists || results.artists || [];
    const albums = results.Albums || results.albums || [];
    const songs = results.Songs || results.songs || [];
    
    // Debug: Log de los resultados para verificar la estructura
    if (artists.length > 0) {
        console.log('Artista de ejemplo:', {
            objeto: artists[0],
            APIArtistId: artists[0].APIArtistId,
            apiArtistId: artists[0].apiArtistId,
            Id: artists[0].Id,
            id: artists[0].id,
            todasLasKeys: Object.keys(artists[0])
        });
    }
    if (albums.length > 0) {
        console.log('Álbum de ejemplo:', {
            objeto: albums[0],
            APIAlbumId: albums[0].APIAlbumId,
            apiAlbumId: albums[0].apiAlbumId,
            Id: albums[0].Id,
            id: albums[0].id,
            todasLasKeys: Object.keys(albums[0])
        });
    }
    if (songs.length > 0) {
        console.log('Canción de ejemplo:', {
            objeto: songs[0],
            APISongId: songs[0].APISongId,
            apiSongId: songs[0].apiSongId,
            Id: songs[0].Id,
            id: songs[0].id,
            todasLasKeys: Object.keys(songs[0])
        });
    }

    if (artists.length === 0 && albums.length === 0 && songs.length === 0) {
        searchDropdown.innerHTML = `
            <div class="search-no-results">
                <i class="fas fa-search"></i>
                <span>No se encontraron resultados para "${query}"</span>
            </div>
        `;
        searchDropdown.style.display = 'block';
        return;
    }

    let html = '';

    // Sección de Artistas
    if (artists.length > 0) {
        html += '<div class="search-section"><div class="search-section-title">Artistas</div>';
        artists.forEach(artist => {
            const artistId = artist.APIArtistId || artist.apiArtistId || artist.Id || artist.id || '';
            const artistName = artist.Name || artist.name || '';
            const artistImage = artist.Imagen || artist.imagen || '../Assets/default-avatar.png';
            
            // Solo renderizar si tiene un ID válido
            if (!artistId || artistId.trim() === '') {
                console.warn('Artista sin ID válido, omitiendo:', artist);
                return;
            }
            
            html += `
                <div class="search-dropdown-item" data-type="artist" data-id="${artistId}">
                    <img src="${artistImage}" alt="${artistName}" class="search-item-image" onerror="this.src='../Assets/default-avatar.png'">
                    <span class="search-item-text">${artistName}</span>
                    <i class="fas fa-user search-item-icon"></i>
                </div>
            `;
        });
        html += '</div>';
    }

    // Sección de Álbumes
    if (albums.length > 0) {
        html += '<div class="search-section"><div class="search-section-title">Álbumes</div>';
        albums.forEach(album => {
            const albumId = album.APIAlbumId || album.apiAlbumId || album.Id || album.id || '';
            const albumTitle = album.Title || album.title || '';
            const albumImage = album.Image || album.image || '../Assets/default-avatar.png';
            
            // Solo renderizar si tiene un ID válido
            if (!albumId || albumId.trim() === '') {
                console.warn('Álbum sin ID válido, omitiendo:', album);
                return;
            }
            
            html += `
                <div class="search-dropdown-item" data-type="album" data-id="${albumId}">
                    <img src="${albumImage}" alt="${albumTitle}" class="search-item-image" onerror="this.src='../Assets/default-avatar.png'">
                    <span class="search-item-text">${albumTitle}</span>
                    <i class="fas fa-compact-disc search-item-icon"></i>
                </div>
            `;
        });
        html += '</div>';
    }

    // Sección de Canciones
    if (songs.length > 0) {
        html += '<div class="search-section"><div class="search-section-title">Canciones</div>';
        songs.forEach(song => {
            const songId = song.APISongId || song.apiSongId || song.Id || song.id || '';
            const songTitle = song.Title || song.title || '';
            const songImage = song.Image || song.image || '../Assets/default-avatar.png';
            const artistName = song.ArtistName || song.artistName || '';
            const artistNameDisplay = artistName ? ` - ${artistName}` : '';
            
            // Solo renderizar si tiene un ID válido
            if (!songId || songId.trim() === '') {
                console.warn('Canción sin ID válido, omitiendo:', song);
                return;
            }
            
            html += `
                <div class="search-dropdown-item" data-type="song" data-id="${songId}">
                    <img src="${songImage}" alt="${songTitle}" class="search-item-image" onerror="this.src='../Assets/default-avatar.png'">
                    <span class="search-item-text">${songTitle}${artistNameDisplay}</span>
                    <i class="fas fa-music search-item-icon"></i>
                </div>
            `;
        });
        html += '</div>';
    }

    searchDropdown.innerHTML = html;
    searchDropdown.style.display = 'block';

    searchDropdown.querySelectorAll('.search-dropdown-item').forEach(item => {
        item.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            const id = this.getAttribute('data-id');
            const text = this.querySelector('.search-item-text').textContent;
            
            // Validar que el ID existe y no está vacío
            if (!id || id.trim() === '' || id === 'undefined' || id === 'null') {
                console.error('Error: ID inválido en resultado de búsqueda', { type, id, text });
                if (typeof showAlert === 'function') {
                    showAlert('Error: No se pudo obtener el ID del contenido seleccionado.', 'danger');
                }
                return;
            }
            
            console.log(`Navegando a ${type} con ID: ${id}`);
            searchInput.value = text;
            searchDropdown.style.display = 'none';
            
            navigateToContentView(type, id);
        });
    });
}

/**
 * Navega a la vista de contenido.
 * Maneja rutas relativas correctamente desde cualquier ubicación.
 */
function navigateToContentView(type, id) {
    // Validación más estricta del ID
    if (!id || typeof id !== 'string' || id.trim() === '' || 
        id === '00000000-0000-0000-0000-000000000000' ||
        id === 'undefined' || id === 'null' ||
        id.toLowerCase() === 'album' || id.toLowerCase() === 'artist' || id.toLowerCase() === 'song') {
        console.error('Error: El ID del contenido está vacío o es inválido.', { type, id });
        if (typeof showAlert === 'function') {
            showAlert('Error: El ID del contenido es inválido. Por favor, intenta buscar nuevamente.', 'danger');
        }
        return;
    }
    
    // Validar que el tipo sea válido
    if (!type || !['song', 'album', 'artist'].includes(type)) {
        console.error('Error: Tipo de contenido inválido.', { type, id });
        if (typeof showAlert === 'function') {
            showAlert('Error: Tipo de contenido inválido.', 'danger');
        }
        return;
    }
    
    const currentPath = window.location.pathname;
    const currentFile = currentPath.split('/').pop() || '';
    let destinationUrl = '';
    
    // Determinar el nombre del archivo según el tipo
    let fileName = '';
    switch(type) {
        case 'song':
            fileName = 'song.html';
            break;
        case 'album':
            fileName = 'album.html';
            break;
        case 'artist':
            fileName = 'artist.html'; 
            break;
        default:
            console.warn('Tipo de contenido desconocido:', type);
            return;
    }
    
    // Codificar el ID para la URL (por si tiene caracteres especiales)
    const encodedId = encodeURIComponent(id.trim());
    
    // Determinar la ruta correcta según dónde estemos
    if (currentPath.includes('/Pages/') || currentFile === 'profile.html' || currentFile === 'editProfile.html' || currentFile === 'ajustes.html') {
        // Estamos en Pages/, necesitamos subir un nivel para llegar a HTML/
        destinationUrl = `../${fileName}?id=${encodedId}`;
    } else if (currentPath.includes('/HTML/') || 
               currentFile === 'home.html' || 
               currentFile === 'album.html' || 
               currentFile === 'song.html' || 
               currentFile === 'artist.html' ||
               currentFile === 'rankings.html' ||
               currentFile === 'amigos.html' ||
               currentFile === 'login.html' ||
               currentFile === 'register.html') {
        // Ya estamos en HTML/, solo necesitamos el nombre del archivo
        destinationUrl = `${fileName}?id=${encodedId}`;
    } else {
        // Fallback: asumir que estamos en el mismo directorio
        destinationUrl = `${fileName}?id=${encodedId}`;
    }

    console.log(`Navegando a: ${destinationUrl} (desde: ${currentFile}, tipo: ${type}, id: ${id})`);
    window.location.href = destinationUrl;
}

/**
 * Navega al perfil de un usuario
 * @param {string} userId - ID del usuario
 */
function navigateToProfile(userId) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        console.error('Error: El ID del usuario está vacío o es inválido.', { userId });
        return;
    }
    
    const currentPath = window.location.pathname;
    const currentFile = currentPath.split('/').pop() || '';
    let destinationUrl = '';
    
    const encodedUserId = encodeURIComponent(userId.trim());
    
    // Determinar la ruta correcta según dónde estemos
    if (currentPath.includes('/Pages/') || currentFile === 'profile.html' || currentFile === 'editProfile.html' || currentFile === 'ajustes.html') {
        // Ya estamos en Pages/, solo necesitamos el nombre del archivo
        destinationUrl = `profile.html?userId=${encodedUserId}`;
    } else if (currentPath.includes('/HTML/') || 
               currentFile === 'home.html' || 
               currentFile === 'album.html' || 
               currentFile === 'song.html' || 
               currentFile === 'artist.html' ||
               currentFile === 'rankings.html' ||
               currentFile === 'amigos.html' ||
               currentFile === 'login.html' ||
               currentFile === 'register.html') {
        // Estamos en HTML/, necesitamos ir a Pages/
        destinationUrl = `Pages/profile.html?userId=${encodedUserId}`;
    } else {
        // Fallback: intentar detectar la estructura
        destinationUrl = `Pages/profile.html?userId=${encodedUserId}`;
    }
    
    console.log(`Navegando a perfil: ${destinationUrl} (desde: ${currentFile}, userId: ${userId})`);
    window.location.href = destinationUrl;
}

// Hacer la función disponible globalmente
if (typeof window !== 'undefined') {
    window.navigateToProfile = navigateToProfile;
}

// --- 5. SECCIÓN DE PERFIL, NAVEGACIÓN Y SESIÓN ---

function initializeProfileDropdown() {
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const verPerfilBtn = document.getElementById('verPerfilBtn');
    const ajustesBtn = document.getElementById('ajustesBtn');
    const cerrarSesionBtn = document.getElementById('cerrarSesionBtn');

    // Defensivo: si no están los botones, no hace nada.
    if (!profileBtn || !profileDropdown) {
        return; 
    }

    profileBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const notificationsDropdown = document.getElementById('notificationsDropdown');
        if (notificationsDropdown) notificationsDropdown.style.display = 'none';
        
        // Comportamiento normal: abrir/cerrar dropdown
        const isVisible = profileDropdown.style.display === 'block';
        profileDropdown.style.display = isVisible ? 'none' : 'block';
    });

    document.addEventListener('click', function(e) {
        if (profileBtn && !profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.style.display = 'none';
        }
    });

    // Hacemos defensivos los botones de adentro
    if(verPerfilBtn) {
        verPerfilBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            profileDropdown.style.display = 'none';
            // Obtener el userId del usuario logueado
            const userId = localStorage.getItem('userId');
            if (userId) {
                // Obtener el userId actual de la URL si estamos en profile.html
                const urlParams = new URLSearchParams(window.location.search);
                const currentUserId = urlParams.get('userId');
                
                // Si ya estamos en el perfil del usuario logueado, no redirigir
                const currentPath = window.location.pathname;
                const currentFile = currentPath.split('/').pop();
                
                if (currentFile === 'profile.html' && currentUserId === userId) {
                    console.log('Ya estamos en el perfil del usuario, no redirigiendo');
                    return;
                }
                
                // Redirigir a la página de perfil con el userId
                // La ruta relativa depende de dónde estemos
                let profilePath = '';
                
                // Determinar la ruta correcta según dónde estemos
                if (currentPath.includes('/Pages/') || currentFile === 'profile.html' || currentFile === 'editProfile.html' || currentFile === 'ajustes.html') {
                    // Ya estamos en Pages/, solo necesitamos el nombre del archivo
                    profilePath = 'profile.html';
                } else if (currentPath.includes('/HTML/') || currentFile === 'home.html' || currentFile === 'album.html' || currentFile === 'song.html' || currentFile === 'artist.html' || currentFile === 'rankings.html' || currentFile === 'amigos.html') {
                    // Estamos en HTML/, necesitamos ir a Pages/
                    profilePath = 'Pages/profile.html';
                } else {
                    // Fallback: intentar detectar la estructura
                    profilePath = '../Pages/profile.html';
                }
                
                console.log('Navegando a perfil:', profilePath);
                window.location.href = `${profilePath}?userId=${userId}`;
            } else {
                if (typeof showAlert === 'function') {
                    showAlert('No se encontró información del usuario. Por favor, inicia sesión nuevamente.', 'error');
                } else {
                    alert('No se encontró información del usuario. Por favor, inicia sesión nuevamente.');
                }
            }
        });
    }

    if(ajustesBtn) {
        ajustesBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            profileDropdown.style.display = 'none';

            const currentPath = window.location.pathname;
            const currentFile = currentPath.split('/').pop();
            let settingsPath = '';

            if (currentPath.includes('/Pages/') || currentFile === 'profile.html' || currentFile === 'editProfile.html' || currentFile === 'ajustes.html') {
                settingsPath = 'ajustes.html';
            } else if (
                currentPath.includes('/HTML/') ||
                currentFile === 'home.html' ||
                currentFile === 'album.html' ||
                currentFile === 'song.html' ||
                currentFile === 'artist.html' ||
                currentFile === 'rankings.html' ||
                currentFile === 'amigos.html' ||
                currentFile === 'login.html' ||
                currentFile === 'register.html'
            ) {
                settingsPath = 'Pages/ajustes.html';
            } else {
                settingsPath = '../Pages/ajustes.html';
            }

            window.location.href = settingsPath;
        });
    }

    if(cerrarSesionBtn) {
        cerrarSesionBtn.addEventListener('click', function() {
            profileDropdown.style.display = 'none';
            showLogoutModal();
        });
    }
}

function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const mobileNavButtons = document.querySelectorAll('.mobile-nav-btn');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileNavMenu = document.getElementById('mobileNavMenu');

    if (navButtons.length > 0) {
        navButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                handleNavigation(this, navButtons, mobileNavButtons);
            });
        });
    }

    if (mobileNavButtons.length > 0) {
        mobileNavButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                handleNavigation(this, navButtons, mobileNavButtons);
                if (mobileNavMenu) {
                    mobileNavMenu.classList.remove('active');
                }
            });
        });
    }

    if (mobileMenuToggle && mobileNavMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            mobileNavMenu.classList.toggle('active');
            const icon = this.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars', !mobileNavMenu.classList.contains('active'));
                icon.classList.toggle('fa-times', mobileNavMenu.classList.contains('active'));
            }
        });

        document.addEventListener('click', function(e) {
            if (mobileMenuToggle && mobileNavMenu &&
                !mobileMenuToggle.contains(e.target) && 
                !mobileNavMenu.contains(e.target) && 
                mobileNavMenu.classList.contains('active')) 
            {
                mobileNavMenu.classList.remove('active');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
    }

    // Esta es la función 'handleNavigation' que estaba dentro de 'initializeNavigation'
    function handleNavigation(clickedBtn, desktopBtns, mobileBtns) {
        desktopBtns.forEach(b => b.classList.remove('active'));
        mobileBtns.forEach(b => b.classList.remove('active'));
        
        clickedBtn.classList.add('active');
        
        const page = clickedBtn.getAttribute('data-page');
        console.log('Navegación clickeada - página:', page, 'desde:', window.location.pathname);
        
        desktopBtns.forEach(b => {
            if (b.getAttribute('data-page') === page) b.classList.add('active');
        });
        mobileBtns.forEach(b => {
            if (b.getAttribute('data-page') === page) b.classList.add('active');
        });
        
        // Lógica de navegación
        switch(page) {
            case 'inicio':
                // Redirigir a home.html con ruta relativa correcta
                const currentPath = window.location.pathname;
                const currentHref = window.location.href;
                const currentFile = currentPath.split('/').pop() || '';
                let homePath = '';
                
                // Determinar la ruta correcta según dónde estemos
                // Si estamos en Pages/ (profile, editProfile)
                if (currentPath.includes('/Pages/') || currentFile === 'profile.html' || currentFile === 'editProfile.html' || currentFile === 'ajustes.html') {
                    homePath = '../home.html';
                } 
                // Si estamos en HTML/ o en cualquier página del nivel raíz (home, album, song, artist, rankings, amigos)
                else if (currentPath.includes('/HTML/') || 
                         currentFile === 'home.html' || 
                         currentFile === 'album.html' || 
                         currentFile === 'song.html' || 
                         currentFile === 'artist.html' || 
                         currentFile === 'rankings.html' || 
                         currentFile === 'amigos.html' ||
                         currentHref.includes('rankings.html') ||
                         currentHref.includes('home.html') ||
                         currentHref.includes('album.html') ||
                         currentHref.includes('song.html') ||
                         currentHref.includes('artist.html')) {
                    homePath = 'home.html';
                } 
                // Fallback: asumir que estamos en el mismo directorio
                else {
                    homePath = 'home.html';
                }
                
                // Solo redirigir si no estamos ya en home
                if (!currentPath.includes('home.html') && currentFile !== 'home.html' && !currentHref.includes('home.html')) {
                    console.log('Navegando a inicio desde:', currentFile, '->', homePath);
                    window.location.href = homePath;
                } else {
                    console.log('Ya estamos en home, no redirigiendo');
                }
                break;
            case 'rankings':
                // Redirigir a rankings.html con ruta relativa correcta
                const rankingsCurrentPath = window.location.pathname;
                const rankingsCurrentFile = window.location.pathname.split('/').pop();
                let rankingsPath = '';
                
                // Determinar la ruta correcta según dónde estemos
                if (rankingsCurrentPath.includes('/Pages/') || rankingsCurrentFile === 'profile.html' || rankingsCurrentFile === 'editProfile.html' || rankingsCurrentFile === 'ajustes.html') {
                    // Estamos en Pages/, necesitamos subir un nivel
                    rankingsPath = '../rankings.html';
                } else if (rankingsCurrentPath.includes('/HTML/') || rankingsCurrentFile === 'home.html' || rankingsCurrentFile === 'album.html' || rankingsCurrentFile === 'song.html' || rankingsCurrentFile === 'artist.html' || rankingsCurrentFile === 'amigos.html') {
                    // Ya estamos en HTML/, solo necesitamos el nombre del archivo
                    rankingsPath = 'rankings.html';
                } else {
                    // Fallback
                    rankingsPath = 'rankings.html';
                }
                
                // Solo redirigir si no estamos ya en rankings
                if (!rankingsCurrentPath.includes('rankings.html') && rankingsCurrentFile !== 'rankings.html') {
                    window.location.href = rankingsPath;
                }
                break;
            case 'amigos':
                // Redirigir a amigos.html con ruta relativa correcta
                const amigosCurrentPath = window.location.pathname;
                const amigosCurrentFile = window.location.pathname.split('/').pop();
                let amigosPath = '';
                
                // Determinar la ruta correcta según dónde estemos
                if (amigosCurrentPath.includes('/Pages/') || amigosCurrentFile === 'profile.html' || amigosCurrentFile === 'editProfile.html' || amigosCurrentFile === 'ajustes.html') {
                    // Estamos en Pages/, necesitamos subir un nivel
                    amigosPath = '../amigos.html';
                } else if (amigosCurrentPath.includes('/HTML/') || amigosCurrentFile === 'home.html' || amigosCurrentFile === 'album.html' || amigosCurrentFile === 'song.html' || amigosCurrentFile === 'artist.html' || amigosCurrentFile === 'rankings.html') {
                    // Ya estamos en HTML/, solo necesitamos el nombre del archivo
                    amigosPath = 'amigos.html';
                } else {
                    // Fallback
                    amigosPath = 'amigos.html';
                }
                
                // Solo redirigir si no estamos ya en amigos
                if (!amigosCurrentPath.includes('amigos.html') && amigosCurrentFile !== 'amigos.html') {
                    window.location.href = amigosPath;
                }
                break;
        }
    }
}

function loadUserData() {
    const authToken = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const loginContainer = document.getElementById('loginContainer');
    const profileContainer = document.getElementById('profileContainer');
    const notificationsContainer = document.getElementById('notificationsContainer');
    const addReviewContainer = document.getElementById('addReviewContainer');
    const addReviewBtn = document.getElementById('addReviewBtn');
    const loginBtn = document.getElementById('loginBtn');
    
    if (!authToken) {
        if (loginContainer) loginContainer.style.display = 'flex';
        if (profileContainer) profileContainer.style.display = 'none';
        if (notificationsContainer) notificationsContainer.style.display = 'none';
        if (addReviewContainer) addReviewContainer.style.display = 'none';
        
        if (loginBtn) {
            loginBtn.addEventListener('click', function() {
                window.location.href = getLoginPath();
            });
        }
    } else {
        if (loginContainer) loginContainer.style.display = 'none';
        if (profileContainer) profileContainer.style.display = 'block';
        if (notificationsContainer) notificationsContainer.style.display = 'block';
        if (addReviewContainer) addReviewContainer.style.display = 'block';
    
        if (username && usernameDisplay) {
            usernameDisplay.textContent = username;
        } else if (usernameDisplay) {
            usernameDisplay.textContent = 'Usuario';
        }
        
        // Configurar el botón de agregar reseña
        if (addReviewBtn) {
            // Remover listeners anteriores si existen
            const newAddReviewBtn = addReviewBtn.cloneNode(true);
            addReviewBtn.parentNode.replaceChild(newAddReviewBtn, addReviewBtn);
            
            newAddReviewBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Intentar usar la función showCreateReviewModal si está disponible (desde homeAdmin o profileHandler)
                if (typeof window.showCreateReviewModal === 'function') {
                    window.showCreateReviewModal();
                } else {
                    // Si no está disponible, buscar el modal directamente
                    const modal = document.getElementById('createReviewModalOverlay');
                    if (modal) {
                        modal.style.display = 'flex';
                    } else {
                        console.warn('Modal de crear reseña no encontrado. Redirigiendo a home...');
                        // Fallback: redirigir a home si no hay modal
                        const currentPath = window.location.pathname;
                        const currentFile = currentPath.split('/').pop();
                        let homePath = '';
                        
                        if (currentPath.includes('/Pages/') || currentFile === 'profile.html' || currentFile === 'editProfile.html' || currentFile === 'ajustes.html') {
                            homePath = '../home.html';
                        } else if (currentPath.includes('/HTML/') || currentFile === 'album.html' || currentFile === 'song.html' || currentFile === 'artist.html' || currentFile === 'rankings.html' || currentFile === 'amigos.html') {
                            homePath = 'home.html';
                        } else {
                            homePath = 'home.html';
                        }
                        
                        window.location.href = homePath;
                    }
                }
            });
        }
        
        loadNotifications();
        
        if (typeof signalR !== 'undefined' && signalR) {
            initializeSignalR();
        } else {
            setTimeout(() => {
                if (typeof signalR !== 'undefined' && signalR) {
                    initializeSignalR();
                } else {
                    console.warn('SignalR no está disponible. Notificaciones en tiempo real no funcionarán.');
                }
            }, 500);
        }
    }
}

function initializeLogoutModal() {
    const logoutModalOverlay = document.getElementById('logoutModalOverlay');
    // Salir si el modal no existe en esta página
    if (!logoutModalOverlay) return; 

    const logoutModalTitle = document.getElementById('logoutModalTitle');
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
        
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', function() {
                stopNotificationPolling();
                userReviewsState = {};
                notifications = [];
            localStorage.removeItem('authToken');
            localStorage.removeItem('userId');
            localStorage.removeItem('username');
            window.location.href = getLoginPath();
            });
    }
        
    if (cancelLogoutBtn) {
            cancelLogoutBtn.addEventListener('click', function() {
                logoutModalOverlay.style.display = 'none';
            });
    }
        
    logoutModalOverlay.addEventListener('click', function(e) {
        if (e.target === logoutModalOverlay) {
            logoutModalOverlay.style.display = 'none';
        }
    });
}

function showLogoutModal() {
    const logoutModalOverlay = document.getElementById('logoutModalOverlay');
    const logoutModalTitle = document.getElementById('logoutModalTitle');
    
    if (!logoutModalOverlay || !logoutModalTitle) return;

    const username = localStorage.getItem('username') || 'Usuario';
    logoutModalTitle.textContent = `¿Salir de ${username}?`;
    logoutModalOverlay.style.display = 'flex';
}

function initializeHeaderLogoutButton() {
    const logoutButton = document.getElementById('logoutButton');
    
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            // Mostrar el modal de confirmación si existe, sino hacer logout directo
            const logoutModalOverlay = document.getElementById('logoutModalOverlay');
            if (logoutModalOverlay) {
                showLogoutModal();
            } else {
                // Si no hay modal, hacer logout directo
                performLogout();
            }
        });
    }
}

function performLogout() {
    stopNotificationPolling();
    userReviewsState = {};
    notifications = [];
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('userAvatar');
    
    // Determinar la ruta correcta a login.html según dónde estemos
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/').filter(p => p);
    let loginPath = '';
    
    // Si estamos en Pages/ (profile, editProfile) - necesitamos subir un nivel para llegar a HTML/
    if (currentPath.includes('/Pages/')) {
        // Encontrar el índice de 'HTML' en el path
        const htmlIndex = pathParts.indexOf('HTML');
        if (htmlIndex !== -1) {
            // Construir ruta absoluta: /SoundList_FrontEnd/Frontend/HTML/login.html
            const baseParts = pathParts.slice(0, htmlIndex + 1);
            loginPath = '/' + baseParts.join('/') + '/login.html';
        } else {
            // Fallback: ruta relativa
            loginPath = '../login.html';
        }
    } 
    // Si estamos en HTML/ (home, album, song, artist, rankings, amigos, login, register)
    else if (currentPath.includes('/HTML/') && !currentPath.includes('/Pages/')) {
        // Ya estamos en HTML/, login.html está en el mismo directorio
        loginPath = 'login.html';
    }
    // Fallback: intentar construir ruta absoluta si contiene SoundList_FrontEnd
    else if (currentPath.includes('SoundList_FrontEnd')) {
        const htmlIndex = pathParts.indexOf('HTML');
        if (htmlIndex !== -1) {
            const baseParts = pathParts.slice(0, htmlIndex + 1);
            loginPath = '/' + baseParts.join('/') + '/login.html';
        } else {
            loginPath = 'login.html';
        }
    }
    // Fallback final: usar ruta relativa simple
    else {
        loginPath = 'login.html';
    }
    
    console.log('Cerrando sesión y redirigiendo a:', loginPath, '(desde:', currentPath, ')');
    window.location.href = loginPath;
}

// --- 6. SECCIÓN DE NOTIFICACIONES ---

function initializeNotificationsDropdown() {
    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    const profileDropdown = document.getElementById('profileDropdown');
        
    if (notificationsBtn && notificationsDropdown) {
        notificationsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            
            if (profileDropdown) {
                profileDropdown.style.display = 'none';
            }
            
            const isVisible = notificationsDropdown.style.display === 'block';
            notificationsDropdown.style.display = isVisible ? 'none' : 'block';
            
            const badge = notificationsBtn.querySelector('.notification-badge');
            if (badge) {
                badge.remove();
            }
        });
            
        document.addEventListener('click', function(e) {
            // Comprobación defensiva
            if (notificationsBtn && notificationsDropdown && !notificationsBtn.contains(e.target) && !notificationsDropdown.contains(e.target)) {
                notificationsDropdown.style.display = 'none';
            }
        });
    }
}

function renderNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;
    
    if (notifications.length === 0) {
        notificationsList.innerHTML = `
            <div class="notification-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No tienes notificaciones</p>
            </div>
        `;
        return;
    }
    
    const sortedNotifications = [...notifications].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    notificationsList.innerHTML = sortedNotifications.map(notification => {
        const icon = getNotificationIcon(notification.type);
        const text = getNotificationText(notification);
        const time = formatNotificationTime(notification.date);
        return `
            <div class="notification-item">
                <div class="notification-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-text">${text}</div>
                    <div class="notification-time">${time}</div>
                </div>
            </div>
        `;
    }).join('');
}

function addNotification(notification) {
    const exists = notifications.some(n => 
        n.type === notification.type &&
        n.reviewId === notification.reviewId &&
        n.username === notification.username &&
        Math.abs(new Date(n.date) - new Date(notification.date)) < 1000
    );
    
    if (exists) return;
    
    notifications.push({
        ...notification,
        date: notification.date || new Date().toISOString(),
        username: notification.username || 'Usuario',
        songName: notification.songName || null
    });

    renderNotifications();
    
    const notificationsBtn = document.getElementById('notificationsBtn');
    if (notificationsBtn) {
        let badge = notificationsBtn.querySelector('.notification-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'notification-badge';
            notificationsBtn.appendChild(badge);
        }
        // Calcular notificaciones no leídas reales
        const count = notifications.length; 
        badge.textContent = count > 99 ? '99+' : count; // Muestra el número
        badge.style.display = count > 0 ? 'block' : 'none';
    }
}

// CORREGIDO: Eliminada la duplicación
function getNotificationIcon(type) {
    switch(type) {
        case 'NewReaction':
        case 'NewNotification':
            return 'fas fa-heart';
        case 'NewComment':
            return 'fas fa-comment';
        case 'NewFollower':
            return 'fas fa-user-plus';
        default:
            return 'fas fa-bell';
    }
}

function getNotificationText(notification) {
    const username = notification.username || 'Alguien';
    
    // DETECTIVE: Si el TIPO dice explícitamente que es de comentario, confiamos en él
    // aunque el ID venga nulo.
    const isExplicitCommentType = notification.type === 'NewCommentReaction';
    
    const commentId = notification.commentId || notification.CommentId;
    const isCommentIdPresent = commentId && commentId !== '00000000-0000-0000-0000-000000000000';

    // Es comentario si el tipo lo dice O si trae ID
    const isComment = isExplicitCommentType || isCommentIdPresent;

    switch(notification.type) {
        case 'NewCommentReaction': // <--- ¡ESTE ES EL NUEVO CASO CLAVE!
        case 'NewReaction':
        case 'NewNotification':
        case 'Like':
            if (isComment) {
                return `<span class="notification-username">${username}</span> le dio me gusta a tu comentario`;
            }
            return `<span class="notification-username">${username}</span> le dio me gusta a tu reseña`;

        case 'NewComment':
            const songName = notification.songName || 'tu reseña';
            return `<span class="notification-username">${username}</span> comentó en tu review de <strong>${songName}</strong>`;
            
        case 'NewFollower':
            return `<span class="notification-username">${username}</span> comenzó a seguirte`;
            
        default:
            return `Nueva notificación de <span class="notification-username">${username}</span>`;
    }
}

export function formatNotificationTime(dateString) {
    if (!dateString) return 'Ahora';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}


async function loadNotifications() {
    const authToken = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    if (!authToken || !userId) return;
    
    try {
        // ¡CAMBIO CLAVE! Usamos la función importada de socialApi.js
        const notificationsData = await getNotifications(userId, authToken);
        
        notifications = []; // Limpiar notificaciones existentes
        
        // Enriquecer notificaciones con datos de usuario en paralelo
        const enrichedNotifications = await Promise.all(
            notificationsData.map(async (notification) => {
                // Obtener el UserId del actor (quien generó la notificación)
                const actorUserId = notification.UserId || notification.userId;
                let username = 'Usuario'; // Valor por defecto
                
                // Si hay un UserId, obtener el username del usuario
                if (actorUserId && actorUserId !== '00000000-0000-0000-0000-000000000000') {
                    try {
                        const userData = await getUser(actorUserId);
                        if (userData) {
                            username = userData.Username || userData.username || 'Usuario';
                        }
                    } catch (userError) {
                        console.debug('No se pudo obtener username para notificación:', actorUserId, userError);
                        // Mantener 'Usuario' como fallback
                    }
                }
                
                return {
                    type: notification.Type || notification.type || 'NewNotification',
                    date: notification.Date || notification.date || new Date().toISOString(),
                    username: username,
                    
                    // Capturamos TODO lo que pueda servir
                    reviewId: notification.ReviewId || notification.reviewId || notification.ReferenceId || null,
                    commentId: notification.CommentId || notification.commentId || null, // <--- Esto es vital
                    
                    userId: actorUserId
                };
            })
        );
        
        // Agregar las notificaciones enriquecidas
        enrichedNotifications.forEach(notification => {
            addNotification(notification);
        });
        
        renderNotifications();
        
    } catch (error) {
        const status = error.response?.status;
        const errorCode = error.code;
        const errorMessage = error?.message || String(error);
        
        const isExpectedError = status === 404 || 
                                status === 502 || 
                                status === 503 ||
                                errorCode === 'ECONNABORTED' ||
                                errorMessage.includes('timeout') ||
                                errorMessage.includes('Network Error') ||
                                errorMessage.includes('ERR_CONNECTION_REFUSED');
        
        if (!isExpectedError) {
            console.error('Error cargando notificaciones:', error);
        } else {
            console.debug('Servicio de notificaciones no disponible');
        }
    }
}

function initializeSignalR() {
    if (typeof signalR === 'undefined' || !signalR) return;
    
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    // Ajusta el puerto si es necesario
    const hubUrl = 'http://localhost:8002/notificationHub'; 

    if (!notificationConnection) {
        notificationConnection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl)
            .withAutomaticReconnect()
            .build();
    }

    if (notificationConnection.state === signalR.HubConnectionState.Disconnected) {
        notificationConnection.start()
            .then(() => {
                console.log('✅ SignalR Conectado.');
                return notificationConnection.invoke('JoinUserGroup', userId.toLowerCase());
            })
            .catch(err => console.error('Error SignalR:', err));
    }

    // LISTENER DEL EVENTO
    notificationConnection.off('ReceiveNotification'); 
    notificationConnection.on('ReceiveNotification', async function(notificationData) {
        console.log('🔔 Notificación recibida en Tiempo Real:', notificationData);
        
        // 1. Reproducir sonido
        playNotificationSound();

        // 2. OBTENER EL NOMBRE REAL (HIDRATACIÓN PREVIA)
        // Antes de agregar a la lista, buscamos quién es para quitar los "..."
        let realUsername = "Usuario"; 
        const senderId = notificationData.SenderId || notificationData.senderId;

        if (senderId && senderId !== '00000000-0000-0000-0000-000000000000') {
            try {
                const userData = await getUser(senderId);
                if (userData) {
                    // Usamos la misma lógica que confirmamos que funciona
                    const userObj = userData.result || userData.data || userData;
                    realUsername = userObj.username || userObj.Username || userObj.Name || "Usuario";
                }
            } catch (e) {
                console.warn("No se pudo obtener el nombre para la lista:", e);
            }
        }
        
        // 3. Mostrar alerta flotante (Toast)
        // (Esta función ya tiene su propia lógica, no tocamos nada)
        await showNotificationAlert(notificationData);
        
        // 4. AGREGAR A LA LISTA DE LA CAMPANITA (CORREGIDO)
        // Ahora pasamos 'realUsername' en lugar de '...'
        addNotification({
             type: notificationData.Type || notificationData.type,
             date: notificationData.Date || notificationData.date,
             username: realUsername, // <--- ¡AQUÍ ESTÁ EL CAMBIO!
             userId: senderId,
             reviewId: notificationData.ReferenceId,
             commentId: notificationData.CommentId || notificationData.commentId || null
        });

        // 5. Actualizar el badge rojo
        updateNotificationCount(1); 
    });
}

function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        console.warn('No se pudo reproducir el sonido de notificación:', error);
    }
}

async function showNotificationAlert(notification) {
    // 1. Obtener ID del emisor (Normalización para evitar errores)
    const actorUserId = notification.SenderId || notification.senderId || notification.userId || notification.UserId;
    
    let username = "Alguien";
    let userImage = '../Assets/default-avatar.png';

    // 2. HIDRATACIÓN DE USUARIO (Obtener nombre y foto real)
    if (actorUserId && actorUserId !== '00000000-0000-0000-0000-000000000000') {
        try {
            const userData = await getUser(actorUserId); 
            
            if (userData) {
                // Manejo robusto de la respuesta (por si viene en 'result' o directo)
                const userObj = userData.result || userData.data || userData;

                // PRIORIDAD: 'username' (Confirmado por tu consola)
                username = userObj.username || userObj.Username || userObj.Name || "Usuario";
                
                // Para la imagen: Busca 'avatar', 'image' o 'profilePicture'
                // (Si en tu consola no salía una propiedad de imagen, se usará el default)
                userImage = userObj.avatar || userObj.image || userObj.profilePicture || userObj.Avatar || '../Assets/default-avatar.png';
            }
        } catch (error) {
            console.warn("No se pudo cargar la info del usuario para la notificación", error);
        }
    }

    // 3. DEFINIR EL MENSAJE HTML
    let messageHtml = '';
    const rawType = notification.Type || notification.type || '';
    
    // LÓGICA DE DETECCIÓN MEJORADA
    const commentId = notification.CommentId || notification.commentId;
    // Es comentario si trae ID O si el tipo lo dice explícitamente
    const isComment = (commentId && commentId !== '00000000-0000-0000-0000-000000000000') || 
                      rawType === 'NewCommentReaction';

    const userHtml = `<strong style="color: #fff;">${username}</strong>`;

    if (rawType.includes('Reaction') || rawType.includes('Like')) {
        if (isComment) {
            messageHtml = `${userHtml} le dio me gusta a tu comentario`;
        } else {
            messageHtml = `${userHtml} le dio me gusta a tu reseña`;
        }
    }
    else if (rawType.includes('Comment')) {
        // Diferenciar si es like a comentario o comentario nuevo
        if (rawType.includes('Reaction')) {
             messageHtml = `${userHtml} le dio me gusta a tu comentario`;
        } else {
             messageHtml = `${userHtml} comentó tu reseña`;
        }
    } 
    else if (rawType.includes('Follow')) {
        messageHtml = `${userHtml} comenzó a seguirte`;
    } 
    else {
        messageHtml = `Nueva notificación de ${userHtml}`;
    }

    // 4. MOSTRAR LA ALERTA VISUAL (TOAST)
    createToastNotification(messageHtml, userImage, rawType);
}
// --- 7. POLLING DE NOTIFICACIONES ---

async function checkForNotifications(isInitialLoad = false) {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        stopNotificationPolling();
        return;
    }
    
    try {
        const allReviews = await getReviews();
        // Filtramos reviews del usuario actual
        const userReviews = allReviews.filter(review => {
            const reviewUserId = review.UserId || review.userId;
            return reviewUserId && (reviewUserId.toString() === userId.toString());
        });
        
        for (const review of userReviews) {
            const reviewId = review.id || review.ReviewId || review.reviewId;
            if (!reviewId) continue;
            
            const reviewIdStr = String(reviewId);
            
            // Obtenemos contadores actuales
            // Asegúrate de que estas funciones importadas no fallen
            let currentLikes = 0;
            let currentComments = 0;

            try {
                currentLikes = await getReviewReactionCount(reviewIdStr);
                const commentsData = await getCommentsByReview(reviewIdStr);
                currentComments = commentsData ? commentsData.length : 0;
            } catch (err) {
                console.warn(`Error obteniendo datos para review ${reviewIdStr}`, err);
                continue; 
            }
            
            const previousState = userReviewsState[reviewIdStr];
            
            // Carga inicial o nuevo estado base
            if (isInitialLoad || !previousState) {
                userReviewsState[reviewIdStr] = { likes: currentLikes, comments: currentComments };
                continue;
            }
            
            // --- AQUÍ ESTABA EL ERROR ---
            // Eliminamos la lógica que lanzaba notificaciones visuales desde el polling.
            // Eliminamos la llamada a 'getReviewContentInfo' que rompía el código.
            // Ahora solo actualizamos el estado interno para que la próxima vez compare bien.
            
            if (currentLikes !== previousState.likes || currentComments !== previousState.comments) {
                console.log(`🔄 Sincronizando estado (silencioso) para Review ${reviewIdStr}`);
                userReviewsState[reviewIdStr] = {
                    likes: currentLikes,
                    comments: currentComments
                };
                // NOTA: No llamamos a addNotification ni showAlert aquí.
                // Dejamos que SignalR haga el trabajo sucio en tiempo real.
            }
        }
        
    } catch (error) {
        // Cambiado a warn para no ensuciar tanto la consola si falla la red
        console.warn('Polling de notificaciones pausado momentáneamente:', error);
    }
}

function startNotificationPolling() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    
    stopNotificationPolling();
    checkForNotifications(true); // Carga inicial
    
    notificationPollingInterval = setInterval(() => {
        checkForNotifications(false);
    }, 15000); 
    
    console.log('✅ Polling de notificaciones iniciado (cada 15 segundos)');
}

function stopNotificationPolling() {
    if (notificationPollingInterval) {
        clearInterval(notificationPollingInterval);
        notificationPollingInterval = null;
        console.log('⏹️ Polling de notificaciones detenido');
    }
}


// --- 8. MODALS Y UTILIDADES COMPARTIDAS ---

// (Esta función es llamada por otros módulos, así que la exportamos y la hacemos global)
export function showAlert(message, type) {
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

    // Intenta encontrar 'main-content', si no, usa 'body'
    const mainContent = document.querySelector('.main-content') || document.body;
    mainContent.insertBefore(alertDiv, mainContent.firstChild);

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

// (Exportamos estas también para que los handlers de reseñas puedan usarlas)
export function showLoginRequiredModal() {
    const modalOverlay = document.getElementById('loginRequiredModalOverlay');
    if (modalOverlay) {
        modalOverlay.style.display = 'flex';
    }
}

function hideLoginRequiredModal() {
    const modalOverlay = document.getElementById('loginRequiredModalOverlay');
    if (modalOverlay) {
        modalOverlay.style.display = 'none';
    }
}

function createToastNotification(messageHtml, image, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'custom-alert notification-toast';
    // Estilos inline o asegúrate de tenerlos en CSS
    alertDiv.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        background: #1e1e1e; border: 1px solid #333; border-left: 4px solid #EC4899;
        color: white; padding: 15px; border-radius: 8px;
        display: flex; align-items: center; gap: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        animation: slideIn 0.3s ease-out;
        min-width: 300px;
    `;

    const iconClass = type === 'NewFollower' ? 'fa-user-plus' : (type.includes('Reaction') ? 'fa-heart' : 'fa-bell');
    const iconColor = type.includes('Reaction') ? '#EC4899' : '#fff';

    alertDiv.innerHTML = `
        <img src="${image}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
        <div style="flex:1; font-size: 0.9rem;">${messageHtml}</div>
        <i class="fas ${iconClass}" style="color: ${iconColor};"></i>
    `;

    document.body.appendChild(alertDiv);

    // Auto eliminar a los 4 segundos
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => alertDiv.remove(), 500);
    }, 4000);
}
function updateNotificationCount(amount) {
    const btn = document.getElementById('notificationsBtn');
    if (!btn) return;
    
    let badge = btn.querySelector('.notification-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'notification-badge';
        badge.textContent = '0';
        btn.appendChild(badge);
    }
    
    let current = parseInt(badge.textContent) || 0;
    badge.textContent = current + amount;
    badge.style.display = 'block';
}
// CORREGIDO: Eliminada la duplicación
function initializeLoginRequiredModal() {
    const goToLoginBtn = document.getElementById('goToLoginBtn');
    const cancelLoginRequiredBtn = document.getElementById('cancelLoginRequiredBtn');
    const loginRequiredModalOverlay = document.getElementById('loginRequiredModalOverlay');

    if (goToLoginBtn) {
        goToLoginBtn.addEventListener('click', function() {
            window.location.href = getLoginPath();
        });
    }

    if (cancelLoginRequiredBtn) {
        cancelLoginRequiredBtn.addEventListener('click', function() {
            hideLoginRequiredModal();
        });
    }

    if (loginRequiredModalOverlay) {
        loginRequiredModalOverlay.addEventListener('click', function(e) {
          if (e.target === loginRequiredModalOverlay) {
                hideLoginRequiredModal();
            }
        });
    }
}

