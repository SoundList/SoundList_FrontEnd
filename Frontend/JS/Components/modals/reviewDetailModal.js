/**
 * Módulo del modal de vista detallada de reseña
 * Maneja la visualización detallada de reseñas y sus comentarios
 */

import { getReviews, getCommentsByReview, getReviewReactionCount, createComment, updateComment, getUser, addReviewReaction, deleteReviewReaction } from '../../APIs/socialApi.js';
import { renderStars, showAlert } from '../../Utils/reviewHelpers.js';
import { showLoginRequiredModal, formatNotificationTime } from '../../Handlers/headerHandler.js';
// Importación dinámica para evitar dependencias circulares

/**
 * Inicializa el modal de vista detallada
 * @param {Object} state - Objeto con estado compartido (editingCommentId, originalCommentText)
 */
export function initializeReviewDetailModalLogic(state) {
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
        reviewDetailSubmitCommentBtn.addEventListener('click', () => submitReviewDetailComment(state));
    }
    
    if (reviewDetailCommentInput) {
        reviewDetailCommentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitReviewDetailComment(state);
            }
        });
    }
}

/**
 * Muestra el modal de vista detallada de reseña
 * @param {string} reviewId - ID de la reseña
 * @param {Object} state - Objeto con estado compartido (opcional, se crea uno nuevo si no se proporciona)
 */
