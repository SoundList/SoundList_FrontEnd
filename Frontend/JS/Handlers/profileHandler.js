// --- IMPORTS Y VARIABLES GLOBALES ---
// Variable global para almacenar el userId del perfil que se está viendo
let profileUserId = null;

// Importar funciones necesarias si están disponibles como módulos
// (Si no están disponibles, se usarán desde window)
let fetchSearchResults = null;
let getOrCreateSong = null;
let getOrCreateAlbum = null;
let createReview = null;

// Estado del modal de comentarios (igual que en home)
const profileCommentsModalState = {
    editingCommentId: null,
    originalCommentText: null,
    commentsData: {}
};

// Intentar importar funciones si están disponibles
if (typeof window !== 'undefined') {
    // fetchSearchResults puede estar en window.searchApi o como función global
    if (window.searchApi && window.searchApi.search) {
        fetchSearchResults = (query) => window.searchApi.search(query);
    }
    
    // getOrCreateSong y getOrCreateAlbum pueden estar en window.contentApi
    if (window.contentApi) {
        getOrCreateSong = window.contentApi.getOrCreateSong;
        getOrCreateAlbum = window.contentApi.getOrCreateAlbum;
    }
    
    // createReview puede estar en window.socialApi o window.reviewApi
    if (window.socialApi && window.socialApi.createReview) {
        createReview = window.socialApi.createReview;
    } else if (window.reviewApi && window.reviewApi.createReview) {
        createReview = window.reviewApi.createReview;
    }
}

// --- FUNCIONES DE RENDERIZADO DE RESEÑAS (FORMATO DE HOME) ---

/**
 * Función auxiliar para renderizar estrellas (reutilizada de homeAdmin.js)
 */
function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    let stars = '';
    for (let i = 0; i < fullStars; i++) { stars += '<span class="star full-star">★</span>'; }
    if (hasHalfStar) { stars += '<span class="star half-star">★</span>'; }
    for (let i = 0; i < emptyStars; i++) { stars += '<span class="star empty-star">★</span>'; }
    return stars;
}

/**
 * Renderiza las reseñas del perfil usando el mismo formato que homeAdmin.js
 * @param {Array} reviews - Array de reseñas procesadas
 * @param {string} containerId - ID del contenedor donde renderizar
 * @param {boolean} isOwnProfile - Si es true, muestra botones de editar/eliminar. Si es false, muestra botón de reportar.
 */
function renderProfileReviews(reviews, containerId, isOwnProfile) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Error: Contenedor #${containerId} no encontrado.`);
        return;
    }

    const currentUserId = localStorage.getItem('userId');
    const isLoggedIn = currentUserId !== null;
    const defaultAvatar = '../../Assets/default-avatar.png';

    if (!reviews || reviews.length === 0) {
        container.innerHTML = '<p class="text-muted p-4 text-center">No hay reseñas recientes de este usuario.</p>';
        return;
    }

    // Ordenar por fecha de creación (más recientes primero)
    // Usar la misma lógica que reviewFeed.js para manejar reseñas recién creadas
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    
    const getTimestamp = (review) => {
        // PRIMERO: Verificar si hay un timestamp de creación guardado en localStorage
        // Esto es para reseñas recién creadas que aún no tienen fecha válida del backend
        try {
            const reviewId = review.id || review.ReviewId || review.reviewId;
            if (reviewId) {
                const creationTimestampKey = `review_created_at_${reviewId}`;
                const storedTimestamp = localStorage.getItem(creationTimestampKey);
                if (storedTimestamp) {
                    const ts = parseInt(storedTimestamp, 10);
                    if (!isNaN(ts) && ts > 0) {
                        // Si es muy reciente (últimos 5 minutos), darle prioridad máxima
                        if (ts >= fiveMinutesAgo) {
                            return ts + 1000000000000; // Agregar 1 billón de ms para prioridad máxima
                        }
                        return ts;
                    }
                }
            }
        } catch (e) {
            // Ignorar errores de localStorage
        }
        
        // SEGUNDO: Intentar desde el campo createdAt del objeto
        let date = review.createdAt || review.CreatedAt || review.Created || review.created || review.date || review.Date;
        
        // Si createdAt es un Date válido
        if (date instanceof Date) {
            const ts = date.getTime();
            if (!isNaN(ts) && ts > 0) {
                return ts;
            }
        }
        
        // Si createdAt es un string o número, intentar parsearlo
        if (date) {
            const parsed = new Date(date);
            const ts = parsed.getTime();
            if (!isNaN(ts) && ts > 0 && parsed.getFullYear() > 1 && !date.toString().includes('0001-01-01')) {
                return ts;
            }
        }
        
        // Fallback: usar índice (las reseñas más recientes suelen estar al final del array)
        const fallbackTimestamp = (review.originalIndex !== undefined ? review.originalIndex : reviews.indexOf(review)) * 1000000;
        return fallbackTimestamp;
    };
    
    const sortedReviews = [...reviews].sort((a, b) => {
        const dateA = getTimestamp(a);
        const dateB = getTimestamp(b);
        return dateB - dateA; // Más recientes primero (mayor timestamp primero)
    });

    container.innerHTML = sortedReviews.map((review) => {
        // Asegurar que siempre tengamos un ID válido (igual que en homeAdmin.js)
        let reviewId = review.id || review.ReviewId || review.reviewId;
        
        // Normalizar el reviewId (convertir a string y limpiar)
        if (reviewId) {
            reviewId = String(reviewId).trim();
            // Si después de normalizar está vacío o es "null" o "undefined", rechazar
            if (!reviewId || reviewId === 'null' || reviewId === 'undefined') {
                console.warn('⚠️ Reseña con ID inválido en renderProfileReviews, omitiendo:', { review, reviewId });
                return '';
            }
        } else {
            console.warn('⚠️ Reseña sin ID en renderProfileReviews, omitiendo:', review);
            return '';
        }

        // El isLiked viene del procesamiento de la reseña (userLiked calculado desde localStorage)
        // NO usar review.userLiked del backend directamente porque puede estar desactualizado
        // Si userLiked es explícitamente true, usarlo; si es false o undefined, usar false
        const isLiked = review.userLiked === true;
        const likeCount = review.likes || 0;
        const commentCount = review.comments || 0;

        const editButtonStyle = (likeCount > 0) ? 'display: none !important;' : '';


        // Formato EXACTO igual que renderReviews de homeAdmin.js
        return `
            <div class="review-item" data-review-id="${reviewId}">
                <div class="review-user review-clickable" data-review-id="${reviewId}" style="cursor: pointer;">
                        <img src="${review.avatar || defaultAvatar}"  
                                alt="${review.username}"  
                                class="review-avatar"
                                onerror="this.src='${defaultAvatar}'">
                        <div class="review-info">
                            <div class="review-header">
                                    <span class="review-username">${review.username}</span>
                                    ${review.isUserDeleted ? '<span class="deleted-account-badge">Cuenta eliminada</span>' : ''}
                                    <span class="review-separator">-</span>
                                    <span class="review-content-type">${review.contentType === 'song' ? 'Canción' : 'Álbum'}</span>
                                    <span class="review-separator">-</span>
                                    <span class="review-song">${review.song}</span>
                                    <span class="review-separator">-</span>
                                    <span class="review-artist">${review.artist}</span>
                            </div>
                            ${review.title ? `<h4 class="review-title">${review.title}</h4>` : ''}
                            <p class="review-comment">${review.comment}</p>
                        </div>
                </div>
                <div class="review-actions">
                        <div class="review-rating">
                            <div class="review-stars">
                                    ${renderStars(review.rating)}
                            </div>
                        </div>
                        <div class="review-interactions">
                            ${isLoggedIn && isOwnProfile ? `
                            <button class="review-btn btn-edit"  
                                    data-review-id="${reviewId}"
                                        data-review-title="${review.title || ''}"
                                        data-review-content="${review.comment || ''}"
                                        data-review-rating="${review.rating || 0}"
                                        style="${editButtonStyle}"
                                        title="Editar reseña">
                                    <i class="fas fa-pencil"></i>
                            </button>
                            <button class="review-btn btn-delete"  
                                        data-review-id="${reviewId}"
                                        title="Eliminar reseña">
                                    <i class="fas fa-trash"></i>
                            </button>
                            ` : ''}
                            <div class="review-likes-container">
                                    <span class="review-likes-count">${likeCount}</span>
                                    <button class="review-btn btn-like ${isLiked ? 'liked' : ''}"  
                                                data-review-id="${reviewId}"
                                                title="${!isLoggedIn ? 'Inicia sesión para dar Me Gusta' : ''}">
                                                <i class="fas fa-heart" style="color: ${isLiked ? 'var(--magenta, #EC4899)' : 'rgba(255,255,255,0.7)'};"></i>
                                    </button>
                            </div>
                            <button class="review-btn comment-btn"  
                                        data-review-id="${reviewId}"
                                        title="Ver comentarios">
                                    <i class="fas fa-comment"></i>
                                    <span class="review-comments-count">${commentCount}</span>
                            </button>
                        </div>
                </div>
            </div>
            `;
    }).join('');

    // Adjuntar listeners después de renderizar
    attachProfileReviewListeners(container, isOwnProfile);
}

/**
 * Adjunta los event listeners a las reseñas del perfil
 */
function attachProfileReviewListeners(container, isOwnProfile) {

    container.querySelectorAll('.btn-like').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                if (typeof showLoginRequiredModal === 'function') {
                    showLoginRequiredModal();
                }
                return;
            }

            const icon = this.querySelector('i');
            const likesSpan = this.parentElement.querySelector('.review-likes-count');
            const reviewId = this.getAttribute('data-review-id');
            const currentUserId = localStorage.getItem('userId');
            const isLiked = this.classList.contains('liked');
            const currentLikes = parseInt(likesSpan.textContent) || 0;
            const likesCacheKey = `review_likes_${reviewId}`;
            const likeUserKey = `like_${reviewId}_${currentUserId}`;
            const reactionKey = `reaction_${reviewId}_${currentUserId}`;

            const newLikes = isLiked
                ? Math.max(0, currentLikes - 1)
                : currentLikes + 1;

            likesSpan.textContent = newLikes;
            this.classList.toggle('liked');
            icon.style.color = this.classList.contains('liked')
                ? 'var(--magenta, #EC4899)'
                : 'rgba(255,255,255,0.7)';

            const reviewInteractions = this.closest('.review-interactions');
            if (reviewInteractions) {
                const editBtn = reviewInteractions.querySelector('.btn-edit');
                if (editBtn) {
                    if (newLikes > 0) {
                        editBtn.style.setProperty('display', 'none', 'important');
                    } else {
                        editBtn.style.removeProperty('display');
                    }
                }
            }

            try { localStorage.setItem(likesCacheKey, String(newLikes)); } catch (e) {}


            if (!isLiked) {

                localStorage.setItem(likeUserKey, 'true');
                addReviewReaction(reviewId, currentUserId, authToken)
                    .then(data => {
                        const reactionId =
                            data?.Id_Reaction ||
                            data?.ReactionId ||
                            data?.id;

                        if (reactionId) {
                            localStorage.setItem(reactionKey, String(reactionId));
                        }
                    })
                    .catch(err => {
                        console.warn("Error dando like:", err);
                        this.classList.remove('liked');
                        icon.style.color = 'rgba(255,255,255,0.7)';
                        likesSpan.textContent = currentLikes;
                        localStorage.removeItem(likeUserKey);
                        localStorage.setItem(likesCacheKey, String(currentLikes));
                    });

                return;
            }

            // ==============================
            //      REMOVE LIKE → QUITAR
            // ==============================
            localStorage.removeItem(likeUserKey);
            localStorage.removeItem(reactionKey);

            deleteReviewReaction(reviewId)
                .then(() => {
                    // mantener cache actualizado
                    localStorage.setItem(likesCacheKey, String(newLikes));
                })
                .catch(err => {
                    console.warn("Error quitando like:", err);
                    // NO revertimos UI (querés UI optimista)
                    try {
                        localStorage.setItem(likesCacheKey, String(newLikes));
                    } catch (e) {}
                });

        });
    });


    if (isOwnProfile) {
container.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (this.style.display === 'none') return;
                
                const reviewId = this.getAttribute('data-review-id');
                if (window.showEditReviewModal) {
                    const item = this.closest('.review-item');
                    const title = item.querySelector('.review-title')?.textContent || '';
                    const content = item.querySelector('.review-comment')?.textContent || '';
                    window.showEditReviewModal(reviewId, title, content, 0);
                }
            });
        });
    

        // Eliminar (solo si es tu propio perfil)
        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const reviewId = this.getAttribute('data-review-id');
                const reviewTitle = this.closest('.review-item')?.querySelector('.review-title')?.textContent || 'esta reseña';
                
                // Usar siempre la versión del módulo deleteModals (igual que en home)
                if (window.modalsState && typeof window.showDeleteReviewModalFromModule === 'function') {
                    window.showDeleteReviewModalFromModule(reviewId, reviewTitle);
                } else if (typeof showDeleteReviewModal === 'function') {
                    // Fallback a la función local si por alguna razón no está el módulo
                    showDeleteReviewModal(reviewId, reviewTitle);
                } else {
                    console.warn('showDeleteReviewModal no está disponible');
                }
        });
    });

        // Click en la reseña para ver detalles (también en propio perfil)
        container.querySelectorAll('.review-clickable').forEach(element => {
            element.addEventListener('click', function(e) {
                if (e.target.closest('.review-actions') || 
                    e.target.closest('.btn-edit') || 
                    e.target.closest('.btn-delete') || 
                    e.target.closest('.btn-like') || 
                    e.target.closest('.comment-btn')) {
                    return;
                }
                
                const reviewId = this.getAttribute('data-review-id');
                if (reviewId && typeof window.showReviewDetailModal === 'function') {
                    window.showReviewDetailModal(reviewId);
                }
            });
        });
    }
    
    // Comentarios (funciona tanto en perfil propio como ajeno)
    container.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                if (typeof showLoginRequiredModal === 'function') {
                    showLoginRequiredModal();
                }
                return;
            }
            
            const reviewId = this.getAttribute('data-review-id');
            if (typeof window.showCommentsModal === 'function') {
                window.showCommentsModal(reviewId);
            } else if (typeof showCommentsModal === 'function') {
                showCommentsModal(reviewId);
            } else {
                console.warn('showCommentsModal no está disponible');
            }
        });
    });
}

/**
 * Carga y procesa las reseñas de un usuario específico
 */
