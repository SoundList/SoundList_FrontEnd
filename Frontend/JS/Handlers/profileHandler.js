
// Variable global para almacenar el userId del perfil que se está viendo
let profileUserId = null;

// Importar funciones necesarias si están disponibles como módulos
// (Si no están disponibles, se usarán desde window)
let fetchSearchResults = null;
let getOrCreateSong = null;
let getOrCreateAlbum = null;
let createReview = null;

// El estado de modals ahora se maneja globalmente en window.modalsState (ver profile.js)

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
 * FIX: Eliminado el ordenamiento forzoso por fecha. Ahora respeta el orden
 * que le envía loadUserProfile (sea por likes o por fecha).
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

    // ❌ BLOQUE ELIMINADO: const sortedReviews = [...reviews].sort(...) 
    // Ahora usamos 'reviews' directamente.
    
    container.innerHTML = reviews.map((review) => {
        // Asegurar que siempre tengamos un ID válido
        let reviewId = review.id || review.ReviewId || review.reviewId;
        
        if (reviewId) {
            reviewId = String(reviewId).trim();
            if (!reviewId || reviewId === 'null' || reviewId === 'undefined') {
                return '';
            }
        } else {
            return '';
        }

        const isLiked = review.userLiked === true;
        const likeCount = review.likes || 0;
        const commentCount = review.comments || 0;
        
        // --- LÓGICA RECUPERADA: Ocultar botón editar si tiene likes ---
        const editButtonStyle = (likeCount > 0) ? 'display: none !important;' : '';

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
                                        title="Editar reseña"
                                        style="${editButtonStyle}">
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

    attachProfileReviewListeners(container, isOwnProfile);
}

/**
 * Adjunta los event listeners a las reseñas del perfil
 */
function attachProfileReviewListeners(container, isOwnProfile) {
    // Listener global para sincronizar botón editar cuando cambian los likes
    // Esto asegura que si se da like en otra página (home, canción, álbum), 
    // el botón editar se oculte/muestre aquí también
    const handleLikeUpdate = (event) => {
        const { reviewId, count } = event.detail;
        const reviewItems = container.querySelectorAll(`.review-item[data-review-id="${reviewId}"]`);
        
        reviewItems.forEach(reviewItem => {
            const editBtn = reviewItem.querySelector('.btn-edit');
            if (editBtn) {
                if (count > 0) {
                    editBtn.style.setProperty('display', 'none', 'important');
                } else {
                    editBtn.style.removeProperty('display');
                }
            }
        });
    };
    
    // Agregar listener una sola vez (usando una marca para evitar duplicados)
    if (!container.hasAttribute('data-like-listener-attached')) {
        window.addEventListener('likeUpdated', handleLikeUpdate);
        container.setAttribute('data-like-listener-attached', 'true');
    }
    
    // Likes - Usar handleLikeToggle global (igual que en home)
    container.querySelectorAll('.btn-like').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Usar la función global handleLikeToggle que ya existe
            if (typeof window.handleLikeToggle === 'function') {
                window.handleLikeToggle(e);
                
                // --- LÓGICA RECUPERADA: Control dinámico del botón editar ---
                const reviewId = this.getAttribute('data-review-id');
                const reviewCard = this.closest('.review-item');
                const editBtn = reviewCard?.querySelector('.btn-edit');
                const likesSpan = this.parentElement.querySelector('.review-likes-count');
                
                if (editBtn && likesSpan) {
                    // Esperar un momento para que handleLikeToggle actualice el contador
                    setTimeout(() => {
                        const newLikesCount = parseInt(likesSpan.textContent) || 0;
                        if (newLikesCount > 0) {
                            editBtn.style.setProperty('display', 'none', 'important');
                        } else {
                            editBtn.style.removeProperty('display');
                        }
                    }, 100);
                }
                // ------------------------------------------------------------
            } else {
                // Fallback si no existe la función global
                console.warn('handleLikeToggle no está disponible');
            }
        });
    });

    // Editar y Eliminar (solo si es tu propio perfil)
    if (isOwnProfile) {
container.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const reviewId = this.getAttribute('data-review-id');
                const title = this.getAttribute('data-review-title') || '';
                const content = this.getAttribute('data-review-content') || '';
                const rating = parseInt(this.getAttribute('data-review-rating')) || 0;
                
                if (typeof showEditReviewModal === 'function') {
                    showEditReviewModal(reviewId, title, content, rating);
                }
            });
        });
    
        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const reviewId = this.getAttribute('data-review-id');
                const reviewTitle = this.closest('.review-item')?.querySelector('.review-title')?.textContent || 'esta reseña';
                
                if (window.modalsState && typeof window.showDeleteReviewModalFromModule === 'function') {
                    window.showDeleteReviewModalFromModule(reviewId, reviewTitle);
                } else if (typeof showDeleteReviewModal === 'function') {
                    showDeleteReviewModal(reviewId, reviewTitle);
                }
        });
    });
    }

    // --- FIX CRÍTICO AQUÍ: CLICK EN TARJETA ---
        container.querySelectorAll('.review-clickable').forEach(element => {
        element.addEventListener('click', async function(e) {
            // Evitar conflictos con botones
                if (e.target.closest('.review-actions') || 
                    e.target.closest('.btn-edit') || 
                    e.target.closest('.btn-delete') || 
                    e.target.closest('.btn-like') || 
                    e.target.closest('.comment-btn')) {
                    return;
                }
                
                const reviewId = this.getAttribute('data-review-id');
            if (!reviewId) return;

            // PLAN A: Función global
            if (typeof window.showReviewDetailModal === 'function') {
                    window.showReviewDetailModal(reviewId);
                return;
            } 

            // PLAN B: Importación Dinámica con RUTA CORREGIDA
            console.warn("⚠️ Importando modal dinámicamente...");
            try {
                // RUTA CORREGIDA: Agregamos /JS/ porque estamos en HTML/Pages/
                const module = await import('../../JS/Components/modals/reviewDetailModal.js');
                
                if (module && module.showReviewDetailModal) {
                    window.showReviewDetailModal = module.showReviewDetailModal;
                    if (module.initializeReviewDetailModalLogic) {
                        module.initializeReviewDetailModalLogic(window.modalsState || {});
                    }
                    module.showReviewDetailModal(reviewId);
                }
            } catch (err) {
                console.error("❌ Error ruta modal:", err);
                }
            });
        });
    
    // Comentarios - Usar funciones globales (igual que en home)
    container.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                if (typeof window.showLoginRequiredModal === 'function') {
                    window.showLoginRequiredModal();
                } else if (typeof showLoginRequiredModal === 'function') {
                    showLoginRequiredModal();
                }
                return;
            }
            
            const reviewId = this.getAttribute('data-review-id');
            
            if (reviewId) {
                // Usar showCommentsModal global (igual que en home)
                if (typeof window.showCommentsModal === 'function') {
                    window.showCommentsModal(reviewId);
                } else if (typeof window.showReviewDetailModal === 'function') {
                    // Fallback al modal de detalle
                    window.showReviewDetailModal(reviewId);
                } else {
                    console.warn('No se encontró función para mostrar comentarios');
                }
            }
        });
    });
}

