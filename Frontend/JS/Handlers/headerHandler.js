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
    getUser,
    getReviewDetails,
    getCommentById,
    markNotificationAsRead
} from '../APIs/socialApi.js'; 
import { getOrCreateSong } from '../APIs/contentApi.js';

// --- 2. VARIABLES GLOBALES DEL HEADER ---
let notificationConnection = null;
let notifications = []; // Array para almacenar notificaciones
let userReviewsState = {}; // Estado para polling
let notificationPollingInterval = null; // Intervalo de polling
const socialAPIURL = "https://social-service-1024349878515.us-central1.run.app"; // Cambia esto si es necesario
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

// Función auxiliar para obtener la ruta correcta de Assets según donde estemos
function getAssetsPath() {
    const path = window.location.pathname;
    
    // Si estamos dentro de la carpeta Pages
    if (path.includes('/Pages/') || path.includes('/pages/')) {
        return '../../Assets/';
    }
    // Si estamos en la raiz o en HTML
    return '../Assets/';
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
        destinationUrl = `./../${fileName}?id=${encodedId}`;
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
        destinationUrl = `/HTML/Pages/profile.html?userId=${encodedUserId}`;
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
    
    // Contenedores
    const loginContainer = document.getElementById('loginContainer');
    const profileContainer = document.getElementById('profileContainer');
    const notificationsContainer = document.getElementById('notificationsContainer');
    const addReviewContainer = document.getElementById('addReviewContainer');
    const addReviewBtn = document.getElementById('addReviewBtn');
    const loginBtn = document.getElementById('loginBtn');

    // Elementos de imagen
    const profileBtn = document.getElementById('profileBtn');
    
    // Ruta del avatar por defecto
    const defaultAvatar = getAssetsPath() + 'default-avatar.png';

    // 1. Renderizar Botón Circular del Navbar (CORREGIDO)
    const renderProfileBtnImage = (srcUrl) => {
        if (!profileBtn) return;
        
        profileBtn.innerHTML = ''; 
        
        // --- ESTILOS CORREGIDOS (Sin círculo gris feo) ---
        profileBtn.style.padding = '0';
        profileBtn.style.border = 'none'; // Quitamos el borde que causaba el anillo
        profileBtn.style.backgroundColor = '#1e1e1e'; // Fondo más oscuro (igual al dropdown)
        profileBtn.style.overflow = 'hidden'; 
        profileBtn.style.display = 'flex';
        profileBtn.style.alignItems = 'center';
        profileBtn.style.justifyContent = 'center';
        profileBtn.style.width = '40px'; 
        profileBtn.style.height = '40px';
        profileBtn.style.borderRadius = '50%';
        profileBtn.style.cursor = 'pointer'; // Asegurar cursor de mano
        
        const img = document.createElement('img');
        img.src = srcUrl;
        img.alt = username || "Perfil";
        
        // La imagen cubre todo el contenedor
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.style.display = "block"; 
        
        img.onerror = function() {
            if (this.src !== defaultAvatar) this.src = defaultAvatar;
        };
        
        profileBtn.appendChild(img);
    };

    // 2. Renderizar Imagen del Menú Desplegable
    const renderDropdownImage = (srcUrl) => {
        const dropdownHeader = document.querySelector('.profile-dropdown-header');
        if (!dropdownHeader) return;

        // Limpieza y estilos
        const oldElements = dropdownHeader.querySelectorAll('img, i, svg');
        oldElements.forEach(el => el.remove());

        dropdownHeader.style.display = 'flex';
        dropdownHeader.style.alignItems = 'center'; 
        dropdownHeader.style.gap = '12px';          
        dropdownHeader.style.padding = '15px';      

        const img = document.createElement('img');
        img.src = srcUrl;
        img.alt = "Avatar";
        
        // Estilos para que coincida con el texto
        img.style.width = '35px';       
        img.style.height = '35px';
        img.style.borderRadius = '50%'; 
        img.style.objectFit = 'cover';
        img.style.backgroundColor = '#1e1e1e'; // Fondo oscuro por seguridad
        img.style.border = '1px solid rgba(255,255,255,0.1)'; 
        img.style.display = 'block';

        img.onerror = function() {
            if (this.src !== defaultAvatar) this.src = defaultAvatar;
        };

        dropdownHeader.prepend(img);
    };

    if (!authToken) {
        // Estado: No Logueado
        if (loginContainer) loginContainer.style.display = 'flex';
        if (profileContainer) profileContainer.style.display = 'none';
        if (notificationsContainer) notificationsContainer.style.display = 'none';
        if (addReviewContainer) addReviewContainer.style.display = 'none';
        if (loginBtn) loginBtn.onclick = function() { window.location.href = getLoginPath(); };
    } else {
        // Estado: Logueado
        if (loginContainer) loginContainer.style.display = 'none';
        if (profileContainer) profileContainer.style.display = 'block';
        if (notificationsContainer) notificationsContainer.style.display = 'block';
        if (addReviewContainer) addReviewContainer.style.display = 'block';
        if (usernameDisplay) usernameDisplay.textContent = username || 'Usuario';
        
        // Recuperar avatar guardado o usar default
        const savedAvatar = localStorage.getItem('userAvatar');
        const avatarToUse = savedAvatar && savedAvatar !== 'null' ? savedAvatar : defaultAvatar;

        // Renderizar
        renderProfileBtnImage(avatarToUse);
        renderDropdownImage(avatarToUse);

        // Actualizar en segundo plano
        const currentUserId = localStorage.getItem('userId');
        if (currentUserId) {
            (async () => {
                try {
                    const { getUser } = await import('../APIs/socialApi.js');
                    const userData = await getUser(currentUserId);
                    
                    if (userData) {
                        const userObj = userData.result || userData.data || userData;
                        // Lógica para detectar si NO tiene foto y limpiar caché
                        let newAvatar = userObj.imgProfile || userObj.ImgProfile || userObj.avatar || userObj.image || userObj.profilePicture;
                        
                        if (!newAvatar || newAvatar === 'null' || newAvatar.trim() === '') {
                            newAvatar = null;
                        }

                        if (newAvatar) {
                            if (newAvatar !== savedAvatar) {
                                localStorage.setItem('userAvatar', newAvatar);
                                renderProfileBtnImage(newAvatar);
                                renderDropdownImage(newAvatar);
                            }
                        } else {
                            // Si el usuario no tiene foto pero nosotros teníamos una guardada, volver a default
                            if (savedAvatar && savedAvatar !== defaultAvatar) {
                                localStorage.removeItem('userAvatar');
                                renderProfileBtnImage(defaultAvatar);
                                renderDropdownImage(defaultAvatar);
                            }
                        }
                    }
                } catch (e) { }
            })();
        }
        
        if (addReviewBtn) {
            const newAddReviewBtn = addReviewBtn.cloneNode(true);
            addReviewBtn.parentNode.replaceChild(newAddReviewBtn, addReviewBtn);
            newAddReviewBtn.addEventListener('click', function(e) {
                e.preventDefault(); e.stopPropagation();
                if (typeof window.showCreateReviewModal === 'function') window.showCreateReviewModal();
                else {
                    const modal = document.getElementById('createReviewModalOverlay');
                    if (modal) modal.style.display = 'flex';
                }
            });
        }
        
        loadNotifications();
        setTimeout(() => {
            if (typeof signalR !== 'undefined' && signalR) initializeSignalR();
        }, 1000);
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
    
    if (!notifications || notifications.length === 0) {
        notificationsList.innerHTML = `
            <div class="notification-empty" style="padding: 20px; text-align: center; color: #666;">
                <i class="fas fa-bell-slash" style="font-size: 24px; margin-bottom: 10px; opacity: 0.5;"></i>
                <p style="margin: 0; font-size: 0.9rem;">No tienes notificaciones</p>
            </div>
        `;
        return;
    }

    // Generamos el HTML
    notificationsList.innerHTML = notifications.map(n => {
        const iconClass = getNotificationIcon(n.type);
        const time = formatNotificationTime(n.date);
        
        // --- ESTILOS VISUALES (El toque "Premium") ---
        
        // Fondo: Si es nueva, un negro un poco más claro (#252525). Si es vista, negro profundo (#121212).
        const bgStyle = n.read ? '#121212' : '#222';
        
        // Borde lateral: Si es nueva, una línea morada a la izquierda.
        const borderStyle = n.read ? 'border-left: 3px solid transparent;' : 'border-left: 3px solid #8B5CF6;';
        
        // Color del nombre: Magenta si es nueva, Gris si es vieja
        const nameColor = n.read ? '#888' : '#EC4899';
        
        // Color del texto: Blanco si es nueva, Gris oscuro si es vieja
        const textColor = n.read ? '#666' : '#eee';

        // Preparamos el HTML del mensaje
        let displayHtml = n.messageHtml;
        
        // Forzamos el color del nombre usando replace para no depender de clases externas
        // Buscamos el span del username y le inyectamos el color correcto
        displayHtml = displayHtml.replace(/style="[^"]*"/, '').replace('class="notification-username"', `style="color: ${nameColor}; font-weight: 600;"`);
        
        // Si el mensaje no tiene el span (por alguna razón), lo envolvemos
        if (!displayHtml.includes('style=')) {
             displayHtml = displayHtml.replace(n.username, `<span style="color: ${nameColor}; font-weight: 600;">${n.username}</span>`);
        }

        // Referencia segura
        const refValue = n.reviewId || n.userId || '';

        return `
            <div class="notification-item js-notification-item ${n.read ? 'read' : 'unread'}" 
                 data-id="${n.id}" 
                 data-type="${n.type}" 
                 data-ref="${refValue}" 
                 style="cursor: pointer; padding: 12px 15px; border-bottom: 1px solid #1f1f1f; display:flex; align-items:center; gap:15px; background-color: ${bgStyle}; ${borderStyle} transition: background 0.2s;">
                
                <div style="width: 42px; height: 42px; min-width: 42px; border-radius: 50%; background: linear-gradient(135deg, #a855f7, #ec4899); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                    <i class="${iconClass}" style="color: #fff; font-size: 1.1rem;"></i>
                </div>
                
                <div class="notification-content" style="flex:1;">
                    <div class="notification-text" style="color: ${textColor}; font-size: 0.9rem; line-height: 1.4;">
                        ${displayHtml}
                    </div>
                    <div class="notification-time" style="color: #666; font-size: 0.75rem; margin-top: 4px;">${time}</div>
                </div>
            </div>
        `;
    }).join('');

    // Re-asignar listeners (Lógica intacta)
    const items = notificationsList.querySelectorAll('.js-notification-item');
    items.forEach(item => {
        item.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const type = this.getAttribute('data-type');
            const ref = this.getAttribute('data-ref');
            
            const dropdown = document.getElementById('notificationsDropdown');
            if(dropdown) dropdown.style.display = 'none';

            handleNotificationClick(type, ref, id, this);
        });
    });
}

