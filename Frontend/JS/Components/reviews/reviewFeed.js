/**
 * Módulo de feed de reseñas
 * Carga reseñas y busca sus datos de canción/álbum correspondientes.
 */

import { API_BASE_URL } from '../../APIs/configApi.js';
import { getReviews, getUser, getReviewReactionCount, getCommentsByReview } from '../../APIs/socialApi.js';
import { getSongByApiId, getAlbumByApiId, getSongById, getAlbumById } from '../../APIs/contentApi.js';
import { renderReviews } from './reviewRenderer.js';
import { showAlert } from '../../Utils/reviewHelpers.js';
import { setReviewFilter } from './reviewUtils.js';

export function initializeReviews(commentsData, setLoadReviews, getCurrentFilter, setCurrentFilter) {
    const reviewsList = document.getElementById('reviewsList');
    if (!reviewsList) return;

    // --- 1. DEFINICIÓN DE FILTROS (ESTO FALTABA) ---
    function initializeReviewFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remover clase active de todos
                filterButtons.forEach(b => b.classList.remove('active'));
                // Agregar a este
                btn.classList.add('active');
                
                const filter = btn.dataset.filter;
                if (typeof setCurrentFilter === 'function') {
                    setReviewFilter(filter, setCurrentFilter, loadReviewsFunction);
                }
            });
        });
    }

    // --- 2. FUNCIÓN PRINCIPAL DE CARGA ---
    async function loadReviewsFunction() {
        const currentUserId = localStorage.getItem('userId');
        
        // Mostrar Spinner
        reviewsList.innerHTML = '<div class="text-center text-light py-4"><div class="spinner-border" role="status"></div></div>';

        try {
            // A. Obtener reseñas de SocialAPI
            let reviews = [];
            try {
                const axiosInstance = window.axios || (typeof axios !== 'undefined' ? axios : null);
                if (!axiosInstance) {
                    throw new Error('axios no está disponible');
                }
                const response = await axiosInstance.get(`${API_BASE_URL}/api/gateway/reviews`, { timeout: 5000 });
                reviews = response.data || [];
            } catch (error) {
                console.warn("API de reseñas no disponible.");
                reviewsList.innerHTML = '<p class="text-light text-center p-4">No se pudieron cargar las reseñas.</p>';
                return;
            }

            if (!reviews || reviews.length === 0) {
                reviewsList.innerHTML = '<p class="text-light text-center p-4">No hay reseñas aún.</p>';
                return;
            }

            // B. ENRIQUECIMIENTO DE DATOS
            const enrichedReviews = await Promise.all(reviews.map(async (review) => {
                try {
                    // Normalizar IDs
                    const reviewId = review.ReviewId || review.reviewId || review.id;
                    const userId = review.UserId || review.userId;
                    const songId = review.SongId || review.songId;
                    const albumId = review.AlbumId || review.albumId;

                    // Valores por defecto (igual que en profileHandler.js)
                    let songName = songId ? 'Canción' : 'Álbum';
                    let albumName = 'Álbum';
                    let artistName = 'Artista';
                    let contentType = songId ? 'song' : 'album';
                    let image = "../Assets/default-avatar.png";

                    // Intentar desde localStorage primero (igual que en profileHandler.js)
                    const storageKey = `review_content_${reviewId}`;
                    const storedContentData = localStorage.getItem(storageKey);
                    let contentData = null;
                    
                    if (storedContentData) {
                        try {
                            contentData = JSON.parse(storedContentData);
                            if (contentData && contentData.name && contentData.name !== 'Canción' && contentData.name !== 'Álbum') {
                                if (contentData.type === 'song') {
                                    songName = contentData.name;
                                    artistName = contentData.artist || artistName;
                                } else if (contentData.type === 'album') {
                                    albumName = contentData.name;
                                    artistName = contentData.artist || artistName;
                                }
                                contentType = contentData.type;
                            }
                        } catch (e) {
                            console.debug('Error parseando datos de contenido:', e);
                        }
                    }

                    // Si no hay datos en localStorage, intentar desde Content Service
                    // IMPORTANTE: songId y albumId son GUIDs locales, necesitamos usar getSongById/getAlbumById
                    if (!contentData || ((!songName || songName === 'Canción') && (!albumName || albumName === 'Álbum'))) {
                        if (songId && typeof getSongById === 'function') {
                            try {
                                const songData = await getSongById(String(songId).trim());
                                if (songData) {
                                    songName = songData.Title || songData.title || songData.Name || songName;
                                    artistName = songData.ArtistName || songData.artistName || songData.Artist || artistName;
                                    image = songData.image || songData.Image || image;
                                    
                                    // Si tenemos el apiSongId, guardar en localStorage para futuras referencias
                                    if (songData.apiSongId || songData.APISongId) {
                                        const apiId = songData.apiSongId || songData.APISongId;
                                        const storageKey = `review_content_${reviewId}`;
                                        const contentDataToSave = {
                                            type: 'song',
                                            id: apiId,
                                            name: songName,
                                            artist: artistName,
                                            image: image
                                        };
                                        try {
                                            localStorage.setItem(storageKey, JSON.stringify(contentDataToSave));
                                        } catch (e) {
                                            // Ignorar errores de localStorage
                                        }
                                    }
                                }
                            } catch (e) {
                                // Manejar errores silenciosamente (404, etc.)
                                // Usar valores por defecto que ya están establecidos
                            }
                        } else if (albumId && typeof getAlbumById === 'function') {
                            try {
                                const albumData = await getAlbumById(String(albumId).trim());
                                if (albumData) {
                                    albumName = albumData.Title || albumData.title || albumData.Name || albumName;
                                    // Intentar obtener artista de todas las posibles fuentes (igual que en albumAdmin.js)
                                    artistName = albumData.ArtistName || 
                                                albumData.artistName || 
                                                (albumData.artist ? (albumData.artist.name || albumData.artist.Name) : null) ||
                                                (albumData.Artist ? (albumData.Artist.Name || albumData.Artist.name) : null) ||
                                                artistName;
                                    
                                    // Si no hay artista directo, intentar desde las canciones del álbum
                                    if ((!artistName || artistName === 'Artista') && albumData.Songs && albumData.Songs.length > 0) {
                                        const firstSong = albumData.Songs[0];
                                        artistName = firstSong.ArtistName || 
                                                    firstSong.artistName ||
                                                    (firstSong.artist ? (firstSong.artist.name || firstSong.artist.Name) : null) ||
                                                    (firstSong.Artist ? (firstSong.Artist.Name || firstSong.Artist.name) : null) ||
                                                    artistName;
                                    }
                                    image = albumData.image || albumData.Image || image;
                                    
                                    // Si tenemos el apiAlbumId, guardar en localStorage para futuras referencias
                                    if (albumData.apiAlbumId || albumData.APIAlbumId) {
                                        const apiId = albumData.apiAlbumId || albumData.APIAlbumId;
                                        const storageKey = `review_content_${reviewId}`;
                                        const contentDataToSave = {
                                            type: 'album',
                                            id: apiId,
                                            name: albumName,
                                            artist: artistName,
                                            image: image
                                        };
                                        try {
                                            localStorage.setItem(storageKey, JSON.stringify(contentDataToSave));
                                        } catch (e) {
                                            // Ignorar errores de localStorage
                                        }
                                    }
                                }
                            } catch (e) {
                                // Manejar errores silenciosamente (404, etc.)
                                // Usar valores por defecto que ya están establecidos
                            }
                        }
                    }

                    // Determinar el nombre del contenido (igual que en profileHandler.js)
                    const itemTitle = contentType === 'song' ? songName : albumName;

                    // Intentar obtener likes desde cache primero (FUENTE DE VERDAD INICIAL)
                    const likesCacheKey = `review_likes_${reviewId}`;
                    let cachedLikes = null;
                    try {
                        const cached = localStorage.getItem(likesCacheKey);
                        if (cached !== null) {
                            cachedLikes = parseInt(cached, 10);
                            if (isNaN(cachedLikes)) cachedLikes = null;
                        }
                    } catch (e) {
                        // Ignorar errores de localStorage
                    }

                    // Datos de Usuario y Social
                    // IMPORTANTE: Usar cache como valor inicial, luego sincronizar con backend
                    const [userData, likesFromBackend, comments] = await Promise.all([
                        getUser(userId).catch((err) => {
                            // Manejar errores silenciosamente (404, 500, etc.)
                            if (err.response && (err.response.status === 404 || err.response.status === 500)) {
                                // Usuario no encontrado o error del servidor - usar valores por defecto
                                return null;
                            }
                            // Otros errores también se manejan silenciosamente
                            return null;
                        }),
                        getReviewReactionCount(reviewId)
                            .then((count) => {
                                // Sincronizar con backend, pero solo actualizar cache si es diferente
                                if (typeof count === 'number' && !isNaN(count) && count >= 0) {
                                    try {
                                        // Si hay cache y es diferente, usar el mayor (para evitar perder likes)
                                        if (cachedLikes !== null && cachedLikes !== count) {
                                            // Si el cache es mayor, mantenerlo (puede ser que el backend no se haya actualizado aún)
                                            const finalCount = Math.max(cachedLikes, count);
                                            localStorage.setItem(likesCacheKey, String(finalCount));
                                            return finalCount;
                                        } else {
                                            // Si no hay cache o son iguales, usar el valor del backend
                                            localStorage.setItem(likesCacheKey, String(count));
                                            return count;
                                        }
                                    } catch (e) {
                                        // Ignorar errores de localStorage
                                        return count;
                                    }
                                }
                                return count;
                            })
                            .catch((err) => {
                                // Manejar errores silenciosamente
                                // Usar cache si está disponible, sino 0
                                return cachedLikes !== null ? cachedLikes : 0;
                            }),
                        getCommentsByReview(reviewId).catch((err) => {
                            // Manejar errores silenciosamente
                            return []; // Retornar array vacío en caso de error
                        })
                    ]);
                    
                    // Usar cache como valor inicial si está disponible, sino usar backend
                    const likes = (cachedLikes !== null) ? cachedLikes : (likesFromBackend || 0);

                    // Verificar si el usuario actual le dio like a esta reseña
                    // IMPORTANTE: localStorage es la fuente de verdad inicial
                    const reviewCurrentUserId = localStorage.getItem('userId');
                    let userLiked = false;
                    
                    if (reviewCurrentUserId) {
                        // Verificar localStorage PRIMERO (fuente de verdad)
                        const storedReactionId = localStorage.getItem(`reaction_${reviewId}_${reviewCurrentUserId}`);
                        const localLike = localStorage.getItem(`like_${reviewId}_${reviewCurrentUserId}`);
                        userLiked = storedReactionId !== null || localLike === 'true';
                        
                        // Sincronizar con backend en segundo plano (solo si no hay en localStorage)
                        // Esto asegura que si el usuario dio like en otra pestaña, se sincronice
                        if (!userLiked) {
                            try {
                                const authToken = localStorage.getItem('authToken');
                                if (authToken) {
                                    // Intentar obtener la reacción desde el backend (en segundo plano, no bloquea)
                                    const axiosInstance = window.axios || (typeof axios !== 'undefined' ? axios : null);
                                    if (axiosInstance) {
                                        // No usar await aquí, hacer la verificación en paralelo sin bloquear
                                        axiosInstance.get(
                                            `${API_BASE_URL}/api/gateway/reactions/review/${reviewId}/${reviewCurrentUserId}`,
                                            {
                                                headers: { 'Authorization': `Bearer ${authToken}` },
                                                timeout: 2000,
                                                validateStatus: (status) => status === 200 || status === 404 || status === 500
                                            }
                                        ).then(reactionResponse => {
                                            if (reactionResponse.status === 200 && reactionResponse.data) {
                                                // Si el backend confirma que hay like, actualizar localStorage
                                                const reactionId = reactionResponse.data.Id_Reaction || reactionResponse.data.id || reactionResponse.data.id_Reaction;
                                                if (reactionId) {
                                                    localStorage.setItem(`reaction_${reviewId}_${reviewCurrentUserId}`, String(reactionId));
                                                    localStorage.setItem(`like_${reviewId}_${reviewCurrentUserId}`, 'true');
                                                    // Actualizar UI si la reseña está visible
                                                    const likeBtn = document.querySelector(`.btn-like[data-review-id="${reviewId}"]`);
                                                    if (likeBtn && !likeBtn.classList.contains('liked')) {
                                                        likeBtn.classList.add('liked');
                                                        const icon = likeBtn.querySelector('i');
                                                        if (icon) icon.style.color = 'var(--magenta, #EC4899)';
                                                    }
                                                }
                                            }
                                        }).catch(reactionError => {
                                            // Ignorar errores silenciosamente (404 es esperado si no hay like)
                                            if (reactionError.response && reactionError.response.status !== 404) {
                                                console.debug(`No se pudo verificar like desde backend para review ${reviewId}`);
                                            }
                                        });
                                    }
                                }
                            } catch (e) {
                                // Ignorar errores y usar localStorage como fallback
                                console.debug('Error verificando like desde backend:', e);
                            }
                        }
                    }

                    // contentType ya está en formato correcto ('song' o 'album')
                    const contentTypeNormalized = contentType;

                    // Asegurar que likes sea un número válido
                    let likesCount = 0;
                    if (typeof likes === 'number' && !isNaN(likes) && likes >= 0) {
                        likesCount = Math.floor(likes); // Asegurar que sea entero
                    } else if (typeof likes === 'string') {
                        const parsed = parseInt(likes, 10);
                        likesCount = isNaN(parsed) ? 0 : Math.max(0, parsed);
                    }
                    
                    // Asegurar que comments sea un número válido
                    let commentsCount = 0;
                    if (Array.isArray(comments)) {
                        commentsCount = comments.length;
                    } else if (typeof comments === 'number' && !isNaN(comments) && comments >= 0) {
                        commentsCount = Math.floor(comments);
                    } else if (typeof comments === 'string') {
                        const parsed = parseInt(comments, 10);
                        commentsCount = isNaN(parsed) ? 0 : Math.max(0, parsed);
                    }
                    
                    // Debug: Verificar que los datos se están obteniendo correctamente
                    if (likesCount === 0 && likes !== 0) {
                        console.debug(`🔍 Review ${reviewId}: likes obtenido=${likes}, normalizado=${likesCount}`);
                    }
                    
                    // Asegurar que createdAt sea parseable correctamente
                    const createdAtRaw = review.CreatedAt || review.Created || review.createdAt || new Date();
                    const createdAtDate = createdAtRaw instanceof Date 
                        ? createdAtRaw 
                        : (createdAtRaw ? new Date(createdAtRaw) : new Date());

                    // Retornar objeto final en formato esperado por renderReviews
                    return {
                        id: reviewId,
                        username: userData?.username || userData?.Username || 'Usuario',
                        avatar: userData?.imgProfile || userData?.ImgProfile || '../Assets/default-avatar.png',
                        contentType: contentTypeNormalized,
                        song: itemTitle,  // renderReviews espera 'song' no 'itemTitle'
                        artist: artistName,  // renderReviews espera 'artist' no 'artistName'
                        image: image,
                        
                        title: review.Title || review.title || '',
                        comment: review.Content || review.content || '',
                        rating: review.Rating || review.rating || 0,
                        likes: likesCount,  // Aseguramos que sea número
                        comments: commentsCount,  // Aseguramos que sea número
                        userId: userId,
                        userLiked: userLiked,  // Necesario para renderReviews
                        createdAt: createdAtDate  // Aseguramos que sea Date o string parseable
                    };

                } catch (err) {
                    console.error("Error procesando reseña:", err);
                    return null;
                }
            }));

            // C. Renderizar
            const validReviews = enrichedReviews.filter(r => r !== null);
            
            // Debug removido - las reseñas se cargan correctamente
            
            // Ordenar según el filtro actual
            const currentFilter = typeof getCurrentFilter === 'function' ? getCurrentFilter() : 'popular';
            
            if (currentFilter === 'popular') {
                // Ordenar por likes (más populares primero)
                validReviews.sort((a, b) => {
                    const likesA = Number(a.likes) || 0;
                    const likesB = Number(b.likes) || 0;
                    // Si tienen los mismos likes, ordenar por fecha (más recientes primero)
                    if (likesB === likesA) {
                        const dateA = a.createdAt instanceof Date 
                            ? a.createdAt.getTime() 
                            : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                        const dateB = b.createdAt instanceof Date 
                            ? b.createdAt.getTime() 
                            : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                        return dateB - dateA;
                    }
                    return likesB - likesA; // Más likes primero
                });
            } else if (currentFilter === 'recent') {
                // Ordenar por fecha (más recientes primero)
                validReviews.sort((a, b) => {
                    const dateA = a.createdAt instanceof Date 
                        ? a.createdAt.getTime() 
                        : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                    const dateB = b.createdAt instanceof Date 
                        ? b.createdAt.getTime() 
                        : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                    return dateB - dateA;
                });
            }

            // Usar renderReviews de reviewRenderer.js (formato correcto como en perfil)
            renderReviews(validReviews);

        } catch (error) {
            console.error("Error fatal en feed:", error);
            reviewsList.innerHTML = '<p class="text-danger text-center">Error al cargar el feed.</p>';
        }
    }

    // --- 3. INICIALIZACIÓN ---
    if (typeof setLoadReviews === 'function') {
        setLoadReviews(loadReviewsFunction);
    }
    
    // Inicializar filtros
    initializeReviewFilters();
    
    // Cargar reseñas
    loadReviewsFunction();
}