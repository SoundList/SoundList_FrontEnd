import { AmigosHandler } from '../Handlers/amigosHandler.js';
import { renderStars } from '../Components/starRenderer.js';
import { initializeCreateReviewModal, showEditReviewModal } from '../Components/modals/createReviewModal.js';
import { initializeCommentsModalLogic, showCommentsModal } from '../Components/modals/commentsModal.js';
import { initializeReviewDetailModalLogic, showReviewDetailModal } from '../Components/modals/reviewDetailModal.js';
import { initializeDeleteModalsLogic, showDeleteReviewModal } from '../Components/modals/deleteModals.js';
import * as socialApi from '../APIs/socialApi.js';
import * as contentApi from '../APIs/contentApi.js';
import '../APIs/reactionApi.js'; // Importar para inicializar window.reactionApi
import '../Handlers/likesHandler.js'; // Importar para tener window.handleLikeToggle disponible

// --- CONFIGURACIÓN ---
const getCurrentUserId = () => localStorage.getItem('userId');
const normalizeId = (id) => String(id || '').toLowerCase().trim();
const FALLBACK_IMAGE = '../Assets/default-avatar.png'; 
const FALLBACK_COVER = '../Assets/default-avatar.png'; 

// =============================================================================
// 1. HANDLER DE LIKES MANUAL
// =============================================================================
window.handleLikeToggleAmigos = async function(event, reviewId) {
    event.stopPropagation();
    const button = event.currentTarget;
    const token = localStorage.getItem("authToken");
    const userId = getCurrentUserId();

    if (!token) {
        alert("Debes iniciar sesión para dar Me Gusta.");
        return;
    }

    const icon = button.querySelector("i");
    const countEl = button.querySelector(".like-count");
    let count = parseInt(countEl.textContent) || 0;
    const isLiked = button.classList.contains('liked');

    if (isLiked) {
        button.classList.remove('liked');
        icon.style.color = "var(--blanco)"; 
        icon.classList.replace('fas', 'far'); 
        countEl.textContent = Math.max(0, count - 1);
        localStorage.removeItem(`like_${reviewId}_${userId}`);
    } else {
        button.classList.add('liked');
        icon.style.color = "var(--magenta, #EC4899)"; 
        icon.classList.replace('far', 'fas');
        countEl.textContent = count + 1;
        localStorage.setItem(`like_${reviewId}_${userId}`, 'true');
    }

    button.disabled = true;

    try {
        if (isLiked) await socialApi.deleteReviewReaction(reviewId);
        else await socialApi.addReviewReaction(reviewId);
    } catch (error) {
        if (!isLiked && error.response && error.response.status === 400) {
            console.warn("Sincronización: Like ya existía.");
        } else {
            if (isLiked) {
                button.classList.add('liked');
                icon.style.color = "var(--magenta, #EC4899)";
                icon.classList.replace('far', 'fas');
                countEl.textContent = count;
            } else {
                button.classList.remove('liked');
                icon.style.color = "var(--blanco)";
                icon.classList.replace('fas', 'far');
                countEl.textContent = count;
            }
        }
    } finally {
        button.disabled = false;
    }
};

// =============================================================================
// 2. HANDLER DE FOLLOW MANUAL
// =============================================================================
window.handleFollowToggleAmigos = async function(event, userIdToFollow, username) {
    event.stopPropagation();
    const button = event.currentTarget;
    const userApi = window.userApi;
    
    if (!userApi) {
        console.error("Error: userApi no está definido globalmente.");
        return;
    }

    const isFollowing = button.classList.contains('following') || 
                        button.textContent.trim().toLowerCase() === 'siguiendo';
    const originalText = button.innerHTML;
    
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const targetId = normalizeId(userIdToFollow);

        if (isFollowing) {
            await userApi.unfollowUser(userIdToFollow);
            modalsState.followingUsers.delete(targetId);
            button.classList.remove('following');
            button.textContent = 'Seguir';
            
            const activeBtn = document.querySelector('.filter-btn.active');
            if (activeBtn && activeBtn.dataset.filter === 'seguidos') {
                setTimeout(() => modalsState.loadReviews('seguidos'), 50);
            }
        } else {
            await userApi.followUser(userIdToFollow);
            modalsState.followingUsers.add(targetId);
            button.classList.add('following');
            button.textContent = 'Siguiendo';
        }
    } catch (error) {
        console.error("Error al seguir:", error);
        button.innerHTML = originalText; 
        if (error.response && error.response.status === 409) {
            modalsState.followingUsers.add(normalizeId(userIdToFollow));
            button.classList.add('following');
            button.textContent = 'Siguiendo';
        }
    } finally {
        button.disabled = false;
    }
};