function addNotification(notification) {
    // Validación de seguridad para no duplicar por ID
    const exists = notifications.some(n => n.id === notification.id);
    if (exists) return;
    
    // Generar el texto HTML con el nombre correcto
    const tempObj = {
        type: notification.type,
        username: notification.username || 'Usuario',
        commentId: notification.commentId
    };

    const newNotif = {
        id: notification.id || notification.Id,
        type: notification.type,
        date: notification.date || new Date().toISOString(),
        username: notification.username || 'Usuario',
        userId: notification.userId,
        
        // CORRECCIÓN CLAVE: Usamos 'messageHtml' para que coincida con renderNotifications
        messageHtml: getNotificationText(tempObj), 
        
        read: false, 
        reviewId: notification.reviewId || notification.referenceId,
        commentId: notification.commentId
    };

    // Agregamos al principio del array
    notifications.unshift(newNotif);

    // Renderizamos de nuevo la lista y actualizamos el contador
    renderNotifications();
    updateBadgeCount();
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
            return `<span class="notification-username">${username}</span> comentó tu reseña`;            
        case 'NewFollower':
            return `<span class="notification-username">${username}</span> comenzó a seguirte`;
            
        default:
            return `Nueva notificación de <span class="notification-username">${username}</span>`;
    }
}

