/**
 * Módulo de feed de reseñas
 * Carga reseñas y busca sus datos de canción/álbum correspondientes.
 * VERSIÓN FINAL: Lógica de intentos secuencial corregida (API -> DB).
 */

import { API_BASE_URL } from '../../APIs/configApi.js';
import { getReviews, getUser, getReviewReactionCount, getCommentsByReview } from '../../APIs/socialApi.js';
import { getSongByApiId, getAlbumByApiId, getSongById, getAlbumById, getSongByDbId } from '../../APIs/contentApi.js';
import { renderReviews } from './reviewRenderer.js';
import { showAlert } from '../../Utils/reviewHelpers.js';
import { setReviewFilter } from './reviewUtils.js';

export function initializeReviews(commentsData, setLoadReviews, getCurrentFilter, setCurrentFilter) {
    const reviewsList = document.getElementById('reviewsList');
    if (!reviewsList) return;

    // --- 1. DEFINICIÓN DE FILTROS ---
    function initializeReviewFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
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
        reviewsList.innerHTML = '<div class="text-center text-light py-4"><div class="spinner-border" role="status"></div></div>';

        try {
            // A. Obtener reseñas
            let reviews = [];
            try {
                const axiosInstance = window.axios || (typeof axios !== 'undefined' ? axios : null);
                if (!axiosInstance) throw new Error('axios no está disponible');
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
            const enrichedReviews = await Promise.all(reviews.map(async (review, originalIndex) => {
                try {
                    const reviewId = String(review.ReviewId || review.reviewId || review.id).trim();
                    const userId = review.UserId || review.userId;
                    const songId = review.SongId || review.songId;
                    const albumId = review.AlbumId || review.albumId;

                    let songName = 'Canción', albumName = 'Álbum', artistName = 'Artista';
                    let contentType = songId ? 'song' : 'album';
                    let image = "../Assets/default-avatar.png";
                    let contentApiId = '';

                    // 1. Intentar Cache Local
                    const storageKey = `review_content_${reviewId}`;
                    const storedContentData = localStorage.getItem(storageKey);
                    let contentData = null;
                    
                    if (storedContentData) {
                        try {
                            contentData = JSON.parse(storedContentData);
                            // Validación anti-veneno: Si dice "Canción" genérico, lo ignoramos y buscamos de nuevo
                            if (contentData && contentData.name && contentData.name !== 'Canción' && contentData.name !== 'Álbum') {
                                if (contentData.type === 'song') {
                                    songName = contentData.name;
                                    artistName = contentData.artist || artistName;
                                } else {
                                    albumName = contentData.name;
                                    artistName = contentData.artist || artistName;
                                }
                                contentType = contentData.type;
                                image = contentData.image || image;
                                contentApiId = contentData.id;
                            } else {
                                contentData = null; // Forzar recarga si el caché es malo
                            }
                        } catch (e) { contentData = null; }
                    }

                    // 2. Buscar en API si no hay caché válido
                    if (!contentData) {
                        // === CASO CANCIÓN ===
                        if (songId) {
                            let songData = null;
                            const idToSearch = String(songId).trim();

                            // INTENTO 1: Buscar en Spotify (API ID)
                            if (typeof getSongByApiId === 'function') {
                                try { songData = await getSongByApiId(idToSearch); } catch(e){}
                            }

                            // INTENTO 2: Buscar en Base de Datos (DB ID) - CRÍTICO: Ejecutar si el anterior falló
                            if (!songData && typeof getSongByDbId === 'function') {
                                try { songData = await getSongByDbId(idToSearch); } catch(e){}
                            }

                            // INTENTO 3: Fallback Genérico
                            if (!songData && typeof getSongById === 'function') {
                                try { songData = await getSongById(idToSearch); } catch(e){}
                            }

                            if (songData) {
                                songName = songData.Title || songData.title || songData.Name || songName;
                                artistName = songData.ArtistName || songData.artistName || songData.Artist || artistName;
                                image = songData.Image || songData.image || image;
                                contentApiId = songData.APISongId || songData.apiSongId || songData.Id || songData.id;

                                // Guardar en caché el resultado exitoso
                                localStorage.setItem(storageKey, JSON.stringify({
                                    type: 'song',
                                    id: contentApiId,
                                    name: songName,
                                    artist: artistName,
                                    image: image
                                }));
                            }
                        } 
                        // === CASO ÁLBUM ===
                        else if (albumId) {
                            let albumData = null;
                            const idToSearch = String(albumId).trim();

                            if (typeof getAlbumByApiId === 'function') {
                                try { albumData = await getAlbumByApiId(idToSearch); } catch(e){}
                            }
                            
                            // Si falla, intentar otros métodos si existieran (ej. getAlbumById)
                            if (!albumData && typeof getAlbumById === 'function') {
                                try { albumData = await getAlbumById(idToSearch); } catch(e){}
                            }

                            if (albumData) {
                                albumName = albumData.Title || albumData.title || albumData.Name || albumName;
                                image = albumData.Image || albumData.image || image;
                                contentApiId = albumData.APIAlbumId || albumData.apiAlbumId || albumData.Id || albumData.id;

                                artistName = albumData.ArtistName || albumData.artistName || 
                                            (albumData.artist ? albumData.artist.name : null) || 
                                            artistName;
                                
                                // Si no hay artista directo, buscar en canciones
                                if ((!artistName || artistName === 'Artista') && albumData.Songs?.[0]) {
                                    artistName = albumData.Songs[0].ArtistName || albumData.Songs[0].artistName || artistName;
                                }

                                localStorage.setItem(storageKey, JSON.stringify({
                                    type: 'album',
                                    id: contentApiId,
                                    name: albumName,
                                    artist: artistName,
                                    image: image
                                }));
                            }
                        }
                    }

                    const itemTitle = contentType === 'song' ? songName : albumName;

                    // --- (Resto de la lógica: Likes, Usuario, Fechas) ---
                    // Likes
                    const likesCacheKey = `review_likes_${reviewId}`;
                    let cachedLikes = localStorage.getItem(likesCacheKey);
                    let likes = cachedLikes !== null ? parseInt(cachedLikes, 10) : 0;

                    const [userData, likesFromBackend, comments] = await Promise.all([
                        getUser(userId).catch(() => null),
                        (!cachedLikes) ? getReviewReactionCount(reviewId).catch(() => 0) : Promise.resolve(null),
                        getCommentsByReview(reviewId).catch(() => [])
                    ]);

                    if (likesFromBackend !== null) {
                        likes = likesFromBackend;
                        localStorage.setItem(likesCacheKey, String(likes));
                    }

                    let username = userData?.username || userData?.Username || 'Usuario';
                    let userAvatar = userData?.imgProfile || userData?.ImgProfile || '../Assets/default-avatar.png';

                    const currentUserId = localStorage.getItem('userId');
                    let userLiked = false;
                    if (currentUserId) {
                        userLiked = localStorage.getItem(`like_${reviewId}_${currentUserId}`) === 'true';
                    }

                    // Extraer fecha de creación de todas las variantes posibles
                    const createdAtRaw = review.date || review.Date || review.CreatedAt || review.Created || 
                                        review.createdAt || review.created || review.DateCreated || review.dateCreated || 
                                        review.createdDate || review.CreatedDate;
                    let createdAtDate = new Date(0);
                    if (createdAtRaw) {
                        const parsed = new Date(createdAtRaw);
                        // Solo aceptar fechas válidas (año > 2000)
                        if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) {
                            createdAtDate = parsed;
                            
                            // Guardar timestamp en localStorage si no existe
                            // IMPORTANTE: NO sobrescribir si ya existe un timestamp válido
                            // Esto protege el timestamp guardado al crear la reseña (Date.now())
                            const timestampKey = `review_created_at_${reviewId}`;
                            const existingTs = localStorage.getItem(timestampKey);
                            
                            // Solo guardar si NO existe un timestamp previo
                            // El timestamp del backend puede ser más antiguo que el guardado al crear
                            if (!existingTs) {
                                const ts = parsed.getTime();
                                // Solo guardar si es una fecha válida (año > 2023)
                                if (ts > 1672531200000) { // 1 Enero 2023
                                    localStorage.setItem(timestampKey, String(ts));
                                }
                            }
                            // Si ya existe un timestamp, mantenerlo (no sobrescribir con fecha del backend)
                        }
                    }

                    return {
                        id: reviewId,
                        username: username,
                        avatar: userAvatar,
                        contentType: contentType,
                        song: itemTitle,
                        artist: artistName,
                        image: image,
                        title: review.Title || review.title || '',
                        comment: review.Content || review.content || '',
                        rating: review.Rating || review.rating || 0,
                        likes: Math.max(0, likes),
                        comments: Array.isArray(comments) ? comments.length : 0,
                        userId: userId,
                        userLiked: userLiked,
                        createdAt: createdAtDate,
                        originalIndex: originalIndex
                    };

                } catch (err) {
                    console.error("Error procesando reseña:", err);
                    return null;
                }
            }));

            // C. Renderizar
            const validReviews = enrichedReviews.filter(r => r !== null);
            const currentFilter = typeof getCurrentFilter === 'function' ? getCurrentFilter() : 'popular';

            if (currentFilter === 'popular') {
                validReviews.sort((a, b) => (b.likes - a.likes) || (b.createdAt - a.createdAt));
            } else {
                // Filtro Recent: Lógica mejorada con boost para reseñas muy recientes
                const now = Date.now();
                const fiveMin = 300000; // 5 minutos en milisegundos
                
                const getTimestamp = (r) => {
                    // 1. Prioridad: Timestamp de localStorage (si existe y es válido)
                    const localTs = localStorage.getItem(`review_created_at_${r.id}`);
                    if (localTs) {
                        const parsedTs = parseInt(localTs, 10);
                        // Validar que sea una fecha razonable (año > 2023)
                        // 1672531200000 = 1 Enero 2023
                        if (!isNaN(parsedTs) && parsedTs > 1672531200000) {
                            // BOOST: Si la reseña fue creada en los últimos 5 minutos, darle prioridad absoluta
                            if (parsedTs >= now - fiveMin) {
                                return parsedTs + 1e12; // Sumar 1 billón de ms para prioridad absoluta
                            }
                            return parsedTs;
                        } else {
                            // Si el timestamp no es válido, limpiarlo
                            localStorage.removeItem(`review_created_at_${r.id}`);
                        }
                    }
                    
                    // 2. Fallback: Fecha del backend
                    if (r.createdAt && r.createdAt instanceof Date && !isNaN(r.createdAt.getTime())) {
                        const year = r.createdAt.getFullYear();
                        // Solo aceptar fechas válidas (año > 2000)
                        if (year > 2000) {
                            return r.createdAt.getTime();
                        }
                    }
                    
                    // 3. Si no hay fecha válida, devolver un número muy negativo para que quede al final
                    return -9999999999999;
                };
                
                // Ordenar por timestamp descendente (más recientes primero)
                validReviews.sort((a, b) => {
                    const tsA = getTimestamp(a);
                    const tsB = getTimestamp(b);
                    return tsB - tsA; // Descendente: más reciente primero
                });
            }

            renderReviews(validReviews);

        } catch (error) {
            console.error("Error en feed:", error);
            reviewsList.innerHTML = '<p class="text-danger text-center">Error cargando feed.</p>';
        }
    }

    if (typeof setLoadReviews === 'function') setLoadReviews(loadReviewsFunction);
    initializeReviewFilters();
    loadReviewsFunction();
}