// =============================================================================
// 3. LÓGICA PRINCIPAL
// =============================================================================

export const modalsState = {
    followingUsers: new Set(),
    followerUsers: new Set(),
    
    loadReviews: (filterOverride) => {
        const activeBtn = document.querySelector('.filter-btn.active');
        const currentFilter = filterOverride || (activeBtn ? activeBtn.dataset.filter : 'seguidores');
        loadReviewsLogic(currentFilter);
    },
    toggleLike: () => {} 
};

async function loadReviewsLogic(filterType) {
    const reviewsList = document.getElementById('reviewsList');
    const reviewsEmpty = document.getElementById('reviewsEmpty');
    
    if (!reviewsList) return;
    
    reviewsList.innerHTML = '<div class="text-center text-white p-5"><i class="fas fa-spinner fa-spin fa-2x"></i><p class="mt-2">Cargando feed...</p></div>';
    if (reviewsEmpty) reviewsEmpty.style.display = 'none';

    try {
        const allReviews = await socialApi.getAllReviews();
        let processedReviews = allReviews.map(mapBackendReviewToFrontend);

        const currentUserId = normalizeId(getCurrentUserId());
        
        // 1. FILTRO GLOBAL
        processedReviews = processedReviews.filter(r => normalizeId(r.userId) !== currentUserId);

        // 2. FILTROS DE PESTAÑA
        if (filterType === 'seguidos') {
            processedReviews = processedReviews.filter(r => 
                modalsState.followingUsers.has(normalizeId(r.userId))
            );
            
            if (processedReviews.length === 0) {
                reviewsList.innerHTML = '';
                if (reviewsEmpty) {
                    reviewsEmpty.style.display = 'block';
                    reviewsEmpty.innerHTML = `<div style="text-align:center; padding:2rem; color:white;"><p>No sigues a nadie aún.</p></div>`;
                    return;
                }
            }
        } else if (filterType === 'seguidores') {
            processedReviews = processedReviews.filter(r => 
                modalsState.followerUsers.has(normalizeId(r.userId))
            );
            
            if (processedReviews.length === 0) {
                reviewsList.innerHTML = '';
                if (reviewsEmpty) {
                    reviewsEmpty.style.display = 'block';
                    reviewsEmpty.innerHTML = `<div style="text-align:center; padding:2rem; color:white;"><p>Aún no tienes seguidores que hayan publicado reseñas.</p></div>`;
                    return;
                }
            }
        }

        // 3. RENDERIZADO FINAL
        if (processedReviews.length === 0) {
            reviewsList.innerHTML = '';
            if (reviewsEmpty) {
                reviewsEmpty.style.display = 'block';
                if (!reviewsEmpty.innerHTML.includes("sigues") && !reviewsEmpty.innerHTML.includes("seguidores")) {
                     reviewsEmpty.innerHTML = `<div style="text-align:center; padding:2rem; color:white;"><p>No hay reseñas para mostrar.</p></div>`;
                }
            }
        } else {
            if (reviewsEmpty) reviewsEmpty.style.display = 'none';
            renderReviews(processedReviews);
            enrichReviewsData(processedReviews);
        }

    } catch (e) {
        console.error("Error cargando feed:", e);
        reviewsList.innerHTML = '<div class="text-center text-danger p-4">Error al cargar.</div>';
    }
}