export async function showReviewDetailModal(reviewId, state = null) {
    // Si no se proporciona estado, crear uno temporal (para compatibilidad)
    if (!state) {
        state = {
            editingCommentId: null,
            originalCommentText: null
        };
    }
    const modal = document.getElementById('reviewDetailModalOverlay');
    if (!modal) return;
    
    modal.setAttribute('data-review-id', reviewId);
    modal.style.display = 'flex';
    const contentDiv = document.getElementById('reviewDetailContent');
    if (contentDiv) {
        contentDiv.innerHTML = '<div class="review-detail-loading">Cargando reseña...</div>';
    }
    
    try {
        const [allReviewsResult, commentsResult, likesResult] = await Promise.allSettled([
            getReviews().catch(err => {
                console.warn('Error obteniendo todas las reseñas:', err);
                return [];
            }), 
            getCommentsByReview(reviewId).catch(err => {
                console.warn('Error obteniendo comentarios:', err);
                return [];
            }),
            getReviewReactionCount(reviewId).catch(err => {
                console.warn('Error obteniendo likes:', err);
                return 0;
            })
        ]);
        
        const allReviews = allReviewsResult.status === 'fulfilled' ? allReviewsResult.value : [];
        const comments = commentsResult.status === 'fulfilled' ? commentsResult.value : [];
        const likes = likesResult.status === 'fulfilled' ? likesResult.value : 0;
        
        let review = null;
        if (allReviews && allReviews.length > 0) {
            review = allReviews.find(r => {
                const rId = r.ReviewId || r.reviewId || r.id || r.Id_Review;
                return String(rId).trim() === String(reviewId).trim();
            });
        }
        
        if (!review) {
            console.error('No se pudo obtener la reseña con ID:', reviewId);
            if (contentDiv) {
                contentDiv.innerHTML = '<div class="review-detail-loading" style="color: #ff6b6b;">No se pudo cargar la reseña. Por favor, intenta nuevamente.</div>';
            }
            return;
        }
        
        let username = 'Usuario'; // Mantener "Usuario" genérico, el badge indicará si está eliminado
        let avatar = '../Assets/default-avatar.png';
        let isUserDeleted = false;
        
        if (review.UserId || review.userId) {
            try {
                const userId = review.UserId || review.userId;
                const userData = await getUser(userId);
                if (userData) {
                    username = userData.Username || userData.username || username;
                    avatar = userData.imgProfile || userData.ImgProfile || avatar;
                } else {
                    // Si getUser devuelve null, puede ser un 404 (usuario eliminado)
                    // Verificar si es un usuario eliminado
                    isUserDeleted = true;
                    username = "Usuario"; // Mantener "Usuario" genérico, el badge indicará que está eliminado
                    console.debug(`Usuario eliminado detectado (getUser devolvió null): ${review.UserId || review.userId}`);
                }
            } catch (userError) {
                // Detectar si el usuario fue eliminado (404)
                if (userError.response && userError.response.status === 404) {
                    isUserDeleted = true;
                    username = "Usuario"; // Mantener "Usuario" genérico, el badge indicará que está eliminado
                    console.debug(`Usuario eliminado detectado (404): ${review.UserId || review.userId}`);
                } else {
                    console.debug(`No se pudo obtener usuario ${review.UserId || review.userId}`);
                }
            }
        }
        
        const fullReview = {
            ...review,
            user: { username, imgProfile: avatar },
            song: {},
            album: {}
        };
        
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
        } else if (fullReview.song) {
            songName = fullReview.song.Title || fullReview.song.title || songName;
            artistName = fullReview.song.ArtistName || fullReview.song.artistName || artistName;
        } else if (fullReview.album) {
            albumName = fullReview.album.Title || fullReview.album.title || albumName;
            artistName = fullReview.album.ArtistName || fullReview.album.artistName || artistName;
        }
        
        const reviewTitle = fullReview.Title || fullReview.title || '';
        const reviewContent = fullReview.Content || fullReview.content || '';
        const reviewRating = fullReview.Rating || fullReview.rating || 0;
        const createdAt = fullReview.CreatedAt || fullReview.Created || new Date();
        const timeAgo = formatNotificationTime(createdAt); 
        
        const currentUserId = localStorage.getItem('userId');
        const reviewUserId = fullReview.UserId || fullReview.userId || '';
        const isOwnReview = currentUserId && (String(reviewUserId) === String(currentUserId));
        
        // Verificar likes desde cache primero (igual que en reviewFeed.js)
        const reviewLikesCacheKey = `review_likes_${reviewId}`;
        let cachedReviewLikes = null;
        try {
            const cached = localStorage.getItem(reviewLikesCacheKey);
            if (cached !== null) {
                cachedReviewLikes = parseInt(cached, 10);
                if (isNaN(cachedReviewLikes)) cachedReviewLikes = null;
            }
        } catch (e) { /* ignore */ }
        
        // Usar cache si está disponible, sino usar backend
        const finalLikes = cachedReviewLikes !== null ? cachedReviewLikes : (likes || 0);
        
        // Verificar si el usuario actual le dio like desde localStorage (fuente de verdad)
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
                        <img src="${avatar}" alt="${username}" class="review-detail-avatar ${isUserDeleted ? '' : 'profile-navigation-trigger'}" ${isUserDeleted ? '' : `data-user-id="${reviewUserId}" style="cursor: pointer;"`} onerror="this.src='../Assets/default-avatar.png'">
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
                                <span class="review-detail-likes-count">${finalLikes}</span>
                            </button>
                            <span class="review-detail-comments-icon">
                                <i class="fas fa-comment"></i>
                                <span class="review-detail-comments-count">${comments.length}</span>
                            </span>
                        </div>
                    </div>
            `;
        }
        
        await loadReviewDetailComments(reviewId, comments, state);
        
        const likeBtn = document.getElementById('reviewDetailLikeBtn');
        if (likeBtn) {
            likeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (!localStorage.getItem('authToken')) return showLoginRequiredModal();
                toggleReviewLikeInDetail(reviewId, this);
            });
        }
        
        // Actualizar el avatar del input con la foto de perfil del usuario actual
        const inputAvatar = document.getElementById('reviewDetailInputAvatar');
        if (inputAvatar) {
            // Detectar la ruta correcta para el avatar por defecto
            const isProfilePage = window.location.pathname.includes('/Pages/profile.html');
            const isAmigosPage = window.location.pathname.includes('/amigos.html');
            const defaultAvatar = isProfilePage ? '../../Assets/default-avatar.png' : 
                                 isAmigosPage ? '../Assets/default-avatar.png' :
                                 '../Assets/default-avatar.png';
            
            // Intentar obtener el avatar desde localStorage primero
            let userAvatar = localStorage.getItem('userAvatar');
            
            // Siempre intentar obtener el avatar más reciente del usuario (por si cambió)
            try {
                const currentUserId = localStorage.getItem('userId');
                if (currentUserId) {
                    // Intentar obtener el perfil del usuario
                    const getUserFn = window.userApi?.getUserProfile || (async (userId) => {
                        try {
                            if (window.userApi && window.userApi.getUserProfile) {
                                return await window.userApi.getUserProfile(userId);
                            }
                            const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';
                            const token = localStorage.getItem('authToken');
                            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                            const axiosInstance = window.axios || (typeof axios !== 'undefined' ? axios : null);
                            if (axiosInstance) {
                                const response = await axiosInstance.get(`${API_BASE_URL}/api/gateway/users/${userId}`, { headers });
                                return response.data;
                            }
                            return null;
                        } catch (error) {
                            console.debug(`No se pudo obtener usuario ${userId}:`, error);
                            return null;
                        }
                    });
                    
                    const userData = await getUserFn(currentUserId);
                    if (userData) {
                        const newAvatar = userData.imgProfile || userData.ImgProfile || userData.avatar || userData.image;
                        if (newAvatar) {
                            userAvatar = newAvatar;
                            localStorage.setItem('userAvatar', newAvatar);
                        }
                    }
                }
            } catch (e) {
                console.debug('Error obteniendo avatar del usuario:', e);
            }
            
            // Usar el avatar obtenido o el default
            inputAvatar.src = userAvatar || defaultAvatar;
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
        try {
            const comments = await getCommentsByReview(reviewId).catch(() => []);
            await loadReviewDetailComments(reviewId, comments, state);
        } catch (commentError) {
            console.warn('No se pudieron cargar los comentarios:', commentError);
        }
    }
}

/**
 * Carga los comentarios en el modal de vista detallada
 */
export async function loadReviewDetailComments(reviewId, comments, state) {
    const commentsList = document.getElementById('reviewDetailCommentsList');
    const commentsCountEl = document.getElementById('reviewDetailCommentsCount');
    if (!commentsList) return;
    
    try {
        if (!comments) {
            comments = await getCommentsByReview(reviewId);
        }
        
        // Enriquecer comentarios con datos de usuario si no tienen username (igual que en profileHandler.js)
        const getUserFn = window.socialApi?.getUser || getUser;
        const axiosInstance = window.axios || (typeof axios !== 'undefined' ? axios : null);
        
        comments = await Promise.all(comments.map(async (comment) => {
            // Si ya tiene username y avatar, devolverlo tal cual
            if ((comment.UserName || comment.username) && (comment.UserProfilePicUrl || comment.userProfilePicUrl || comment.avatar)) {
                return comment;
            }
            
            // Si no tiene username o avatar, obtenerlo del User Service
            const userId = comment.IdUser || comment.idUser || comment.Id_User || comment.id_user || comment.userId;
            if (userId) {
                try {
                    const userData = await getUserFn(userId);
                    if (userData) {
                        return {
                            ...comment,
                            UserName: userData.Username || userData.username || userData.UserName || comment.UserName || comment.username || 'Usuario',
                            username: userData.Username || userData.username || userData.UserName || comment.UserName || comment.username || 'Usuario',
                            UserProfilePicUrl: userData.imgProfile || userData.ImgProfile || userData.avatar || userData.image || comment.UserProfilePicUrl || comment.userProfilePicUrl || comment.avatar
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
                            UserProfilePicUrl: comment.UserProfilePicUrl || comment.userProfilePicUrl || comment.avatar || '../Assets/default-avatar.png'
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
            
            return comment;
        }));
        
        if (commentsCountEl) commentsCountEl.textContent = comments.length;
        
        const currentUserIdRaw = localStorage.getItem('userId');
        const currentUserId = currentUserIdRaw ? String(currentUserIdRaw).trim() : null;
        
        if (comments.length === 0) {
            commentsList.innerHTML = `
                <div class="review-detail-comment-empty">
                    <i class="fas fa-comment-slash"></i>
                    <p>No hay comentarios aún. ¡Sé el primero en comentar!</p>
                </div>
            `;
        } else {
            commentsList.innerHTML = comments.map(comment => {
                const timeAgo = formatNotificationTime(comment.Created || comment.CreatedAt || comment.date);
                const username = comment.UserName || comment.username || 'Usuario';
                const text = comment.Text || comment.text || '';
                let commentId = comment.Id_Comment || comment.id_Comment || comment.IdComment || comment.idComment || comment.id || comment.Id || '';
                if (commentId) {
                    commentId = String(commentId).trim();
                }
                const commentUserId = comment.IdUser || comment.idUser || comment.Id_User || comment.id_user || comment.userId || '';
                
                // Obtener la foto de perfil del usuario (con fallback a default)
                let userAvatar = comment.UserProfilePicUrl || comment.userProfilePicUrl || comment.avatar || comment.imgProfile || comment.ImgProfile || comment.image;
                // Si no hay avatar o es una cadena vacía, usar el default
                // La ruta debe ser relativa al HTML donde se renderiza (home.html usa ../Assets, profile.html usa ../../Assets)
                if (!userAvatar || userAvatar === '' || userAvatar === 'null' || userAvatar === 'undefined') {
                    // Detectar si estamos en profile.html o home.html basado en la ruta actual
                    const isProfilePage = window.location.pathname.includes('/Pages/profile.html');
                    userAvatar = isProfilePage ? '../../Assets/default-avatar.png' : '../Assets/default-avatar.png';
                }
                
                // Verificar likes desde cache primero (igual que con reseñas)
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
                
                // Determinar la ruta del fallback basado en la página actual
                const isProfilePage = window.location.pathname.includes('/Pages/profile.html');
                const fallbackAvatar = isProfilePage ? '../../Assets/default-avatar.png' : '../Assets/default-avatar.png';
                
                return `
                    <div class="review-detail-comment-item" data-comment-id="${commentId}">
                        <img src="${userAvatar}" alt="${username}" class="review-detail-comment-avatar ${isCommentUserDeleted ? '' : 'profile-navigation-trigger'}" ${isCommentUserDeleted ? '' : `data-user-id="${commentUserId}" style="cursor: pointer;"`} onerror="this.src='${fallbackAvatar}'">
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
        
        attachReviewDetailCommentListeners(reviewId, state);
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

/**
 * Adjunta listeners a los comentarios en la vista detallada
 */
function attachReviewDetailCommentListeners(reviewId, state) {
    document.querySelectorAll('.review-detail-comment-like-btn').forEach(btn => {
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
    
    document.querySelectorAll('.review-detail-comment-item .comment-edit-btn').forEach(btn => {
        if (!btn.hasAttribute('data-listener-attached')) {
            btn.setAttribute('data-listener-attached', 'true');
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const commentId = this.getAttribute('data-comment-id');
                if (commentId) {
                    editCommentInDetail(commentId, reviewId, state);
                }
            });
        }
    });
    
    document.querySelectorAll('.review-detail-comment-item .comment-delete-btn').forEach(btn => {
        if (!btn.hasAttribute('data-listener-attached')) {
            btn.setAttribute('data-listener-attached', 'true');
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const commentId = this.getAttribute('data-comment-id');
                if (commentId) {
                    deleteCommentInDetail(commentId, reviewId, state);
                }
            });
        }
    });
}

