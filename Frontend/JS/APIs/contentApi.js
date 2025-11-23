import { API_BASE_URL } from './configApi.js'; // (Debe ser 'http://localhost:5000')
/**
 * Helper unificado para manejar las respuestas de fetch y parsear el JSON.
 */
async function handleResponse(response) {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error de API: ${response.status} - ${errorText}`);
    }
    return response.status === 204 ? null : response.json();
}

// ===========================================
//  FUNCIONES DE ÁLBUM
// ===========================================

/**
 * Obtiene los datos de un álbum por su ID de Spotify (Get-or-Create).
 * YARP Route: "album-by-id-contents"
 * YARP Path: /api/gateway/contents/album/{id}
 */
export async function getAlbumByApiId(id) {
    try {
        const axiosInstance = window.axios || (typeof axios !== 'undefined' ? axios : null);
        if (axiosInstance) {
            const response = await axiosInstance.get(`${API_BASE_URL}/api/gateway/contents/album/${id}`, {
                validateStatus: (status) => status === 200 || status === 404 || status === 500
            });
            
            // Si es 404 o 500, retornar null silenciosamente
            if (response.status === 404 || response.status === 500) {
                return null;
            }
            
            return response.data;
        } else {
            // Fallback a fetch si axios no está disponible
            const url = `${API_BASE_URL}/api/gateway/contents/album/${id}`;
            return fetch(url).then(handleResponse).catch(() => null);
        }
    } catch (error) {
        // Manejar errores silenciosamente
        return null;
    }
}

/**
 * Obtiene las canciones de un álbum.
 * YARP Route: "song-by-album-id-contents"
 * YARP Path: /api/gateway/contents/song/album/{albumId}
 */
export async function getAlbumSongsByApiId(albumId) {
    console.log(`(API Real) Buscando canciones del álbum: ${albumId}`);
    const url = `${API_BASE_URL}/api/gateway/contents/song/album/${albumId}`;
    return fetch(url).then(handleResponse);
}

// ===========================================
//  FUNCIONES DE ARTISTA
// ===========================================

/**
 * Obtiene los datos de un artista por su ID de Spotify (Get-or-Create).
 * YARP Route: "artist-by-id-contents" (La que acabamos de añadir)
 * YARP Path: /api/gateway/contents/artist/{id}
 */
export async function getArtistByApiId(id) {
    console.log(`(API Real) Buscando artista: ${id}`);
    const url = `${API_BASE_URL}/api/gateway/contents/artist/${id}`;
    return fetch(url).then(handleResponse);
}

/**
 * Obtiene las canciones top de un artista.
 * YARP Route: "song-by-artist-id-contents"
 * YARP Path: /api/gateway/contents/song/artist/{artistId}
 */
export async function getArtistTopTracksByApiId(artistId) {
    console.log(`(API Real) Buscando canciones de: ${artistId}`);
    const url = `${API_BASE_URL}/api/gateway/contents/song/artist/${artistId}`;
    return fetch(url).then(handleResponse);
}

/**
 * Obtiene los álbumes de un artista.
 * YARP Route: "album-by-artist-id-contents"
 * YARP Path: /api/gateway/contents/album/artist/{artistId}
 */
export async function getArtistAlbumsByApiId(artistId) {
    console.log(`(API Real) Buscando álbumes de: ${artistId}`);
    const url = `${API_BASE_URL}/api/gateway/contents/album/artist/${artistId}`;
    return fetch(url).then(handleResponse);
}

// ===========================================
//  FUNCIONES DE CANCIÓN
// ===========================================

/**
 * Obtiene los datos de una canción por su ID de Spotify (Get-or-Create).
 * YARP Route: "song-by-id-contents"
 * YARP Path: /api/gateway/contents/song/{id}
 */
export async function getSongByApiId(id) {
    try {
        const axiosInstance = window.axios || (typeof axios !== 'undefined' ? axios : null);
        if (axiosInstance) {
            const response = await axiosInstance.get(`${API_BASE_URL}/api/gateway/contents/song/${id}`, {
                validateStatus: (status) => status === 200 || status === 404 || status === 500
            });
            
            // Si es 404 o 500, retornar null silenciosamente
            if (response.status === 404 || response.status === 500) {
                return null;
            }
            
            return response.data;
        } else {
            // Fallback a fetch si axios no está disponible
            const url = `${API_BASE_URL}/api/gateway/contents/song/${id}`;
            return fetch(url).then(handleResponse).catch(() => null);
        }
    } catch (error) {
        // Manejar errores silenciosamente
        return null;
    }
}

/**
 * Crea una canción (para el modal de reseña).
 * YARP Route: "song-post-contents"
 * YARP Path: /api/gateway/contents/song
 */
export async function getOrCreateSong(apiSongId) {
    console.log(`(API) Obteniendo o creando canción: ${apiSongId}`);
    try {
        // Intento 1: POST para crear
        const response = await axios.post(`${API_BASE_URL}/api/gateway/contents/song`, {
            APISongId: apiSongId
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        
        const songId = response.data?.SongId || response.data?.songId;
        if (response.data && songId) {
            return response.data;
        } else {
            // El POST funcionó pero no devolvió un ID
            throw new Error('Respuesta inválida del POST /song, intentando GET');
        }
    } catch (postError) {
        // Si el POST falla (ej. 409 Conflicto, o 500), intentamos un GET
        console.warn('POST /song falló, intentando GET como fallback...', postError.message);
        try {
            // Intento 2: GET para obtener
            return await getSongByApiId(apiSongId); // Reutiliza la función GET
        } catch (getError) {
            console.error('Error en el GET de fallback de /song:', getError);
            throw new Error('No se pudo crear ni obtener la canción.');
        }
    }
}

/**
 * Obtiene o Crea un Álbum. (GET ya hace Get-or-Create)
 * YARP Route: "album-by-id-contents"
 * YARP Path: /api/gateway/contents/album/{id}
 */
export async function getOrCreateAlbum(apiAlbumId) {
    console.log(`(API) Obteniendo o creando álbum: ${apiAlbumId}`);
    return await getAlbumByApiId(apiAlbumId); // Reutiliza la función GET
}

/**
 * Busca una canción por su ID (GUID) de base de datos.
 * CORRECCIÓN: Usamos 'song' (minúscula) porque el Gateway así lo define en su "Match".
 */
export async function getSongById(songId) {
    try {
        // CORRECCIÓN: /api/gateway/contents/song/ (minúscula)
        const response = await axios.get(`${API_BASE_URL}/api/gateway/contents/song/${songId}`, {
            validateStatus: (status) => status === 200 || status === 404 || status === 500
        });
        
        // Si el Gateway deja pasar la petición pero la DB no tiene el dato, devuelve 404
        if (response.status === 404 || response.status === 500) {
            console.warn(`[DATA] Canción no encontrada en DB para ID: ${songId}`);
            return null;
        }
        
        return response.data;
    } catch (error) {
        console.error("Error de conexión:", error);
        return null;
    }
}

export async function getAlbumById(albumId) {
    try {
        // CORRECCIÓN: Usamos la ruta completa del Gateway con /db/
        const response = await axios.get(`${API_BASE_URL}/api/gateway/contents/album/db/${albumId}`, {
             validateStatus: (status) => status === 200 || status === 404 || status === 500
        });
        
        if (response.status === 200) return response.data;
        return null;
    } catch (error) {
        console.error("Error en getAlbumById:", error);
        return null;
    }
}

export async function updateSongRating(apiSongId, newRating) {
    console.log(`(API) Actualizando rating Canción ${apiSongId} a ${newRating}`);
    const url = `${API_BASE_URL}/api/gateway/contents/song/${apiSongId}/Calificacion?newCalification=${newRating}`;
    
    // PATCH suele requerir body, aunque sea vacío, axios lo maneja mejor así
    return axios.patch(url, {}, {
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function updateAlbumRating(apiAlbumId, newRating) {
    console.log(`(API) Actualizando rating Álbum ${apiAlbumId} a ${newRating}`);
    const url = `${API_BASE_URL}/api/gateway/contents/album/${apiAlbumId}/Calificacion?newCalification=${newRating}`;
    
    return axios.patch(url, {}, {
        headers: { 'Content-Type': 'application/json' }
    });
}