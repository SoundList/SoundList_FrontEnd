import { initializeHeader } from './Handlers/headerHandler.js';

// ¡¡ESTE ES EL ÚNICO DOMCONTENTLOADED!!
// Espera a que todo el HTML de la página (home, album, artist, etc.) esté listo.
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Carga la lógica compartida (header, búsqueda, etc.)
    // (Asegúrate de que initializeHeader NO tenga su propio DOMContentLoaded)
    initializeHeader();

    // 2. Carga la lógica específica de CADA página
    const path = window.location.pathname;
    console.log("DOM Listo. Cargando scripts para la ruta:", path);

    if (path.endsWith('/') || path.endsWith('/home.html')) {
        import('./Pages/homeAdmin.js') // (Usa /Admin/ o /Pages/ según tu carpeta)
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
    }
});