/**
 * Alterna el like de un comentario en la vista detallada
 */
async function toggleCommentLikeInDetail(commentId, btn, reviewId) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        showLoginRequiredModal();
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
        const { deleteCommentReaction } = await import('../../APIs/socialApi.js');
        deleteCommentReaction(commentId, currentUserId, authToken)
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
        const { addCommentReaction } = await import('../../APIs/socialApi.js');
        addCommentReaction(commentId, currentUserId, authToken)
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

/**
 * Inicia la edición de un comentario en la vista detallada
 */
function editCommentInDetail(commentId, reviewId, state) {
    const commentItem = document.querySelector(`.review-detail-comment-item[data-comment-id="${commentId}"]`);
    const commentTextElement = commentItem?.querySelector('.review-detail-comment-text');
    
    if (!commentItem || !commentTextElement) {
        console.error('No se encontró commentItem o commentTextElement en vista detallada');
        return;
    }
    
    if (commentItem.classList.contains('editing')) {
        console.warn('El comentario ya está en modo edición');
        return;
    }
    
    state.originalCommentText = commentTextElement.textContent.trim();
    state.editingCommentId = commentId;
    
    const currentText = state.originalCommentText;
    
    const textarea = document.createElement('textarea');
    textarea.className = 'comment-text-edit';
    textarea.id = `comment-text-edit-${commentId}`;
    textarea.value = currentText;
    textarea.maxLength = 500;
    textarea.rows = 3;
    textarea.setAttribute('data-comment-id', commentId);
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'comment-edit-buttons';
    buttonsContainer.setAttribute('data-comment-id', commentId);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'comment-edit-action-btn comment-edit-cancel';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.type = 'button';
    cancelBtn.setAttribute('data-comment-id', commentId);
    cancelBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        cancelEditCommentInDetail(commentId, state);
    });
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'comment-edit-action-btn comment-edit-confirm';
    confirmBtn.textContent = 'Confirmar';
    confirmBtn.type = 'button';
    confirmBtn.setAttribute('data-comment-id', commentId);
    confirmBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        confirmEditCommentInDetail(commentId, reviewId, state);
    });
    
    buttonsContainer.appendChild(cancelBtn);
    buttonsContainer.appendChild(confirmBtn);
    
    commentTextElement.replaceWith(textarea);
    textarea.parentNode.insertBefore(buttonsContainer, textarea.nextSibling);
        
    commentItem.classList.add('editing');
    
    const commentFooter = commentItem.querySelector('.review-detail-comment-footer');
    if (commentFooter) {
        commentFooter.style.display = 'none';
    }
    
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 10);
}