function mapBackendReviewToFrontend(r) {
    const emptyGuid = "00000000-0000-0000-0000-000000000000";
    const rawSongId = r.songId || r.SongId;
    const validSongId = (rawSongId && rawSongId !== emptyGuid) ? rawSongId : null;
    const validAlbumId = (r.albumId && r.albumId !== emptyGuid) ? r.albumId : null;
    const currentUserId = getCurrentUserId();
    const reviewId = r.reviewId || r.ReviewId || r.id;
    
    // Verificar localStorage PRIMERO (igual que en perfil)
    let userLiked = false;
    if (currentUserId && reviewId) {
        const storedReactionId = localStorage.getItem(`reaction_${reviewId}_${currentUserId}`);
        const localLike = localStorage.getItem(`like_${reviewId}_${currentUserId}`);
        // Solo marcar como liked si está en localStorage
        if (storedReactionId !== null && storedReactionId !== 'null' && storedReactionId !== 'undefined') {
            userLiked = true;
        } else if (localLike === 'true') {
            userLiked = true;
        }
    }
    
    // Intentar obtener likes desde cache primero (igual que en perfil)
    const likesCacheKey = `review_likes_${reviewId}`;
    let cachedLikes = null;
    try {
        const cached = localStorage.getItem(likesCacheKey);
        if (cached !== null) {
            cachedLikes = parseInt(cached, 10);
            if (isNaN(cachedLikes)) cachedLikes = null;
        }
    } catch (e) { /* ignore */ }
    
    // Usar cache si está disponible, sino usar el valor del backend
    const likes = cachedLikes !== null ? cachedLikes : parseInt(r.likes || r.Likes || r.reactionCount || 0);

    return {
        id: reviewId,
        userId: r.userId || r.UserId,
        songId: validSongId, 
        albumId: validAlbumId,
        contentType: validSongId ? 'song' : 'album',
        username: 'Usuario', 
        song: 'Cargando...',
        artist: '...',
        image: FALLBACK_COVER, 
        reviewTitle: r.title || r.Title || '', 
        comment: r.content || r.Content || '',
        rating: r.rating || r.Rating || 0,
        likes: likes,
        comments: r.comments || r.Comments || r.commentCount || 0,
        userLiked: userLiked, // Usar el valor de localStorage, no del backend
        avatar: FALLBACK_IMAGE,
        // Inicializamos como null, se llenará en enrichReviewsData
        apiContentId: null 
    };
}

