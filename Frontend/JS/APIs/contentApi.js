import { API_BASE_URL } from './configApi.js'; // Asegúrate de que apunte a 'http://localhost:5000'

// ===========================================
//  HELPER DE AUTENTICACIÓN
// ===========================================
function getHeaders() {
    const token = localStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

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
 */
export async function getAlbumByApiId(id) {
    try {
        const axiosInstance = window.axios || (typeof axios !== 'undefined' ? axios : null);
        if (axiosInstance) {
            const response = await axiosInstance.get(`${API_BASE_URL}/api/gateway/contents/album/${id}`, {
                headers: getHeaders(), // Inyectamos Token
                validateStatus: (status) => status === 200 || status === 404 || status === 500
            });
            
            if (response.status === 404 || response.status === 500) {
                return null;
            }
            return response.data;
        } else {
            // Fallback a fetch
            const url = `${API_BASE_URL}/api/gateway/contents/album/${id}`;
            return fetch(url, { headers: getHeaders() }).then(handleResponse).catch(() => null);
        }
    } catch (error) {
        return null;
    }
}

/**
 * Obtiene las canciones de un álbum.
 */
export async function getAlbumSongsByApiId(albumId) {
    console.log(`(API Real) Buscando canciones del álbum: ${albumId}`);
    const url = `${API_BASE_URL}/api/gateway/contents/song/album/${albumId}`;
    return fetch(url, { headers: getHeaders() }).then(handleResponse);
}

// ===========================================
//  FUNCIONES DE ARTISTA
// ===========================================

/**
 * Obtiene los datos de un artista por su ID de Spotify.
 */
export async function getArtistByApiId(id) {
    console.log(`(API Real) Buscando artista: ${id}`);
    const url = `${API_BASE_URL}/api/gateway/contents/artist/${id}`;
    return fetch(url, { headers: getHeaders() }).then(handleResponse);
}

/**
 * Obtiene las canciones top de un artista.
 */
export async function getArtistTopTracksByApiId(artistId) {
    console.log(`(API Real) Buscando canciones de: ${artistId}`);
    const url = `${API_BASE_URL}/api/gateway/contents/song/artist/${artistId}`;
    return fetch(url, { headers: getHeaders() }).then(handleResponse);
}

/**
 * Obtiene los álbumes de un artista.
 */
export async function getArtistAlbumsByApiId(artistId) {
    console.log(`(API Real) Buscando álbumes de: ${artistId}`);
    const url = `${API_BASE_URL}/api/gateway/contents/album/artist/${artistId}`;
    return fetch(url, { headers: getHeaders() }).then(handleResponse);
}

// ===========================================
//  FUNCIONES DE CANCIÓN
// ===========================================

/**
 * Obtiene los datos de una canción por su ID de Spotify.
 */
export async function getSongByApiId(id) {
    try {
        const axiosInstance = window.axios || (typeof axios !== 'undefined' ? axios : null);
        if (axiosInstance) {
            const response = await axiosInstance.get(`${API_BASE_URL}/api/gateway/contents/song/${id}`, {
                headers: getHeaders(), // Inyectamos Token
                validateStatus: (status) => status === 200 || status === 404 || status === 500
            });
            
            if (response.status === 404 || response.status === 500) {
                return null;
            }
            return response.data;
        } else {
            const url = `${API_BASE_URL}/api/gateway/contents/song/${id}`;
            return fetch(url, { headers: getHeaders() }).then(handleResponse).catch(() => null);
        }
    } catch (error) {
        return null;
    }
}

/**
 * Crea una canción (para el modal de reseña).
 */
export async function getOrCreateSong(apiSongId) {
    console.log(`(API) Obteniendo o creando canción: ${apiSongId}`);
    try {
        // Intento 1: POST para crear (NECESITA TOKEN SI EL BACKEND LO PIDE)
        const response = await axios.post(`${API_BASE_URL}/api/gateway/contents/song`, {
            APISongId: apiSongId
        }, {
            headers: getHeaders(), // Token Agregado
            timeout: 10000
        });
        
        const songId = response.data?.SongId || response.data?.songId;
        if (response.data && songId) {
            return response.data;
        } else {
            throw new Error('Respuesta inválida del POST /song, intentando GET');
        }
    } catch (postError) {
        console.warn('POST /song falló, intentando GET como fallback...', postError.message);
        try {
            // Intento 2: GET para obtener
            return await getSongByApiId(apiSongId); 
        } catch (getError) {
            console.error('Error en el GET de fallback de /song:', getError);
            throw new Error('No se pudo crear ni obtener la canción.');
        }
    }
}

/**
 * Obtiene o Crea un Álbum.
 */
export async function getOrCreateAlbum(apiAlbumId) {
    console.log(`(API) Obteniendo o creando álbum: ${apiAlbumId}`);
    return await getAlbumByApiId(apiAlbumId); 
}

/**
 * Busca una canción por su ID (GUID) de base de datos.
 */
export async function getSongById(songId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/gateway/contents/song/${songId}`, {
            headers: getHeaders(), // Inyectamos Token
            validateStatus: (status) => status === 200 || status === 404 || status === 500
        });
        
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
        const response = await axios.get(`${API_BASE_URL}/api/gateway/contents/album/db/${albumId}`, {
             headers: getHeaders(), // Inyectamos Token
             validateStatus: (status) => status === 200 || status === 404 || status === 500
        });
        
        if (response.status === 200) return response.data;
        return null;
    } catch (error) {
        console.error("Error en getAlbumById:", error);
        return null;
    }
}

/**
 * Actualiza el rating de una canción.
 */
export async function updateSongRating(apiSongId, newRating) {
    console.log(`(API) Actualizando rating Canción ${apiSongId} a ${newRating}`);
    const url = `${API_BASE_URL}/api/gateway/contents/song/${apiSongId}/Calificacion?newCalification=${newRating}`;
    
    // PATCH requiere Token para saber QUIÉN califica
    return axios.patch(url, {}, {
        headers: getHeaders() 
    });
}

/**
 * Actualiza el rating de un álbum.
 */
export async function updateAlbumRating(apiAlbumId, newRating) {
    console.log(`(API) Actualizando rating Álbum ${apiAlbumId} a ${newRating}`);
    const url = `${API_BASE_URL}/api/gateway/contents/album/${apiAlbumId}/Calificacion?newCalification=${newRating}`;
    
    // PATCH requiere Token para saber QUIÉN califica
    return axios.patch(url, {}, {
        headers: getHeaders()
    });
}