export function formatNotificationTime(dateString) {
    if (!dateString) return 'Ahora';
    
    // TRUCO CLAVE: Si la fecha es un string ISO (tiene 'T') pero no tiene 'Z' ni offset,
    // le agregamos 'Z' para decirle al navegador que es hora UTC (Universal).
    // Esto arregla el desfase de 3/4/5 horas.
    let dateToParse = dateString;
    if (typeof dateString === 'string' && dateString.indexOf('T') > -1 && !dateString.endsWith('Z') && !dateString.includes('+')) {
        dateToParse += 'Z';
    }

    const date = new Date(dateToParse);
    const now = new Date();
    
    // Calcular diferencia en milisegundos
    let diffMs = now - date;

    // Si la diferencia es negativa (la fecha es "del futuro" por error de reloj), asumimos 0
    if (diffMs < 0) diffMs = 0;

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}


// REEMPLAZAR COMPLETAMENTE ESTA FUNCIÓN
// REEMPLAZAR SOLAMENTE ESTA FUNCIÓN EN headerHandler.js
async function loadNotifications() {
    const authToken = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    if (!authToken || !userId) return;

    try {
        const notificationsData = await getNotifications(userId, authToken);
        
        notifications = []; 

        const enrichedNotifications = await Promise.all(
            notificationsData.map(async (n) => {
                
                // A. Normalización
                const id = n.Id || n.id || n.Id_Notification;
                const type = n.Type || n.type;
                const date = n.Date || n.date;
                const isRead = (n.IsRead === true || n.isRead === true || n.State === 'Read' || n.state === 'Read' || n.read === true);
                
                // B. Identificar Sender (Buscamos en todos lados)
                let senderId = n.SenderId || n.senderId;
                const reactionObj = n.Reaction || n.reaction;
                const commentObj = n.Comment || n.comment;

                if (!senderId || senderId === '00000000-0000-0000-0000-000000000000') {
                    if (reactionObj) senderId = reactionObj.UserId || reactionObj.userId;
                    else if (commentObj) senderId = commentObj.IdUser || commentObj.idUser || commentObj.userId;
                }

                // C. OBTENER NOMBRE REAL (Lógica Corregida "Anti-Usuario")
                let finalUsername = 'Usuario'; // Valor por defecto
                const senderObj = n.Sender || n.sender || n.User || n.user;
                let candidateName = null;

                // 1. Buscamos un nombre candidato
                if (senderObj && (senderObj.Username || senderObj.username || senderObj.Name)) {
                    candidateName = senderObj.Username || senderObj.username || senderObj.Name;
                } else if (n.SenderName || n.senderName) {
                    candidateName = n.SenderName || n.senderName;
                }

                // 2. VALIDACIÓN: Solo usamos el candidato si NO es "Usuario"
                if (candidateName && candidateName !== 'Usuario' && candidateName.trim() !== '') {
                    finalUsername = candidateName;
                } 
                // 3. Si no tenemos nombre (o era "Usuario") y tenemos ID -> LLAMAMOS A LA API
                else if (senderId && senderId !== userId && senderId !== '00000000-0000-0000-0000-000000000000') {
                    try {
                        const userData = await getUser(senderId);
                        if (userData) {
                            const uObj = userData.result || userData.data || userData;
                            // Ahora sí asignamos el nombre real
                            finalUsername = uObj.Username || uObj.username || uObj.Name || 'Usuario';
                        }
                    } catch (e) {
                        // Fallo silencioso
                    }
                }

                // D. Referencias
                let finalRefId = n.ReferenceId || n.referenceId || n.ReviewId || n.reviewId;
                if (!finalRefId && reactionObj) finalRefId = reactionObj.ReviewId || reactionObj.reviewId;
                if (!finalRefId && commentObj) finalRefId = commentObj.ReviewId || commentObj.reviewId;

                // E. Generar mensaje
                const tempObjForText = { 
                    type: type, 
                    username: finalUsername, 
                    commentId: n.CommentId || n.commentId 
                };
                
                return {
                    id: id,
                    type: type,
                    date: date,
                    read: isRead,
                    username: finalUsername,
                    userId: senderId,
                    messageHtml: getNotificationText(tempObjForText), 
                    reviewId: finalRefId || null,
                    commentId: n.CommentId || n.commentId || null
                };
            })
        );

        // Ordenar
        notifications = enrichedNotifications.sort((a, b) => {
            if (a.read === b.read) return new Date(b.date) - new Date(a.date);
            return a.read ? 1 : -1;
        });

        renderNotifications(); 
        updateBadgeCount(); // Usamos la función BUENA

    } catch (error) {
        console.error('Error cargando notificaciones:', error);
    }
}