async function loadUserReviews(userIdToLoad) {
    try {
        // Obtener todas las reseñas
        let allReviews = [];
        
        // Intentar primero con reviewApi
        if (typeof window.reviewApi !== 'undefined' && window.reviewApi.getReviewsByUser) {
            allReviews = await window.reviewApi.getReviewsByUser(userIdToLoad);
        } 
        // Fallback: usar socialApi.getReviews y filtrar
        else if (typeof window.socialApi !== 'undefined' && window.socialApi.getReviews) {
            const allReviewsData = await window.socialApi.getReviews();
            // Filtrar solo las reseñas del usuario
            allReviews = allReviewsData.filter(review => {
                const reviewUserId = review.UserId || review.userId;
                return String(reviewUserId).trim() === String(userIdToLoad).trim();
            });
        } 
        // Fallback: usar función global getReviews si está disponible
        else if (typeof getReviews === 'function') {
            const allReviewsData = await getReviews();
            // Filtrar solo las reseñas del usuario
            allReviews = allReviewsData.filter(review => {
                const reviewUserId = review.UserId || review.userId;
                return String(reviewUserId).trim() === String(userIdToLoad).trim();
            });
        } 
        // Último fallback: intentar importar dinámicamente
        else {
            try {
                const socialApiModule = await import('../../APIs/socialApi.js');
                if (socialApiModule && socialApiModule.getReviews) {
                    const allReviewsData = await socialApiModule.getReviews();
                    allReviews = allReviewsData.filter(review => {
                        const reviewUserId = review.UserId || review.userId;
                        return String(reviewUserId).trim() === String(userIdToLoad).trim();
                    });
                } else {
                    console.warn('No se encontró método para obtener reseñas');
                    return [];
                }
            } catch (importError) {
                console.error('Error importando socialApi:', importError);
                return [];
            }
        }
        
        if (!allReviews || allReviews.length === 0) {
            return [];
        }

        // Procesar cada reseña para obtener detalles completos
        const processedReviews = await Promise.all(
            allReviews.map(async (review) => {
                try {
                    let reviewId = review.ReviewId || review.reviewId || review.id || 
                                review.Id_Review || review.id_Review;
                    
                    if (!reviewId) return null;
                    
                    reviewId = String(reviewId).trim();
                    if (!reviewId || reviewId === 'null' || reviewId === 'undefined') {
                        return null;
                    }

                    const currentUserId = localStorage.getItem('userId');
                    const userIdStr = review.UserId ? (review.UserId.toString ? review.UserId.toString() : String(review.UserId)) : 'unknown';
                    let username = 'Usuario'; // Mantener "Usuario" genérico, el badge indicará si está eliminado
                    let avatar = '../../Assets/default-avatar.png';
                    
                    // Obtener datos del usuario
                    let isUserDeleted = false;
                    try {
                        const userId = review.UserId || review.userId;
                        if (typeof getUser === 'function') {
                            const userData = await getUser(userId);
                            if (userData) {
                                username = userData.Username || userData.username || username;
                                avatar = userData.imgProfile || userData.ImgProfile || avatar;
                            }
                        } else if (typeof window.userApi !== 'undefined' && window.userApi.getUserProfile) {
                            try {
                                const userData = await window.userApi.getUserProfile(userId);
                                if (userData) {
                                    username = userData.Username || userData.username || username;
                                    avatar = userData.imgProfile || userData.ImgProfile || avatar;
                                }
                            } catch (userError) {
                                // Detectar si el usuario fue eliminado (404)
                                if (userError.response && userError.response.status === 404) {
                                    isUserDeleted = true;
                                    username = "Usuario"; // Mantener "Usuario" genérico, el badge indicará que está eliminado
                                } else {
                                    throw userError;
                                }
                            }
                        }
                    } catch (e) {
                        // Si es un 404, marcar como eliminado
                        if (e.response && e.response.status === 404) {
                            isUserDeleted = true;
                            username = "Usuario"; // Mantener "Usuario" genérico, el badge indicará que está eliminado
                        } else {
                            console.debug(`No se pudo obtener usuario ${review.UserId || review.userId}`);
                        }
                    }

                    // Obtener likes y comentarios
                    let likes = 0;
                    let comments = [];
                    
                    // Intentar obtener likes desde cache primero (igual que en reviewFeed.js)
                    const likesCacheKey = `review_likes_${reviewId}`;
                    let cachedLikes = null;
                    try {
                        const cached = localStorage.getItem(likesCacheKey);
                        if (cached !== null) {
                            cachedLikes = parseInt(cached, 10);
                            if (isNaN(cachedLikes)) cachedLikes = null;
                        }
                    } catch (e) { /* ignore */ }
                    
                    // Intentar obtener likes desde diferentes fuentes
                    const getReviewReactionCountFn = typeof getReviewReactionCount === 'function'
                        ? getReviewReactionCount
                        : (window.socialApi?.getReviewReactionCount || window.reviewApi?.getReviewReactionCount || (() => Promise.resolve(0)));
                    
                    let likesFromBackend = 0;
                    if (getReviewReactionCountFn) {
                        likesFromBackend = await getReviewReactionCountFn(reviewId)
                            .then((count) => {
                                // Guardar en cache cuando se obtiene correctamente
                                if (typeof count === 'number' && !isNaN(count) && count >= 0) {
                                    try {
                                        // Si hay cache y es diferente, usar el mayor (para evitar perder likes)
                                        if (cachedLikes !== null && cachedLikes !== count) {
                                            const finalCount = Math.max(cachedLikes, count);
                                            localStorage.setItem(likesCacheKey, String(finalCount));
                                            return finalCount;
                                        } else {
                                            localStorage.setItem(likesCacheKey, String(count));
                                            return count;
                                        }
                                    } catch (e) { /* ignore */ }
                                }
                                return count;
                            })
                            .catch(() => cachedLikes !== null ? cachedLikes : 0);
                    }
                    
                    // Usar cache como valor inicial si está disponible, sino usar backend
                    likes = cachedLikes !== null ? cachedLikes : likesFromBackend;
                    
                    // Intentar obtener comentarios desde diferentes fuentes
                    if (typeof window.socialApi !== 'undefined' && window.socialApi.getCommentsByReview) {
                        comments = await window.socialApi.getCommentsByReview(reviewId).catch(() => []);
                    } else if (typeof getCommentsByReview === 'function') {
                        comments = await getCommentsByReview(reviewId).catch(() => []);
                    }

                    // Verificar si el usuario actual dio like (igual que en home/reviewFeed.js)
                    // IMPORTANTE: localStorage es la fuente de verdad inicial
                    let userLiked = false;
                    
                    if (currentUserId) {
                        // Verificar localStorage PRIMERO (fuente de verdad)
                        const storedReactionId = localStorage.getItem(`reaction_${reviewId}_${currentUserId}`);
                        const localLike = localStorage.getItem(`like_${reviewId}_${currentUserId}`);
                        
                        // Solo marcar como liked si AMBOS están presentes o si localLike es explícitamente 'true'
                        // Si alguno está null o undefined, significa que NO hay like
                        if (storedReactionId !== null && storedReactionId !== 'null' && storedReactionId !== 'undefined') {
                            userLiked = true;
                        } else if (localLike === 'true') {
                            userLiked = true;
                        } else {
                            // Si no hay en localStorage (null, undefined, o cualquier otro valor), NO hay like
                            userLiked = false;
                        }
                        
                        // NUNCA usar review.userLiked del backend aquí porque puede estar desactualizado
                        // El localStorage es la única fuente de verdad
                    }

                    // Obtener datos del contenido
                    let songName = review.SongId ? 'Canción' : 'Álbum';
                    let albumName = 'Álbum';
                    let artistName = 'Artista';
                    let contentType = review.SongId ? 'song' : 'album';

                    // Intentar desde localStorage primero
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
                    if (!contentData || (!songName || songName === 'Canción') && (!albumName || albumName === 'Álbum')) {
                        if (review.SongId && typeof getSongByApiId === 'function') {
                            try {
                                const songData = await getSongByApiId(String(review.SongId).trim());
                                if (songData) {
                                    songName = songData.Title || songData.title || songData.Name || songName;
                                    artistName = songData.ArtistName || songData.artistName || songData.Artist || artistName;
                                }
                            } catch (e) {
                                console.debug('No se pudo obtener canción:', e);
                            }
                        } else if (review.AlbumId && typeof getAlbumByApiId === 'function') {
                            try {
                                const albumData = await getAlbumByApiId(String(review.AlbumId).trim());
                                if (albumData) {
                                    albumName = albumData.Title || albumData.title || albumData.Name || albumName;
                                    if (albumData.Songs && albumData.Songs.length > 0) {
                                        artistName = albumData.Songs[0].ArtistName || albumData.Songs[0].artistName || artistName;
                                    }
                                }
                            } catch (e) {
                                console.debug('No se pudo obtener álbum:', e);
                            }
                        }
                    }

                    const contentName = contentType === 'song' ? songName : albumName;
                    const createdAt = review.CreatedAt || review.Created || review.Date || new Date();
                    const createdAtDate = createdAt instanceof Date ? createdAt : new Date(createdAt);

                    return {
                        id: reviewId,
                        username: username,
                        song: contentName,
                        artist: artistName,
                        contentType: contentType,
                        title: review.Title || review.title || '',
                        comment: review.Content || review.content || 'Sin contenido',
                        rating: review.Rating || review.rating || 0,
                        likes: likes,
                        comments: Array.isArray(comments) ? comments.length : 0,
                        userLiked: userLiked,
                        avatar: avatar,
                        userId: review.UserId || review.userId,
                        createdAt: createdAtDate,
                        isUserDeleted: isUserDeleted // Flag para indicar si el usuario fue eliminado
                    };
                } catch (error) {
                    console.error(`Error procesando review ${review.ReviewId || review.reviewId}:`, error);
                    return null;
                }
            })
        );

        return processedReviews.filter(r => r !== null);
    } catch (error) {
        console.error('Error cargando reseñas del usuario:', error);
        return [];
    }
}

// --- FUNCIÓN AUXILIAR PARA CARGAR API ---
async function loadUserApi() {
    if (window.userApi && window.userApi.getUserProfile) {
        return window.userApi;
    }
    
    // Esperar un poco para que el script se cargue si es necesario
    let attempts = 0;
    while (attempts < 10 && (!window.userApi || !window.userApi.getUserProfile)) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (window.userApi && window.userApi.getUserProfile) {
        return window.userApi;
    }
    
    // Si aún no está disponible, intentar importarlo dinámicamente
    try {
        await import('../APIs/userApi.js');
        if (window.userApi && window.userApi.getUserProfile) {
            return window.userApi;
        }
    } catch (e) {
        console.warn("No se pudo importar userApi dinámicamente:", e);
    }
    
    throw new Error("userApi no está disponible");
}

// --- FUNCIÓN PARA MOSTRAR MENSAJE DE USUARIO ELIMINADO ---
function showDeletedUserMessage(userIdToLoad) {
    console.log("⚠️ Mostrando mensaje de usuario eliminado para:", userIdToLoad);
    
    // Obtener elementos del DOM
    const mainContent = document.querySelector('.main-content');
    const profileHeader = document.querySelector('.profile-header');
    const profileMainContent = document.querySelector('.profile-main-content');
    
    // Ocultar el contenido normal del perfil
    if (profileHeader) profileHeader.style.display = 'none';
    if (profileMainContent) profileMainContent.style.display = 'none';
    
    // Ocultar también las secciones de reseñas recientes y destacadas
    const recentReviewsSection = document.querySelector('.recent-reviews-section');
    const featuredReviewsSection = document.querySelector('.featured-reviews-section');
    if (recentReviewsSection) recentReviewsSection.style.display = 'none';
    if (featuredReviewsSection) featuredReviewsSection.style.display = 'none';
    
    // Crear contenedor para el mensaje
    let messageContainer = document.getElementById('deleted-user-message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'deleted-user-message-container';
        messageContainer.className = 'deleted-user-message-container';
        
        if (mainContent) {
            // Insertar antes del profile-header si existe, o al inicio del main-content
            const firstChild = mainContent.firstElementChild;
            if (firstChild) {
                mainContent.insertBefore(messageContainer, firstChild);
            } else {
                mainContent.appendChild(messageContainer);
            }
        }
    }
    
    // Contenido del mensaje
    messageContainer.innerHTML = `
        <div class="deleted-user-message-wrapper">
            <div class="deleted-user-icon">
                <i class="fas fa-user-slash"></i>
            </div>
            <h2 class="deleted-user-title">Usuario no disponible</h2>
            <p class="deleted-user-text">Este usuario eliminó su cuenta</p>
            <p class="deleted-user-subtext">Esta cuenta ya no está disponible en SoundList</p>
            <button class="deleted-user-back-btn" onclick="window.history.back()">
                <i class="fas fa-arrow-left"></i> Volver
            </button>
        </div>
    `;
    
    messageContainer.style.display = 'block';
}

// --- FUNCIÓN PRINCIPAL DE CARGA DE PERFIL ---