/**
 * Cancela la edición de un comentario en la vista detallada
 */
function cancelEditCommentInDetail(commentId, state) {
    const commentItem = document.querySelector(`.review-detail-comment-item[data-comment-id="${commentId}"]`);
    if (!commentItem) return;
    
    const textarea = document.getElementById(`comment-text-edit-${commentId}`);
    const buttonsContainer = commentItem.querySelector('.comment-edit-buttons');
    const commentFooter = commentItem.querySelector('.review-detail-comment-footer');
    
    if (textarea) {
        const commentTextElement = document.createElement('p');
        commentTextElement.className = 'review-detail-comment-text';
        commentTextElement.textContent = state.originalCommentText;
        textarea.replaceWith(commentTextElement);
    }
    
    if (buttonsContainer) {
        buttonsContainer.remove();
    }
    
    if (commentFooter) {
        commentFooter.style.display = 'flex';
    }
    
    commentItem.classList.remove('editing');
    
    state.editingCommentId = null;
    state.originalCommentText = null;
}

/**
 * Confirma la edición de un comentario en la vista detallada
 */
async function confirmEditCommentInDetail(commentId, reviewId, state) {
    if (!commentId || commentId === '') {
        console.error('No se pudo obtener commentId');
        showAlert('Error: No se pudo identificar el comentario a editar', 'danger');
        return;
    }
    
    if (!state.editingCommentId || state.editingCommentId !== commentId) {
        state.editingCommentId = commentId;
    }
    
    const textarea = document.getElementById(`comment-text-edit-${commentId}`);
    
    if (!reviewId || !textarea) {
        if (!reviewId) {
            showAlert('Error: No se pudo identificar la reseña', 'danger');
        } else if (!textarea) {
            showAlert('Error: No se encontró el campo de edición', 'danger');
        }
        return;
    }
    
    const newText = textarea.value.trim();
    if (!newText) {
        showAlert('El comentario no puede estar vacío', 'warning');
        return;
    }
    
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Debes iniciar sesión para editar comentarios', 'warning');
            return;
        }
        
        // updateComment solo acepta commentId y newText, el authToken se obtiene internamente
        await updateComment(commentId, newText);
        
        await loadReviewDetailComments(reviewId, null, state);
        
        showAlert('Comentario editado exitosamente', 'success');
    } catch (error) {
        console.error('❌ Error al actualizar comentario:', error);
        
        // Manejar diferentes tipos de errores
        let errorMessage = 'Error al actualizar el comentario. Por favor, intenta nuevamente.';
        
        if (error.response?.status === 409) {
            errorMessage = 'No se puede editar este comentario porque ya tiene reacciones (likes).';
        } else if (error.response?.status === 404) {
            errorMessage = 'El comentario no fue encontrado o no tienes permiso para editarlo.';
        } else if (error.response?.status === 401) {
            errorMessage = 'Debes iniciar sesión para editar comentarios.';
        } else if (error.response?.status === 405) {
            errorMessage = 'El método de actualización no está disponible. Por favor, intenta más tarde.';
        }
        
        showAlert(errorMessage, 'danger');
    }
    
    state.editingCommentId = null;
    state.originalCommentText = null;
}