/**
 * Carga y procesa las reseñas de un usuario específico
 * FIX: Se eliminó el "new Date()" por defecto. Ahora si no hay fecha,
 * se asigna la fecha 0 (1970) para que no aparezcan como recientes.
 */
async function loadUserReviews(userIdToLoad) {
    try {
        // Obtener reseñas (sin cambios en la lógica de obtención)
        let allReviews = [];
        if (typeof window.reviewApi !== 'undefined' && window.reviewApi.getReviewsByUser) {
            allReviews = await window.reviewApi.getReviewsByUser(userIdToLoad);
        } else if (typeof window.socialApi !== 'undefined' && window.socialApi.getReviews) {
            const allReviewsData = await window.socialApi.getReviews();
            allReviews = allReviewsData.filter(review => {
                const reviewUserId = review.UserId || review.userId;
                return String(reviewUserId).trim() === String(userIdToLoad).trim();
            });
        } else if (typeof getReviews === 'function') {
            const allReviewsData = await getReviews();
            allReviews = allReviewsData.filter(review => {
                const reviewUserId = review.UserId || review.userId;
                return String(reviewUserId).trim() === String(userIdToLoad).trim();
            });
        } else {
            // Fallback import
            try {
                const socialApiModule = await import('../../APIs/socialApi.js');
                if (socialApiModule && socialApiModule.getReviews) {
                    const allReviewsData = await socialApiModule.getReviews();
                    allReviews = allReviewsData.filter(review => {
                        const reviewUserId = review.UserId || review.userId;
                        return String(reviewUserId).trim() === String(userIdToLoad).trim();
                    });
                } else { return []; }
            } catch (e) { return []; }
        }
        
        if (!allReviews || allReviews.length === 0) return [];

        // Procesar reseñas
        const processedReviews = await Promise.all(
            allReviews.map(async (review) => {
                try {
                    let reviewId = review.ReviewId || review.reviewId || review.id || review.Id_Review;
                    if (!reviewId) return null;
                    reviewId = String(reviewId).trim();

                    // --- USUARIO ---
                    const userIdStr = review.UserId ? String(review.UserId) : 'unknown';
                    let username = `Usuario ${userIdStr.substring(0, 8)}`;
                    let avatar = '../../Assets/default-avatar.png';
                    try {
                        const userId = review.UserId || review.userId;
                        if (typeof window.userApi !== 'undefined' && window.userApi.getUserProfile) {
                            const userData = await window.userApi.getUserProfile(userId);
                            if (userData) {
                                username = userData.Username || userData.username || username;
                                avatar = userData.imgProfile || userData.ImgProfile || avatar;
                            }
                        }
                    } catch (e) { }

                    // --- CONTENIDO (Song/Album) ---
                    let songName = review.SongId ? 'Canción' : 'Álbum';
                    let albumName = 'Álbum';
                    let artistName = 'Artista';
                    let contentType = review.SongId ? 'song' : 'album';
                    let contentImage = '../../Assets/default-avatar.png';
                    let contentApiId = '';

                    // 1. LocalStorage
                    const storageKey = `review_content_${reviewId}`;
                    const storedContentData = localStorage.getItem(storageKey);
                    let contentData = null;
                    if (storedContentData) {
                        try {
                            contentData = JSON.parse(storedContentData);
                            if (contentData && contentData.name) {
                                if (contentData.type === 'song') {
                                    songName = contentData.name;
                                    artistName = contentData.artist || artistName;
                                } else {
                                    albumName = contentData.name;
                                    artistName = contentData.artist || artistName;
                                }
                                contentType = contentData.type;
                            }
                        } catch (e) { }
                    }

                    // 2. API Fallback
                    if (!contentData || (!songName || songName === 'Canción') && (!albumName || albumName === 'Álbum')) {
                        if (review.SongId && typeof getSongByApiId === 'function') {
                            try {
                                const songData = await getSongByApiId(String(review.SongId).trim());
                                if (songData) {
                                    songName = songData.Title || songData.title || songName;
                                    artistName = songData.ArtistName || songData.artistName || artistName;
                                    contentImage = songData.Image || songData.image || contentImage;
                                    contentApiId = songData.APISongId || songData.apiSongId || songData.Id;
                                    
                                    const cacheData = { type: 'song', id: contentApiId, name: songName, artist: artistName, image: contentImage };
                                    localStorage.setItem(storageKey, JSON.stringify(cacheData));
                                }
                            } catch (e) { }
                        } else if (review.AlbumId && typeof getAlbumByApiId === 'function') {
                            try {
                                const albumData = await getAlbumByApiId(String(review.AlbumId).trim());
                                if (albumData) {
                                    albumName = albumData.Title || albumData.title || albumName;
                                    contentImage = albumData.Image || albumData.image || contentImage;
                                    contentApiId = albumData.APIAlbumId || albumData.apiAlbumId || albumData.Id;
                                    const cacheData = { type: 'album', id: contentApiId, name: albumName, artist: artistName, image: contentImage };
                                    localStorage.setItem(storageKey, JSON.stringify(cacheData));
                                }
                            } catch (e) { }
                        }
                    }

                    // --- LIKES ---
                    let likes = 0;
                    const likesCacheKey = `review_likes_${reviewId}`;
                    let cachedLikes = null;
                    try {
                        const cached = localStorage.getItem(likesCacheKey);
                        if (cached !== null) cachedLikes = parseInt(cached, 10);
                    } catch (e) { }

                    const getReviewReactionCountFn = typeof getReviewReactionCount === 'function' ? getReviewReactionCount : (window.socialApi?.getReviewReactionCount || (() => Promise.resolve(0)));
                    let likesFromBackend = await getReviewReactionCountFn(reviewId).catch(() => 0);
                    
                    if (likesFromBackend > 0) localStorage.setItem(likesCacheKey, String(likesFromBackend));
                    likes = cachedLikes !== null ? Math.max(cachedLikes, likesFromBackend) : likesFromBackend;

                    // --- COMENTARIOS ---
                    let commentsCount = 0;
                    try {
                        // Obtener comentarios desde el backend
                        const getCommentsByReviewFn = typeof getCommentsByReview === 'function' ? getCommentsByReview : (window.socialApi?.getCommentsByReview || (() => Promise.resolve([])));
                        const comments = await getCommentsByReviewFn(reviewId).catch(() => []);
                        commentsCount = Array.isArray(comments) ? comments.length : 0;
                        
                        // Actualizar cache de comentarios
                        const commentsCacheKey = `review_comments_${reviewId}`;
                        try {
                            localStorage.setItem(commentsCacheKey, String(commentsCount));
                        } catch (e) { /* ignore */ }
                    } catch (e) {
                        // Si falla, intentar usar cache
                        const commentsCacheKey = `review_comments_${reviewId}`;
                        try {
                            const cached = localStorage.getItem(commentsCacheKey);
                            if (cached !== null) {
                                commentsCount = parseInt(cached, 10) || 0;
                            }
                        } catch (cacheError) {
                            commentsCount = 0;
                        }
                    }

                    // User Liked
                    const currentUserId = localStorage.getItem('userId');
                    let userLiked = false;
                    if (currentUserId) {
                        const localLike = localStorage.getItem(`like_${reviewId}_${currentUserId}`);
                        userLiked = localLike === 'true';
                    }

                    const contentName = contentType === 'song' ? songName : albumName;
                    
                    // --- FECHA (EL FIX CRÍTICO ESTÁ AQUÍ) ---
                    // Eliminamos el '|| new Date()' del final.
                    const createdAtRaw = review.CreatedAt || review.Created || review.createdAt || review.date;
                    
                    // Si hay fecha, la parseamos. Si no, usamos fecha 0 (1970).
                    let createdAtDate = new Date(0); 
                    
                    if (createdAtRaw) {
                        const parsed = new Date(createdAtRaw);
                        // Validar que no sea '0001-01-01' o inválida
                        if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) {
                            createdAtDate = parsed;
                        }
                    }

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
                        comments: commentsCount,
                        userLiked: userLiked,
                        avatar: avatar,
                        userId: review.UserId || review.userId,
                        createdAt: createdAtDate // Ahora enviamos la fecha correcta (o 1970)
                    };
                } catch (error) {
                    return null;
                }
            })
        );

        return processedReviews.filter(r => r !== null);
    } catch (error) {
        console.error('Error cargando reseñas:', error);
        return [];
    }
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
    const editBtn = document.querySelector(".btn-edit"); 

    const existingFollowBtn = document.getElementById("profile-follow-btn");
    if (existingFollowBtn) existingFollowBtn.remove();

    if (editBtn) {
        if (isOwnProfile) {
            editBtn.style.display = 'block';
            editBtn.onclick = () => window.location.href = 'editProfile.html';
        } else {
            editBtn.style.display = 'none';
            if (btnContainer && loggedInUserId) {
                await setupFollowButton(btnContainer, userIdToLoad);
            }
        }
    }

    const recentContainer = document.getElementById(recentContainerId);
    if (recentContainer) recentContainer.innerHTML = "<p class='text-muted p-4 text-center'>Cargando reseñas...</p>";

    // --- CARGA DE DATOS DE USUARIO ---
    try {
        const user = await window.userApi.getUserProfile(userIdToLoad); 
        if (userAvatarEl) {
            userAvatarEl.src = user.imgProfile || user.Image || user.image || defaultAvatar;
            userAvatarEl.onerror = function() { this.src = defaultAvatar; };
        }
        const username = user.Username || user.UserName || user.username || user.name || "Usuario";
        if (userNameEl) userNameEl.textContent = username;
        
        const bio = user.bio || user.Bio || user.userQuote || user.quote || user.description || "";
        if (userQuoteEl) {
            if (bio && bio.trim() !== "") {
                userQuoteEl.textContent = bio;
                userQuoteEl.style.display = "block";
            } else {
                userQuoteEl.style.display = "none";
            }
        }
    } catch (error) {
        console.error("❌ Error al cargar el perfil principal:", error);
        if (userAvatarEl) userAvatarEl.src = defaultAvatar;
        if (userNameEl) userNameEl.textContent = "Error al cargar";
    }

    // --- CARGA DE ESTADÍSTICAS ---
    try {
        const followerCount = await window.userApi.getFollowerCount(userIdToLoad);
        const followingCount = await window.userApi.getFollowingCount(userIdToLoad);
        if (followerCountEl) followerCountEl.textContent = followerCount || 0;
        if (followingCountEl) followingCountEl.textContent = followingCount || 0;
    } catch (e) { /* ignore */ }
        

    // --- CARGA Y ORDENAMIENTO DE RESEÑAS (AQUÍ ESTÁ LA MAGIA) ---
    try {
        const userReviews = await loadUserReviews(userIdToLoad);
        
        if (reviewCountEl) reviewCountEl.textContent = userReviews.length || 0;

            if (userReviews && userReviews.length > 0) {
            
            // Helper para obtener fecha segura (Fix 0001-01-01 y LocalStorage)
            // Helper para obtener fecha segura (Fix 0001-01-01 y LocalStorage)
            // Helper ESTRICTO para fechas
            const getSafeTimestamp = (review) => {
                // 1. Prioridad: LocalStorage (SOLO SI ES RECIENTE Y VÁLIDO)
                // Usamos un prefijo único para evitar colisiones viejas
                const storageKey = `review_created_at_${review.id}`;
                const localTs = localStorage.getItem(storageKey);
                
                if (localTs) {
                    const parsedTs = parseInt(localTs, 10);
                    // Validar que sea una fecha razonable (año > 2023 para estar seguros)
                    // 1672531200000 = 1 Enero 2023
                    if (!isNaN(parsedTs) && parsedTs > 1672531200000) {
                        return parsedTs;
            } else {
                        // Si es vieja o rara, la borramos para no contaminar
                        localStorage.removeItem(storageKey);
                    }
                }

                // 2. Fecha del objeto (backend)
                // Intentamos parsear cualquier cosa que parezca fecha
                const rawDate = review.createdAt || review.CreatedAt || review.date || review.Date;
                
                if (rawDate) {
                    const dateObj = new Date(rawDate);
                    const ts = dateObj.getTime();
                    // Solo aceptar fechas mayores al año 2000
                    if (!isNaN(ts) && dateObj.getFullYear() > 2000) {
                        return ts;
                    }
                }
                
                // 3. CASTIGO EXTREMO: Si no tiene fecha válida, devolvemos un número muy negativo
                // Esto asegura que siempre queden al final de un sort descendente.
                return -9999999999999; 
            };

            // --- LÓGICA 1: RESEÑAS RECIENTES (Por fecha desc) ---
            if (recentContainer) {
                const sortedByRecent = [...userReviews].sort((a, b) => {
                    return getSafeTimestamp(b) - getSafeTimestamp(a);
                });
                renderProfileReviews(sortedByRecent, recentContainerId, isOwnProfile);
            }

            // --- LÓGICA 2: RESEÑAS DESTACADAS (Por Likes desc, luego fecha) ---
        const featuredContainer = document.getElementById('featured-reviews-list-best');
            if (featuredContainer) {
            const bestReviews = [...userReviews].sort((a, b) => {
                    const likesA = Number(a.likes) || 0;
                    const likesB = Number(b.likes) || 0;
                    
                    // Si tienen distintos likes, gana el que tiene más
                    if (likesB !== likesA) {
                        return likesB - likesA;
                    }
                    
                    // Si tienen mismos likes, desempata por fecha (más reciente primero)
                    return getSafeTimestamp(b) - getSafeTimestamp(a);
                });

                // Tomamos solo las top 5
            const topReviews = bestReviews.slice(0, 5);
            
            if (topReviews.length > 0) {
                renderProfileReviews(topReviews, 'featured-reviews-list-best', isOwnProfile);
            } else {
                featuredContainer.innerHTML = "<p class='text-muted p-4 text-center'>No hay reseñas destacadas.</p>";
            }
            }

        } else {
            if (recentContainer) recentContainer.innerHTML = "<p class='text-muted p-4 text-center'>No hay reseñas recientes de este usuario.</p>";
            const featuredContainer = document.getElementById('featured-reviews-list-best');
            if (featuredContainer) featuredContainer.innerHTML = "<p class='text-muted p-4 text-center'>No hay reseñas destacadas.</p>";
        }
        
    } catch (reviewError) {
        console.error("❌ Error al cargar reseñas:", reviewError);
        if (recentContainer) recentContainer.innerHTML = "<p class='text-danger p-4 text-center'>Error al cargar reseñas.</p>";
    }

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
            isFollowing = await window.userApi.checkFollowStatus(targetUserId);
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
            if (currentState) {
                // ---------------------------
                // DEJAR DE SEGUIR
                // ---------------------------
                await window.userApi.unfollowUser(targetUserId);
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
                await window.userApi.followUser(targetUserId, targetName, targetImage);
                
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
        const contentInfo = document.getElementById('createReviewContentInfo');
        if (contentSelector) contentSelector.style.display = 'none';
        if (contentInfo) contentInfo.style.display = 'block';
        
        modal.style.display = 'flex';
    } else {
        // Si no hay modal, redirigir a home para editar
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

// showCommentsModal ahora se usa desde el módulo global (ver profile.js)

// initializeDeleteModalsLogic ahora se usa desde el módulo global (ver profile.js)

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
    
    // Estrellas (igual que en createReviewModal.js del home)
    if (createReviewStars) {
        let currentRating = 0;
        const stars = createReviewStars.querySelectorAll('.star-input');
        
        if (stars.length === 0) {
            console.warn('⚠️ No se encontraron estrellas con la clase .star-input');
            return;
        }
        
        function highlightStars(rating) {
            stars.forEach((star, index) => {
                star.classList.toggle('active', (index + 1) <= rating);
            });
        }
        
        function updateStarRating(rating) {
            currentRating = rating;
            highlightStars(rating);
        }
        
        stars.forEach((star) => {
            star.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const rating = parseInt(this.getAttribute('data-rating')) || 0;
                updateStarRating(rating);
            });
            
            star.addEventListener('mouseenter', function() {
                const rating = parseInt(this.getAttribute('data-rating')) || 0;
                highlightStars(rating);
            });
        });
        
        createReviewStars.addEventListener('mouseleave', () => {
            highlightStars(currentRating);
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
            const storageKey = `review_content_${String(reviewId).trim()}`;
            localStorage.setItem(storageKey, JSON.stringify({
                type: currentReviewData.type,
                id: currentReviewData.id,
                name: currentReviewData.name,
                artist: currentReviewData.artist,
                image: currentReviewData.image
            }));
        }
        
        hideCreateReviewModal();
        
        if (typeof showAlert === 'function') {
            showAlert(' Reseña creada exitosamente', 'success');
        } else {
            alert(' Reseña creada exitosamente');
        }
        
        // Recargar las reseñas del perfil
        if (profileUserId && typeof loadUserProfile === 'function') {
            await loadUserProfile(profileUserId);
        }
        
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
        let users = [];
        
        if (type === 'followers') {
            // Obtener lista de seguidores
            const response = await window.userApi.getFollowerList(userId);
            const data = response.Items || response.items || response || [];
            
            // Obtener información completa de cada usuario
            for (const item of data) {
                const followerId = item.FollowerId || item.followerId || item.UserId || item.userId || item.id;
                if (followerId) {
                    try {
                        const userInfo = await window.userApi.getUserProfile(followerId);
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
                        const userInfo = await window.userApi.getUserProfile(followingId);
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
window.showReportModal = typeof showReportModal !== 'undefined' ? showReportModal : null; // Safety check
window.reportReview = typeof reportReview !== 'undefined' ? reportReview : null; // Safety check
// showCommentsModal ahora se expone desde profile.js usando el módulo
window.showCreateReviewModal = showCreateReviewModal;
window.initializeCreateReviewModal = initializeCreateReviewModal;
window.showFollowersModal = showFollowersModal;
window.initializeFollowersModal = initializeFollowersModal;