async function loadUserProfile(userIdToLoad) {

    const loggedInUserId = localStorage.getItem("userId");
    
    console.log(`👤 Cargando perfil para ID: ${userIdToLoad}...`);

    profileUserId = userIdToLoad; 
    const isOwnProfile = loggedInUserId && String(loggedInUserId).trim() === String(userIdToLoad).trim();

    const recentContainerId = "recent-reviews"; 
    const userAvatarEl = document.querySelector(".profile-avatar");
    const userNameEl = document.querySelector(".username");
    const userQuoteEl = document.querySelector(".user-quote");
    const reviewCountEl = document.getElementById("user-reviews");
    const followerCountEl = document.getElementById("user-followers");
    const followingCountEl = document.getElementById("user-following");
    const defaultAvatar ="../../Assets/default-avatar.png";

    // 1. Manejo de Botones (Editar vs Seguir)
    const btnContainer = document.querySelector(".btn-container");
    const editBtn = document.querySelector(".btn-edit"); // El botón original del HTML

    // Limpiamos botones previos dinámicos si existen
    const existingFollowBtn = document.getElementById("profile-follow-btn");
    if (existingFollowBtn) existingFollowBtn.remove();

    if (editBtn) {
        if (isOwnProfile) {
            // CASO 1: TU PERFIL -> Mostrar botón Editar
            editBtn.style.display = 'block';
            editBtn.onclick = () => window.location.href = 'editProfile.html';
        } else {
            // CASO 2: PERFIL AJENO -> Ocultar Editar e inyectar Seguir
            editBtn.style.display = 'none';
            if (btnContainer && loggedInUserId) {
                await setupFollowButton(btnContainer, userIdToLoad);
            }
        }
    }

    const recentContainer = document.getElementById(recentContainerId);
    if (recentContainer) recentContainer.innerHTML = "<p class='text-muted p-4 text-center'>Cargando reseñas...</p>";

    let user = null; 
    let isUserDeleted = false;

    try {
        // Asegurar que userApi esté disponible antes de usarlo
        const userApi = await loadUserApi();
        
        // Llamar directamente a axios para poder verificar el status de la respuesta
        // ya que el interceptor puede convertir el 404 en una respuesta resuelta
        try {
            // Verificar que axios esté disponible
            if (typeof axios === 'undefined') {
                console.error("❌ axios no está disponible");
                throw new Error("axios no está disponible");
            }
            
            // Importar API_BASE_URL desde configApi si está disponible
            let API_BASE_URL = 'http://localhost:5000';
            try {
                const configApi = await import('../APIs/configApi.js');
                API_BASE_URL = configApi.API_BASE_URL || API_BASE_URL;
            } catch (e) {
                console.warn("No se pudo importar configApi, usando URL por defecto");
            }
            
            const token = localStorage.getItem('authToken');
            const headers = {
                'Content-Type': 'application/json'
            };
            if (token && token !== 'null' && token !== 'undefined' && token.length >= 20) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            console.log("🔍 Llamando a:", `${API_BASE_URL}/api/gateway/users/${userIdToLoad}`);
            const response = await axios.get(`${API_BASE_URL}/api/gateway/users/${userIdToLoad}`, { headers });
            
            console.log("📋 Respuesta completa:", response);
            console.log("📋 response.status:", response.status);
            console.log("📋 response.data:", response.data);
            
            // Verificar si la respuesta tiene status 404 o data es null
            // El interceptor puede convertir el 404 en una respuesta resuelta con status 404 y data null
            if (response.status === 404 || !response.data || response.data === null || response.data === undefined) {
                console.log("⚠️ Usuario no encontrado (404 o data null)");
                isUserDeleted = true;
                showDeletedUserMessage(userIdToLoad);
                return;
            }
            
            user = response.data;
        } catch (error) {
            console.log("🔍 Error al obtener perfil:", error);
            console.log("🔍 Error.response:", error.response);
            console.log("🔍 Error.response?.status:", error.response?.status);
            console.log("🔍 Error completo:", JSON.stringify(error, null, 2));
            
            // Detectar si el usuario fue eliminado (404 o usuario no encontrado)
            const is404 = error.response && error.response.status === 404;
            const isNotFound = error.message && (error.message.includes('404') || error.message.includes('not found') || error.message.includes('No encontrado') || error.message.includes('Usuario no encontrado'));
            const is404InConfig = error.config && error.config.url && error.config.url.includes('/users/');
            
            if (is404 || isNotFound || is404InConfig) {
                isUserDeleted = true;
                console.log("⚠️ Usuario eliminado detectado (404):", userIdToLoad);
                
                // Mostrar mensaje destacado y salir
                showDeletedUserMessage(userIdToLoad);
                return;
            } else {
                // Si es otro error, relanzarlo
                console.log("❌ Error no es 404, relanzando:", error);
                throw error;
            }
        }
        
        // Si el usuario fue eliminado, mostrar mensaje y salir
        if (isUserDeleted) {
            console.log("✅ Usuario eliminado detectado - mostrando mensaje");
            showDeletedUserMessage(userIdToLoad);
            return;
        }

        // Verificar que user no sea null antes de usarlo
        // Si user es null, probablemente es un 404 que el interceptor convirtió en null
        if (!user && !isUserDeleted) {
            console.log("⚠️ Usuario es null - verificando si es 404...");
            // Intentar detectar si fue un 404
            isUserDeleted = true;
            
            // Mostrar mensaje de usuario eliminado
            if (userAvatarEl) userAvatarEl.src = defaultAvatar;
            if (userNameEl) {
                userNameEl.textContent = "Este usuario eliminó su cuenta";
                userNameEl.style.color = "rgba(255, 255, 255, 0.7)";
                userNameEl.style.fontStyle = "italic";
            }
            if (userQuoteEl) {
                userQuoteEl.textContent = "Esta cuenta ya no está disponible";
                userQuoteEl.style.display = "block";
                userQuoteEl.style.visibility = "visible";
                userQuoteEl.style.color = "rgba(255, 255, 255, 0.5)";
            }
            
            // Ocultar botones
            if (editBtn) editBtn.style.display = 'none';
            if (btnContainer) {
                const existingFollowBtn = document.getElementById("profile-follow-btn");
                if (existingFollowBtn) existingFollowBtn.remove();
            }
            
            // NO mostrar mensaje en secciones - las reseñas se cargarán normalmente
            console.log("✅ Las reseñas se cargarán normalmente para usuario eliminado (null check)");
            
            // Estadísticas a 0
            if (reviewCountEl) reviewCountEl.textContent = "0";
            if (followerCountEl) followerCountEl.textContent = "0";
            if (followingCountEl) followingCountEl.textContent = "0";
            
            console.log("✅ Usuario null tratado como eliminado - mostrando mensaje");
            showDeletedUserMessage(userIdToLoad);
            return;
        }

        console.log("✅ Usuario válido encontrado, continuando con carga de datos...");
        console.log("✅ user:", user);

        // Verificación adicional: si user es null o undefined, no continuar
        if (!user || isUserDeleted) {
            console.error("❌ Intento de usar user cuando es null o eliminado. user:", user, "isUserDeleted:", isUserDeleted);
            return;
        }

        // Cargar datos del usuario desde el backend (como Spotify)
        if (userAvatarEl) {
            userAvatarEl.src = user.imgProfile || user.Image || user.image || defaultAvatar;
            userAvatarEl.onerror = function() { this.src = defaultAvatar; };
        }
        
        // Usar el nombre de usuario del backend (Username, UserName, o name)
        const username = user.Username || user.UserName || user.username || user.name || "Usuario";
        if (userNameEl) {
            userNameEl.textContent = username;
        }
        
        // Mostrar la bio/descripción del usuario
        // Log completo del objeto usuario para ver todos los campos disponibles
        console.log("📋 Objeto usuario completo:", user);
        console.log("📋 Todas las claves del usuario:", Object.keys(user));
        
        // El backend devuelve 'bio', no 'userQuote'
        const bio = user.bio || user.Bio || user.userQuote || user.quote || user.description || user.Description || user.UserQuote || "";
        console.log("📝 Bio encontrada:", bio);
        console.log("📝 userQuoteEl:", userQuoteEl);
        console.log("📝 Campos del usuario:", {
            userQuote: user.userQuote,
            UserQuote: user.UserQuote,
            quote: user.quote,
            Bio: user.Bio,
            bio: user.bio,
            description: user.description,
            Description: user.Description
        });
        
        if (userQuoteEl) {
            if (bio && bio.trim() !== "") {
                userQuoteEl.textContent = bio;
                userQuoteEl.style.display = "block";
                userQuoteEl.style.visibility = "visible";
                console.log("✅ Descripción mostrada:", bio);
            } else {
                userQuoteEl.textContent = "";
                userQuoteEl.style.display = "none";
                console.log("⚠️ Descripción vacía, ocultando elemento");
            }
        } else {
            console.error("❌ Elemento user-quote no encontrado en el DOM");
        }
        
        console.log("✅ Perfil principal cargado:", user);

        const isOwner = (loggedInUserId === userIdToLoad);
        if (isOwner && editBtn) {
            editBtn.style.display = 'block';
            editBtn.onclick = () => window.location.href = 'editProfile.html';
        }
    } catch (error) {
        console.error("❌ Error al cargar el perfil principal:", error);
        console.error("❌ Detalles del error:", {
            message: error.message,
            response: error.response,
            status: error.response?.status,
            data: error.response?.data
        });

        // Verificar si es un 404 que no se capturó antes
        const is404 = error.response && error.response.status === 404;
        const isNotFound = error.message && (error.message.includes('404') || error.message.includes('not found') || error.message.includes('No encontrado'));
        
        if (is404 || isNotFound) {
            console.log("⚠️ Usuario eliminado detectado en catch general (404):", userIdToLoad);
            isUserDeleted = true;
            
            // Mostrar mensaje destacado y salir
            showDeletedUserMessage(userIdToLoad);
            return;
        }

        // Si no es 404, mostrar error genérico
        if (userAvatarEl) userAvatarEl.src = defaultAvatar;
        if (userNameEl) userNameEl.textContent = "Error al cargar";
        if (userQuoteEl) userQuoteEl.textContent = "No disponible";
        return; 
    }



    try {
        const userApi = await loadUserApi();
        const followerCount = await userApi.getFollowerCount(userIdToLoad);
        const followingCount = await userApi.getFollowingCount(userIdToLoad);
        
        if (followerCountEl) followerCountEl.textContent = followerCount || 0;
        if (followingCountEl) followingCountEl.textContent = followingCount || 0;
        
    } catch (followError) {
        console.warn("⚠️ Fallo al cargar contadores de Follows (esperado si no hay mock):", followError.message);
        if (followerCountEl) followerCountEl.textContent = 0;
        if (followingCountEl) followingCountEl.textContent = 0;
    }


    // Cargar y renderizar reseñas del usuario con el formato de home
    try {
        const userReviews = await loadUserReviews(userIdToLoad);
        
        if (recentContainer) {
            if (userReviews && userReviews.length > 0) {
                renderProfileReviews(userReviews, recentContainerId, isOwnProfile);
            } else {
                recentContainer.innerHTML = "<p class='text-muted p-4 text-center'>No hay reseñas recientes de este usuario.</p>";
            }
        }
        if (reviewCountEl) reviewCountEl.textContent = userReviews.length || 0;
        
        // Cargar mejores reseñas (ordenadas por likes, igual que populares)
        const featuredContainer = document.getElementById('featured-reviews-list-best');
        if (featuredContainer && userReviews && userReviews.length > 0) {
            // Ordenar por likes (más populares primero) - igual que en homeAdmin.js
            const bestReviews = [...userReviews].sort((a, b) => {
                const likesA = Number(a.likes) || Number(a.Likes) || 0;
                const likesB = Number(b.likes) || Number(b.Likes) || 0;
                // Si tienen los mismos likes, ordenar por fecha (más recientes primero)
                if (likesB === likesA) {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : (a.CreatedAt ? new Date(a.CreatedAt).getTime() : 0);
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : (b.CreatedAt ? new Date(b.CreatedAt).getTime() : 0);
                    return dateB - dateA;
                }
                return likesB - likesA; // Más likes primero
            });
            
            console.log('📊 Reseñas ordenadas por likes:', bestReviews.map(r => ({ id: r.id, likes: r.likes, title: r.title })));
            
            // Mostrar las top 5 reseñas con más likes
            const topReviews = bestReviews.slice(0, 5);
            
            if (topReviews.length > 0) {
                renderProfileReviews(topReviews, 'featured-reviews-list-best', isOwnProfile);
            } else {
                featuredContainer.innerHTML = "<p class='text-muted p-4 text-center'>No hay reseñas destacadas.</p>";
            }
        }
        
    } catch (reviewError) {
        console.error("❌ Error al cargar reseñas:", reviewError);
        if (recentContainer) recentContainer.innerHTML = "<p class='text-danger p-4 text-center'>Error al cargar reseñas.</p>";
        if (reviewCountEl) reviewCountEl.textContent = 0;
    }

    // Hacer el avatar clickeable solo si es el perfil propio
    setupAvatarClickability(isOwnProfile);
}

/**
 * Configura el avatar para que sea clickeable solo si es el perfil propio
 * @param {boolean} isOwnProfile - Indica si es el perfil del usuario actual
 */
function setupAvatarClickability(isOwnProfile) {
    const userAvatarEl = document.querySelector(".profile-avatar");
    
    if (!userAvatarEl) return;
    
    // Remover cualquier listener previo
    const newAvatar = userAvatarEl.cloneNode(true);
    userAvatarEl.parentNode.replaceChild(newAvatar, userAvatarEl);
    
    // Obtener el nuevo elemento
    const avatarEl = document.querySelector(".profile-avatar");
    
    if (isOwnProfile) {
        // Perfil propio: hacer clickeable
        avatarEl.style.cursor = 'pointer';
        avatarEl.title = 'Haz clic para editar tu foto de perfil';
        avatarEl.setAttribute('data-editable', 'true');
        
        avatarEl.addEventListener('click', function() {
            window.location.href = 'editProfile.html#image';
        });
    } else {
        // Perfil ajeno: no clickeable
        avatarEl.style.cursor = 'default';
        avatarEl.title = '';
        avatarEl.removeAttribute('data-editable');
    }
}

/**
 * Configura e inyecta el botón de Seguir en el perfil
 * VERSIÓN BLINDADA: Maneja errores de lista y autocorrige el estado con error 409
 */
async function setupFollowButton(container, targetUserId) {
    // 1. Crear el botón
    const followBtn = document.createElement("button");
    followBtn.id = "profile-follow-btn";
    followBtn.className = "btn-edit"; 
    followBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; 
    followBtn.style.minWidth = "180px"; 
    
    container.appendChild(followBtn);

    const currentUserId = localStorage.getItem("userId");
    let isFollowing = false;

    // --- FASE 1: DETECCIÓN DE ESTADO INICIAL ---
    try {
        // INTENTO 1: API directa
        try {
            const userApi = await loadUserApi();
            isFollowing = await userApi.checkFollowStatus(targetUserId);
        } catch (e) { /* Ignoramos fallo directo */ }

        // INTENTO 2: Fallback Manual (Descargar lista de seguidos)
        if (!isFollowing && currentUserId) {
            try {
                // Aseguramos la URL base
                const API_BASE = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:5000';
                const token = localStorage.getItem("authToken");
                
                if (token) {
                    const response = await axios.get(`${API_BASE}/api/gateway/users/${currentUserId}/follow`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    let list = [];
                    // Normalización de respuesta (Items, items o array directo)
                    if (Array.isArray(response.data)) {
                        list = response.data;
                    } else if (response.data && Array.isArray(response.data.Items)) {
                        list = response.data.Items;
                    } else if (response.data && Array.isArray(response.data.items)) {
                        list = response.data.items;
                    }

                    isFollowing = list.some(f => {
                        const fId = f.FollowingId || f.followingId || f.id || f.UserId || f.userId;
                        return String(fId).toLowerCase().trim() === String(targetUserId).toLowerCase().trim();
                    });
                }
            } catch (err) {
                console.warn("⚠️ Fallback de verificación falló", err);
            }
        }
    } catch (fatal) {
        console.error("Error fatal en setup", fatal);
    }

    // Renderizar estado inicial
    updateFollowBtnUI(followBtn, isFollowing);

    // --- FASE 2: MANEJO DEL CLIC (AQUÍ ESTÁ LA MAGIA) ---
    followBtn.onclick = async () => {
        const currentState = followBtn.getAttribute("data-following") === "true";
        
        // Bloqueo visual temporal
        followBtn.disabled = true;
        const originalContent = followBtn.innerHTML;
        followBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const userApi = await loadUserApi();
            
            if (currentState) {
                // ---------------------------
                // DEJAR DE SEGUIR
                // ---------------------------
                await userApi.unfollowUser(targetUserId);
                updateFollowBtnUI(followBtn, false);
                updateFollowerCount(-1);
            } else {
                // ---------------------------
                // SEGUIR (CON HIDRATACIÓN DE DATOS)
                // ---------------------------
                
                // 1. Obtener datos visuales del perfil que estamos viendo
                // (Esto evita tener que pedirlos al backend de nuevo)
                const targetNameElement = document.querySelector(".username");
                const targetImageElement = document.querySelector(".profile-avatar");

                const targetName = targetNameElement ? targetNameElement.textContent.trim() : "Usuario";
                // Si la imagen es la default o falla, mandamos un string vacío o default
                let targetImage = targetImageElement ? targetImageElement.src : "";
                if (targetImage.includes("default-avatar") || targetImage.startsWith("file://")) {
                    targetImage = "default.png";
                }

                console.log("📤 Enviando Follow con datos:", { targetUserId, targetName, targetImage });

                // 2. Llamar a la API con los 3 parámetros
                await userApi.followUser(targetUserId, targetName, targetImage);
                
                updateFollowBtnUI(followBtn, true);
                updateFollowerCount(1);
            }
        } catch (error) {
            console.error("Error acción follow:", error);

            // AUTOCORRECCIÓN POR ERROR 409 (Ya existe)
            if (error.response && (error.response.status === 409 || error.response.status === 500)) {
                // A veces el 500 esconde un "duplicate key", asumimos éxito visual
                console.log("🔄 Sincronizando visualmente (asumimos éxito o ya seguido).");
                updateFollowBtnUI(followBtn, true);
            } else {
                // Revertir cambio visual
                followBtn.innerHTML = originalContent;
                alert("Hubo un error al conectar con el servidor.");
            }
        } finally {
            followBtn.disabled = false;
        }
    };
}
/**
 * Actualiza el estilo y texto del botón según el estado
 */
function updateFollowBtnUI(btn, isFollowing) {
    btn.setAttribute("data-following", isFollowing);
    
    if (isFollowing) {
        btn.innerHTML = 'Siguiendo <i class="fas fa-check"></i>';
        // Estilo "Siguiendo": Fondo transparente con borde (Simulado sobre la clase btn-edit)
        btn.style.background = "rgba(255, 255, 255, 0.1)";
        btn.style.border = "2px solid rgba(255, 255, 255, 0.3)";
    } else {
        btn.innerHTML = 'Seguir <i class="fas fa-user-plus"></i>';
        // Estilo "Seguir": Gradiente original
        btn.style.background = ""; // Vuelve al gradiente del CSS original
        btn.style.border = "none";
    }
}

/**
 * Actualiza el contador de seguidores en la UI visualmente
 */
function updateFollowerCount(change) {
    const followerCountEl = document.getElementById("user-followers");
    if (followerCountEl) {
        let current = parseInt(followerCountEl.textContent) || 0;
        followerCountEl.textContent = Math.max(0, current + change);
    }
}

// --- FUNCIONES DE EDICIÓN, ELIMINACIÓN Y REPORTE DE RESEÑAS ---

/**
 * Muestra el modal de editar reseña o redirige a home si el modal no está disponible
 */
async function showEditReviewModal(reviewId, title, content, rating) {
    // Intentar usar el modal de home si está disponible
    const modal = document.getElementById('createReviewModalOverlay');
    if (modal) {
        // Si el modal existe, usarlo (similar a homeAdmin.js)
        modal.setAttribute('data-edit-review-id', reviewId);
        
        const normalizedReviewId = String(reviewId).trim();
        const storageKey = `review_content_${normalizedReviewId}`;
        const storedContentData = localStorage.getItem(storageKey);
        
        if (storedContentData) {
            try {
                const contentData = JSON.parse(storedContentData);
                const contentInfoImage = document.getElementById('contentInfoImage');
                const contentInfoName = document.getElementById('contentInfoName');
                const contentInfoType = document.getElementById('contentInfoType');
                
                if (contentInfoImage) contentInfoImage.src = contentData.image || '../../Assets/default-avatar.png';
                if (contentInfoName) contentInfoName.textContent = contentData.name || '';
                if (contentInfoType) contentInfoType.textContent = contentData.type === 'song' ? 'CANCIÓN' : 'ÁLBUM';
            } catch (e) {
                console.error('Error parseando datos del contenido:', e);
            }
        }
        
        const titleInput = document.getElementById('createReviewTitleInput');
        const textInput = document.getElementById('createReviewTextInput');
        const starsContainer = document.getElementById('createReviewStars');
        
        if (titleInput) titleInput.value = title;
        if (textInput) textInput.value = content;
        
        if (starsContainer) {
            const stars = starsContainer.querySelectorAll('.star-input');
            stars.forEach((star) => {
                const starRating = parseInt(star.getAttribute('data-rating'));
                star.classList.toggle('active', starRating <= rating);
            });
        }
        
        const modalTitle = modal.querySelector('.create-review-title');
        if (modalTitle) modalTitle.textContent = 'Editar Reseña';
        
        
        const contentSelector = document.getElementById('createReviewContentSelector');
        if (contentSelector) contentSelector.style.display = 'none';

        const contentSearchDropdown = document.getElementById('contentSearchDropdown');
        if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';

        const contentSearchInput = document.getElementById('contentSearchInput');
        if (contentSearchInput) {
            contentSearchInput.disabled = true;
            contentSearchInput.style.pointerEvents = "none";
        }

        const changeContentBtn = document.getElementById('changeContentBtn');
        if (changeContentBtn) changeContentBtn.style.display = 'none';
        const contentInfo = document.getElementById('createReviewContentInfo');
        if (contentInfo) {
            contentInfo.style.pointerEvents = "none"; 
            contentInfo.style.opacity = "0.7"; 
        }

        if (contentSelector) contentSelector.style.display = 'none';
        if (contentInfo) contentInfo.style.display = 'block';
        
        modal.style.display = 'flex';
    } else {
    
        if (confirm('Para editar la reseña, serás redirigido a la página principal. ¿Continuar?')) {
            window.location.href = '../home.html';
        }
    }
}

