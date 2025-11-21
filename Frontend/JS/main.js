import { initializeHeader } from './Handlers/headerHandler.js';
import { API_BASE_URL } from './APIs/configApi.js';

// Configurar API_BASE_URL globalmente
if (typeof window !== 'undefined') {
    window.API_BASE_URL = API_BASE_URL;
}


document.addEventListener('DOMContentLoaded', () => {
    

    initializeHeader();


    const path = window.location.pathname;
    console.log("DOM Listo. Cargando scripts para la ruta:", path);

    if (path.endsWith('/') || path.endsWith('/home.html')) {
        import('./Pages/homeAdmin.js') 
            .then(module => module.initializeHomePage())
            .catch(err => console.error('Error al cargar homeAdmin.js:', err));
    
    } else if (path.endsWith('/album.html')) {
        import('./Pages/albumAdmin.js')
            .then(module => module.initializeAlbumPage())
            .catch(err => console.error('Error al cargar albumAdmin.js:', err));
    
    } else if (path.endsWith('/artist.html')) { 
        import('./Pages/artistAdmin.js')
            .then(module => module.initializeArtistPage())
            .catch(err => console.error('Error al cargar artistAdmin.js:', err));
    
    } else if (path.endsWith('/song.html')) {
        import('./Pages/songAdmin.js') // CORREGIDO: songAdmin.js
            .then(module => module.initializeSongPage())
            .catch(err => console.error('Error al cargar songAdmin.js:', err));
    
    } else if (path.endsWith('/amigos.html')) {
        import('./Pages/amigos.js')
            .then(module => {
                if (module.initializeAmigosPage) {
                    module.initializeAmigosPage();
                } else {
                    console.log('Cargando página de amigos...');
                }
            })
            .catch(err => console.error('Error al cargar amigos.js:', err));
    }
});