function enrichReviewsData(reviews) {
    const currentUserId = getCurrentUserId();
    const promises = [];

    // Usuarios
    const userIds = [...new Set(reviews.map(r => r.userId))];
    promises.push(Promise.all(userIds.map(async id => {
        try {
            return await socialApi.getUser(id);
        } catch (error) {
            // Si es 404, el usuario fue eliminado
            if (error.response && error.response.status === 404) {
                return { userId: id, isDeleted: true };
            }
            return null;
        }
    })).then(users => {
        reviews.forEach(r => {
            const u = users.find(user => user && normalizeId(user.userId || user.id) === normalizeId(r.userId));
            if (u) {
                if (u.isDeleted) {
                    r.username = 'Usuario'; // Mantener "Usuario" genérico, el badge indicará que está eliminado
                    r.isUserDeleted = true;
                } else {
                    r.username = u.username || u.Username;
                    r.avatar = u.imgProfile || u.image || r.avatar;
                }
                
                const card = document.querySelector(`.feed-card[data-review-id="${r.id}"]`);
                if(card) {
                    const nameEl = card.querySelector('.feed-username');
                    const imgEl = card.querySelector('.feed-avatar');
                    if(nameEl) {
                        nameEl.textContent = r.username;
                        // Agregar badge si el usuario está eliminado
                        if (r.isUserDeleted) {
                            const existingBadge = card.querySelector('.deleted-account-badge');
                            if (!existingBadge && nameEl.nextSibling) {
                                const badge = document.createElement('span');
                                badge.className = 'deleted-account-badge';
                                badge.textContent = 'Cuenta eliminada';
                                nameEl.parentNode.insertBefore(badge, nameEl.nextSibling);
                            }
                        }
                    }
                    if(imgEl && !r.isUserDeleted) imgEl.src = r.avatar;
                }
            }
        });
    }));

    // Likes y Comentarios Reales - Sincronizar con backend pero usar cache como base (igual que en perfil)
    const likeAndCommentChecks = reviews.map(async r => {
        try {
            const reviewId = r.id;
            const likesCacheKey = `review_likes_${reviewId}`;
            let cachedLikes = null;
            try {
                const cached = localStorage.getItem(likesCacheKey);
                if (cached !== null) {
                    cachedLikes = parseInt(cached, 10);
                    if (isNaN(cachedLikes)) cachedLikes = null;
                }
            } catch (e) { /* ignore */ }
            
            // Obtener likes y comentarios en paralelo (igual que en inicio)
            const [realCount, commentsData] = await Promise.all([
                socialApi.getReviewReactionCount(reviewId).catch(() => cachedLikes !== null ? cachedLikes : 0),
                socialApi.getCommentsByReview(reviewId).catch(() => [])
            ]);
            
            // Actualizar likes
            if (typeof realCount === 'number' && !isNaN(realCount) && realCount >= 0) {
                // Si hay cache y es diferente, usar el mayor (para evitar perder likes)
                if (cachedLikes !== null && cachedLikes !== realCount) {
                    const finalCount = Math.max(cachedLikes, realCount);
                    localStorage.setItem(likesCacheKey, String(finalCount));
                    r.likes = finalCount;
                } else {
                    localStorage.setItem(likesCacheKey, String(realCount));
                    r.likes = realCount;
                }
                
                // Actualizar UI si el card existe
                const card = document.querySelector(`.feed-card[data-review-id="${reviewId}"]`);
                if(card) {
                    const countEl = card.querySelector('.like-count');
                    if(countEl) countEl.textContent = r.likes;
                }
            } else if (cachedLikes !== null) {
                // Si el backend falla, usar cache
                r.likes = cachedLikes;
            }
            
            // Actualizar comentarios
            if (Array.isArray(commentsData)) {
                const commentCount = commentsData.length;
                r.comments = commentCount;
                
                // Actualizar UI si el card existe
                const card = document.querySelector(`.feed-card[data-review-id="${reviewId}"]`);
                if(card) {
                    const commentBtn = card.querySelector('.comment-btn');
                    if(commentBtn) {
                        const commentSpan = commentBtn.querySelector('span');
                        if(commentSpan) commentSpan.textContent = commentCount;
                    }
                }
            }
            
            // Verificar si el usuario dio like (solo sincronizar con backend si no hay en localStorage)
            if (currentUserId) {
                const storedReactionId = localStorage.getItem(`reaction_${reviewId}_${currentUserId}`);
                const localLike = localStorage.getItem(`like_${reviewId}_${currentUserId}`);
                
                // Si no hay en localStorage, verificar backend
                if (!storedReactionId && localLike !== 'true') {
                    try {
                        const axiosInstance = window.axios || axios;
                        const response = await axiosInstance.get(`${socialApi.API_BASE_URL}/api/gateway/reactions/review/${reviewId}/${currentUserId}`, {
                            validateStatus: (status) => status === 200 || status === 404
                        });
                        if (response.status === 200) {
                            r.userLiked = true;
                            localStorage.setItem(`like_${reviewId}_${currentUserId}`, 'true');
                            const card = document.querySelector(`.feed-card[data-review-id="${reviewId}"]`);
                            if(card) {
                                const btn = card.querySelector('.btn-like');
                                const icon = btn?.querySelector('i');
                                if(btn) btn.classList.add('liked');
                                if(icon) {
                                    icon.classList.remove('far');
                                    icon.classList.add('fas');
                                    icon.style.color = 'var(--magenta, #EC4899)';
                                }
                            }
                        }
                    } catch (e) { /* ignore */ }
                } else {
                    // Ya está en localStorage, asegurar que la UI refleje esto
                    r.userLiked = true;
                    const card = document.querySelector(`.feed-card[data-review-id="${reviewId}"]`);
                    if(card) {
                        const btn = card.querySelector('.btn-like');
                        const icon = btn?.querySelector('i');
                        if(btn && !btn.classList.contains('liked')) {
                            btn.classList.add('liked');
                            if(icon) {
                                icon.classList.remove('far');
                                icon.classList.add('fas');
                                icon.style.color = 'var(--magenta, #EC4899)';
                            }
                        }
                    }
                }
            }
        } catch (e) { }
    });
    promises.push(Promise.all(likeAndCommentChecks));

    // Música (Aquí capturamos el ID para el link)
    const missingContent = reviews.filter(r => r.song === 'Cargando...');
    if (missingContent.length > 0) {
        const contentPromises = missingContent.map(async r => {
            try {
                let data = null;
                if (r.songId) {
                    data = await contentApi.getSongByDbId(r.songId);
                } else if (r.albumId) {
                    data = await contentApi.getAlbumById(r.albumId);
                }
                
                if (data) {
                    r.song = data.title || data.Title;
                    r.artist = data.artistName || data.ArtistName;
                    r.image = data.image || data.Image;
                    // --- GUARDAMOS EL ID DE API PARA EL LINK ---
                    r.apiContentId = data.apiSongId || data.apiAlbumId || data.APISongId || data.APIAlbumId;
                    
                    const card = document.querySelector(`.feed-card[data-review-id="${r.id}"]`);
                    if(card) {
                        card.querySelector('.music-title').textContent = r.song;
                        card.querySelector('.music-artist').textContent = r.artist;
                        card.querySelector('.music-cover').src = r.image;
                        // Actualizamos el atributo data para que el click lo lea
                        const musicDiv = card.querySelector('.feed-music-content');
                        if(musicDiv) {
                            musicDiv.setAttribute('data-api-id', r.apiContentId || '');
                        }
                    }
                }
            } catch(e) {}
        });
        promises.push(Promise.all(contentPromises));
    }
}