/**
 * Muestra el modal de eliminar reseña o usa confirm si el modal no está disponible
 */
function showDeleteReviewModal(reviewId, reviewTitle) {
    if (!reviewId) {
        console.error('❌ ReviewId inválido:', reviewId);
        return;
    }
    
    reviewId = String(reviewId).trim();
    
    if (reviewId === '' || reviewId === 'null' || reviewId === 'undefined') {
        console.error('❌ ReviewId inválido:', reviewId);
        return;
    }
    
    deletingReviewId = reviewId;
    
    // Intentar usar el modal si está disponible
    const modal = document.getElementById('deleteReviewModalOverlay');
    if (modal) {
        const messageElement = document.getElementById('deleteReviewMessage');
        if (messageElement) {
            messageElement.textContent = `¿Estás seguro de que quieres eliminar la reseña "${reviewTitle}"? Esta acción no se puede deshacer.`;
        }
        modal.style.display = 'flex';
    } else {
        // Si no hay modal, usar confirm como fallback
        if (confirm(`¿Estás seguro de que quieres eliminar la reseña "${reviewTitle}"? Esta acción no se puede deshacer.`)) {
            deleteReviewLogic(reviewId);
        }
    }
}

/**
 * Lógica para eliminar una reseña
 */
async function deleteReviewLogic(reviewId) {
    const userId = localStorage.getItem('userId');
    const authToken = localStorage.getItem('authToken');
    
    if (!userId || !authToken) {
        alert('Debes iniciar sesión para eliminar reseñas');
        return;
    }
    
    try {
        // Intentar usar deleteReview si está disponible (puede venir de socialApi.js importado o window)
        let deleteSuccess = false;
        let was409Error = false;
        try {
            if (typeof deleteReview === 'function') {
                await deleteReview(reviewId, userId, authToken);
                deleteSuccess = true;
            } else if (typeof window.socialApi !== 'undefined' && window.socialApi.deleteReview) {
                await window.socialApi.deleteReview(reviewId, userId, authToken);
                deleteSuccess = true;
            } else {
                throw new Error('Función deleteReview no disponible');
            }
        } catch (deleteError) {
            // Si recibimos un 409 (Conflict), lo tratamos como éxito ya que queremos permitir eliminar
            // reseñas aunque tengan likes o comentarios
            if (deleteError.response && deleteError.response.status === 409) {
                console.warn('El backend devolvió 409, pero permitimos la eliminación de todas formas');
                deleteSuccess = true;
                was409Error = true;
                
                // Eliminar la reseña del DOM inmediatamente ya que el backend no la eliminó
                const reviewItem = document.querySelector(`.review-item[data-review-id="${reviewId}"]`);
                if (reviewItem) {
                    reviewItem.remove();
                    
                    // Actualizar contadores
                    const reviewCountEl = document.getElementById("user-reviews");
                    if (reviewCountEl) {
                        const currentCount = parseInt(reviewCountEl.textContent) || 0;
                        reviewCountEl.textContent = Math.max(0, currentCount - 1);
                    }
                    
                    // Verificar si quedan reseñas en "Reseñas Recientes"
                    const recentContainer = document.getElementById("recent-reviews");
                    if (recentContainer) {
                        const remainingReviews = recentContainer.querySelectorAll('.review-item');
                        if (remainingReviews.length === 0) {
                            recentContainer.innerHTML = "<p class='text-muted p-4 text-center'>No hay reseñas recientes de este usuario.</p>";
                        }
                    }
                    
                    // Verificar si quedan reseñas en "Reseñas Destacadas" (mejores reseñas)
                    const featuredContainer = document.getElementById("featured-reviews-list-best");
                    if (featuredContainer) {
                        const featuredReviewItem = featuredContainer.querySelector(`.review-item[data-review-id="${reviewId}"]`);
                        if (featuredReviewItem) {
                            featuredReviewItem.remove();
                            const remainingFeatured = featuredContainer.querySelectorAll('.review-item');
                            if (remainingFeatured.length === 0) {
                                featuredContainer.innerHTML = "<p class='text-muted p-4 text-center'>No hay reseñas destacadas.</p>";
                            }
                        }
                    }
                }
            } else {
                throw deleteError;
            }
        }
        
        if (deleteSuccess) {
            if (typeof showAlert === 'function') {
                showAlert(' Reseña eliminada exitosamente', 'success');
            } else {
                alert(' Reseña eliminada exitosamente');
            }
        
            // Recargar el perfil completo para actualizar todas las secciones (recientes y mejores)
            // Esto asegura que las "mejores reseñas" se actualicen correctamente
            if (profileUserId) {
                await loadUserProfile(profileUserId);
            }
        }
    } catch (error) {
        console.error('Error eliminando reseña:', error);
        if (error.response) {
            const status = error.response.status;
            // Ya no bloqueamos por 409 (reacciones/comentarios), se permite eliminar
            if (status === 404) {
                if (typeof showAlert === 'function') {
                    showAlert('La reseña no fue encontrada.', 'warning');
                } else {
                alert('La reseña no fue encontrada.');
                }
            } else if (status === 401) {
                if (typeof showLoginRequiredModal === 'function') {
                    showLoginRequiredModal();
                } else {
                alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
                setTimeout(() => {
                    window.location.href = '../login.html';
                }, 2000);
                }
            } else if (status === 403) {
                if (typeof showAlert === 'function') {
                    showAlert('No tienes permisos para eliminar esta reseña.', 'danger');
                } else {
                alert('No tienes permisos para eliminar esta reseña.');
                }
            } else {
                const errorMessage = error.response.data?.message || 'Error desconocido';
                if (typeof showAlert === 'function') {
                    showAlert(`Error al eliminar la reseña: ${errorMessage}`, 'danger');
                } else {
                    alert(`Error al eliminar la reseña: ${errorMessage}`);
                }
            }
        } else {
            if (typeof showAlert === 'function') {
                showAlert('Error al eliminar la reseña. Intenta nuevamente.', 'danger');
        } else {
            alert('Error al eliminar la reseña. Intenta nuevamente.');
            }
        }
    }
}

/**
 * Muestra el modal de comentarios (igual que en home)
 */
async function showCommentsModal(reviewId) {
    // Intentar usar el modal de comentarios del módulo (igual que en home)
    try {
        const { showCommentsModal: showCommentsModalFromModule } = await import('../../Components/modals/commentsModal.js');
        if (showCommentsModalFromModule) {
            await showCommentsModalFromModule(reviewId, profileCommentsModalState);
            
            // Actualizar el avatar del input
            const avatarImg = document.getElementById('commentsModalAvatar');
            if (avatarImg) {
                avatarImg.src = localStorage.getItem('userAvatar') || '../../Assets/default-avatar.png';
            }
            return;
        }
    } catch (importError) {
        console.warn('No se pudo importar showCommentsModal del módulo:', importError);
    }
    
    // Fallback: usar el modal directamente si existe
    const modal = document.getElementById('commentsModalOverlay');
    if (modal) {
        modal.setAttribute('data-review-id', reviewId);
        modal.style.display = 'flex';
        
        // Intentar cargar comentarios
        try {
            const { loadCommentsIntoModal } = await import('../../Components/modals/commentsModal.js');
            if (loadCommentsIntoModal) {
                await loadCommentsIntoModal(reviewId, profileCommentsModalState);
            }
        } catch (loadError) {
            console.warn('No se pudieron cargar los comentarios:', loadError);
        }
    } else {
        console.warn('Modal de comentarios no disponible');
    }
}

/**
 * Muestra el modal de vista detallada de reseña (igual que en home)
 */
async function showReviewDetailModal(reviewId) {
    const modal = document.getElementById('reviewDetailModalOverlay');
    if (!modal) return;
    
    // Establecer el reviewId en el modal para que submitReviewDetailComment pueda obtenerlo
        modal.setAttribute('data-review-id', reviewId);
        modal.style.display = 'flex';
    const contentDiv = document.getElementById('reviewDetailContent');
    if (contentDiv) {
        contentDiv.innerHTML = '<div class="review-detail-loading">Cargando reseña...</div>';
    }
    
    try {
        // Obtener funciones de API disponibles
        const getReviewsByUserFn = window.reviewApi?.getReviewsByUser || window.socialApi?.getReviewsByUser;
        const getCommentsByReviewFn = window.socialApi?.getCommentsByReview || window.reviewApi?.getCommentsByReview || (() => Promise.resolve([]));
        const getReviewReactionCountFn = window.socialApi?.getReviewReactionCount || window.reviewApi?.getReviewReactionCount || (() => Promise.resolve(0));
        const getUserFn = window.userApi?.getUserProfile || window.userApi?.getUser || (() => Promise.resolve(null));
        const formatNotificationTimeFn = window.formatNotificationTime || ((date) => 'Ahora');
        
        // Primero intentar obtener la reseña de las reseñas del usuario del perfil
        let review = null;
        let allReviews = [];
        
        if (profileUserId && getReviewsByUserFn) {
            try {
                allReviews = await getReviewsByUserFn(profileUserId);
                if (allReviews && allReviews.length > 0) {
                    review = allReviews.find(r => {
                        const rId = r.ReviewId || r.reviewId || r.id || r.Id_Review;
                        return String(rId).trim() === String(reviewId).trim();
                    });
                }
            } catch (err) {
                console.debug('Error obteniendo reseñas del usuario:', err);
            }
        }
        
        // Si no encontramos la reseña, intentar obtener todas las reseñas
        if (!review) {
            const getReviewsFn = window.socialApi?.getReviews || window.reviewApi?.getReviews || (() => Promise.resolve([]));
            try {
                allReviews = await getReviewsFn();
                if (allReviews && allReviews.length > 0) {
                    review = allReviews.find(r => {
                        const rId = r.ReviewId || r.reviewId || r.id || r.Id_Review;
                        return String(rId).trim() === String(reviewId).trim();
                    });
                }
            } catch (err) {
                console.debug('Error obteniendo todas las reseñas:', err);
            }
        }
        
        // Si aún no encontramos la reseña, mostrar error
        if (!review) {
            console.warn('⚠️ No se pudo obtener la reseña con ID:', reviewId, '- Puede que la reseña haya sido eliminada o no exista.');
            if (contentDiv) {
                contentDiv.innerHTML = '<div class="review-detail-loading" style="color: #ff6b6b; padding: 2rem; text-align: center;">No se pudo cargar la reseña. Puede que haya sido eliminada.</div>';
            }
            return;
        }
        
        // Verificar likes desde cache primero (igual que en reviewDetailModal.js)
        const reviewLikesCacheKey = `review_likes_${reviewId}`;
        let cachedReviewLikes = null;
        try {
            const cached = localStorage.getItem(reviewLikesCacheKey);
            if (cached !== null) {
                cachedReviewLikes = parseInt(cached, 10);
                if (isNaN(cachedReviewLikes)) cachedReviewLikes = null;
            }
        } catch (e) { /* ignore */ }
        
        // Obtener comentarios y likes
        const [commentsResult, likesResult] = await Promise.allSettled([
            getCommentsByReviewFn(reviewId).catch(err => {
                console.warn('Error obteniendo comentarios:', err);
                return [];
            }),
            getReviewReactionCountFn(reviewId)
                .then((count) => {
                    // Sincronizar con backend, pero solo actualizar cache si es diferente
                    if (typeof count === 'number' && !isNaN(count) && count >= 0) {
                        try {
                            // Si hay cache y es diferente, usar el mayor (para evitar perder likes)
                            if (cachedReviewLikes !== null && cachedReviewLikes !== count) {
                                const finalCount = Math.max(cachedReviewLikes, count);
                                localStorage.setItem(reviewLikesCacheKey, String(finalCount));
                                return finalCount;
                            } else {
                                localStorage.setItem(reviewLikesCacheKey, String(count));
                                return count;
                            }
                        } catch (e) { /* ignore */ }
                    }
                    return count;
                })
                .catch(err => {
                    console.warn('Error obteniendo likes:', err);
                    return cachedReviewLikes !== null ? cachedReviewLikes : 0;
                })
        ]);
        
        const comments = commentsResult.status === 'fulfilled' ? commentsResult.value : [];
        const likesFromBackend = likesResult.status === 'fulfilled' ? likesResult.value : 0;
        
        // Usar cache como valor inicial si está disponible, sino usar backend
        const likes = cachedReviewLikes !== null ? cachedReviewLikes : likesFromBackend;
        
        // Obtener datos del usuario
        let username = 'Usuario'; // Mantener "Usuario" genérico, el badge indicará si está eliminado
        let avatar = '../../Assets/default-avatar.png';
        let isUserDeleted = false;
        
        if (review.UserId || review.userId) {
            try {
                const userId = review.UserId || review.userId;
                const userData = await getUserFn(userId);
                if (userData) {
                    username = userData.Username || userData.username || userData.UserName || username;
                    avatar = userData.imgProfile || userData.ImgProfile || userData.image || avatar;
                }
            } catch (userError) {
                    // Detectar si el usuario fue eliminado (404)
                    if (userError.response && userError.response.status === 404) {
                        isUserDeleted = true;
                        username = "Usuario"; // Mantener "Usuario" genérico, el badge indicará que está eliminado
                        console.debug(`Usuario eliminado detectado en review detail: ${review.UserId || review.userId}`);
                    } else {
                        console.debug(`No se pudo obtener usuario ${review.UserId || review.userId}`);
                    }
            }
        }
        
        const storageKey = `review_content_${reviewId}`;
        const storedContentData = localStorage.getItem(storageKey);
        let contentData = null;
        if (storedContentData) {
            try { contentData = JSON.parse(storedContentData); } catch (e) {}
        }
        
        let songName = 'Canción', albumName = 'Álbum', artistName = 'Artista', contentType = 'song';
        
        if (contentData) {
            contentType = contentData.type || 'song';
            if (contentData.type === 'song') songName = contentData.name || songName;
            else albumName = contentData.name || albumName;
            artistName = contentData.artist || artistName;
        } else if (review.song) {
            songName = review.song.Title || review.song.title || songName;
            artistName = review.song.ArtistName || review.song.artistName || artistName;
        } else if (review.album) {
            albumName = review.album.Title || review.album.title || albumName;
            artistName = review.album.ArtistName || review.album.artistName || artistName;
        }
        
        const reviewTitle = review.Title || review.title || '';
        const reviewContent = review.Content || review.content || review.comment || '';
        const reviewRating = review.Rating || review.rating || 0;
        const createdAt = review.CreatedAt || review.Created || new Date();
        const timeAgo = formatNotificationTimeFn(createdAt); 
        
        const currentUserId = localStorage.getItem('userId');
        const reviewUserId = review.UserId || review.userId || '';
        
        let userLiked = false;
        if (currentUserId) {
            const storedReactionId = localStorage.getItem(`reaction_${reviewId}_${currentUserId}`);
            const localLike = localStorage.getItem(`like_${reviewId}_${currentUserId}`);
            userLiked = storedReactionId !== null || localLike === 'true';
        }
        
        const contentName = contentType === 'song' ? songName : albumName;
        
        if (contentDiv) {
            contentDiv.innerHTML = `
                <div class="review-detail-main">
                    <div class="review-detail-user">
                        <img src="${avatar}" alt="${username}" class="review-detail-avatar ${isUserDeleted ? '' : 'profile-navigation-trigger'}" ${isUserDeleted ? '' : `data-user-id="${reviewUserId}" style="cursor: pointer;"`} onerror="this.src='../../Assets/default-avatar.png'">
                        <div class="review-detail-user-info">
                            <span class="review-detail-username ${isUserDeleted ? '' : 'profile-navigation-trigger'}" ${isUserDeleted ? '' : `data-user-id="${reviewUserId}" style="cursor: pointer;"`}>${username}</span>
                            ${isUserDeleted ? '<span class="deleted-account-badge" style="margin-left: 0.5rem;">Cuenta eliminada</span>' : ''}
                            <span class="review-detail-time">${timeAgo}</span>
                        </div>
                    </div>
                    <div class="review-detail-meta">
                        <span class="review-detail-content-type">${contentType === 'song' ? 'Canción' : 'Álbum'}</span>
                        <span class="review-detail-separator">-</span>
                        <span class="review-detail-content-name">${contentName}</span>
                        <span class="review-detail-separator">-</span>
                        <span class="review-detail-artist">${artistName}</span>
                    </div>
                    ${reviewTitle ? `<h2 class="review-detail-title">${reviewTitle}</h2>` : ''}
                    <p class="review-detail-text">${reviewContent}</p>
                    <div class="review-detail-rating">
                        <div class="review-detail-stars">${renderStars(reviewRating)}</div>
                    </div>
                    <div class="review-detail-interactions">
                        <button class="review-detail-interaction-btn ${userLiked ? 'liked' : ''}" 
                                data-review-id="${reviewId}" id="reviewDetailLikeBtn">
                            <i class="fas fa-heart" style="color: ${userLiked ? 'var(--magenta, #EC4899)' : 'rgba(255,255,255,0.7)'};"></i>
                            <span class="review-detail-likes-count">${likes}</span>
                        </button>
                        <span class="review-detail-comments-icon">
                            <i class="fas fa-comment"></i>
                            <span class="review-detail-comments-count">${comments.length}</span>
                        </span>
                    </div>
                </div>
            `;
        }
        
        await loadReviewDetailComments(reviewId, comments);
        
        // Agregar event listeners para navegación a perfil en la reseña principal
        attachProfileNavigationListeners();
        
        const likeBtn = document.getElementById('reviewDetailLikeBtn');
        if (likeBtn) {
            likeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (!localStorage.getItem('authToken')) {
                    if (typeof showLoginRequiredModal === 'function') {
                        showLoginRequiredModal();
                    }
                    return;
                }
                toggleReviewLikeInDetail(reviewId, this);
            });
        }
        
        const inputAvatar = document.getElementById('reviewDetailInputAvatar');
        if (inputAvatar) {
            inputAvatar.src = localStorage.getItem('userAvatar') || '../../Assets/default-avatar.png';
        }
        
    } catch (error) {
        console.error('Error cargando vista detallada:', error);
        if (contentDiv) {
            contentDiv.innerHTML = `
                <div class="review-detail-loading" style="padding: 2rem; text-align: center; color: rgba(255, 255, 255, 0.7);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem; color: #ff6b6b;"></i>
                    <p style="margin: 0;">Error al cargar la reseña. Por favor, intenta nuevamente.</p>
                </div>
            `;
        }
        // Aún así, cargar los comentarios si es posible
        try {
            const getCommentsByReviewFn = window.socialApi?.getCommentsByReview || window.reviewApi?.getCommentsByReview || (() => Promise.resolve([]));
            const comments = await getCommentsByReviewFn(reviewId).catch(() => []);
            await loadReviewDetailComments(reviewId, comments);
        } catch (commentError) {
            console.warn('No se pudieron cargar los comentarios:', commentError);
        }
    }
}