/**
 * Elimina un comentario en la vista detallada
 */
async function deleteCommentInDetail(commentId, reviewId, state) {
    if (!commentId || !reviewId) {
        console.error('Falta commentId o reviewId para eliminar');
        return;
    }
    
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        showLoginRequiredModal();
        return;
    }
    
    // Usar modal bonito en lugar de confirm()
    const { showDeleteCommentModal } = await import('./deleteModals.js');
    if (typeof showDeleteCommentModal === 'function') {
        // Guardar el reviewId y commentId en el state para que el modal los use
        if (!state.deletingCommentId) {
            state.deletingCommentId = commentId;
        }
        // Guardar el reviewId en el modal para que se pueda usar después
        const deleteCommentModal = document.getElementById('deleteCommentModalOverlay');
        if (deleteCommentModal) {
            deleteCommentModal.setAttribute('data-review-id', reviewId);
        }
        showDeleteCommentModal(commentId, state);
    } else {
        // Fallback a confirm si el modal no está disponible
        if (!confirm('¿Estás seguro de que quieres eliminar este comentario?')) {
            return;
        }
        
        try {
            const { deleteComment } = await import('../../APIs/socialApi.js');
            if (!authToken.startsWith('dev-token-')) {
                await deleteComment(commentId, authToken);
            }
            
            await loadReviewDetailComments(reviewId, null, state);
            
            const commentsCount = document.getElementById('reviewDetailCommentsCount');
            if (commentsCount) {
                const comments = await getCommentsByReview(reviewId);
                commentsCount.textContent = comments.length;
            }
            
            showAlert('Comentario eliminado exitosamente', 'success');
        } catch (error) {
            console.error('Error eliminando comentario:', error);
            showAlert('Error al eliminar el comentario', 'danger');
        }
    }
}

