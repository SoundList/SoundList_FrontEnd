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
                                            console.debug('Error guardando datos en localStorage:', e);
                                        }
                                    }
                                }
                            } catch (e) {
                                console.debug('No se pudo obtener canción:', e);
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
                                            console.debug('Error guardando datos en localStorage:', e);
                                        }
                                    }
                                }
                            } catch (e) {
                                console.debug('No se pudo obtener álbum:', e);
                            }
                        }
                    }

                    // Determinar el nombre del contenido (igual que en profileHandler.js)
                    const itemTitle = contentType === 'song' ? songName : albumName;

                    // Intentar obtener likes desde cache primero
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
                    const [userData, likes, comments] = await Promise.all([
                        getUser(userId).catch(() => null),
                        getReviewReactionCount(reviewId)
                            .then((count) => {
                                // Guardar en cache cuando se obtiene correctamente
                                if (typeof count === 'number' && !isNaN(count) && count >= 0) {
                                    try {
                                        localStorage.setItem(likesCacheKey, String(count));
                                    } catch (e) {
                                        // Ignorar errores de localStorage
                                    }
                                }
                                return count;
                            })
                            .catch((err) => {
                                console.warn(`⚠️ No se pudieron obtener likes para review ${reviewId}:`, err);
                                // Usar cache si está disponible, sino 0
                                return cachedLikes !== null ? cachedLikes : 0;
                            }),
                        getCommentsByReview(reviewId).catch((err) => {
                            console.warn(`⚠️ No se pudieron obtener comentarios para review ${reviewId}:`, err);
                            return []; // Retornar array vacío en caso de error
                        })
                    ]);

                    // Verificar si el usuario actual le dio like a esta reseña
                    // Nota: currentUserId se obtiene al inicio de loadReviewsFunction, pero aquí lo necesitamos dentro del map
                    const reviewCurrentUserId = localStorage.getItem('userId');
                    const userLiked = reviewCurrentUserId 
                        ? (localStorage.getItem(`like_${reviewId}_${reviewCurrentUserId}`) === 'true' || 
                           localStorage.getItem(`reaction_${reviewId}_${reviewCurrentUserId}`) !== null)
                        : false;

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
            
            // Debug: Verificar que los likes se están guardando correctamente
            const reviewsWithLikes = validReviews.filter(r => r.likes > 0);
            console.log(`📊 Reseñas cargadas: ${validReviews.length}, con likes: ${reviewsWithLikes.length}`);
            if (reviewsWithLikes.length > 0) {
                console.log(`✅ Ejemplo de reseña con likes:`, {
                    id: reviewsWithLikes[0].id,
                    likes: reviewsWithLikes[0].likes,
                    comments: reviewsWithLikes[0].comments
                });
            }
            
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