async function loadReviewDetailComments(reviewId, comments) {
    const commentsList = document.getElementById('reviewDetailCommentsList');
    const commentsCountEl = document.getElementById('reviewDetailCommentsCount');
    if (!commentsList) return;
    
    try {
        // Si no nos pasan los comentarios, los buscamos
        if (!comments) {
            const getCommentsByReviewFn = window.socialApi?.getCommentsByReview || window.reviewApi?.getCommentsByReview || (() => Promise.resolve([]));
            comments = await getCommentsByReviewFn(reviewId);
        }
        
        // Enriquecer comentarios con datos de usuario si no tienen username
        // Usar getUserProfile de userApi que ya está bien implementada
        const getUserFn = window.userApi?.getUserProfile || (async (userId) => {
            try {
                // Usar axios directamente con el endpoint correcto
                const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
                const token = localStorage.getItem('authToken');
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const response = await axios.get(`${API_BASE_URL}/api/gateway/users/${userId}`, { headers });
                return response.data;
            } catch (error) {
                console.debug(`No se pudo obtener usuario ${userId}:`, error);
                return null;
            }
        });
        
        comments = await Promise.all(comments.map(async (comment) => {
            // Si ya tiene username, devolverlo tal cual
            if (comment.UserName || comment.username) {
                return comment;
            }
            
            // Si no tiene username, obtenerlo del User Service
            const userId = comment.IdUser || comment.idUser || comment.Id_User || comment.id_user || comment.userId;
            if (userId) {
                try {
                    const userData = await getUserFn(userId);
                    if (userData) {
                        return {
                            ...comment,
                            UserName: userData.Username || userData.username || userData.UserName || 'Usuario',
                            username: userData.Username || userData.username || userData.UserName || 'Usuario',
                            UserProfilePicUrl: userData.imgProfile || userData.ImgProfile || userData.image || comment.UserProfilePicUrl
                        };
                    }
                } catch (error) {
                    // Detectar si el usuario fue eliminado (404)
                    if (error.response && error.response.status === 404) {
                        return {
                            ...comment,
                            UserName: 'Usuario', // Mantener "Usuario" genérico, el badge indicará que está eliminado
                            username: 'Usuario',
                            isUserDeleted: true,
                            UserProfilePicUrl: comment.UserProfilePicUrl || '../../Assets/default-avatar.png'
                        };
                    }
                    console.debug(`No se pudo obtener usuario ${userId} para comentario:`, error);
                }
            }
            
            // Fallback: usar el username del localStorage si es el comentario del usuario actual
            const currentUserId = localStorage.getItem('userId');
            if (userId && currentUserId && String(userId).trim() === String(currentUserId).trim()) {
                const currentUsername = localStorage.getItem('username');
                if (currentUsername) {
                    return {
                        ...comment,
                        UserName: currentUsername,
                        username: currentUsername
                    };
                }
            }
            
            // Si aún no tenemos username, devolver con "Usuario" como fallback
            return {
                ...comment,
                UserName: 'Usuario',
                username: 'Usuario'
            };
        }));
        
        const formatNotificationTimeFn = window.formatNotificationTime || ((date) => 'Ahora');
        const currentUserIdRaw = localStorage.getItem('userId');
        const currentUserId = currentUserIdRaw ? String(currentUserIdRaw).trim() : null;
        
        if (commentsCountEl) commentsCountEl.textContent = comments.length;
        
        if (comments.length === 0) {
            commentsList.innerHTML = `
                <div class="review-detail-comment-empty">
                    <i class="fas fa-comment-slash"></i>
                    <p>No hay comentarios aún. ¡Sé el primero en comentar!</p>
                </div>
            `;
    } else {
            commentsList.innerHTML = comments.map(comment => {
                const timeAgo = formatNotificationTimeFn(comment.Created || comment.CreatedAt || comment.date);
                const username = comment.UserName || comment.username || 'Usuario';
                const text = comment.Text || comment.text || '';
                let commentId = comment.Id_Comment || comment.id_Comment || comment.IdComment || comment.idComment || comment.id || comment.Id || '';
                if (commentId) {
                    commentId = String(commentId).trim();
                }
                const commentUserId = comment.IdUser || comment.idUser || comment.Id_User || comment.id_user || comment.userId || '';
                const isCommentUserDeleted = comment.isUserDeleted || false;
                
                // Verificar likes desde cache primero (igual que en reviewDetailModal.js)
                const commentLikesCacheKey = `comment_likes_${commentId}`;
                let cachedCommentLikes = null;
                try {
                    const cached = localStorage.getItem(commentLikesCacheKey);
                    if (cached !== null) {
                        cachedCommentLikes = parseInt(cached, 10);
                        if (isNaN(cachedCommentLikes)) cachedCommentLikes = null;
                    }
                } catch (e) { /* ignore */ }
                
                const likes = cachedCommentLikes !== null ? cachedCommentLikes : (comment.Likes || comment.likes || 0);
                
                // Verificar si el usuario actual le dio like desde localStorage
                let userLiked = false;
                if (currentUserId) {
                    const storedReactionId = localStorage.getItem(`reaction_comment_${commentId}_${currentUserId}`);
                    const localLike = localStorage.getItem(`like_comment_${commentId}_${currentUserId}`);
                    userLiked = storedReactionId !== null || localLike === 'true';
                }
                
                // Si no hay en localStorage, usar el valor del backend
                if (!userLiked && comment.userLiked) {
                    userLiked = comment.userLiked;
                }
                
                const normalizedCommentUserId = commentUserId ? String(commentUserId).trim() : '';
                const normalizedCurrentUserId = currentUserId ? String(currentUserId).trim() : '';
                const isOwnComment = normalizedCurrentUserId && normalizedCommentUserId && 
                    normalizedCommentUserId.toLowerCase() === normalizedCurrentUserId.toLowerCase();
                
                let actionButtons = '';
                if (isOwnComment) {
                    actionButtons = `
                        <div class="review-detail-comment-actions">
                            <button class="review-detail-comment-action-btn comment-edit-btn" data-comment-id="${commentId}" title="Editar">
                                <i class="fas fa-pencil"></i>
                            </button>
                            <button class="review-detail-comment-action-btn comment-delete-btn" data-comment-id="${commentId}" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                      </div>
                    `;
                }
                
                return `
                    <div class="review-detail-comment-item" data-comment-id="${commentId}">
                        <img src="../../Assets/default-avatar.png" alt="${username}" class="review-detail-comment-avatar ${isCommentUserDeleted ? '' : 'profile-navigation-trigger'}" ${isCommentUserDeleted ? '' : `data-user-id="${commentUserId}" style="cursor: pointer;"`} onerror="this.src='../../Assets/default-avatar.png'">
                        <div class="review-detail-comment-content">
                            <div class="review-detail-comment-header">
                                <span class="review-detail-comment-username ${isCommentUserDeleted ? '' : 'profile-navigation-trigger'}" ${isCommentUserDeleted ? '' : `data-user-id="${commentUserId}" style="cursor: pointer;"`}>${username}</span>
                                ${isCommentUserDeleted ? '<span class="deleted-account-badge" style="margin-left: 0.5rem; font-size: 0.7rem;">Cuenta eliminada</span>' : ''}
                                <span class="review-detail-comment-time">${timeAgo}</span>
                            </div>
                            <p class="review-detail-comment-text">${text}</p>
                            <div class="review-detail-comment-footer">
                                <button class="review-detail-comment-like-btn ${userLiked ? 'liked' : ''}" 
                                        data-comment-id="${commentId}">
                                    <i class="fa-solid fa-heart" style="color: ${userLiked ? 'var(--magenta, #EC4899)' : 'rgba(255,255,255,0.6)'};"></i>
                                    <span class="review-detail-comment-likes-count">${likes}</span>
                                </button>
                                ${actionButtons}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // Agregar event listeners para navegación a perfil
        attachProfileNavigationListeners();
        
        attachReviewDetailCommentListeners(reviewId);
    } catch (error) {
        console.error('Error cargando comentarios en vista detallada:', error);
        commentsList.innerHTML = '<div class="review-detail-comment-empty">Error al cargar comentarios.</div>';
    }
}

/**
 * Adjunta listeners para navegación a perfil desde avatares y usernames
 */
function attachProfileNavigationListeners() {
    document.querySelectorAll('.profile-navigation-trigger').forEach(element => {
        if (!element.hasAttribute('data-navigation-listener-attached')) {
            element.setAttribute('data-navigation-listener-attached', 'true');
            element.addEventListener('click', function(e) {
                e.stopPropagation();
                const userId = this.getAttribute('data-user-id');
                if (userId && typeof window.navigateToProfile === 'function') {
                    window.navigateToProfile(userId);
                }
            });
        }
    });
}

function attachReviewDetailCommentListeners(reviewId) {
    document.querySelectorAll('.review-detail-comment-like-btn').forEach(btn => {
        // Verificar si ya tiene un listener (usando un atributo de datos)
        if (!btn.hasAttribute('data-listener-attached')) {
            btn.setAttribute('data-listener-attached', 'true');
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const commentId = this.getAttribute('data-comment-id');
                if (commentId) {
                    toggleCommentLikeInDetail(commentId, this, reviewId);
                }
            });
        }
    });
    
    // Botones de editar
    document.querySelectorAll('.review-detail-comment-item .comment-edit-btn').forEach(btn => {
        // Verificar si ya tiene un listener
        if (!btn.hasAttribute('data-listener-attached')) {
            btn.setAttribute('data-listener-attached', 'true');
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const commentId = this.getAttribute('data-comment-id');
                if (commentId) {
                    editCommentInDetail(commentId, reviewId);
                }
            });
        }
    });
    
    // Botones de eliminar
    document.querySelectorAll('.review-detail-comment-item .comment-delete-btn').forEach(btn => {
        // Verificar si ya tiene un listener
        if (!btn.hasAttribute('data-listener-attached')) {
            btn.setAttribute('data-listener-attached', 'true');
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                const commentId = this.getAttribute('data-comment-id');
                if (commentId && reviewId) {
                    deleteCommentInDetail(commentId, reviewId);
                }
            });
        }
    });
}

async function toggleReviewLikeInDetail(reviewId, btn) {
    const authToken = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    if (!authToken || !userId) {
        if (typeof showLoginRequiredModal === 'function') {
            showLoginRequiredModal();
        }
        return;
    }
    
    const icon = btn.querySelector('i');
    const likesSpan = btn.querySelector('.review-detail-likes-count');
    const isLiked = btn.classList.contains('liked');
    const currentLikes = parseInt(likesSpan.textContent) || 0;
    
    if (isLiked) {
        // Quitar like (Optimistic Update)
        btn.classList.remove('liked');
        icon.style.color = 'rgba(255,255,255,0.7)';
        const newLikesCount = Math.max(0, currentLikes - 1);
        likesSpan.textContent = newLikesCount;
        
        // Actualizar cache
        const likesCacheKey = `review_likes_${reviewId}`;
        try {
            localStorage.setItem(likesCacheKey, String(newLikesCount));
        } catch (e) { /* ignore */ }
        
        const reactionId = localStorage.getItem(`reaction_${reviewId}_${userId}`);
        const deleteReviewReactionFn = window.socialApi?.deleteReviewReaction || (typeof deleteReviewReaction !== 'undefined' ? deleteReviewReaction : null);
        if (deleteReviewReactionFn) {
            deleteReviewReactionFn(reviewId, userId, authToken, reactionId)
                .then(() => {
                    localStorage.removeItem(`like_${reviewId}_${userId}`);
                    localStorage.removeItem(`reaction_${reviewId}_${userId}`);
                    
                    // Sincronizar con el feed si la reseña está visible
                    const feedLikeBtn = document.querySelector(`.btn-like[data-review-id="${reviewId}"]`);
                    if (feedLikeBtn && feedLikeBtn.classList.contains('liked')) {
                        feedLikeBtn.classList.remove('liked');
                        const feedIcon = feedLikeBtn.querySelector('i');
                        const feedLikesSpan = feedLikeBtn.parentElement.querySelector('.review-likes-count');
                        if (feedIcon) feedIcon.style.color = 'rgba(255,255,255,0.7)';
                        if (feedLikesSpan) feedLikesSpan.textContent = newLikesCount;
                    }
                })
                .catch(err => {
                    console.warn('No se pudo eliminar like del backend', err);
                    // Revertir cambio si falla
                    btn.classList.add('liked');
                    icon.style.color = 'var(--magenta, #EC4899)';
                    likesSpan.textContent = currentLikes;
                    try {
                        localStorage.setItem(likesCacheKey, String(currentLikes));
                    } catch (e) { /* ignore */ }
                });
        }
    } else {
        // Agregar like (Optimistic Update)
        btn.classList.add('liked');
        icon.style.color = 'var(--magenta, #EC4899)';
        const newLikesCount = currentLikes + 1;
        likesSpan.textContent = newLikesCount;
        
        // Actualizar cache
        const likesCacheKey = `review_likes_${reviewId}`;
        try {
            localStorage.setItem(likesCacheKey, String(newLikesCount));
        } catch (e) { /* ignore */ }
        
        localStorage.setItem(`like_${reviewId}_${userId}`, 'true');
        
        const addReviewReactionFn = window.socialApi?.addReviewReaction || (typeof addReviewReaction !== 'undefined' ? addReviewReaction : null);
        if (addReviewReactionFn) {
            addReviewReactionFn(reviewId, userId, authToken)
                .then(data => {
                    const reactionId = data?.Id_Reaction || data?.ReactionId || data?.id;
                    if (reactionId) {
                        localStorage.setItem(`reaction_${reviewId}_${userId}`, String(reactionId));
                    }
                    
                    // Sincronizar con el feed si la reseña está visible
                    const feedLikeBtn = document.querySelector(`.btn-like[data-review-id="${reviewId}"]`);
                    if (feedLikeBtn && !feedLikeBtn.classList.contains('liked')) {
                        feedLikeBtn.classList.add('liked');
                        const feedIcon = feedLikeBtn.querySelector('i');
                        const feedLikesSpan = feedLikeBtn.parentElement.querySelector('.review-likes-count');
                        if (feedIcon) feedIcon.style.color = 'var(--magenta, #EC4899)';
                        if (feedLikesSpan) feedLikesSpan.textContent = newLikesCount;
                    }
                })
                .catch(err => {
                    console.warn('No se pudo guardar like en el backend', err);
                    // Revertir cambio si falla
                    btn.classList.remove('liked');
                    icon.style.color = 'rgba(255,255,255,0.7)';
                    likesSpan.textContent = currentLikes;
                    localStorage.removeItem(`like_${reviewId}_${userId}`);
                    try {
                        localStorage.setItem(likesCacheKey, String(currentLikes));
                    } catch (e) { /* ignore */ }
                });
        }
    }
}

async function toggleCommentLikeInDetail(commentId, btn, reviewId) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        if (typeof showLoginRequiredModal === 'function') {
            showLoginRequiredModal();
        }
        return;
    }
    
    const icon = btn.querySelector('i');
    const likesSpan = btn.querySelector('.review-detail-comment-likes-count');
    const isLiked = btn.classList.contains('liked');
    const currentLikes = parseInt(likesSpan.textContent) || 0;
    const currentUserId = localStorage.getItem('userId');
    
    if (isLiked) {
        // Quitar like (Optimistic Update)
        btn.classList.remove('liked');
        icon.style.color = 'rgba(255,255,255,0.6)';
        const newLikesCount = Math.max(0, currentLikes - 1);
        likesSpan.textContent = newLikesCount;
        
        // Actualizar cache
        const likesCacheKey = `comment_likes_${commentId}`;
        try {
            localStorage.setItem(likesCacheKey, String(newLikesCount));
        } catch (e) { /* ignore */ }
        
        // Sincronizar con backend
        const deleteCommentReactionFn = window.socialApi?.deleteCommentReaction || (typeof deleteCommentReaction !== 'undefined' ? deleteCommentReaction : null);
        if (deleteCommentReactionFn) {
            deleteCommentReactionFn(commentId, currentUserId, authToken)
                .then(() => {
                    localStorage.removeItem(`like_comment_${commentId}_${currentUserId}`);
                    localStorage.removeItem(`reaction_comment_${commentId}_${currentUserId}`);
                    
                    // Sincronizar con el modal de comentarios si está abierto
                    const commentsModal = document.getElementById('commentsModalOverlay');
                    if (commentsModal && commentsModal.style.display === 'flex') {
                        const commentLikeBtn = document.querySelector(`.comment-like-btn[data-comment-id="${commentId}"]`);
                        if (commentLikeBtn && commentLikeBtn.classList.contains('liked')) {
                            commentLikeBtn.classList.remove('liked');
                            const commentIcon = commentLikeBtn.querySelector('i');
                            const commentLikesSpan = commentLikeBtn.querySelector('.comment-likes-count');
                            if (commentIcon) commentIcon.style.color = 'rgba(255,255,255,0.6)';
                            if (commentLikesSpan) commentLikesSpan.textContent = newLikesCount;
                        }
                    }
                })
                .catch(err => {
                    console.warn('No se pudo eliminar like del comentario en el backend', err);
                    // Revertir cambio si falla
                    btn.classList.add('liked');
                    icon.style.color = 'var(--magenta, #EC4899)';
                    likesSpan.textContent = currentLikes;
                    try {
                        localStorage.setItem(likesCacheKey, String(currentLikes));
                    } catch (e) { /* ignore */ }
                });
        }
    } else {
        // Agregar like (Optimistic Update)
        btn.classList.add('liked');
        icon.style.color = 'var(--magenta, #EC4899)';
        const newLikesCount = currentLikes + 1;
        likesSpan.textContent = newLikesCount;
        
        // Actualizar cache
        const likesCacheKey = `comment_likes_${commentId}`;
        try {
            localStorage.setItem(likesCacheKey, String(newLikesCount));
        } catch (e) { /* ignore */ }
        
        localStorage.setItem(`like_comment_${commentId}_${currentUserId}`, 'true');
        
        // Sincronizar con backend
        const addCommentReactionFn = window.socialApi?.addCommentReaction || (typeof addCommentReaction !== 'undefined' ? addCommentReaction : null);
        if (addCommentReactionFn) {
            addCommentReactionFn(commentId, currentUserId, authToken)
                .then(data => {
                    const reactionId = data?.Id_Reaction || data?.ReactionId || data?.id;
                    if (reactionId) {
                        localStorage.setItem(`reaction_comment_${commentId}_${currentUserId}`, String(reactionId));
                    }
                    
                    // Sincronizar con el modal de comentarios si está abierto
                    const commentsModal = document.getElementById('commentsModalOverlay');
                    if (commentsModal && commentsModal.style.display === 'flex') {
                        const commentLikeBtn = document.querySelector(`.comment-like-btn[data-comment-id="${commentId}"]`);
                        if (commentLikeBtn && !commentLikeBtn.classList.contains('liked')) {
                            commentLikeBtn.classList.add('liked');
                            const commentIcon = commentLikeBtn.querySelector('i');
                            const commentLikesSpan = commentLikeBtn.querySelector('.comment-likes-count');
                            if (commentIcon) commentIcon.style.color = 'var(--magenta, #EC4899)';
                            if (commentLikesSpan) commentLikesSpan.textContent = newLikesCount;
                        }
                    }
                })
                .catch(err => {
                    console.warn('No se pudo guardar like del comentario en el backend', err);
                    // Revertir cambio si falla
                    btn.classList.remove('liked');
                    icon.style.color = 'rgba(255,255,255,0.6)';
                    likesSpan.textContent = currentLikes;
                    localStorage.removeItem(`like_comment_${commentId}_${currentUserId}`);
                    try {
                        localStorage.setItem(likesCacheKey, String(currentLikes));
                    } catch (e) { /* ignore */ }
                });
        }
    }
    
    // Actualizar visualmente
    if (isLiked) {
        btn.classList.remove('liked');
        icon.style.color = 'rgba(255,255,255,0.6)';
        likesSpan.textContent = Math.max(0, currentLikes - 1);
    } else {
        btn.classList.add('liked');
        icon.style.color = 'var(--magenta, #EC4899)';
        likesSpan.textContent = currentLikes + 1;
    }
    
    // TODO: Enviar like al backend cuando esté disponible
}

function editCommentInDetail(commentId, reviewId) {
    const commentItem = document.querySelector(`.review-detail-comment-item[data-comment-id="${commentId}"]`);
    const commentTextElement = commentItem?.querySelector('.review-detail-comment-text');
    
    if (!commentItem || !commentTextElement) {
        console.error('No se encontró commentItem o commentTextElement en vista detallada');
        return;
    }
    
    // Si ya está en modo edición, no hacer nada
    if (commentItem.classList.contains('editing')) {
        return;
    }
    
    // Guardar el texto original
    const originalText = commentTextElement.textContent.trim();
    
    // Crear textarea para edición
    const textarea = document.createElement('textarea');
    textarea.className = 'comment-text-edit';
    textarea.value = originalText;
    textarea.maxLength = 500;
    textarea.rows = 3;
    
    // Crear contenedor de botones
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'comment-edit-buttons';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'comment-edit-action-btn comment-edit-cancel';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        cancelEditCommentInDetail(commentId, originalText);
    });
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'comment-edit-action-btn comment-edit-confirm';
    confirmBtn.textContent = 'Guardar';
    confirmBtn.type = 'button';
    confirmBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const newText = textarea.value.trim();
        if (newText && newText !== originalText) {
            saveCommentEditInDetail(commentId, newText, reviewId);
        } else {
            cancelEditCommentInDetail(commentId, originalText);
        }
    });
    
    buttonsContainer.appendChild(cancelBtn);
    buttonsContainer.appendChild(confirmBtn);
    
    // Reemplazar el texto con el textarea
    commentTextElement.style.display = 'none';
    commentItem.classList.add('editing');
    commentTextElement.parentNode.insertBefore(textarea, commentTextElement);
    commentTextElement.parentNode.insertBefore(buttonsContainer, commentTextElement.nextSibling);
    
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

function cancelEditCommentInDetail(commentId, originalText) {
    const commentItem = document.querySelector(`.review-detail-comment-item[data-comment-id="${commentId}"]`);
    if (!commentItem) return;
    
    const textarea = commentItem.querySelector('.comment-text-edit');
    const buttonsContainer = commentItem.querySelector('.comment-edit-buttons');
    const commentTextElement = commentItem.querySelector('.review-detail-comment-text');
    
    if (textarea) textarea.remove();
    if (buttonsContainer) buttonsContainer.remove();
    if (commentTextElement) {
        commentTextElement.textContent = originalText;
        commentTextElement.style.display = 'block';
    }
    
    commentItem.classList.remove('editing');
}

async function saveCommentEditInDetail(commentId, newText, reviewId) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        if (typeof showLoginRequiredModal === 'function') {
            showLoginRequiredModal();
        }
        return;
    }
    
    try {
        const updateCommentFn = window.socialApi?.updateComment || window.reviewApi?.updateComment;
        if (updateCommentFn) {
            await updateCommentFn(commentId, newText, authToken);
            
            // Actualizar el texto en el DOM
            const commentTextElement = document.querySelector(`.review-detail-comment-item[data-comment-id="${commentId}"] .review-detail-comment-text`);
            if (commentTextElement) {
                commentTextElement.textContent = newText;
            }
            
            cancelEditCommentInDetail(commentId, newText);
            
            if (typeof showAlert === 'function') {
                showAlert('Comentario actualizado', 'success');
            }
        }
    } catch (error) {
        console.error('Error actualizando comentario:', error);
        if (typeof showAlert === 'function') {
            showAlert('Error al actualizar el comentario', 'danger');
        }
    }
}

// Variable global para almacenar el ID del comentario a eliminar
let deletingCommentId = null;
let deletingCommentReviewId = null;

function showDeleteCommentModal(commentId, reviewId) {
    deletingCommentId = commentId;
    deletingCommentReviewId = reviewId;
    
    const modal = document.getElementById('deleteCommentModalOverlay');
    if (modal) {
        // Asegurar que el modal tenga el z-index más alto
        modal.style.display = 'flex';
        modal.style.zIndex = '10005';
        // Asegurar que el modal esté visible
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
    } else {
        // Fallback a confirm si no hay modal
        if (confirm('¿Estás seguro de que quieres eliminar este comentario? Esta acción no se puede deshacer.')) {
            confirmDeleteComment();
        }
    }
}

function hideDeleteCommentModal() {
    const modal = document.getElementById('deleteCommentModalOverlay');
    if (modal) {
        modal.style.display = 'none';
    }
    deletingCommentId = null;
    deletingCommentReviewId = null;
}

async function confirmDeleteComment() {
    if (!deletingCommentId) return;
    
    const commentId = deletingCommentId;
    const reviewId = deletingCommentReviewId;
    
    hideDeleteCommentModal();
    
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        if (typeof showLoginRequiredModal === 'function') {
            showLoginRequiredModal();
        }
        return;
    }
    
    try {
        const deleteCommentFn = window.socialApi?.deleteComment || window.reviewApi?.deleteComment;
        if (deleteCommentFn) {
            await deleteCommentFn(commentId, authToken);
            
            // Remover el comentario del DOM
            const commentItem = document.querySelector(`.review-detail-comment-item[data-comment-id="${commentId}"]`);
            if (commentItem) {
                commentItem.remove();
            }
            
            // Actualizar el contador de comentarios en el modal de detalles
            const commentsCountEl = document.getElementById('reviewDetailCommentsCount');
            if (commentsCountEl) {
                const currentCount = parseInt(commentsCountEl.textContent) || 0;
                commentsCountEl.textContent = Math.max(0, currentCount - 1);
            }
            
            // Actualizar el contador de comentarios en la tarjeta de reseña del perfil
            const reviewItem = document.querySelector(`.review-item[data-review-id="${reviewId}"]`);
            if (reviewItem) {
                const reviewCommentsCount = reviewItem.querySelector('.review-comments-count');
                if (reviewCommentsCount) {
                    const currentCardCount = parseInt(reviewCommentsCount.textContent) || 0;
                    reviewCommentsCount.textContent = Math.max(0, currentCardCount - 1);
                }
            }
            
            // Si no hay más comentarios, mostrar mensaje vacío
            const commentsList = document.getElementById('reviewDetailCommentsList');
            if (commentsList && commentsList.querySelectorAll('.review-detail-comment-item').length === 0) {
                commentsList.innerHTML = `
                    <div class="review-detail-comment-empty">
                        <i class="fas fa-comment-slash"></i>
                        <p>No hay comentarios aún. ¡Sé el primero en comentar!</p>
                    </div>
                `;
            }
            
            if (typeof showAlert === 'function') {
                showAlert('Comentario eliminado', 'success');
            }
        }
    } catch (error) {
        console.error('Error eliminando comentario:', error);
        if (typeof showAlert === 'function') {
            showAlert('Error al eliminar el comentario', 'danger');
        }
    }
}

async function deleteCommentInDetail(commentId, reviewId) {
    showDeleteCommentModal(commentId, reviewId);
}

function hideReviewDetailModal() {
    const modal = document.getElementById('reviewDetailModalOverlay');
    if (modal) modal.style.display = 'none';
}

// Variable global para almacenar el ID de la reseña a eliminar
let deletingReviewId = null;

function initializeDeleteModalsLogic() {
    // Modal de Borrar Comentario
    const cancelDeleteCommentBtn = document.getElementById('cancelDeleteCommentBtn');
    const confirmDeleteCommentBtn = document.getElementById('confirmDeleteCommentBtn');
    const deleteCommentModalOverlay = document.getElementById('deleteCommentModalOverlay');
    
    if (cancelDeleteCommentBtn) {
        cancelDeleteCommentBtn.addEventListener('click', hideDeleteCommentModal);
    }
    if (confirmDeleteCommentBtn) {
        confirmDeleteCommentBtn.addEventListener('click', confirmDeleteComment);
    }
    if (deleteCommentModalOverlay) {
        deleteCommentModalOverlay.addEventListener('click', (e) => {
            if (e.target === deleteCommentModalOverlay) hideDeleteCommentModal();
        });
    }
    
    // Modal de Borrar Reseña
    const cancelDeleteReviewBtn = document.getElementById('cancelDeleteReviewBtn');
    const confirmDeleteReviewBtn = document.getElementById('confirmDeleteReviewBtn');
    const deleteReviewModalOverlay = document.getElementById('deleteReviewModalOverlay');
    
    if (cancelDeleteReviewBtn) {
        cancelDeleteReviewBtn.addEventListener('click', hideDeleteReviewModal);
    }
    if (confirmDeleteReviewBtn) {
        confirmDeleteReviewBtn.addEventListener('click', confirmDeleteReview);
    }
    if (deleteReviewModalOverlay) {
        deleteReviewModalOverlay.addEventListener('click', (e) => {
            if (e.target === deleteReviewModalOverlay) hideDeleteReviewModal();
        });
    }
}

function hideDeleteReviewModal() {
    const modal = document.getElementById('deleteReviewModalOverlay');
    if (modal) {
        modal.style.display = 'none';
    }
    deletingReviewId = null;
}

async function confirmDeleteReview() {
    if (!deletingReviewId) return;
    
    const reviewId = deletingReviewId;
    hideDeleteReviewModal();
    await deleteReviewLogic(reviewId);
}

function initializeReviewDetailModalLogic() {
    const closeReviewDetailModal = document.getElementById('closeReviewDetailModal');
    const reviewDetailModalOverlay = document.getElementById('reviewDetailModalOverlay');
    const reviewDetailSubmitCommentBtn = document.getElementById('reviewDetailSubmitCommentBtn');
    const reviewDetailCommentInput = document.getElementById('reviewDetailCommentInput');
    
    if (closeReviewDetailModal) {
        closeReviewDetailModal.addEventListener('click', hideReviewDetailModal);
    }
    
    if (reviewDetailModalOverlay) {
        reviewDetailModalOverlay.addEventListener('click', (e) => {
            if (e.target === reviewDetailModalOverlay) {
                hideReviewDetailModal();
            }
        });
    }
    
    if (reviewDetailSubmitCommentBtn) {
        reviewDetailSubmitCommentBtn.addEventListener('click', submitReviewDetailComment);
    }
    
    if (reviewDetailCommentInput) {
        reviewDetailCommentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitReviewDetailComment();
            }
        });
    }
}

async function submitReviewDetailComment() {
    const modal = document.getElementById('reviewDetailModalOverlay');
    if (!modal || modal.style.display !== 'flex') return;
    
    const reviewId = modal.getAttribute('data-review-id');
    const commentInput = document.getElementById('reviewDetailCommentInput');
    
    if (!reviewId || !commentInput) {
        console.warn('No se pudo obtener reviewId o commentInput en modal de detalle');
        return;
    }
    
    const commentText = commentInput.value.trim();
    if (!commentText) {
        if (typeof showAlert === 'function') {
            showAlert('Por favor, escribe un comentario', 'warning');
        }
        return;
    }
    
    try {
        const authToken = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        
        if (!authToken) {
            if (typeof showLoginRequiredModal === 'function') {
                showLoginRequiredModal();
            }
            return;
        }
        
        // Crear comentario usando la API - intentar múltiples fuentes
        let createCommentFn = null;
        
        // Intentar desde socialApi (importado como módulo)
        if (typeof window.socialApi !== 'undefined' && window.socialApi.createComment) {
            createCommentFn = window.socialApi.createComment;
        } else if (typeof window.reviewApi !== 'undefined' && window.reviewApi.createComment) {
            createCommentFn = window.reviewApi.createComment;
        } else if (typeof createComment === 'function') {
            // Intentar función global directa
            createCommentFn = createComment;
        } else {
            // Intentar importar dinámicamente
            try {
                const socialApiModule = await import('../../APIs/socialApi.js');
                if (socialApiModule && socialApiModule.createComment) {
                    createCommentFn = socialApiModule.createComment;
                    // Guardar para uso futuro
                    if (typeof window !== 'undefined') {
                        if (!window.socialApi) window.socialApi = {};
                        window.socialApi.createComment = socialApiModule.createComment;
                    }
                }
            } catch (importError) {
                console.warn('No se pudo importar socialApi dinámicamente:', importError);
            }
        }
        
        if (createCommentFn) {
            await createCommentFn(reviewId, commentText);
        } else {
            console.error('No se encontró función createComment en ninguna fuente disponible');
            if (typeof showAlert === 'function') {
                showAlert('Error: No se pudo encontrar la función para crear comentarios', 'danger');
            }
            return;
        }
        
        // Limpiar input
        commentInput.value = '';
        
        // Recargar comentarios para obtener el username del backend
        const getCommentsByReviewFn = window.socialApi?.getCommentsByReview || window.reviewApi?.getCommentsByReview || (() => Promise.resolve([]));
        const comments = await getCommentsByReviewFn(reviewId);
        await loadReviewDetailComments(reviewId, comments);
        
        // Actualizar contador en el modal de detalles
        const commentsCount = document.getElementById('reviewDetailCommentsCount');
        if (commentsCount) {
            commentsCount.textContent = comments.length;
        }
        
        // Actualizar también el contador en la tarjeta de reseña del perfil
        const reviewItem = document.querySelector(`.review-item[data-review-id="${reviewId}"]`);
        if (reviewItem) {
            const reviewCommentsCount = reviewItem.querySelector('.review-comments-count');
            if (reviewCommentsCount) {
                reviewCommentsCount.textContent = comments.length;
            }
        }
        
        if (typeof showAlert === 'function') {
            showAlert('Comentario agregado exitosamente', 'success');
        }
    } catch (error) {
        console.error('Error agregando comentario en vista detallada:', error);
        if (typeof showAlert === 'function') {
            showAlert('Error al agregar el comentario', 'danger');
        }
    }
}

// --- FUNCIONES PARA CREAR RESEÑA DESDE EL PERFIL ---

let currentReviewData = null; // Almacena datos del contenido para el modal "Crear Reseña"

/**
 * Inicializa el modal de crear reseña en el perfil
 */
function initializeCreateReviewModal() {
    const addReviewBtn = document.getElementById('addReviewBtn');
    const closeCreateReviewModal = document.getElementById('closeCreateReviewModal');
    const createReviewModalOverlay = document.getElementById('createReviewModalOverlay');
    const submitCreateReviewBtn = document.getElementById('submitCreateReviewBtn');
    const createReviewStars = document.getElementById('createReviewStars');
    const contentSearchInput = document.getElementById('contentSearchInput');
    const contentSearchDropdown = document.getElementById('contentSearchDropdown');
    const changeContentBtn = document.getElementById('changeContentBtn');
    
    if (closeCreateReviewModal) {
        closeCreateReviewModal.addEventListener('click', hideCreateReviewModal);
    }
    if (createReviewModalOverlay) {
        createReviewModalOverlay.addEventListener('click', (e) => {
            if (e.target === createReviewModalOverlay) hideCreateReviewModal();
        });
    }
    
    if (submitCreateReviewBtn) {
        submitCreateReviewBtn.addEventListener('click', (e) => {
            console.log('🔘 Botón de crear reseña clickeado desde perfil');
            e.preventDefault();
            submitCreateReview();
        });
    }
    
    if (changeContentBtn) {
        changeContentBtn.addEventListener('click', () => {
            const contentSelector = document.getElementById('createReviewContentSelector');
            const contentInfo = document.getElementById('createReviewContentInfo');
            if (contentSelector) contentSelector.style.display = 'block';
            if (contentInfo) contentInfo.style.display = 'none';
            currentReviewData = null;
        });
    }
    
    // Búsqueda de contenido (igual que en homeAdmin.js)
    if (contentSearchInput) {
        let searchTimeout;
        let currentSearchController = null;
        
        contentSearchInput.addEventListener('input', function() {
            if (currentSearchController) {
                currentSearchController.abort();
            }
            clearTimeout(searchTimeout);
            
            if (this.value.length > 0) {
                currentSearchController = new AbortController();
                searchTimeout = setTimeout(() => {
                    performContentSearch(this.value.trim(), currentSearchController.signal);
                }, 500);
            } else {
                if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';
            }
        });
        
        document.addEventListener('click', (e) => {
            if (contentSearchInput && contentSearchDropdown && !contentSearchInput.contains(e.target) && !contentSearchDropdown.contains(e.target)) {
                if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';
            }
        });
    }
    
    // Estrellas
    if (createReviewStars) {
        let currentRating = 0;
        const stars = createReviewStars.querySelectorAll('.star-input');
        
        stars.forEach(star => {
            star.addEventListener('click', () => {
                currentRating = parseInt(star.getAttribute('data-rating'));
                stars.forEach((s, i) => {
                    s.classList.toggle('active', i < currentRating);
                });
            });
            
            star.addEventListener('mouseenter', function() {
                // Solo resaltar esta estrella y las anteriores (hasta esta posición)
                const hoverRating = parseInt(this.getAttribute('data-rating')) || 0;
                stars.forEach((s, i) => {
                    // Solo activar las estrellas hasta la posición actual (i + 1 <= hoverRating)
                    const shouldBeActive = (i + 1) <= hoverRating;
                    s.classList.toggle('active', shouldBeActive);
                    // No cambiar opacity, dejar que el CSS maneje el hover
                });
            });
        });
        
        createReviewStars.addEventListener('mouseleave', () => {
            // Restaurar al rating actual cuando se sale del área
            stars.forEach((s, i) => {
                const shouldBeActive = (i + 1) <= currentRating;
                s.classList.toggle('active', shouldBeActive);
                s.style.opacity = shouldBeActive ? '1' : '0.5';
            });
        });
    }
}

/**
 * Muestra el modal de crear reseña
 */
function showCreateReviewModal(contentData = null) {
    const modal = document.getElementById('createReviewModalOverlay');
    const contentSelector = document.getElementById('createReviewContentSelector');
    const contentInfo = document.getElementById('createReviewContentInfo');
    const contentSearchInput = document.getElementById('contentSearchInput');
    const contentSearchDropdown = document.getElementById('contentSearchDropdown');
    
    if (!modal) {
        console.warn('Modal de crear reseña no encontrado');
        return;
    }
    
    if (contentData && contentData.type === 'artist') {
        if (typeof showAlert === 'function') {
            showAlert('No se pueden crear reseñas de artistas. Por favor, selecciona una canción o un álbum.', 'warning');
        } else {
            alert('No se pueden crear reseñas de artistas.');
        }
        return;
    }
    
    if (contentData) {
        setSelectedContent(contentData);
    } else {
        currentReviewData = null;
        if (contentSelector) contentSelector.style.display = 'block';
        if (contentInfo) contentInfo.style.display = 'none';
        if (contentSearchInput) contentSearchInput.value = '';
        if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';
    }
    
    const titleInput = document.getElementById('createReviewTitleInput');
    const textInput = document.getElementById('createReviewTextInput');
    if (titleInput) titleInput.value = '';
    if (textInput) textInput.value = '';
    
    const stars = document.querySelectorAll('#createReviewStars .star-input');
    stars.forEach(star => star.classList.remove('active'));
    
    modal.style.display = 'flex';
}

function hideCreateReviewModal() {
    const modal = document.getElementById('createReviewModalOverlay');
    if (modal) {
        modal.style.display = 'none';
    }
    currentReviewData = null;
}

function setSelectedContent(contentData) {
    currentReviewData = contentData;
    const contentSelector = document.getElementById('createReviewContentSelector');
    const contentInfo = document.getElementById('createReviewContentInfo');
    const contentInfoImage = document.getElementById('contentInfoImage');
    const contentInfoName = document.getElementById('contentInfoName');
    const contentInfoType = document.getElementById('contentInfoType');
    
    if (contentSelector) contentSelector.style.display = 'none';
    if (contentInfo) contentInfo.style.display = 'flex';
    if (contentInfoImage) contentInfoImage.src = contentData.image || '../../Assets/default-avatar.png';
    if (contentInfoName) contentInfoName.textContent = contentData.name || '';
    if (contentInfoType) contentInfoType.textContent = contentData.type === 'song' ? 'CANCIÓN' : 'ÁLBUM';
}

/**
 * Busca contenido usando la API de búsqueda (igual que en homeAdmin.js)
 */
async function performContentSearch(query, signal) {
    const contentSearchDropdown = document.getElementById('contentSearchDropdown');
    if (!query || query.length === 0) {
        if (contentSearchDropdown) contentSearchDropdown.style.display = 'none';
        return;
    }
    
    if (contentSearchDropdown) {
        contentSearchDropdown.innerHTML = '<div class="search-loading">Buscando...</div>';
        contentSearchDropdown.style.display = 'block';
    }
    
    try {
        let results = null;
        
        // Intentar usar fetchSearchResults si está disponible (desde headerHandler o window)
        if (typeof window.fetchSearchResults === 'function') {
            results = await window.fetchSearchResults(query, signal);
        } else if (typeof fetchSearchResults === 'function') {
            results = await fetchSearchResults(query, signal);
        } else {
            // Usar la API directamente
            const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
            const axiosInstance = window.axios || axios;
            const response = await axiosInstance.get(`${API_BASE_URL}/api/gateway/contents/search`, {
                params: { query: query },
                signal: signal,
                timeout: 5000
            });
            results = response.data;
        }
        
        if (results === null) return; // Búsqueda cancelada
        displayContentSearchResults(results, query);
    } catch (error) {
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
            return; // Búsqueda cancelada, no es un error
        }
        console.error('Error en la búsqueda del modal:', error);
        if (contentSearchDropdown) {
            contentSearchDropdown.innerHTML = `
                <div class="search-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Error al buscar. Intenta nuevamente.</span>
                </div>
            `;
            contentSearchDropdown.style.display = 'block';
        }
    }
}

/**
 * Muestra los resultados de búsqueda en el dropdown del modal (igual que en homeAdmin.js)
 */
function displayContentSearchResults(results, query) {
    const contentSearchDropdown = document.getElementById('contentSearchDropdown');
    
    const albums = results.Albums || results.albums || [];
    const songs = results.Songs || results.songs || [];
    
    if (albums.length === 0 && songs.length === 0) {
        if (contentSearchDropdown) {
            contentSearchDropdown.innerHTML = `
                <div class="search-no-results">
                    <i class="fas fa-search"></i>
                    <span>No se encontraron resultados para "${query}"</span>
                </div>
            `;
            contentSearchDropdown.style.display = 'block';
        }
        return;
    }
    
    let html = '';
    
    // Canciones primero (como en Spotify)
    if (songs.length > 0) {
        songs.forEach(song => {
            const songId = song.apiSongId || song.APISongId || song.APIId || song.apiId || song.Id || song.id || song.SongId || song.songId || '';
            const songTitle = song.Title || song.title || song.Name || song.name || '';
            const songImage = song.Image || song.image || song.AlbumImage || song.albumImage || '../../Assets/default-avatar.png';
            const artistName = song.ArtistName || song.artistName || song.Artist || song.artist || '';
            const subtitle = artistName ? `Canción • ${artistName}` : 'Canción';
            
            if (!songId) {
                console.warn('⚠️ Canción sin ID:', song);
            }
            
            html += `
                <div class="content-search-item" data-type="song" data-id="${songId}" data-name="${songTitle}" data-image="${songImage}" data-artist="${artistName}">
                    <img src="${songImage}" alt="${songTitle}" class="content-search-item-image" onerror="this.src='../../Assets/default-avatar.png'">
                    <div class="content-search-item-text">
                        <div class="content-search-item-name">${songTitle}</div>
                        <div class="content-search-item-type">${subtitle}</div>
                    </div>
                    <i class="fas fa-plus content-search-item-icon"></i>
                </div>
            `;
        });
    }
    
    // Álbumes después
    if (albums.length > 0) {
        albums.forEach(album => {
            const albumId = album.apiAlbumId || album.APIAlbumId || album.Id || album.id || album.AlbumId || album.albumId || '';
            const albumTitle = album.Title || album.title || album.Name || album.name || '';
            const albumImage = album.Image || album.image || '../../Assets/default-avatar.png';
            const artistName = album.ArtistName || album.artistName || album.Artist || album.artist || '';
            const subtitle = artistName ? `Álbum • ${artistName}` : 'Álbum';
            
            if (!albumId) {
                console.warn('⚠️ Álbum sin ID:', album);
            }
            
            html += `
                <div class="content-search-item" data-type="album" data-id="${albumId}" data-name="${albumTitle}" data-image="${albumImage}" data-artist="${artistName}">
                    <img src="${albumImage}" alt="${albumTitle}" class="content-search-item-image" onerror="this.src='../../Assets/default-avatar.png'">
                    <div class="content-search-item-text">
                        <div class="content-search-item-name">${albumTitle}</div>
                        <div class="content-search-item-type">${subtitle}</div>
                    </div>
                    <i class="fas fa-plus content-search-item-icon"></i>
                </div>
            `;
        });
    }
    
    if (contentSearchDropdown) {
        contentSearchDropdown.innerHTML = html;
        contentSearchDropdown.style.display = 'block';
        
        contentSearchDropdown.querySelectorAll('.content-search-item').forEach(item => {
            item.addEventListener('click', function() {
                const contentType = this.getAttribute('data-type');
                
                if (contentType === 'artist') {
                    if (typeof showAlert === 'function') {
                        showAlert('No se pueden crear reseñas de artistas. Por favor, selecciona una canción o un álbum.', 'warning');
                    } else {
                        alert('No se pueden crear reseñas de artistas.');
                    }
                    return;
                }
                
                const contentId = this.getAttribute('data-id');
                const contentName = this.getAttribute('data-name');
                const contentImage = this.getAttribute('data-image');
                const contentArtist = this.getAttribute('data-artist') || '';
                
                console.log('🎵 Contenido seleccionado:', { type: contentType, id: contentId, name: contentName, image: contentImage, artist: contentArtist });
                
                if (!contentId || contentId === '00000000-0000-0000-0000-000000000000' || contentId.trim() === '') {
                    console.error('❌ Error: El ID del contenido está vacío o es un GUID vacío');
                    if (typeof showAlert === 'function') {
                        showAlert('Error: No se pudo obtener el ID del contenido. El backend no está devolviendo un ID válido.', 'warning');
                    } else {
                        alert('Error: No se pudo obtener el ID del contenido.');
                    }
                    return;
                }
                
                const contentData = {
                    type: contentType,
                    id: contentId,
                    name: contentName,
                    image: contentImage,
                    artist: contentArtist
                };
                
                setSelectedContent(contentData);
                const contentSearchInput = document.getElementById('contentSearchInput');
                if (contentSearchInput) contentSearchInput.value = contentName;
            });
        });
    }
}

/**
 * Envía la reseña al backend y actualiza el perfil (igual que en homeAdmin.js)
 */
async function submitCreateReview() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        if (typeof showAlert === 'function') {
            showAlert('Debes iniciar sesión para crear una reseña', 'warning');
        } else {
            alert('Debes iniciar sesión para crear una reseña');
        }
        return;
    }
    
    const titleInput = document.getElementById('createReviewTitleInput');
    const textInput = document.getElementById('createReviewTextInput');
    const createReviewStars = document.getElementById('createReviewStars');
    
    const title = titleInput ? titleInput.value.trim() : '';
    const content = textInput ? textInput.value.trim() : '';
    
    let rating = 0;
    if (createReviewStars) {
        const activeStars = createReviewStars.querySelectorAll('.star-input.active');
        rating = activeStars.length;
    }
    
    if (!title) {
        if (typeof showAlert === 'function') {
            showAlert('Por favor, ingresa un título para la reseña', 'warning');
        } else {
            alert('Por favor, ingresa un título para la reseña');
        }
        return;
    }
    if (!content) {
        if (typeof showAlert === 'function') {
            showAlert('Por favor, escribe tu reseña', 'warning');
        } else {
            alert('Por favor, escribe tu reseña');
        }
        return;
    }
    if (rating === 0) {
        if (typeof showAlert === 'function') {
            showAlert('Por favor, selecciona una calificación', 'warning');
        } else {
            alert('Por favor, selecciona una calificación');
        }
        return;
    }
    
    const userId = localStorage.getItem('userId');
    const modal = document.getElementById('createReviewModalOverlay');
    const editReviewId = modal ? modal.getAttribute('data-edit-review-id') : null;
    const isEdit = !!editReviewId;
    
    // --- Lógica de Edición (igual que en homeAdmin.js) ---
    if (isEdit) {
        console.log('✏️ Modo edición detectado. ReviewId:', editReviewId);
        try {
            const reviewData = {
                UserId: String(userId).trim(),
                Rating: rating,
                Title: title,
                Content: content
            };
            
            // Intentar usar updateReview si está disponible
            if (typeof window.socialApi !== 'undefined' && window.socialApi.updateReview) {
                await window.socialApi.updateReview(editReviewId, reviewData, authToken);
            } else if (typeof updateReview === 'function') {
                await updateReview(editReviewId, reviewData, authToken);
            } else {
                // Usar axios directamente
                const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
                const axiosInstance = window.axios || axios;
                await axiosInstance.put(`${API_BASE_URL}/api/gateway/reviews/${editReviewId}`, reviewData, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
            }
            
            console.log(' Reseña editada exitosamente');
            if (typeof showAlert === 'function') {
                showAlert(' Reseña editada exitosamente', 'success');
            } else {
                alert(' Reseña editada exitosamente');
            }
            hideCreateReviewModal();
            if (modal) modal.removeAttribute('data-edit-review-id');
            
            // Recargar las reseñas del perfil
            if (profileUserId && typeof loadUserProfile === 'function') {
                await loadUserProfile(profileUserId);
            }
        } catch (error) {
            console.error('❌ Error editando reseña:', error);
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.message || error.response.data?.Message || 'Error desconocido';
                if (status === 401) {
                    if (typeof showAlert === 'function') {
                        showAlert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'warning');
                    } else {
                        alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
                    }
                    setTimeout(() => { window.location.href = '../login.html'; }, 2000);
                } else if (status === 403) {
                    if (typeof showAlert === 'function') {
                        showAlert('No tienes permisos para editar esta reseña.', 'danger');
                    } else {
                        alert('No tienes permisos para editar esta reseña.');
                    }
                } else if (status === 404) {
                    if (typeof showAlert === 'function') {
                        showAlert('La reseña no fue encontrada.', 'danger');
                    } else {
                        alert('La reseña no fue encontrada.');
                    }
                } else {
                    if (typeof showAlert === 'function') {
                        showAlert(`Error al editar la reseña: ${message}`, 'danger');
                    } else {
                        alert(`Error al editar la reseña: ${message}`);
                    }
                }
            } else {
                if (typeof showAlert === 'function') {
                    showAlert('Error al editar la reseña. Intenta nuevamente.', 'danger');
                } else {
                    alert('Error al editar la reseña. Intenta nuevamente.');
                }
            }
        }
        return;
    }
    
    // --- Lógica de Creación ---
    if (!currentReviewData || !currentReviewData.id) {
        if (typeof showAlert === 'function') {
            showAlert('Error: No se seleccionó contenido.', 'warning');
        } else {
            alert('Error: No se seleccionó contenido.');
        }
        return;
    }
    
    try {
        // Obtener el GUID del contenido
        let contentGuid = null;
        
        try {
            const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
            const axiosInstance = window.axios || axios;
            
            if (currentReviewData.type === 'song') {
                // Intentar POST primero (create), luego GET si falla
                try {
                    const response = await axiosInstance.post(`${API_BASE_URL}/api/gateway/contents/song`, {
                        APISongId: currentReviewData.id
                    }, {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 10000
                    });
                    contentGuid = response.data?.SongId || response.data?.songId;
                } catch (postError) {
                    // Si POST falla, intentar GET
                    const getResponse = await axiosInstance.get(`${API_BASE_URL}/api/gateway/contents/song/${currentReviewData.id}`, {
                        timeout: 10000
                    });
                    contentGuid = getResponse.data?.SongId || getResponse.data?.songId;
                }
            } else if (currentReviewData.type === 'album') {
                const response = await axiosInstance.get(`${API_BASE_URL}/api/gateway/contents/album/${currentReviewData.id}`, {
                    timeout: 10000
                });
                contentGuid = response.data?.AlbumId || response.data?.albumId;
            }
        } catch (apiError) {
            console.error('Error obteniendo GUID del contenido:', apiError);
            // Intentar métodos alternativos
            if (typeof window.contentApi !== 'undefined') {
                if (currentReviewData.type === 'song' && window.contentApi.getOrCreateSong) {
                    const songData = await window.contentApi.getOrCreateSong(currentReviewData.id);
                    contentGuid = songData.songId || songData.SongId;
                } else if (currentReviewData.type === 'album' && window.contentApi.getOrCreateAlbum) {
                    const albumData = await window.contentApi.getOrCreateAlbum(currentReviewData.id);
                    contentGuid = albumData.albumId || albumData.AlbumId;
                }
            } else if (typeof getOrCreateSong === 'function' || typeof getOrCreateAlbum === 'function') {
                if (currentReviewData.type === 'song' && typeof getOrCreateSong === 'function') {
                    const songData = await getOrCreateSong(currentReviewData.id);
                    contentGuid = songData.songId || songData.SongId;
                } else if (currentReviewData.type === 'album' && typeof getOrCreateAlbum === 'function') {
                    const albumData = await getOrCreateAlbum(currentReviewData.id);
                    contentGuid = albumData.albumId || albumData.AlbumId;
                }
            }
        }
        
        if (!contentGuid) {
            if (typeof showAlert === 'function') {
                showAlert('Error: No se pudo obtener el ID del contenido.', 'warning');
            } else {
                alert('Error: No se pudo obtener el ID del contenido.');
            }
            return;
        }
        
        const reviewData = {
            UserId: String(userId).trim(),
            Rating: rating,
            Title: title,
            Content: content,
            SongId: null,
            AlbumId: null
        };
        
        if (currentReviewData.type === 'song') {
            reviewData.SongId = String(contentGuid).trim();
        } else if (currentReviewData.type === 'album') {
            reviewData.AlbumId = String(contentGuid).trim();
        }
        
        // Crear la reseña
        let response = null;
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
        
        try {
            // Intentar usar la función createReview si está disponible
            if (typeof window.socialApi !== 'undefined' && window.socialApi.createReview) {
                response = await window.socialApi.createReview(reviewData, authToken);
            } else if (typeof createReview === 'function') {
                response = await createReview(reviewData, authToken);
            } else if (typeof window.reviewApi !== 'undefined' && window.reviewApi.createReview) {
                response = await window.reviewApi.createReview(reviewData, authToken);
            } else {
                // Usar axios directamente
                const axiosInstance = window.axios || axios;
                const axiosResponse = await axiosInstance.post(`${API_BASE_URL}/api/gateway/reviews`, reviewData, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                response = axiosResponse.data;
            }
        } catch (createError) {
            console.error('Error creando reseña:', createError);
            throw createError;
        }
        
        console.log('✅ Reseña creada exitosamente:', response);
        
        // Guardar datos del contenido en localStorage para uso futuro
        const reviewId = response?.ReviewId || response?.reviewId || response?.Id_Review || response?.id;
        if (reviewId) {
            const reviewIdStr = String(reviewId).trim();
            const storageKey = `review_content_${reviewIdStr}`;
            localStorage.setItem(storageKey, JSON.stringify({
                type: currentReviewData.type,
                id: currentReviewData.id,
                name: currentReviewData.name,
                artist: currentReviewData.artist,
                image: currentReviewData.image
            }));
            
            // Guardar el timestamp de creación para que aparezca primero en el filtro "recent"
            const creationTimestampKey = `review_created_at_${reviewIdStr}`;
            const now = Date.now();
            localStorage.setItem(creationTimestampKey, String(now));
            console.log(`⏰ Timestamp de creación guardado para review ${reviewIdStr}: ${now}`);
        }
        
        hideCreateReviewModal();
        
        if (typeof showAlert === 'function') {
            showAlert(' Reseña creada exitosamente', 'success');
        } else {
            alert(' Reseña creada exitosamente');
        }
        
        // Esperar un momento para que el backend procese la reseña antes de recargar
        setTimeout(async () => {
            // Recargar las reseñas del perfil
            if (profileUserId && typeof loadUserProfile === 'function') {
                await loadUserProfile(profileUserId);
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Error creando reseña:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
        if (typeof showAlert === 'function') {
            showAlert(`Error al crear la reseña: ${errorMessage}`, 'danger');
        } else {
            alert(`Error al crear la reseña: ${errorMessage}`);
        }
    }
}

// --- FUNCIONES PARA MODAL DE SEGUIDORES/SEGUIDOS ---

/**
 * Carga y muestra la lista de seguidores o seguidos en el modal
 * @param {string} userId - ID del usuario
 * @param {string} type - 'followers' o 'following'
 */
async function showFollowersModal(userId, type) {
    const modal = document.getElementById('followersModalOverlay');
    const modalTitle = document.getElementById('followersModalTitle');
    const followersList = document.getElementById('followersList');
    
    if (!modal || !modalTitle || !followersList) {
        console.error('❌ Elementos del modal no encontrados');
        return;
    }
    
    // Configurar título
    modalTitle.textContent = type === 'followers' ? 'Seguidores' : 'Seguidos';
    
    // Mostrar modal
    modal.style.display = 'flex';
    
    // Mostrar loading
    followersList.innerHTML = `
        <div class="followers-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Cargando...</p>
        </div>
    `;
    
    try {
        const userApi = await loadUserApi();
        let users = [];
        
        if (type === 'followers') {
            // Obtener lista de seguidores
            const response = await userApi.getFollowerList(userId);
            const data = response.Items || response.items || response || [];
            
            // Obtener información completa de cada usuario
            for (const item of data) {
                const followerId = item.FollowerId || item.followerId || item.UserId || item.userId || item.id;
                if (followerId) {
                    try {
                        const userInfo = await userApi.getUserProfile(followerId);
                        users.push({
                            userId: followerId,
                            username: userInfo.Username || userInfo.username || 'Usuario',
                            avatar: userInfo.ImgProfile || userInfo.imgProfile || userInfo.avatar || '../../Assets/default-avatar.png',
                            bio: userInfo.Bio || userInfo.bio || ''
                        });
                    } catch (err) {
                        console.warn(`⚠️ Error obteniendo info del usuario ${followerId}:`, err);
                        // Agregar usuario con datos mínimos
                        users.push({
                            userId: followerId,
                            username: 'Usuario',
                            avatar: '../../Assets/default-avatar.png',
                            bio: ''
                        });
                    }
                }
            }
        } else {
            // Obtener lista de seguidos
            const API_BASE = window.API_BASE_URL || 'http://localhost:5000';
            const token = localStorage.getItem("authToken");
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            const response = await axios.get(`${API_BASE}/api/gateway/users/${userId}/follow`, { headers });
            const data = response.data.Items || response.data.items || response.data || [];
            
            // Obtener información completa de cada usuario
            for (const item of data) {
                const followingId = item.FollowingId || item.followingId || item.UserId || item.userId || item.id;
                if (followingId) {
                    try {
                        const userInfo = await userApi.getUserProfile(followingId);
                        users.push({
                            userId: followingId,
                            username: userInfo.Username || userInfo.username || 'Usuario',
                            avatar: userInfo.ImgProfile || userInfo.imgProfile || userInfo.avatar || '../../Assets/default-avatar.png',
                            bio: userInfo.Bio || userInfo.bio || ''
                        });
                    } catch (err) {
                        console.warn(`⚠️ Error obteniendo info del usuario ${followingId}:`, err);
                        // Agregar usuario con datos mínimos
                        users.push({
                            userId: followingId,
                            username: 'Usuario',
                            avatar: '../../Assets/default-avatar.png',
                            bio: ''
                        });
                    }
                }
            }
        }
        
        // Renderizar lista de usuarios
        if (users.length === 0) {
            followersList.innerHTML = `
                <div class="followers-empty">
                    <i class="fas fa-users"></i>
                    <p>No hay ${type === 'followers' ? 'seguidores' : 'seguidos'} aún</p>
                </div>
            `;
        } else {
            followersList.innerHTML = users.map(user => `
                <div class="follower-item" data-user-id="${user.userId}" style="cursor: pointer;">
                    <img src="${user.avatar}" 
                         alt="${user.username}" 
                         class="follower-avatar"
                         onerror="this.src='../../Assets/default-avatar.png'">
                    <div class="follower-info">
                        <h4 class="follower-username">${user.username}</h4>
                        ${user.bio ? `<p class="follower-bio">${user.bio}</p>` : ''}
                    </div>
                </div>
            `).join('');
            
            // Agregar event listeners para navegar a perfiles
            followersList.querySelectorAll('.follower-item').forEach(item => {
                item.addEventListener('click', function() {
                    const targetUserId = this.getAttribute('data-user-id');
                    if (targetUserId && typeof window.navigateToProfile === 'function') {
                        window.navigateToProfile(targetUserId);
                    }
                });
            });
        }
        
    } catch (error) {
        console.error('❌ Error cargando lista:', error);
        followersList.innerHTML = `
            <div class="followers-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error al cargar la lista</p>
            </div>
        `;
    }
}

/**
 * Cierra el modal de seguidores/seguidos
 */
function closeFollowersModal() {
    const modal = document.getElementById('followersModalOverlay');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Inicializa los event listeners para el modal de seguidores/seguidos
 */
function initializeFollowersModal() {
    // Botón de cerrar
    const closeBtn = document.getElementById('closeFollowersModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeFollowersModal);
    }
    
    // Cerrar al hacer clic fuera del modal
    const modal = document.getElementById('followersModalOverlay');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeFollowersModal();
            }
        });
    }
    
    // Botones de estadísticas (seguidores/seguidos)
    const followersStat = document.getElementById('followers-stat');
    const followingStat = document.getElementById('following-stat');
    
    if (followersStat) {
        followersStat.addEventListener('click', function() {
            if (profileUserId) {
                showFollowersModal(profileUserId, 'followers');
            }
        });
    }
    
    if (followingStat) {
        followingStat.addEventListener('click', function() {
            if (profileUserId) {
                showFollowersModal(profileUserId, 'following');
            }
        });
    }
}

// Hacer las funciones disponibles globalmente para que los listeners puedan usarlas
window.showEditReviewModal = showEditReviewModal;
window.showDeleteReviewModal = showDeleteReviewModal;
window.showReportModal = showReportModal;
window.reportReview = reportReview;
window.showCommentsModal = showCommentsModal;
window.showReviewDetailModal = showReviewDetailModal;
window.initializeReviewDetailModalLogic = initializeReviewDetailModalLogic;
window.showCreateReviewModal = showCreateReviewModal;
window.initializeCreateReviewModal = initializeCreateReviewModal;
window.showFollowersModal = showFollowersModal;
window.initializeFollowersModal = initializeFollowersModal;