/**
 * Alterna el like de una reseña en la vista detallada
 */
async function toggleReviewLikeInDetail(reviewId, btn) {
    const authToken = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    if (!authToken || !userId) {
        showLoginRequiredModal();
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
        deleteReviewReaction(reviewId, userId, authToken, reactionId)
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
        
        addReviewReaction(reviewId, userId, authToken)
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

/**
 * Envía un comentario desde el modal de vista detallada
 */
async function submitReviewDetailComment(state) {
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
        showAlert('Por favor, escribe un comentario', 'warning');
        return;
    }
    
    try {
        const authToken = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        
        if (!authToken) {
            showLoginRequiredModal();
            return;
        }
        
        await createComment(reviewId, commentText);
        
        commentInput.value = '';
        // Recargar comentarios para obtener el username del backend
        const comments = await getCommentsByReview(reviewId);
        await loadReviewDetailComments(reviewId, comments, state);
        
        const commentsCount = document.getElementById('reviewDetailCommentsCount');
        if (commentsCount) {
            const comments = await getCommentsByReview(reviewId);
            commentsCount.textContent = comments.length;
        }
        
        showAlert('Comentario agregado exitosamente', 'success');
    } catch (error) {
        console.error('Error agregando comentario en vista detallada:', error);
        showAlert('Error al agregar el comentario', 'danger');
    }
}

/**
 * Oculta el modal de vista detallada
 */
function hideReviewDetailModal() {
    const modal = document.getElementById('reviewDetailModalOverlay');
    if (modal) modal.style.display = 'none';
}

