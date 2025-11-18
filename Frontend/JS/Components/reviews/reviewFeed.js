/**
 * Módulo de feed de reseñas
 * Funciones para inicializar, cargar y filtrar reseñas
 */

import { API_BASE_URL } from '../../APIs/configApi.js';
import { renderReviews } from './reviewRenderer.js';
import { showAlert } from '../../Utils/reviewHelpers.js';
import { setReviewFilter } from './reviewUtils.js';

/**
 * Inicializa el feed de reseñas
 * @param {Object} commentsData - Objeto para almacenar comentarios simulados (key: reviewId)
 * @param {Function} setLoadReviews - Función para establecer la función loadReviews globalmente
 * @param {Function} getCurrentFilter - Función para obtener el filtro actual
 * @param {Function} setCurrentFilter - Función para actualizar el filtro actual
 */
export function initializeReviews(commentsData, setLoadReviews, getCurrentFilter, setCurrentFilter) {
    const reviewsList = document.getElementById('reviewsList');
    if (!reviewsList) return;

    const sampleReviews = [
        {
            username: 'DeniDen',
            song: 'Love Story',
            artist: 'Taylor Swift',
            comment: 'Buena cancion',
            rating: 3,
            likes: 45,
            comments: 12
        },
        {
            username: 'Luli',
            song: 'Niño',
            artist: 'Milo J',
            comment: 'Canción nostalgica',
            rating: 5,
            likes: 89,
            comments: 23
        },
        {
            username: 'Miri ✨',
            song: 'Ya no vuelvas',
            artist: 'Luck Ra',
            comment: 'Se lucio Luck Ra',
            rating: 4,
            likes: 67,
            comments: 18
        }
    ];

    function initializeReviewFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                setReviewFilter(filter, setCurrentFilter, loadReviewsFunction);
            });
        });
    }
    
    async function loadReviewsFunction() {
        const currentUserId = localStorage.getItem('userId') ? localStorage.getItem('userId') : null;
        
        try {
            // 1. Obtener todas las reseñas a través del gateway (con timeout de 5 segundos)
            let reviews = [];
            try {
                const reviewsResponse = await axios.get(`${API_BASE_URL}/api/gateway/reviews`, {
                    timeout: 5000
                });
                reviews = reviewsResponse.data || [];
            } catch (error) {
                // Si hay un error 502 (Bad Gateway) o de conexión, mostrar mensaje pero no fallar completamente
                if (error.response?.status === 502 || error.code === 'ECONNABORTED' || error.message?.includes('Network Error')) {
                    console.warn('⚠️ No se pudo conectar con el servicio de reseñas. El servicio puede estar iniciando...');
                    // Renderizar lista vacía en lugar de mostrar error crítico
                    renderReviews([]);
                    return;
                }
                // Para otros errores, lanzar la excepción
                throw error;
            }
            
            if (!reviews || reviews.length === 0) {
                renderReviews([]);
                return;
            }
            
            // 2. Para cada reseña, obtener detalles completos (usuario, likes, comentarios)
            const reviewsWithDetails = await Promise.all(
                reviews.map(async (review) => {
                    try {
                        // Validar que ReviewId existe (puede venir como ReviewId, reviewId, o id)
                        // También verificar variantes con guiones bajos (Id_Review, id_review)
                        let reviewId = review.ReviewId || review.reviewId || review.id || 
                                    review.Id_Review || review.id_Review || review.Id_Review;
                        
                        if (!reviewId) {
                            console.warn('⚠️ Reseña sin ID válido, omitiendo:', review);
                            return null;
                        }
                        
                        // Normalizar el reviewId (convertir a string y trim)
                        reviewId = String(reviewId).trim();
                        
                        // Validar que después de normalizar no esté vacío o sea "null"/"undefined"
                        if (!reviewId || reviewId === 'null' || reviewId === 'undefined' || reviewId === '00000000-0000-0000-0000-000000000000') {
                            console.warn('⚠️ Reseña con ID inválido después de normalizar, omitiendo:', { review, reviewId });
                            return null;
                        }
                        
                        // Intentar obtener detalles completos usando el endpoint agregador
                        let reviewDetails = null;
                        // Validar que UserId existe antes de hacer toString()
                        const userIdStr = review.UserId ? (review.UserId.toString ? review.UserId.toString() : String(review.UserId)) : 'unknown';
                        let username = `Usuario ${userIdStr.substring(0, 8)}`;
                        let avatar = '../Assets/default-avatar.png';
                        
                        try {
                            const detailsResponse = await axios.get(
                                `${API_BASE_URL}/api/review-details/${reviewId}`,
                                { timeout: 3000 }
                            );
                            reviewDetails = detailsResponse.data;
                            if (reviewDetails?.user) {
                                username = reviewDetails.user.username || reviewDetails.user.Username || username;
                                avatar = reviewDetails.user.imgProfile || reviewDetails.user.imgProfile || avatar;
                            }
                        } catch (error) {
                            // Silenciar errores 404, 500 y 502 del endpoint agregador (son esperados cuando el servicio no está disponible)
                            const status = error.response?.status;
                            if (status !== 404 && status !== 500 && status !== 502) {
                                console.debug(`No se pudieron obtener detalles completos para review ${reviewId}, intentando obtener usuario directamente`);
                            }
                            
                            // Intentar obtener el usuario directamente del User Service
                            if (review.UserId || review.userId) {
                                try {
                                    const userId = review.UserId || review.userId;
                                    const userResponse = await axios.get(
                                        `${API_BASE_URL}/api/gateway/users/${userId}`,
                                        { timeout: 2000 }
                                    );
                                    if (userResponse.data) {
                                        username = userResponse.data.Username || userResponse.data.username || username;
                                        avatar = userResponse.data.imgProfile || userResponse.data.ImgProfile || avatar;
                                    }
                                } catch (userError) {
                                    // Silenciar errores de usuario también
                                    if (userError.response?.status !== 404 && userError.response?.status !== 500 && userError.response?.status !== 502) {
                                        console.debug(`No se pudo obtener usuario ${review.UserId || review.userId} del User Service`);
                                    }
                                }
                            }
                        }
                        
                        // Obtener cantidad de likes (reacciones) a través del gateway
                        let likes = 0;
                        try {
                            const likesResponse = await axios.get(
                                `${API_BASE_URL}/api/gateway/reviews/${reviewId}/reactions/count`,
                                { timeout: 3000 }
                            );
                            likes = likesResponse.data || 0;
                        } catch (error) {
                            // Si no hay ruta en gateway, intentar directo (fallback)
                            try {
                                const likesResponse = await axios.get(
                                    `http://localhost:8002/Reaction/${reviewId}/Reviews/count`,
                                    { timeout: 3000 }
                                );
                                likes = likesResponse.data || 0;
                            } catch (e) {
                                // Silenciar el error si el reviewId es válido pero no hay likes
                                if (reviewId && reviewId !== 'undefined') {
                                    console.debug(`No se pudieron obtener likes para review ${reviewId}`);
                                }
                                likes = 0;
                            }
                        }
                        
                        // Obtener cantidad de comentarios
                        let comments = 0;
                        const authToken = localStorage.getItem('authToken');
                        
                        // Si es modo desarrollo, usar comentarios simulados
                        if (authToken && authToken.startsWith('dev-token-')) {
                            comments = commentsData[reviewId] ? commentsData[reviewId].length : 0;
                        } else {
                            // Modo real: obtener del backend a través del gateway
                            try {
                                const commentsResponse = await axios.get(
                                    `${API_BASE_URL}/api/gateway/reviews/${reviewId}/comments`,
                                    { timeout: 3000 }
                                );
                                comments = Array.isArray(commentsResponse.data) ? commentsResponse.data.length : 0;
                            } catch (error) {
                                // Si no hay ruta en gateway, intentar directo (fallback)
                                try {
                                    const commentsResponse = await axios.get(
                                        `${API_BASE_URL}/api/gateway/comments/review/${reviewId}`,
                                        { timeout: 3000 }
                                    );
                                    comments = Array.isArray(commentsResponse.data) ? commentsResponse.data.length : 0;
                                } catch (e) {
                                    // Silenciar el error si el reviewId es válido pero no hay comentarios
                                    if (reviewId && reviewId !== 'undefined') {
                                        console.debug(`No se pudieron obtener comentarios para review ${reviewId}`);
                                    }
                                    comments = 0;
                                }
                            }
                        }
                        
                        // Verificar si el usuario actual dio like
                        let userLiked = false;
                        if (currentUserId) {
                            // Verificar si hay un reactionId guardado en localStorage (del backend)
                            const storedReactionId = localStorage.getItem(`reaction_${reviewId}_${currentUserId}`);
                            // También verificar el estado local (fallback si el backend falló)
                            const localLike = localStorage.getItem(`like_${reviewId}_${currentUserId}`);
                            userLiked = storedReactionId !== null || localLike === 'true';
                        }
                        
                        // Intentar obtener nombres reales de canción/álbum desde el Content Service
                        let songName = review.SongId ? 'Canción' : 'Álbum';
                        let albumName = 'Álbum';
                        let artistName = 'Artista';
                        
                        // PRIMERO: Intentar obtener desde localStorage (SIEMPRE tiene prioridad si existe)
                        let contentData = null;
                        if (reviewId) {
                            const normalizedReviewId = String(reviewId).trim();
                            const storageKey = `review_content_${normalizedReviewId}`;
                            const storedContentData = localStorage.getItem(storageKey);
                            
                            if (storedContentData) {
                                try {
                                    contentData = JSON.parse(storedContentData);
                                    console.log(`📦 [DEBUG] Datos encontrados en localStorage para review ${reviewId}:`, contentData);
                                    
                                    // Si tenemos datos válidos en localStorage, USARLOS DIRECTAMENTE
                                    if (contentData && contentData.name && contentData.name !== 'Canción' && contentData.name !== 'Álbum' && contentData.name.trim() !== '') {
                                        // Usar los datos guardados directamente
                                        if (contentData.type === 'song') {
                                            songName = contentData.name;
                                            artistName = contentData.artist || artistName;
                                            console.log(`✅ [DEBUG] Usando datos de localStorage para canción:`, { songName, artistName });
                                        } else if (contentData.type === 'album') {
                                            albumName = contentData.name;
                                            artistName = contentData.artist || artistName;
                                            console.log(`✅ [DEBUG] Usando datos de localStorage para álbum:`, { albumName, artistName });
                                        }
                                        // Marcar que ya tenemos los datos, no necesitamos buscar más
                                        // IMPORTANTE: Mantener contentData con todos sus datos para usarlo después
                                        contentData._used = true;
                                    }
                                } catch (e) {
                                    console.error('❌ Error parseando datos de contenido guardados:', e);
                                }
                            } else {
                                console.log(`⚠️ [DEBUG] No se encontraron datos en localStorage para review ${reviewId}`);
                            }
                        }
                            
                        // SEGUNDO: Si no hay datos válidos en localStorage, intentar obtener directamente desde Content Service usando los IDs de la reseña
                        if (!contentData || !contentData._used) {
                            // Intentar obtener desde Content Service usando SongId o AlbumId de la reseña
                            if (review.SongId) {
                                try {
                                    const songIdStr = String(review.SongId).trim();
                                    console.log(`🔍 [DEBUG] Obteniendo datos de canción desde Content Service con ID: ${songIdStr}`);
                                    console.log(`🔍 [DEBUG] review.SongId original:`, review.SongId);
                                    const songResponse = await axios.get(
                                        `${API_BASE_URL}/api/gateway/contents/song/${songIdStr}`,
                                        { timeout: 3000 }
                                    );
                                    console.log(`🔍 [DEBUG] Respuesta del Content Service:`, songResponse.data);
                                    if (songResponse.data) {
                                        const newSongName = songResponse.data.Title || songResponse.data.title || songResponse.data.Name || songResponse.data.name;
                                        const newArtistName = songResponse.data.ArtistName || songResponse.data.artistName || songResponse.data.Artist || songResponse.data.artist;
                                        
                                        if (newSongName && newSongName !== 'Canción') {
                                            songName = newSongName;
                                        }
                                        if (newArtistName && newArtistName !== 'Artista') {
                                            artistName = newArtistName;
                                        }
                                        
                                        console.log(`✅ [DEBUG] Datos obtenidos desde Content Service para canción:`, { 
                                            songName, 
                                            artistName,
                                            originalData: songResponse.data 
                                        });
                                        
                                        // Guardar en localStorage para próximas veces
                                        if (reviewId) {
                                            const normalizedReviewId = String(reviewId).trim();
                                            const storageKey = `review_content_${normalizedReviewId}`;
                                            const contentDataToStore = {
                                                type: 'song',
                                                name: songName,
                                                artist: artistName,
                                                id: songIdStr,
                                                image: songResponse.data.Image || songResponse.data.image || '../Assets/default-avatar.png'
                                            };
                                            localStorage.setItem(storageKey, JSON.stringify(contentDataToStore));
                                            console.log(`💾 [DEBUG] Datos guardados en localStorage:`, contentDataToStore);
                                        }
                                    }
                                } catch (e) {
                                    console.error(`❌ [DEBUG] Error obteniendo canción desde Content Service:`, e);
                                    console.error(`❌ [DEBUG] URL intentada: ${API_BASE_URL}/api/gateway/contents/song/${String(review.SongId).trim()}`);
                                    console.debug(`⚠️ No se pudo obtener canción desde Content Service:`, e.message);
                                }
                            } else if (review.AlbumId) {
                                try {
                                    const albumIdStr = String(review.AlbumId).trim();
                                    console.debug(`🔍 Obteniendo datos de álbum desde Content Service con ID: ${albumIdStr}`);
                                    const albumResponse = await axios.get(
                                        `${API_BASE_URL}/api/gateway/contents/album/${albumIdStr}`,
                                        { timeout: 3000 }
                                    );
                                    if (albumResponse.data) {
                                        albumName = albumResponse.data.Title || albumResponse.data.title || albumName;
                                    
                                        // Para álbumes, intentar obtener el artista desde la primera canción del álbum
                                        if (albumResponse.data.Songs && albumResponse.data.Songs.length > 0) {
                                            const firstSong = albumResponse.data.Songs[0];
                                            const foundArtist = firstSong.ArtistName || firstSong.artistName || firstSong.Artist || firstSong.artist;
                                            if (foundArtist && foundArtist !== 'Artista') {
                                                artistName = foundArtist;
                                                console.debug(`✅ Artista obtenido desde primera canción del álbum:`, artistName);
                                            }
                                        }
                                        
                                        // Si aún no tenemos artista, intentar desde ArtistName del álbum (si existe)
                                        if (artistName === 'Artista' && albumResponse.data.ArtistName) {
                                            artistName = albumResponse.data.ArtistName;
                                        }
                                        
                                        console.debug(`✅ Datos obtenidos desde Content Service para álbum:`, { albumName, artistName });
                                        
                                        // Guardar en localStorage para próximas veces (SIEMPRE guardar, incluso si el artista es 'Artista')
                                        if (reviewId) {
                                            const normalizedReviewId = String(reviewId).trim();
                                            const storageKey = `review_content_${normalizedReviewId}`;
                                            const contentDataToStore = {
                                                type: 'album',
                                                name: albumName,
                                                artist: artistName, // Guardar el artista obtenido (o 'Artista' si no se encontró)
                                                id: albumIdStr,
                                                image: albumResponse.data.Image || albumResponse.data.image || '../Assets/default-avatar.png'
                                            };
                                            localStorage.setItem(storageKey, JSON.stringify(contentDataToStore));
                                            console.debug(`💾 Datos guardados en localStorage:`, contentDataToStore);
                                        }
                                    }
                                } catch (e) {
                                    console.debug(`⚠️ No se pudo obtener álbum desde Content Service:`, e.message);
                                }
                            }
                        }
                        
                        // TERCERO: Intentar obtener desde reviewDetails si aún no tenemos datos (fallback final)
                        if ((songName === 'Canción' || albumName === 'Álbum' || artistName === 'Artista') && reviewDetails) {
                            if (reviewDetails.song) {
                                songName = reviewDetails.song.Title || reviewDetails.song.title || songName;
                                artistName = reviewDetails.song.ArtistName || reviewDetails.song.artistName || artistName;
                            } else if (reviewDetails.album) {
                                albumName = reviewDetails.album.Title || reviewDetails.album.title || albumName;
                                artistName = reviewDetails.album.ArtistName || reviewDetails.album.artistName || artistName;
                            }
                        }
                        
                        // Mapear datos del backend al formato del frontend
                        // Intentar obtener la fecha de creación (puede venir como CreatedAt, Created, Date, etc.)
                        const createdAt = review.CreatedAt || review.Created || review.Date || review.Timestamp || new Date();
                        const createdAtDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
                        
                        // Determinar el tipo de contenido y el nombre a mostrar
                        // PRIORIDAD: Usar el tipo de contentData si está disponible, sino usar review.SongId/AlbumId
                        let contentType;
                        let contentName;
                        
                        if (contentData && contentData.type) {
                            // Usar el tipo de localStorage (más confiable)
                            contentType = contentData.type;
                            contentName = contentData.type === 'song' ? songName : albumName;
                            console.log(`✅ [DEBUG] Usando contentType desde localStorage: ${contentType}, contentName: ${contentName}`);
                        } else {
                            // Fallback: usar review.SongId/AlbumId
                            contentType = review.SongId ? 'song' : 'album';
                            contentName = review.SongId ? songName : albumName;
                            console.log(`⚠️ [DEBUG] Usando contentType desde review (fallback): ${contentType}, contentName: ${contentName}`);
                        }
                        
                        // DEBUG: Log final antes de retornar
                        console.log(`🔍 [DEBUG] Datos finales para review ${reviewId}:`, {
                            contentType,
                            contentName,
                            songName,
                            albumName,
                            artistName,
                            hasContentData: !!contentData,
                            contentDataFromStorage: contentData
                        });
                        
                        return {
                            id: reviewId,
                            username: username,
                            song: contentName, // Nombre de la canción o álbum
                            artist: artistName,
                            contentType: contentType, // 'song' o 'album'
                            title: review.Title || review.title || '', // Título de la reseña
                            comment: review.Content || review.content || 'Sin contenido', // Contenido/descripción de la reseña
                            rating: review.Rating || review.rating || 0,
                            likes: likes,
                            comments: comments,
                            userLiked: userLiked,
                            avatar: avatar,
                            userId: review.UserId || review.userId,
                            songId: review.SongId || review.songId,
                            albumId: review.AlbumId || review.albumId,
                            createdAt: createdAtDate
                        };
                    } catch (error) {
                        // Validar que ReviewId existe
                        const reviewId = review.ReviewId || review.reviewId || review.id;
                        if (!reviewId) {
                            console.warn('⚠️ Reseña sin ID válido en catch, omitiendo:', review);
                            return null;
                        }
                        
                        console.error(`Error obteniendo detalles de review ${reviewId}:`, error);
                        // Retornar review con datos básicos si falla obtener detalles
                        // Intentar obtener la fecha de creación
                        const createdAt = review.CreatedAt || review.Created || review.Date || review.Timestamp || new Date();
                        const createdAtDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
                        
                        // Validar que UserId existe antes de hacer toString()
                        const userIdStr = review.UserId ? (review.UserId.toString ? review.UserId.toString() : String(review.UserId)) : 'unknown';
                        
                        return {
                            id: reviewId,
                            username: `Usuario ${userIdStr.substring(0, 8)}`,
                            song: review.SongId ? 'Canción' : 'Álbum',
                            artist: 'Artista',
                            contentType: review.SongId ? 'song' : 'album',
                            title: review.Title || review.title || '', // Título de la reseña
                            comment: review.Content || review.content || 'Sin contenido', // Contenido/descripción de la reseña
                            rating: review.Rating || review.rating || 0,
                            likes: 0,
                            comments: 0,
                            userLiked: false,
                            avatar: '../Assets/default-avatar.png',
                            userId: review.UserId || review.userId,
                            createdAt: createdAtDate
                        };
                    }
                })
            );
            
            // Filtrar reseñas nulas (que no tienen ID válido)
            const validReviews = reviewsWithDetails.filter(review => review !== null);
            
            if (validReviews.length === 0) {
                showAlert('No hay reseñas válidas disponibles', 'info');
                renderReviews([]);
                return;
            }
            
            // 3. Ordenar según el filtro seleccionado
            let sortedReviews;
            const currentFilter = getCurrentFilter ? getCurrentFilter() : 'popular';
            if (currentFilter === 'recent') {
                // Ordenar por fecha de creación (más recientes primero)
                sortedReviews = validReviews.sort((a, b) => {
                    const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
                    const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
                    return dateB - dateA; // Más recientes primero
                });
            } else {
                // Ordenar por likes (más populares primero)
                sortedReviews = validReviews.sort((a, b) => b.likes - a.likes);
            }
            
            // 4. Renderizar reseñas
            renderReviews(sortedReviews);
            
        } catch (error) {
            console.error('Error cargando reseñas:', error);
            
            // Si ya manejamos el error 502 arriba, no mostrar otro mensaje
            if (error.response?.status === 502 || error.code === 'ECONNABORTED') {
                // Ya se manejó arriba, solo renderizar lista vacía
                renderReviews([]);
                return;
            }
            
            if (error.response) {
                // Error del servidor
                const status = error.response.status;
                console.warn(`Error del servidor: ${status}`);
                
                if (status === 404) {
                    // No hay reseñas, renderizar lista vacía
                    renderReviews([]);
                } else {
                    // Para otros errores, usar datos de ejemplo como fallback silencioso
                    const sortedReviews = [...sampleReviews].sort((a, b) => b.likes - a.likes);
                    renderReviews(sortedReviews);
                }
            } else if (error.request) {
                // No se pudo conectar al servidor - usar datos de ejemplo sin mostrar alerta molesta
                console.warn('No se pudo conectar al servidor. Usando datos de ejemplo.');
                const sortedReviews = [...sampleReviews].sort((a, b) => b.likes - a.likes);
                renderReviews(sortedReviews);
            } else {
                console.error('Error inesperado al cargar reseñas:', error);
                // Usar datos de ejemplo como fallback
                const sortedReviews = [...sampleReviews].sort((a, b) => b.likes - a.likes);
                renderReviews(sortedReviews);
            }
        }
    }

    // --- Inicialización ---
    setLoadReviews(loadReviewsFunction);
    loadReviewsFunction();
    initializeReviewFilters();
}