// REEMPLAZAR COMPLETAMENTE ESTA FUNCIÓN
function updateBadgeCount() {
    // Cuenta REAL basada en el array actual
    const unreadCount = notifications.filter(n => !n.read).length;
    
    const btn = document.getElementById('notificationsBtn');
    if (!btn) return;
        
    let badge = btn.querySelector('.notification-badge');
    
    // Si hay no leídas y no existe el badge, lo creamos
    if (!badge && unreadCount > 0) {
        badge = document.createElement('span');
        badge.className = 'notification-badge';
        btn.appendChild(badge);
    }
    
    if (badge) {
        // Actualizamos el número
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        // Solo visible si hay más de 0
        badge.style.display = unreadCount > 0 ? 'block' : 'none';
    }
}
// REEMPLAZAR COMPLETAMENTE ESTA FUNCIÓN
function initializeSignalR() {
    if (typeof signalR === 'undefined' || !signalR) return;
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    // Asegúrate de que este puerto sea el correcto (8002 o 5000 según tu setup)
    const hubUrl = `${socialAPIURL}/notificationHub`; 

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

    notificationConnection.off('ReceiveNotification'); 
    notificationConnection.on('ReceiveNotification', async function(notificationData) {
        console.log('🔔 Nueva Notificación SignalR:', notificationData);
        
        // 1. Obtener datos
        const senderId = notificationData.SenderId || notificationData.senderId;
        const refId = notificationData.ReferenceId || notificationData.referenceId;
        const type = notificationData.Type || notificationData.type;
        const notifId = notificationData.Id || notificationData.id || notificationData.Id_Notification;

        // 2. HIDRATACIÓN EN VIVO (Esperamos el nombre ANTES de pintar)
        let realUsername = "Usuario";
        
        if (senderId && senderId !== '00000000-0000-0000-0000-000000000000') {
            try {
                const userData = await getUser(senderId);
                if (userData) {
                    const userObj = userData.result || userData.data || userData;
                    realUsername = userObj.username || userObj.Username || userObj.Name || "Usuario";
                }
            } catch (e) {
                console.warn("SignalR: No se pudo obtener nombre:", e);
            }
        }

        // 3. Audio y Toast
        if (typeof playNotificationSound === 'function') playNotificationSound();
        
        // Usamos el nombre real para el toast
        const toastData = { ...notificationData, username: realUsername, referenceId: refId };
        await showNotificationAlert(toastData);

        // 4. AGREGAR A LA LISTA (Dropdown)
        if (typeof addNotification === 'function') {
            addNotification({
                id: notifId, 
                type: type,
                date: notificationData.Date || notificationData.date,
                username: realUsername, // ¡IMPORTANTE! Pasamos el nombre ya resuelto
                userId: senderId,
                read: false, // Nueva = No leída
                
                reviewId: refId,
                commentId: notificationData.CommentId || null
            });
        }

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

    const refId = rawType.includes('Follow') 
            ? actorUserId 
            : (notification.ReferenceId || notification.referenceId);

    createToastNotification(messageHtml, userImage, rawType, refId);
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

    // Insertar directamente en el body para que esté por encima de los modales
    document.body.appendChild(alertDiv);
    
    // Asegurar que el alert tenga posición fixed y z-index alto
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.left = '50%';
    alertDiv.style.transform = 'translateX(-50%)';
    alertDiv.style.zIndex = '10010';
    alertDiv.style.pointerEvents = 'auto';
    alertDiv.style.width = '95%';
    alertDiv.style.maxWidth = '500px';
    alertDiv.style.margin = '0 auto';

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

function createToastNotification(messageHtml, image, type, referenceId) {
    const alertDiv = document.createElement('div');
    // Clase extra para especificidad si hace falta
    alertDiv.className = 'custom-alert notification-toast toast-replica';
    
    // Configuración de ícono derecho
    let rightIconClass = 'fas fa-bell';
    let rightIconColor = '#fff';

    if (type.includes('Like') || type.includes('Reaction')) {
        rightIconClass = 'fas fa-heart';
        rightIconColor = '#EC4899'; 
    } else if (type.includes('Comment')) {
        rightIconClass = 'fas fa-comment';
        rightIconColor = '#A855F7'; 
    } else if (type.includes('Follow')) {
        rightIconClass = 'fas fa-user-plus';
        rightIconColor = '#3B82F6'; 
    }

    // ESTILOS FORZADOS (!important) para igualar la captura
    alertDiv.style.cssText = `
        position: fixed !important; 
        top: 85px !important; 
        right: 20px !important; 
        z-index: 99999 !important;
        
        /* Fondo gris oscuro (no negro total) */
        background-color: #222 !important; 
        background-image: none !important;
        
        /* Sombra suave */
        box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
        
        /* Bordes: Borde rosa a la izquierda, sin borde alrededor */
        border: none !important;
        border-left: 5px solid #EC4899 !important; 
        border-radius: 4px !important; 
        
        /* Dimensiones y Layout */
        min-width: 320px !important;
        max-width: 420px !important;
        padding: 14px 18px !important;
        margin: 0 !important;
        
        /* Alineación perfecta al centro */
        display: flex !important; 
        align-items: center !important; 
        justify-content: space-between !important;
        gap: 15px !important;
        
        /* Texto */
        color: #fff !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        cursor: pointer !important; 
        
        /* Animación */
        opacity: 0; 
        transform: translateX(20px); 
        transition: opacity 0.3s ease, transform 0.3s ease !important;
    `;

    // Limpieza de texto: Quitamos HTML previo y la fecha
    // En la captura el nombre es Bold y el resto normal, todo blanco/gris claro.
    const cleanText = messageHtml.replace(/<[^>]*>?/gm, '').trim();
    
    // Reconstrucción del mensaje: Nombre en Bold
    let finalMessageHtml = `<span style="font-weight: 600 !important; color: #fff !important; font-size: 0.95rem !important;">${cleanText}</span>`;
    
    // Intentamos separar el nombre para ponerlo en bold (heurística simple: primera palabra o hasta el primer espacio)
    // Si prefieres usar el HTML que ya traía el nombre separado, podemos usarlo, pero limpiando estilos.
    // Usaremos una estrategia segura: Si el mensaje original tenía tags, extraemos el nombre.
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = messageHtml;
    const nameSpan = tempDiv.querySelector('.notification-username') || tempDiv.querySelector('strong');
    
    if (nameSpan) {
        const name = nameSpan.textContent;
        const rest = tempDiv.textContent.replace(name, '');
        finalMessageHtml = `
            <span style="font-weight: 700 !important; color: #fff !important; font-size: 0.95rem !important;">${name}</span>
            <span style="font-weight: 400 !important; color: #e0e0e0 !important; font-size: 0.95rem !important;">${rest}</span>
        `;
    }

    // HTML INTERNO (Sin la fecha "Ahora")
    alertDiv.innerHTML = `
        <div style="display: flex !important; align-items: center !important; gap: 12px !important; flex: 1 !important;">
            <img src="${image}" 
                 style="width: 28px !important; height: 28px !important; min-width: 28px !important; border-radius: 50% !important; object-fit: cover !important; background: #333 !important;" 
                 onerror="this.src='../Assets/default-avatar.png'">
            
            <div style="line-height: 1.2 !important; text-align: left !important;">
                ${finalMessageHtml}
            </div>
        </div>

        <div style="margin-left: 10px !important; display: flex !important; align-items: center !important;">
            <i class="${rightIconClass}" style="color: ${rightIconColor} !important; font-size: 1.1rem !important;"></i>
        </div>
    `;

    // Click
    alertDiv.addEventListener('click', () => {
        handleNotificationClick(type, referenceId);
        removeToast(alertDiv);
    });

    document.body.appendChild(alertDiv);

    // Animación de Entrada
    requestAnimationFrame(() => {
        alertDiv.style.opacity = '1';
        alertDiv.style.transform = 'translateX(0)';
    });

    // Auto-cierre
    setTimeout(() => {
        removeToast(alertDiv);
    }, 5000); 
}

function removeToast(element) {
    if (element && element.parentNode) {
        element.style.opacity = '0';
        element.style.transform = 'translateX(20px)';
        setTimeout(() => element.remove(), 300);
    }
}

async function handleNotificationClick(type, referenceId, notificationId, element) {
    console.log(`🔔 Click en notificación. ID: ${notificationId}, Ref: ${referenceId}`);

    // 1. MARCAR COMO LEÍDA
    if (notificationId && notificationId !== 'undefined') {
        if (element) {
        // Fondo y Borde
        element.classList.remove('unread');
        element.classList.add('read');
        element.style.backgroundColor = '#121212';
        element.style.borderLeft = '3px solid transparent'; // Quita la línea morada
        
        // Texto principal
        const textDiv = element.querySelector('.notification-text');
        if (textDiv) textDiv.style.color = '#666';

        // Nombre de usuario (De magenta a gris)
        const usernameSpan = element.querySelector('span[style*="color"]');
        if (usernameSpan) {
            usernameSpan.style.color = '#888'; 
            usernameSpan.style.fontWeight = 'normal';
        }
        
        // Ocultar cualquier dot residual
        const dot = element.querySelector('.unread-dot');
        if(dot) dot.remove();
    }
        
        // Actualizar estado local
        const notifIndex = notifications.findIndex(n => n.id === notificationId);
        if(notifIndex > -1) notifications[notifIndex].read = true;
        updateBadgeCount();
        
        if (typeof markNotificationAsRead === 'function') {
            markNotificationAsRead(notificationId);
        }
    }

    // 2. VALIDACIÓN DE REFERENCIA (Aquí evitamos el Error 400)
    if (!referenceId || referenceId === 'null' || referenceId === 'undefined' || referenceId === '00000000-0000-0000-0000-000000000000') {
        console.warn("⚠️ No se puede navegar: ID de referencia inválido o vacío.");
        if (typeof showAlert === 'function') {
            showAlert('No se pudo abrir el detalle: La notificación no contiene la referencia al contenido.', 'warning');
        }
        return;
    }

    // 3. NAVEGACIÓN
    if (type === 'NewFollower') {
        const currentPath = window.location.pathname;
        let profileUrl = currentPath.includes('/Pages/') 
            ? `profile.html?userId=${referenceId}` 
            : `Pages/profile.html?userId=${referenceId}`;
        window.location.href = profileUrl;
        return;
    }

    if (['NewReaction', 'ReviewLike', 'NewComment', 'NewCommentReaction', 'CommentLike'].includes(type)) {
        try {
            // Llamada segura a la API
            const responseData = await getReviewDetails(referenceId);
            
            if (!responseData) {
                console.warn("La reseña no existe o fue eliminada.");
                showAlert('El contenido asociado a esta notificación ya no está disponible.', 'error');
                return;
            }

            const reviewObj = responseData.review || responseData;
            const userObj = responseData.user || null;
            const songObj = responseData.song || null;
            const albumObj = responseData.album || null;

            openReviewModal(reviewObj, userObj, songObj || albumObj);
        } catch (error) {
            console.error("Error abriendo modal:", error);
        }
    }
}


// =========================================================================
// 2. FUNCIÓN AUXILIAR: POBLAR Y MOSTRAR EL MODAL (MODO VISUALIZACIÓN)
// =========================================================================
async function openReviewModal(review, user, content) {
    const modalOverlay = document.getElementById('reviewDetailModalOverlay');
    const closeBtn = document.getElementById('closeReviewDetailModal');
    const contentDiv = document.getElementById('reviewDetailContent'); 

    if (!modalOverlay) return;

    console.log("🔍 [Modal] Abriendo para reseña:", review);

    // --- A. DATOS BÁSICOS ---
    const reviewId = review.reviewId || review.Id_Review || review.id;
    const ratingVal = review.rating || review.Rating || 0;
    const reviewBody = review.content || review.Content || review.text || review.Text || "";
    const reviewTitle = review.title || review.Title || "";
    
    // --- B. DATOS DE USUARIO ---
    let username = "Usuario";
    let avatar = "../Assets/default-avatar.png";
    const userId = review.userId || review.UserId || (user ? (user.userId || user.UserId) : null);

    if (user) {
        username = user.username || user.Username || username;
        avatar = user.imgProfile || user.ImgProfile || user.avatar || user.image || avatar;
    } else if (userId) {
        try {
            if(typeof getUser !== 'undefined'){
                 const uData = await getUser(userId);
                 if(uData) {
                    const uObj = uData.result || uData.data || uData;
                    username = uObj.Username || uObj.username || username;
                    avatar = uObj.imgProfile || uObj.ImgProfile || uObj.avatar || avatar;
                 }
            }
        } catch(e) {}
    }

    // --- C. DATOS DE CONTENIDO ---
    let contentName = "Contenido";
    let artistName = "Artista";
    let contentImage = "../Assets/default-avatar.png";
    let contentType = "song";

    // Lógica de rescate de datos (Igual que antes para asegurar que se vea bien)
    if (content) {
        contentName = content.Title || content.title || content.name || contentName;
        artistName = content.ArtistName || content.artistName || content.artist || artistName;
        contentImage = content.CoverImage || content.coverImage || content.Image || content.image || contentImage;
        if(content.AlbumId || content.apiAlbumId) contentType = "album";
    } 
    else if (review.song || review.Song) {
        const s = review.song || review.Song;
        contentName = s.Title || s.title || contentName;
        artistName = s.ArtistName || s.artistName || artistName;
        contentImage = s.Image || s.image || contentImage;
    } 
    else if (review.album || review.Album) {
        contentType = "album";
        const a = review.album || review.Album;
        contentName = a.Title || a.title || contentName;
        artistName = a.ArtistName || a.artistName || artistName;
        contentImage = a.Image || a.image || contentImage;
    }
    else {
        const rawSongId = review.songId || review.SongId;
        const rawAlbumId = review.albumId || review.AlbumId;

        if (rawSongId) {
            contentType = 'song';
            try {
                const contentApi = window.contentApi || await import('../APIs/contentApi.js');
                let songData = null;
                if (contentApi.getSongByDbId) try { songData = await contentApi.getSongByDbId(rawSongId); } catch(e){}
                if (!songData && contentApi.getSongById) try { songData = await contentApi.getSongById(rawSongId); } catch(e){}
                if (!songData && contentApi.getSongByApiId) try { songData = await contentApi.getSongByApiId(rawSongId); } catch(e){}

                if (songData) {
                    contentName = songData.Title || songData.title || contentName;
                    artistName = songData.ArtistName || songData.artistName || (songData.Artist ? songData.Artist.Name : artistName);
                    contentImage = songData.Image || songData.image || contentImage;
                }
            } catch (err) { console.error(err); }
        } 
        else if (rawAlbumId) {
            contentType = 'album';
            try {
                const contentApi = window.contentApi || await import('../APIs/contentApi.js');
                let albumData = null;
                if (contentApi.getAlbumById) try { albumData = await contentApi.getAlbumById(rawAlbumId); } catch(e){}
                if (!albumData && contentApi.getAlbumByApiId) try { albumData = await contentApi.getAlbumByApiId(rawAlbumId); } catch(e){}

                if (albumData) {
                    contentName = albumData.Title || albumData.title || contentName;
                    contentImage = albumData.Image || albumData.image || contentImage;
                    if(albumData.ArtistName) artistName = albumData.ArtistName;
                    else if(albumData.artistName) artistName = albumData.artistName;
                }
            } catch (err) { console.error(err); }
        }
    }

    const isDeepPath = window.location.pathname.includes('/Pages/');
    const defaultAvatarPath = isDeepPath ? '../../Assets/default-avatar.png' : '../Assets/default-avatar.png';
    if (!avatar || avatar.includes('default-avatar')) avatar = defaultAvatarPath;
    if (!contentImage || contentImage.includes('default-avatar')) contentImage = defaultAvatarPath;

    const likesCount = review.likes || review.Likes || 0;
    const commentsCount = review.comments || review.Comments || 0;

    const renderStarsLocal = (rating) => {
        let stars = '';
        for (let i = 0; i < 5; i++) {
            stars += `<span style="color: ${i < rating ? '#fbbf24' : '#4b5563'}; font-size: 1rem; margin-right: 2px;">★</span>`;
        }
        return stars;
    };

    // --- D. RENDERIZADO HTML (SIN LINKS) ---
    if (contentDiv) {
        contentDiv.innerHTML = `
            <div class="review-detail-main" style="padding: 1.5rem; padding-bottom: 50px; color: white;">
                
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 1.5rem;">
                    <img src="${avatar}" 
                         style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 1px solid #333;"
                         onerror="this.src='${defaultAvatarPath}'">
                    <div>
                        <div style="font-weight: 700; font-size: 1.1rem; color: #fff;">${username}</div>
                    </div>
                </div>

                <div style="background: #252525; border: 1px solid #333; border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 12px; margin-bottom: 1.5rem;">
                    <img src="${contentImage}" 
                         style="width: 48px; height: 48px; border-radius: 4px; object-fit: cover;"
                         onerror="this.src='${defaultAvatarPath}'">
                    <div style="flex: 1; overflow: hidden;">
                        <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${contentName}</h4>
                        <p style="margin: 4px 0 0; font-size: 0.8rem; color: #ccc;">${artistName} • ${contentType === 'song' ? 'Canción' : 'Álbum'}</p>
                    </div>
                </div>

                ${reviewTitle ? `<h2 style="margin: 0 0 0.5rem 0; font-size: 1.2rem; font-weight: 700; color: #fff;">${reviewTitle}</h2>` : ''}
                
                <p style="color: #e0e0e0; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1rem;">
                    ${reviewBody}
                </p>
                
                <div style="margin-bottom: 1.5rem;">
                    ${renderStarsLocal(ratingVal)}
                </div>

                <div style="border-top: 1px solid #333; padding-top: 1rem; display: flex; gap: 20px; border-bottom: 1px solid #333; padding-bottom: 1rem; margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center; gap: 6px; color: #ccc; font-size: 0.9rem;">
                        <i class="fas fa-heart"></i> <span id="modalLikeCount">${likesCount}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; color: #ccc; font-size: 0.9rem;">
                        <i class="fas fa-comment"></i> <span id="modalCommentCount">${commentsCount}</span>
                    </div>
                </div>

                <div id="reviewDetailCommentsList">
                    <p style="color: #888; text-align: center; padding: 10px;">Cargando comentarios...</p>
                </div>
            </div>
        `;
    }

    // --- E. APERTURA ---
    modalOverlay.style.display = 'flex';
    if (closeBtn) closeBtn.onclick = () => modalOverlay.style.display = 'none';
    modalOverlay.onclick = (e) => { if (e.target === modalOverlay) modalOverlay.style.display = 'none'; };

    // ... (El resto de la lógica de ocultar inputs y cargar comentarios sigue igual) ...
    try {
        const inputs = modalOverlay.querySelectorAll('input');
        inputs.forEach(inp => {
            if (inp.placeholder && inp.placeholder.toLowerCase().includes('comentario')) {
                if(inp.parentElement) inp.parentElement.style.display = 'none';
                inp.style.display = 'none';
            }
        });
        const sendBtns = modalOverlay.querySelectorAll('button');
        sendBtns.forEach(btn => {
            if (btn.innerHTML.includes('fa-paper-plane') || btn.querySelector('i.fa-paper-plane')) btn.style.display = 'none';
        });
        const headers = modalOverlay.querySelectorAll('h3, h4');
        headers.forEach(h => {
            if (h.innerText.includes('Comentarios') && !h.closest('#reviewDetailContent')) h.style.display = 'none';
        });
    } catch (err) {}

    if (reviewId) {
        try {
            const comments = await fetchCommentsFallback(reviewId);
            if (comments && comments.length > 0) {
                renderCommentsInModal(comments); 
            } else {
                const list = document.getElementById('reviewDetailCommentsList');
                if(list) list.innerHTML = '<p style="text-align:center; color:#888; padding: 1rem;">No hay comentarios aún.</p>';
            }
            const countSpan = document.getElementById('modalCommentCount');
            if(countSpan) countSpan.textContent = comments ? comments.length : 0;
        } catch (error) {}
    }
    
    if (reviewId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/gateway/reviews/${reviewId}/reactions/count`);
            if (response.ok) {
                const count = await response.json();
                const likeSpan = document.getElementById('modalLikeCount');
                if(likeSpan) likeSpan.textContent = count;
            }
        } catch(e) {}
    }
}

// =========================================================
// 3. FUNCIONES AUXILIARES (Pégalas debajo de openReviewModal)
// =========================================================

// Fallback para obtener comentarios si no tienes el import
async function fetchCommentsFallback(reviewId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/gateway/comments/review/${reviewId}`);
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        console.warn("Fallo fetch comentarios:", e);
        return [];
    }
}

// Función para pintar los comentarios en el HTML del modal
// Función para pintar los comentarios en el HTML del modal con LIKES
function renderCommentsInModal(comments) {
    const list = document.getElementById('reviewDetailCommentsList');
    if (!list) return;
    list.innerHTML = ''; 

    const isDeepPath = window.location.pathname.includes('/Pages/');
    const defaultAvatarPath = isDeepPath ? '../../Assets/default-avatar.png' : '../Assets/default-avatar.png';

    comments.forEach(comment => {
        const text = comment.text || comment.Text || comment.content || comment.Content || "";
        const displayName = comment.username || comment.Username || "Usuario";
        
        let userAvatar = comment.UserProfilePicUrl || comment.userProfilePicUrl || comment.avatar || comment.imgProfile || comment.image;
        if (!userAvatar || userAvatar.includes('default-avatar')) {
            userAvatar = defaultAvatarPath;
        }

        const uniqueNameId = `comment-author-${Math.random().toString(36).substr(2, 9)}`;

        const item = document.createElement('div');
        item.style.cssText = "padding: 12px 0; border-bottom: 1px solid #333; display: flex; gap: 12px;";

        item.innerHTML = `
            <img src="${userAvatar}" 
                 style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid #333; flex-shrink: 0;"
                 onerror="this.src='${defaultAvatarPath}'">
            
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <span id="${uniqueNameId}" style="font-weight: 700; color: #fff; font-size: 0.9rem;">
                        ${displayName}
                    </span>
                </div>
                <div style="color: #ddd; font-size: 0.9rem; line-height: 1.4;">${text}</div>
            </div>
        `;
        list.appendChild(item);

        // Hidratación
        const userId = comment.userId || comment.UserId || comment.idUser || comment.IdUser;
        if ((displayName === "Usuario") && userId) {
            if (typeof getUser !== 'undefined') {
                getUser(userId).then(uData => {
                    const uObj = uData.result || uData.data || uData;
                    const realName = uObj.username || uObj.Username || uObj.Name;
                    const realImg = uObj.imgProfile || uObj.ImgProfile || uObj.avatar;
                    
                    if (realName) {
                        const nameEl = document.getElementById(uniqueNameId);
                        if(nameEl) nameEl.textContent = realName;
                    }
                    if (realImg) {
                        const imgEl = item.querySelector('img');
                        if(imgEl) imgEl.src = realImg;
                    }
                }).catch(() => {});
            }
        }
    });
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