function renderReviews(reviews) {
    const list = document.getElementById('reviewsList');
    if (!list) return;
    const currentUserId = normalizeId(getCurrentUserId());

    list.innerHTML = reviews.map(r => {
        const isLiked = r.userLiked || false;
        const heartColor = isLiked ? 'style="color: var(--magenta, #EC4899);"' : 'style="color: var(--blanco);"'; 
        const heartIcon = isLiked ? 'fas' : 'far';
        const iconClass = r.contentType === 'song' ? 'fa-music' : 'fa-compact-disc';
        
        // Asegurar que likes y comments sean números válidos >= 0
        const likesCount = Math.max(0, parseInt(r.likes) || 0);
        const commentsCount = Math.max(0, parseInt(r.comments) || 0);
        
        const isFollowing = modalsState.followingUsers.has(normalizeId(r.userId));
        const followBtn = (currentUserId && normalizeId(r.userId) !== currentUserId) ? 
            `<button class="feed-follow-btn ${isFollowing ? 'following' : ''}" 
                     onclick="handleFollowToggleAmigos(event, '${r.userId}', '${r.username}')">
                ${isFollowing ? 'Siguiendo' : 'Seguir'}
            </button>` : '';

        return `
        <div class="feed-card" data-review-id="${r.id}">
            <div class="feed-header">
                <div class="feed-user-info review-clickable" data-target="profile" data-user-id="${r.userId}">
                    <img src="${r.avatar}" class="feed-avatar" onerror="this.src='${FALLBACK_IMAGE}'">
                    <div class="feed-meta">
                        <span class="feed-username">${r.username}</span>
                        ${r.isUserDeleted ? '<span class="deleted-account-badge">Cuenta eliminada</span>' : ''}
                        <span class="feed-action">reseñó ${r.contentType === 'song' ? 'una canción' : 'un álbum'}</span>
                    </div>
                </div>
                ${followBtn}
            </div>

            <div class="feed-music-content review-clickable" 
                 data-target="music" 
                 data-type="${r.contentType}" 
                 data-api-id="${r.apiContentId || ''}">
                <div class="music-cover-wrapper"><img src="${r.image}" class="music-cover" onerror="this.src='${FALLBACK_COVER}'"><div class="music-badge"><i class="fas ${iconClass}"></i></div></div>
                <div class="music-details"><h3 class="music-title">${r.song}</h3><p class="music-artist">${r.artist}</p><div class="feed-rating">${renderStars(r.rating)}</div></div>
            </div>

            <div class="feed-review-text review-clickable" data-target="modal">
                ${r.reviewTitle ? `<h4>${r.reviewTitle}</h4>` : ''}<p>"${r.comment}"</p>
            </div>

            <div class="feed-footer">
                <div class="interaction-group">
                    <div class="feed-likes-container">
                        <button class="feed-btn btn-like ${isLiked ? 'liked' : ''}" 
                                data-review-id="${r.id}">
                            <i class="${heartIcon} fa-heart" ${heartColor}></i>
                            <span class="like-count">${likesCount}</span>
                        </button>
                    </div>
                    <button class="feed-btn comment-btn" data-review-id="${r.id}"><i class="far fa-comment"></i><span class="review-comments-count">${commentsCount}</span></button>
                </div>
            </div>
        </div>`;
    }).join('');

    AmigosHandler.addReviewEventListeners(list, modalsState);
    
    // Los event listeners para comentarios ya se agregan en AmigosHandler.addReviewEventListeners
    // No necesitamos duplicarlos aquí
    
    // --- LÓGICA DE NAVEGACIÓN SEGMENTADA ---
    document.querySelectorAll('.feed-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Ignorar botones de acción
            if (e.target.closest('button') || e.target.closest('.feed-follow-btn') || e.target.closest('.interaction-group')) return;

            // Detectar zona clickeada
            const musicDiv = e.target.closest('.feed-music-content');
            const userDiv = e.target.closest('.feed-user-info');
            const reviewId = card.getAttribute('data-review-id');

            if (musicDiv) {
                // ZONA MÚSICA -> PÁGINA DE CANCIÓN/ÁLBUM
                const type = musicDiv.getAttribute('data-type'); // song o album
                const apiId = musicDiv.getAttribute('data-api-id');
                
                if (apiId && apiId !== 'null' && apiId !== '') {
                    window.location.href = `/Frontend/HTML/${type}.html?id=${apiId}`;
                } else {
                    // Si no cargó el ID aún, fallback a modal
                    if (window.showReviewDetailModal) window.showReviewDetailModal(reviewId, modalsState);
                }

            } else if (userDiv) {
                // ZONA USUARIO -> PERFIL
                const userId = userDiv.getAttribute('data-user-id');
                if (userId) {
                    window.location.href = `/Frontend/HTML/Pages/profile.html?userId=${userId}`;
                }

            } else {
                // CUALQUIER OTRA ZONA (Texto, fondo) -> MODAL
                if (window.showReviewDetailModal) window.showReviewDetailModal(reviewId, modalsState);
            }
        });
    });
}

export async function initializeAmigosPage() {
    initializeCreateReviewModal(modalsState);
    initializeCommentsModalLogic(modalsState);
    initializeReviewDetailModalLogic(modalsState);
    initializeDeleteModalsLogic(modalsState);
    if (typeof window !== 'undefined') {
        window.showEditReviewModal = (id, t, c, r) => showEditReviewModal(id, t, c, r, modalsState);
        window.showDeleteReviewModal = (id, title) => showDeleteReviewModal(id, title, modalsState);
        window.showReviewDetailModal = (id) => showReviewDetailModal(id, modalsState);
        window.showCommentsModal = (id) => showCommentsModal(id, modalsState);
    }
    await AmigosHandler.init(modalsState);
    
    // Escuchar eventos de actualización de likes para sincronizar
    window.addEventListener('likeUpdated', (event) => {
        const { reviewId, isLiked, count } = event.detail;
        // Si hay una función de recarga, podríamos recargar las reseñas
        // Por ahora, la sincronización se hace directamente en syncLikeButtons
    });
    
    modalsState.loadReviews(); 
}