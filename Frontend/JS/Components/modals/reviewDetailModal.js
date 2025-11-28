/**
 * Módulo del modal de vista detallada de reseña
 * VERSIÓN COMBINADA:
 * - Estructura del primer archivo
 * - Lógica de likes / reacciones del segundo archivo (optimistic, localStorage reactionId, rollback)
 * - data-likes y data-reaction-id en DOM para prevenir edición cuando hay interacciones
 */

import { 
    getReviews, 
    getCommentsByReview, 
    getReviewReactionCount, 
    createComment, 
    updateComment, 
    deleteComment,           
    addCommentReaction,      
    deleteCommentReaction,   
    getUser, 
    addReviewReaction, 
    deleteReviewReaction 
} from '../../APIs/socialApi.js';

import { renderStars, showAlert } from '../../Utils/reviewHelpers.js';
import { showLoginRequiredModal, formatNotificationTime } from '../../Handlers/headerHandler.js';

// Estado local para la edición
let modalState = {
    editingCommentId: null,
    originalCommentText: null
};

// =========================================================
// 1. INICIALIZACIÓN Y DELEGACIÓN
// =========================================================

export function initializeReviewDetailModalLogic(state) {
    if (state) modalState = state; 

    const closeBtn = document.getElementById('closeReviewDetailModal');
    const overlay = document.getElementById('reviewDetailModalOverlay');
    const submitBtn = document.getElementById('reviewDetailSubmitCommentBtn');
    const input = document.getElementById('reviewDetailCommentInput');
    

    if (closeBtn) {
        const newBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newBtn, closeBtn);
        newBtn.addEventListener('click', hideReviewDetailModal);
    }
    
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) hideReviewDetailModal();
        });
    }
    
    if (submitBtn) {
        const newBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newBtn, submitBtn);
        newBtn.addEventListener('click', () => submitReviewDetailComment());
    }
    
    if (input) {
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        newInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitReviewDetailComment();
        });
    }

    // Listener Maestro para la lista de comentarios (Delegación de eventos)
    const commentsList = document.getElementById('reviewDetailCommentsList');
    if (commentsList) {
        const newList = commentsList.cloneNode(false);
        commentsList.parentNode.replaceChild(newList, commentsList);
        newList.addEventListener('click', handleCommentListClick);
    }
}

function handleCommentListClick(e) {
    const target = e.target;
    const modal = document.getElementById('reviewDetailModalOverlay');
    const reviewId = modal ? modal.getAttribute('data-review-id') : null;

    // 1. Like
    const likeBtn = target.closest('.review-detail-comment-like-btn');
    if (likeBtn) {
        e.preventDefault(); e.stopPropagation();
        const commentId = likeBtn.getAttribute('data-comment-id');
        if (commentId && commentId !== 'undefined') toggleCommentLikeInDetail(commentId, likeBtn, reviewId);
        return;
    }

    // 2. Editar
    const editBtn = target.closest('.comment-edit-btn');
    if (editBtn) {
        e.preventDefault(); e.stopPropagation();
        const commentId = editBtn.getAttribute('data-comment-id');
        if (commentId && commentId !== 'undefined') editCommentInDetail(commentId, reviewId);
        else console.error("ID de comentario inválido para editar");
        return;
    }

    // 3. Eliminar
    const deleteBtn = target.closest('.comment-delete-btn');
    if (deleteBtn) {
        e.preventDefault(); e.stopPropagation();
        const commentId = deleteBtn.getAttribute('data-comment-id');
        if (commentId && commentId !== 'undefined') deleteCommentInDetail(commentId, reviewId);
        else console.error("ID de comentario inválido para eliminar");
        return;
    }

    // 4. Cancelar Edición
    if (target.classList.contains('comment-edit-cancel')) {
        e.preventDefault(); e.stopPropagation();
        const commentItem = target.closest('.review-detail-comment-item');
        const commentId = commentItem.getAttribute('data-comment-id');
        cancelEditCommentInDetail(commentId);
        return;
    }

    // 5. Confirmar Edición
    if (target.classList.contains('comment-edit-confirm')) {
        e.preventDefault(); e.stopPropagation();
        const commentItem = target.closest('.review-detail-comment-item');
        const commentId = commentItem.getAttribute('data-comment-id');
        confirmEditCommentInDetail(commentId, reviewId);
        return;
    }
}

// =========================================================
// 2. CARGA Y RENDERIZADO
// =========================================================

export async function showReviewDetailModal(reviewId) {
    const modal = document.getElementById('reviewDetailModalOverlay');
    if (!modal) return;
    
    // Reactivar listener de lista por si el modal se cerró y abrió
    const commentsList = document.getElementById('reviewDetailCommentsList');
    if (commentsList) {
        const newList = commentsList.cloneNode(false);
        commentsList.parentNode.replaceChild(newList, commentsList);
        newList.id = 'reviewDetailCommentsList';
        newList.addEventListener('click', handleCommentListClick);
    }

    modal.setAttribute('data-review-id', reviewId);
    modal.style.display = 'flex';
    
    const contentDiv = document.getElementById('reviewDetailContent');
    if (contentDiv) contentDiv.innerHTML = '<div class="review-detail-loading">Cargando...</div>';
    
    try {
        // Carga paralela de datos
        const [reviewsData, commentsData, likesData] = await Promise.allSettled([
            getReviews(), 
            getCommentsByReview(reviewId),
            getReviewReactionCount(reviewId) 
        ]);

        const allReviews = reviewsData.status === 'fulfilled' ? reviewsData.value : [];
        const comments = commentsData.status === 'fulfilled' ? commentsData.value : [];
        const likesRaw = likesData.status === 'fulfilled' ? likesData.value : 0;
        

        let likes = 0;
        let userLiked = false;
        let reactionId = null;
        if (likesRaw && typeof likesRaw === 'object') {
            likes = Number(likesRaw.likes || 0);
            userLiked = !!likesRaw.userLiked;
            reactionId = likesRaw.reactionId || null;
        } else {
            likes = Number(likesRaw || 0);
        }

    
        let review = null;
        if (Array.isArray(allReviews) && allReviews.length > 0) {
            review = allReviews.find(r => {
                const rId = r.ReviewId || r.reviewId || r.id || r.Id_Review;
                return String(rId).trim() === String(reviewId).trim();
            });
        } else if (typeof allReviews === 'object' && allReviews !== null) {

            const rId = allReviews.ReviewId || allReviews.reviewId || allReviews.id || allReviews.Id_Review;
            if (String(rId).trim() === String(reviewId).trim()) review = allReviews;
        }
        
        if (!review) {
            if (contentDiv) contentDiv.innerHTML = '<div class="review-detail-loading">Reseña no encontrada o eliminada.</div>';
            return;
        }

       
        const currentUserId = localStorage.getItem('userId');
        if (reactionId && currentUserId) {
            localStorage.setItem(`reaction_${reviewId}_${currentUserId}`, String(reactionId));
        
        let username = 'Usuario'; // Mantener "Usuario" genérico, el badge indicará si está eliminado
        // Detectar la ruta correcta según la página actual
        const isProfilePage = window.location.pathname.includes('/Pages/profile.html');
        const defaultAvatarPath = isProfilePage ? '../../Assets/default-avatar.png' : '../Assets/default-avatar.png';
        let avatar = defaultAvatarPath;
        const reviewUserId = review.UserId || review.userId;

        if (reviewUserId) {
            try {
                const userData = await getUser(reviewUserId);
                if (userData) {
                    username = userData.Username || userData.username || username;
                    avatar = userData.imgProfile || userData.ImgProfile || defaultAvatarPath;
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
        
        const userProfileUrl = `profile.html?userId=${reviewUserId}`;

        // --- DATOS DE CONTENIDO (MÚSICA) ---
        const storageKey = `review_content_${reviewId}`;
        const storedContentData = localStorage.getItem(storageKey);
        let contentData = null;
        if (storedContentData) {
            try { contentData = JSON.parse(storedContentData); } catch (e) {}
        }

        
        await renderMainReviewContent(contentDiv, review, likes, reviewId, userLiked);
        let songName = 'Canción', albumName = 'Álbum', artistName = 'Artista';
        let contentType = 'song'; 
        let contentImage = defaultAvatarPath;
        let contentApiId = ''; 

        // 1. Intentar desde LocalStorage
        if (contentData) {
            contentType = (contentData.type || 'song').toLowerCase();
            contentApiId = contentData.id;
            contentImage = contentData.image || contentImage;
            
            if (contentType === 'song') songName = contentData.name || songName;
            else albumName = contentData.name || albumName;
            
            artistName = contentData.artist || artistName;
        } 
        // 2. Intentar desde el objeto Review
        else {
            console.log("🔍 Debug Review Data:", review); // DEBUG LOG

            if (review.song || review.Song) {
                const s = review.song || review.Song;
                contentType = 'song';
                songName = s.Title || s.title || songName;
                artistName = s.ArtistName || s.artistName || artistName;
                contentImage = s.Image || s.image || contentImage;
                contentApiId = s.APISongId || s.apiSongId || s.Id || s.id; 
            } else if (review.album || review.Album) {
                const a = review.album || review.Album;
                contentType = 'album'; 
                albumName = a.Title || a.title || albumName;
                artistName = a.ArtistName || a.artistName || artistName;
                contentImage = a.Image || a.image || contentImage;
                
                // Múltiples intentos para encontrar el ID del álbum
                contentApiId = a.APIAlbumId || a.apiAlbumId || a.Id || a.id || a.AlbumId || a.albumId;
                
                console.log("💿 Álbum detectado. ID extraído:", contentApiId); // DEBUG LOG
            }
            // Fallback de IDs planos
            else if (review.SongId) { contentType = 'song'; contentApiId = review.SongId; }
            else if (review.AlbumId) { 
                contentType = 'album'; 
                contentApiId = review.AlbumId; 
                console.log("💿 Álbum detectado por ID plano:", contentApiId);
            }
        }
        
       
        await loadReviewDetailComments(reviewId, comments);

    } catch (error) {
        console.error("Error en modal detalle:", error);
        if (contentDiv) contentDiv.innerHTML = '<div class="review-detail-loading">Error de conexión.</div>';
    }
}

async function renderMainReviewContent(container, review, likes, reviewId, userLikedFromServer = false) {
    const user = await getUser(review.UserId || review.userId).catch(() => ({ username: 'Usuario' }));
    const username = user.Username || user.username || 'Usuario';
    const avatar = user.imgProfile || user.avatar || '../Assets/default-avatar.png';
    const userProfileUrl = `profile.html?userId=${review.UserId || review.userId}`;
    
    const currentUserId = localStorage.getItem('userId');

    const userLikedLocal = currentUserId ? (localStorage.getItem(`like_${reviewId}_${currentUserId}`) === 'true') : false;
    const userLiked = userLikedFromServer || userLikedLocal;


    const cachedLikes = localStorage.getItem(`review_likes_${reviewId}`);
    const displayLikes = (typeof likes === 'number' && !isNaN(likes)) ? likes : (cachedLikes ? parseInt(cachedLikes) : 0);

    let contentImage = '../Assets/default-avatar.png';
    let contentName = 'Contenido';
    let artistName = 'Artista';
    let contentType = 'song';
    let contentApiId = '';
   
    const storedContent = localStorage.getItem(`review_content_${reviewId}`);
    let foundContent = false;

    if (storedContent) {
        try {
            const parsed = JSON.parse(storedContent);
            if (parsed && parsed.name) {
                contentName = parsed.name;
                artistName = parsed.artist || 'Artista Desconocido';
                contentImage = parsed.image || contentImage;
                contentType = parsed.type || 'song';
                contentApiId = parsed.id;
                foundContent = true;
            }
        } catch(e) {}
    }

   
    if (!foundContent) {
        if (review.song || review.Song) {
            const s = review.song || review.Song;
            contentName = s.Title || s.title || contentName;
            artistName = s.ArtistName || s.artistName || artistName;
            contentImage = s.Image || s.image || contentImage;
            contentApiId = s.APISongId || s.apiSongId || s.Id || s.id;
        } else if (review.album || review.Album) {
            const a = review.album || review.Album;
            contentType = 'album';
            contentName = a.Title || a.title || contentName;
            artistName = a.ArtistName || a.artistName || artistName;
            contentImage = a.Image || a.image || contentImage;
            contentApiId = a.APIAlbumId || a.apiAlbumId || a.Id || a.id;
        }
    }

    const contentLabel = contentType === 'song' ? 'Canción' : 'Álbum';
    let navUrl = '#';
    let cursorStyle = 'default';
    if (contentApiId) {
        cursorStyle = 'pointer';
        navUrl = contentType === 'album' 
            ? `/Frontend/HTML/album.html?id=${contentApiId}` 
            : `/Frontend/HTML/song.html?id=${contentApiId}`;
    }


    container.innerHTML = `
        <div class="review-detail-main" style="padding: 1.5rem;">
            <div class="review-detail-user">
                <img src="${avatar}" class="review-detail-avatar clickable-user" 
                     onclick="window.location.href='${userProfileUrl}'"
                     onerror="this.src='../Assets/default-avatar.png'">
                <div class="review-detail-user-info">
                    <span class="review-detail-username clickable-user" onclick="window.location.href='${userProfileUrl}'">${username}</span>
                </div>
            </div>

            <a href="${navUrl}" class="modal-music-pill" style="cursor: ${cursorStyle}; text-decoration: none; color: inherit; display: flex; align-items: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 12px; margin-top: 15px;">
                <img src="${contentImage}" class="modal-music-cover" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover; margin-right: 12px;" onerror="this.src='../Assets/default-avatar.png'">
                <div class="modal-music-info" style="display: flex; flex-direction: column;">
                    <h3 style="margin: 0; font-size: 1rem; color: #fff;">${contentName}</h3>
                    <p style="margin: 0; font-size: 0.8rem; color: rgba(255,255,255,0.6);">${artistName} • ${contentLabel}</p>
                </div>
                <i class="fas fa-chevron-right" style="margin-left: auto; color: rgba(255,255,255,0.3);"></i>
            </a>

            <h2 class="review-detail-title" style="margin-top:15px;">${review.Title || review.title || ''}</h2>
            <p class="review-detail-text">${review.Content || review.content || ''}</p>
            <div class="review-detail-rating"><div class="review-detail-stars">${renderStars(review.Rating || review.rating || 0)}</div></div>
            
            <div class="review-detail-interactions">
                <button class="review-detail-interaction-btn ${userLiked ? 'liked' : ''}" id="reviewDetailLikeBtn" data-review-id="${reviewId}">
                    <i class="fas fa-heart" style="color: ${userLiked ? '#EC4899' : 'rgba(255,255,255,0.7)'}"></i>
                    <span class="review-detail-likes-count">${displayLikes}</span>
                </button>
                <span class="review-detail-comments-icon">
                    <i class="fas fa-comment"></i>
                    <span id="reviewDetailCommentsCount" style="margin-left:5px;">0</span>
                </span>
            </div>
        </div>
    `;

  
    const likeBtn = document.getElementById('reviewDetailLikeBtn');
    if (likeBtn) {
        likeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleReviewLikeInDetail(reviewId, e.currentTarget);
        });
        // Likes
        const reviewLikesCacheKey = `review_likes_${reviewId}`;
        let cachedReviewLikes = localStorage.getItem(reviewLikesCacheKey);
        const finalLikes = cachedReviewLikes !== null ? parseInt(cachedReviewLikes) : (likes || 0);
        
        const currentUserId = localStorage.getItem('userId');
        let userLiked = false;
        if (currentUserId) {
            const localLike = localStorage.getItem(`like_${reviewId}_${currentUserId}`);
            userLiked = localLike === 'true';
        }
        
        // --- RENDERIZADO HTML (USANDO <a> TAG) ---
        if (contentDiv) {
            contentDiv.innerHTML = `
                <div class="review-detail-main" style="padding: 1.5rem;">
                    
                    <div class="review-detail-user">
                        <img src="${avatar}" alt="${username}" 
                             class="review-detail-avatar clickable-user" 
                             onclick="window.location.href='${userProfileUrl}'"
                             onerror="this.src='${defaultAvatarPath}'">
                        
                        <div class="review-detail-user-info">
                        <span class="review-detail-username clickable-user"
                              onclick="window.location.href='${userProfileUrl}'">
                            ${username}
                        </span>
                            ${timeAgo ? `<span class="review-detail-time">${timeAgo}</span>` : ''}
                        </div>
                    </div>

                    <a href="${navUrl}" class="modal-music-pill" style="cursor: ${cursorStyle}; text-decoration: none; color: inherit; display: flex; align-items: center;">
                        <img src="${contentImage}" class="modal-music-cover" onerror="this.src='${defaultAvatarPath}'">
                        <div class="modal-music-info">
                            <h3>${contentName}</h3>
                            <p>${artistName} • ${contentLabel}</p>
                        </div>
                        <i class="fas fa-chevron-right" style="margin-left: auto; color: rgba(255,255,255,0.3);"></i>
                    </a>

                    ${reviewTitle ? `<h2 class="review-detail-title" style="margin-top: 1rem;">${reviewTitle}</h2>` : ''}
                    <p class="review-detail-text">${reviewContent}</p>
                    
                    <div class="review-detail-rating">
                        <div class="review-detail-stars">${renderStars(reviewRating)}</div>
                    </div>

                    <div class="review-detail-interactions">
                        <button class="review-detail-interaction-btn btn-like ${userLiked ? 'liked' : ''}" 
                                data-review-id="${reviewId}" id="reviewDetailLikeBtn">
                                <i class="fas fa-heart" style="color: ${userLiked ? 'var(--magenta, #EC4899)' : 'rgba(255,255,255,0.7)'};"></i>
                                <span class="review-detail-likes-count" style="margin-left: 6px;">${finalLikes}</span>
                        </button>
                        <span class="review-detail-comments-icon">
                            <i class="fas fa-comment"></i>
                            <span class="review-detail-comments-count" style="margin-left: 6px;">${comments.length}</span>
                        </span>
                    </div>
                </div>
            `;
        }
        
        await loadReviewDetailComments(reviewId, comments, state);
        
        // Usar setTimeout para asegurar que el DOM se haya actualizado completamente
        setTimeout(() => {
            const likeBtn = document.getElementById('reviewDetailLikeBtn');
            if (likeBtn) {
                console.log('🔍 [DEBUG] Botón de like encontrado, adjuntando listener...');
                // Remover listener anterior para evitar duplicados
                const newLikeBtn = likeBtn.cloneNode(true);
                likeBtn.parentNode.replaceChild(newLikeBtn, likeBtn);
                const freshLikeBtn = document.getElementById('reviewDetailLikeBtn');
                
                if (!freshLikeBtn) {
                    console.error('❌ [DEBUG] No se pudo encontrar el botón después de clonar');
                    return;
                }
                
                console.log('✅ [DEBUG] Botón clonado correctamente, agregando listener...');
                console.log('✅ [DEBUG] handleLikeToggle disponible:', typeof window.handleLikeToggle);
                
                // Usar handleLikeToggle global para mantener sincronización (igual que en home y perfil)
                freshLikeBtn.addEventListener('click', function(e) {
                    console.log('🖱️ [DEBUG] Click en botón de like de review');
                    e.stopPropagation();
                    if (!localStorage.getItem('authToken')) return showLoginRequiredModal();
                    
                    // Usar la función global handleLikeToggle
                    if (typeof window.handleLikeToggle === 'function') {
                        console.log('✅ [DEBUG] handleLikeToggle está disponible, llamando...');
                        window.handleLikeToggle(e).then(() => {
                        // Sincronizar contador después del like
                        setTimeout(() => {
                            const likesSpan = freshLikeBtn.querySelector('.review-detail-likes-count');
                            if (likesSpan) {
                                const newLikesCount = parseInt(likesSpan.textContent) || 0;
                                // Sincronizar con otros botones de like de la misma review
                                const allLikeBtns = document.querySelectorAll(`.btn-like[data-review-id="${reviewId}"]`);
                                allLikeBtns.forEach(btn => {
                                    const countEl = btn.parentElement.querySelector('.review-likes-count') || 
                                                   btn.closest('.review-likes-container')?.querySelector('.review-likes-count') ||
                                                   btn.closest('.feed-likes-container')?.querySelector('.like-count') ||
                                                   btn.querySelector('.review-detail-likes-count');
                                    if (countEl) {
                                        countEl.textContent = newLikesCount;
                                    }
                                });
                                
                                // Actualizar cache
                                const likesCacheKey = `review_likes_${reviewId}`;
                                try {
                                    localStorage.setItem(likesCacheKey, String(newLikesCount));
                                } catch (e) { /* ignore */ }
                            }
                        }, 100);
                    }).catch(err => {
                        console.debug('Error en handleLikeToggle:', err);
                    });
                } else {
                    console.warn('⚠️ [DEBUG] handleLikeToggle no está disponible, usando fallback');
                    // Fallback a función local
                    toggleReviewLikeInDetail(reviewId, freshLikeBtn);
                }
            });
            } else {
                console.warn('⚠️ [DEBUG] No se encontró el botón de like');
            }
        }, 100);
        
    } catch (error) {
        console.error('Error cargando vista detallada:', error);
        if (contentDiv) contentDiv.innerHTML = '<div class="review-detail-loading">Error al cargar.</div>';
    }
}

// =========================================================
// Comentarios: render + listeners
// =========================================================

export async function loadReviewDetailComments(reviewId, comments = null) {
    const list = document.getElementById('reviewDetailCommentsList');
    const countEl = document.getElementById('reviewDetailCommentsCount');
    if (!list) return;


    if (!comments) {
        list.innerHTML = '<div style="padding:20px; text-align:center;">Cargando comentarios...</div>';
        try { comments = await getCommentsByReview(reviewId); } catch (e) { comments = []; }
    }
  

    if (countEl) countEl.textContent = comments? comments.length:0;
    
    let currentUserId = localStorage.getItem('userId');
    if (currentUserId) currentUserId = String(currentUserId).trim();

    if (comments.length === 0) {
        list.innerHTML = '<div class="review-detail-comment-empty">No hay comentarios aún.</div>';
        return;
    }

    const htmlPromises = comments.map(async (c) => {

        let commentUserId = c.IdUser || c.userId || c.UserId || c.id_user || c.idUser;
        if (commentUserId) commentUserId = String(commentUserId).trim();

        const cId = c.Id_Comment || c.id_Comment || c.CommentId || c.id || c.Id;
        
        let uName = c.username || c.UserName || 'Usuario';
        let uAvatar = c.avatar || c.UserProfilePicUrl || '../Assets/default-avatar.png';
        
        if (commentUserId && uName === 'Usuario') {
            try {
                const u = await getUser(commentUserId);
                if (u) { uName = u.username || u.Username; uAvatar = u.imgProfile || u.image; }
            } catch(e){}
        if (comments.length === 0) {
            commentsList.innerHTML = `<div class="review-detail-comment-empty"><p>No hay comentarios aún.</p></div>`;
        } else {
            commentsList.innerHTML = comments.map(comment => {
                const dateRaw = comment.Created || comment.CreatedAt || comment.created || comment.createdAt || comment.date;
                const timeAgo = formatNotificationTime(dateRaw);
                const username = comment.username || comment.UserName || 'Usuario';
                const text = comment.Text || comment.text || '';
                // Extraer commentId de todas las variantes posibles
                const commentId = comment.Id_Comment || comment.id_Comment || comment.IdComment || comment.idComment || comment.id || comment.Id || comment.CommentId || comment.commentId || '';
                
                if (!commentId) {
                    console.warn('⚠️ [DEBUG] Comentario sin ID:', comment);
                }
                
                // --- CORRECCIÓN CRÍTICA: EXTRACCIÓN ROBUSTA DEL ID DE USUARIO ---
                // Buscamos en todas las variantes posibles para que nunca sea undefined
                const commentUserId = comment.userId || comment.UserId || comment.IdUser || comment.idUser || comment.Id_User;

                // Detectar la ruta correcta según la página actual
                const isProfilePage = window.location.pathname.includes('/Pages/profile.html');
                const commentDefaultAvatar = isProfilePage ? '../../Assets/default-avatar.png' : '../Assets/default-avatar.png';
                const avatar = comment.avatar || comment.UserProfilePicUrl || commentDefaultAvatar;
                
                // Link al perfil con ruta absoluta
                // Si por alguna razón sigue siendo undefined, ponemos # para no romper la URL
                const profileUrl = commentUserId ? `/Frontend/HTML/Pages/profile.html?userId=${commentUserId}` : '#';

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
                
                const backendLikes = comment.Likes || comment.likes || comment.ReactionCount || comment.reactionCount || 0;
                let likes = backendLikes;
                
                // Si hay cache, usar el mayor entre cache y backend (para evitar perder likes)
                if (cachedCommentLikes !== null) {
                    if (backendLikes > 0 && cachedCommentLikes === 0) {
                        likes = backendLikes;
                    } else {
                        likes = Math.max(cachedCommentLikes, backendLikes);
                    }
                    try {
                        localStorage.setItem(commentLikesCacheKey, String(likes));
                    } catch (e) { /* ignore */ }
                } else {
                    try {
                        localStorage.setItem(commentLikesCacheKey, String(likes));
                    } catch (e) { /* ignore */ }
                }
                
                let userLiked = false;
                if (currentUserId) {
                    const storedLike = localStorage.getItem(`like_comment_${commentId}_${currentUserId}`);
                    const storedReactionId = localStorage.getItem(`reaction_comment_${commentId}_${currentUserId}`);
                    userLiked = storedLike === 'true' || storedReactionId !== null;
                }

                // Comparación de Strings para asegurar que coincida aunque uno sea número y otro texto
                const isOwnComment = currentUserId && commentUserId && String(commentUserId).trim() === String(currentUserId).trim();
                
                // --- LÓGICA: Ocultar botón editar si tiene likes (igual que en commentsModal) ---
                const editButtonStyle = (likes > 0) ? 'display: none !important;' : '';
                
                let actionButtons = isOwnComment ? `
                    <div class="review-detail-comment-actions">
                        <button class="review-detail-comment-action-btn comment-edit-btn" data-comment-id="${commentId}" style="${editButtonStyle}"><i class="fas fa-pencil"></i></button>
                        <button class="review-detail-comment-action-btn comment-delete-btn" data-comment-id="${commentId}"><i class="fas fa-trash"></i></button>
                    </div>` : '';

                return `
                    <div class="review-detail-comment-item" data-comment-id="${commentId}">
                        <img src="${avatar}" class="review-detail-comment-avatar clickable-user" 
                             onclick="window.location.href='${profileUrl}'"
                             onerror="this.src='${commentDefaultAvatar}'">
                        
                        <div class="review-detail-comment-content">
                            <div class="review-detail-comment-header">
                                <span class="review-detail-comment-username clickable-user"
                                      onclick="window.location.href='${profileUrl}'">
                                    ${username}
                                </span>
                                <span class="review-detail-comment-time">${timeAgo}</span>
                            </div>
                            <p class="review-detail-comment-text">${text}</p>
                            
                            <div class="review-detail-comment-footer">
                                <button class="review-detail-comment-like-btn comment-like-btn ${userLiked ? 'liked' : ''}" data-comment-id="${commentId}">
                                    <i class="fa-solid fa-heart" style="color: ${userLiked ? 'var(--magenta, #EC4899)' : 'rgba(255,255,255,0.6)'};"></i>
                                    <span class="review-detail-comment-likes-count comment-likes-count">${likes}</span>
                                </button>
                                ${actionButtons}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        const isOwn = currentUserId && commentUserId && (currentUserId === commentUserId);

   
        const likesCount = Number(c.Likes || c.likes || 0);

        const backendUserLiked = !!(c.userLiked || c.userReaction);
        const backendReactionId = c.reactionId || c.ReactionId || c.Id_Reaction || null;

        const likedLocal = currentUserId ? (localStorage.getItem(`like_comment_${cId}_${currentUserId}`) === 'true') : false;
        const liked = backendUserLiked || likedLocal;


        const actions = (isOwn && cId) ? `
            <div class="review-detail-comment-actions">
                <button class="review-detail-comment-action-btn comment-edit-btn" data-comment-id="${cId}"><i class="fas fa-pencil"></i></button>
                <button class="review-detail-comment-action-btn comment-delete-btn" data-comment-id="${cId}"><i class="fas fa-trash"></i></button>
            </div>` : '';

    
        if (backendReactionId && currentUserId) {
            localStorage.setItem(`reaction_comment_${cId}_${currentUserId}`, String(backendReactionId));

            if (backendUserLiked) localStorage.setItem(`like_comment_${cId}_${currentUserId}`, 'true');
        }

        return `
            <div class="review-detail-comment-item" data-comment-id="${cId}" data-likes="${likesCount}" data-reaction-id="${backendReactionId ? backendReactionId : ''}">
                <img src="${uAvatar}" class="review-detail-comment-avatar clickable-user" 
                     onclick="window.location.href='${commentUserId ? `profile.html?userId=${commentUserId}` : '#'}'"
                     onerror="this.src='../Assets/default-avatar.png'">
                <div class="review-detail-comment-content">
                    <div class="review-detail-comment-header">
                        <span class="review-detail-comment-username clickable-user" onclick="window.location.href='${commentUserId ? `profile.html?userId=${commentUserId}` : '#'}'">${uName}</span>
                        <span class="review-detail-comment-time">${formatNotificationTime(c.Created || c.date)}</span>
                    </div>
                    <p class="review-detail-comment-text" id="comment-text-${cId}">${c.Text || c.text || ''}</p>
                    <div class="review-detail-comment-footer">
                        <button class="review-detail-comment-like-btn ${liked ? 'liked' : ''}" data-comment-id="${cId}">
                            <i class="fa-solid fa-heart" style="color: ${liked ? '#EC4899' : 'rgba(255,255,255,0.6)'}"></i>
                            <span class="review-detail-comment-likes-count">${likesCount}</span>
                        </button>
                        ${actions}
                    </div>
                </div>
            </div>
        `;
function attachReviewDetailCommentListeners(reviewId, state) {
    console.log('🔍 [DEBUG] attachReviewDetailCommentListeners llamado para reviewId:', reviewId);
    
    // Remover listeners anteriores para evitar duplicados
    // IMPORTANTE: No clonar, solo remover listeners manualmente
    document.querySelectorAll('.review-detail-comment-like-btn[data-listener-attached]').forEach(btn => {
        // Remover el atributo para permitir agregar el listener de nuevo
        btn.removeAttribute('data-listener-attached');
    });
    
    const likeButtons = document.querySelectorAll('.review-detail-comment-like-btn');
    console.log('🔍 [DEBUG] Botones de like de comentarios encontrados:', likeButtons.length);
    
    likeButtons.forEach(btn => {
        // Marcar que ya tiene listener para evitar duplicados
        if (btn.hasAttribute('data-listener-attached')) {
            console.log('⚠️ [DEBUG] Botón ya tiene listener, saltando');
            return;
        }
        
        const commentId = btn.getAttribute('data-comment-id');
        console.log('🔍 [DEBUG] Botón de like - commentId:', commentId, 'Elemento:', btn);
        
        if (!commentId) {
            console.warn('⚠️ [DEBUG] Botón de like sin data-comment-id, elemento:', btn);
            // Intentar obtener el commentId del elemento padre
            const commentItem = btn.closest('.review-detail-comment-item');
            if (commentItem) {
                const parentCommentId = commentItem.getAttribute('data-comment-id');
                if (parentCommentId) {
                    btn.setAttribute('data-comment-id', parentCommentId);
                    console.log('✅ [DEBUG] CommentId obtenido del elemento padre:', parentCommentId);
                }
            }
        }
        
        btn.setAttribute('data-listener-attached', 'true');
        
        btn.addEventListener('click', function(e) {
            console.log('🖱️ [DEBUG] Click en botón de like de comentario');
            e.preventDefault(); e.stopPropagation();
            const commentId = this.getAttribute('data-comment-id');
            if (!commentId) {
                console.warn('⚠️ [DEBUG] Botón de like sin data-comment-id en click');
                return;
            }
            
            console.log('✅ [DEBUG] CommentId:', commentId);
            
            // Usar handleLikeToggle global para mantener sincronización (igual que en commentsModal)
            if (typeof window.handleLikeToggle === 'function') {
                console.log('✅ [DEBUG] handleLikeToggle está disponible para comentario');
                const commentItem = this.closest('.review-detail-comment-item');
                const editBtn = commentItem?.querySelector('.comment-edit-btn');
                const oldLikesCount = parseInt(this.querySelector('.review-detail-comment-likes-count')?.textContent) || 0;
                
                window.handleLikeToggle(e).then(() => {
                    // Sincronizar contador después del like
                    setTimeout(() => {
                        const likesSpan = this.querySelector('.review-detail-comment-likes-count');
                        if (likesSpan) {
                            const newLikesCount = parseInt(likesSpan.textContent) || 0;
                            
                            // Ocultar/mostrar botón de editar según likes
                            if (editBtn) {
                                if (newLikesCount > 0) {
                                    editBtn.style.setProperty('display', 'none', 'important');
                                } else {
                                    editBtn.style.removeProperty('display');
                                }
                            }
                            
                            // Sincronizar con el modal de comentarios si está abierto
                            const commentsModal = document.getElementById('commentsModalOverlay');
                            if (commentsModal && commentsModal.style.display === 'flex') {
                                const commentItemModal = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
                                if (commentItemModal) {
                                    const commentLikeBtn = commentItemModal.querySelector('.comment-like-btn');
                                    if (commentLikeBtn) {
                                        const commentLikesSpan = commentLikeBtn.querySelector('.comment-likes-count');
                                        if (commentLikesSpan) {
                                            commentLikesSpan.textContent = newLikesCount;
                                        }
                                        // Sincronizar estado visual del botón
                                        const isLiked = commentLikeBtn.classList.contains('liked');
                                        if (newLikesCount > 0 && !isLiked) {
                                            commentLikeBtn.classList.add('liked');
                                            const icon = commentLikeBtn.querySelector('i');
                                            if (icon) icon.style.color = 'var(--magenta, #EC4899)';
                                        } else if (newLikesCount === 0 && isLiked) {
                                            commentLikeBtn.classList.remove('liked');
                                            const icon = commentLikeBtn.querySelector('i');
                                            if (icon) icon.style.color = 'rgba(255,255,255,0.6)';
                                        }
                                    }
                                    
                                    // Sincronizar botón de editar en el modal de comentarios
                                    const editBtnModal = commentItemModal.querySelector('.comment-edit-btn');
                                    if (editBtnModal) {
                                        if (newLikesCount > 0) {
                                            editBtnModal.style.setProperty('display', 'none', 'important');
                                        } else {
                                            editBtnModal.style.removeProperty('display');
                                        }
                                    }
                                }
                            }
                        }
                    }, 100);
                }).catch(err => {
                    console.debug('Error en handleLikeToggle:', err);
                });
            } else {
                // Fallback a función local
                toggleCommentLikeInDetail(commentId, this, reviewId);
            }
        });
    });

    // Remover listeners anteriores para evitar duplicados
    // IMPORTANTE: No clonar, solo remover listeners manualmente
    document.querySelectorAll('.review-detail-comment-item .comment-edit-btn[data-listener-attached]').forEach(btn => {
        btn.removeAttribute('data-listener-attached');
    });
    
    const editButtons = document.querySelectorAll('.review-detail-comment-item .comment-edit-btn');
    console.log('🔍 [DEBUG] Botones de editar encontrados:', editButtons.length);
    
    editButtons.forEach(btn => {
        // Marcar que ya tiene listener para evitar duplicados
        if (btn.hasAttribute('data-listener-attached')) return;
        
        let commentId = btn.getAttribute('data-comment-id');
        if (!commentId) {
            // Intentar obtener el commentId del elemento padre
            const commentItem = btn.closest('.review-detail-comment-item');
            if (commentItem) {
                commentId = commentItem.getAttribute('data-comment-id');
                if (commentId) {
                    btn.setAttribute('data-comment-id', commentId);
                    console.log('✅ [DEBUG] CommentId obtenido del elemento padre para editar:', commentId);
                }
            }
        }
        
        if (!commentId) {
            console.warn('⚠️ [DEBUG] Botón de editar sin data-comment-id, elemento:', btn);
            return;
        }
        
        btn.setAttribute('data-listener-attached', 'true');
        
        btn.addEventListener('click', function(e) {
            console.log('🖱️ [DEBUG] Click en botón de editar comentario');
            e.preventDefault(); e.stopPropagation();
            const commentId = this.getAttribute('data-comment-id');
            if (commentId) {
                console.log('✅ [DEBUG] Editando comentario:', commentId);
                editCommentInDetail(commentId, reviewId, state);
            } else {
                console.warn('⚠️ [DEBUG] Botón de editar sin data-comment-id en click');
            }
        });
    });
    
    // Remover listeners anteriores para evitar duplicados
    // IMPORTANTE: No clonar, solo remover listeners manualmente
    document.querySelectorAll('.review-detail-comment-item .comment-delete-btn[data-listener-attached]').forEach(btn => {
        btn.removeAttribute('data-listener-attached');
    });
    
    const deleteButtons = document.querySelectorAll('.review-detail-comment-item .comment-delete-btn');
    console.log('🔍 [DEBUG] Botones de eliminar encontrados:', deleteButtons.length);
    
    deleteButtons.forEach(btn => {
        // Marcar que ya tiene listener para evitar duplicados
        if (btn.hasAttribute('data-listener-attached')) return;
        
        let commentId = btn.getAttribute('data-comment-id');
        if (!commentId) {
            // Intentar obtener el commentId del elemento padre
            const commentItem = btn.closest('.review-detail-comment-item');
            if (commentItem) {
                commentId = commentItem.getAttribute('data-comment-id');
                if (commentId) {
                    btn.setAttribute('data-comment-id', commentId);
                    console.log('✅ [DEBUG] CommentId obtenido del elemento padre para eliminar:', commentId);
                }
            }
        }
        
        if (!commentId) {
            console.warn('⚠️ [DEBUG] Botón de eliminar sin data-comment-id, elemento:', btn);
            return;
        }
        
        btn.setAttribute('data-listener-attached', 'true');
        
        btn.addEventListener('click', function(e) {
            console.log('🖱️ [DEBUG] Click en botón de eliminar comentario');
            e.preventDefault(); e.stopPropagation();
            const commentId = this.getAttribute('data-comment-id');
            if (commentId) {
                console.log('✅ [DEBUG] Eliminando comentario:', commentId);
                deleteCommentInDetail(commentId, reviewId, state);
            } else {
                console.warn('⚠️ [DEBUG] Botón de eliminar sin data-comment-id en click');
            }
        });
    });

    const htmlItems = await Promise.all(htmlPromises);
    list.innerHTML = htmlItems.join('');
}


async function toggleCommentLikeInDetail(commentId, btn, reviewId = null) {
    const token = localStorage.getItem('authToken');
    if (!token) return showLoginRequiredModal();

    const icon = btn.querySelector('i');
    const likesSpan = btn.querySelector('.review-detail-comment-likes-count');
    const currentLikes = parseInt(likesSpan.textContent) || 0;
    const currentUserId = localStorage.getItem('userId');
    
    // Verificar localStorage primero (más confiable que la clase CSS)
    let isLiked = false;
    if (currentUserId) {
        const storedLike = localStorage.getItem(`like_comment_${commentId}_${currentUserId}`);
        const storedReactionId = localStorage.getItem(`reaction_comment_${commentId}_${currentUserId}`);
        isLiked = storedLike === 'true' || storedReactionId !== null;
    }
    
    // Si no hay en localStorage, verificar por el estado visual del botón
    if (!isLiked) {
        const iconColor = icon.style.color || window.getComputedStyle(icon).color;
        isLiked = btn.classList.contains('liked') || 
                  iconColor === 'var(--magenta)' || 
                  iconColor === 'rgb(236, 72, 153)' || 
                  iconColor === '#EC4899';
    }
    
    if (isLiked) {
        btn.classList.remove('liked');
        icon.style.color = 'rgba(255,255,255,0.6)';
        const newLikesCount = Math.max(0, currentLikes - 1);
        likesSpan.textContent = newLikesCount;
        localStorage.setItem(`comment_likes_${commentId}`, String(newLikesCount));
        
        // IMPORTANTE: deleteCommentReaction solo acepta commentId, el backend obtiene userId del token
        const { deleteCommentReaction } = await import('../../APIs/socialApi.js');
        deleteCommentReaction(commentId)
            .then(() => {
                localStorage.removeItem(`like_comment_${commentId}_${currentUserId}`);
                localStorage.removeItem(`reaction_comment_${commentId}_${currentUserId}`);
            })
            .catch(err => {
                // Si el error es 404, significa que la reacción ya no existe (aceptable)
                if (err.response?.status === 404) {
                    console.debug('Reacción de comentario ya no existe en el servidor, limpiando localStorage');
                    localStorage.removeItem(`like_comment_${commentId}_${currentUserId}`);
                    localStorage.removeItem(`reaction_comment_${commentId}_${currentUserId}`);
                } else {
                    // Revertir cambio solo si no es 404
                    btn.classList.add('liked');
                    icon.style.color = 'var(--magenta, #EC4899)';
                    likesSpan.textContent = currentLikes;
                    localStorage.setItem(`comment_likes_${commentId}`, String(currentLikes));
                }
            });
    } else {
        btn.classList.add('liked');
        icon.style.color = 'var(--magenta, #EC4899)';
        const newLikesCount = currentLikes + 1;
        likesSpan.textContent = newLikesCount;
        localStorage.setItem(`comment_likes_${commentId}`, String(newLikesCount));
        localStorage.setItem(`like_comment_${commentId}_${currentUserId}`, 'true');
        
        // IMPORTANTE: addCommentReaction solo acepta commentId, el backend obtiene userId del token
        const { addCommentReaction } = await import('../../APIs/socialApi.js');
        addCommentReaction(commentId)
            .then(data => {
                const reactionId = data?.Id_Reaction || data?.ReactionId || data?.id;
                if (reactionId) {
                    localStorage.setItem(`reaction_comment_${commentId}_${currentUserId}`, String(reactionId));
                }
            })
            .catch(err => {
                console.warn('No se pudo guardar like del comentario en el backend', err);
                // Revertir cambio si falla
                btn.classList.remove('liked');
                icon.style.color = 'rgba(255,255,255,0.6)';
                likesSpan.textContent = currentLikes;
                localStorage.removeItem(`like_comment_${commentId}_${currentUserId}`);
                localStorage.setItem(`comment_likes_${commentId}`, String(currentLikes));
            });
    }
}

/**
 * toggleReviewLikeInDetail - similar estrategia para la review (optimistic + reactionId)
 */
async function toggleReviewLikeInDetail(reviewId, btn) {
    const token = localStorage.getItem('authToken');
    if (!token) return showLoginRequiredModal();
    
    const icon = btn.querySelector('i');
    const span = btn.querySelector('.review-detail-likes-count');
    const isLiked = btn.classList.contains('liked');
    const userId = localStorage.getItem('userId');
    let count = parseInt(span.textContent) || 0;

    btn.style.transform = 'scale(1.12)';
    setTimeout(() => { btn.style.transform = ''; }, 180);

    if (isLiked) {
        // optimistic remove
        btn.classList.remove('liked');
        icon.style.color = 'rgba(255,255,255,0.7)';
        const newCount = Math.max(0, count - 1);
        span.textContent = newCount;
        localStorage.removeItem(`like_${reviewId}_${userId}`);
        localStorage.setItem(`review_likes_${reviewId}`, String(newCount));

        
        try {
            const rId = localStorage.getItem(`reaction_${reviewId}_${userId}`) || null;
            await deleteReviewReaction(reviewId, userId, token, rId);
            if (rId) localStorage.removeItem(`reaction_${reviewId}_${userId}`);
        } catch (e) {
            console.error('Error removing review reaction:', e);
            // rollback
            btn.classList.add('liked');
            icon.style.color = '#EC4899';
            span.textContent = count;
            localStorage.setItem(`like_${reviewId}_${userId}`, 'true');
            localStorage.setItem(`review_likes_${reviewId}`, String(count));
            showAlert('Error al quitar like. Intenta de nuevo.', 'danger');
        }
    } else {
      
        btn.classList.add('liked');
        icon.style.color = '#EC4899';
        const newCount = count + 1;
        span.textContent = newCount;
        localStorage.setItem(`like_${reviewId}_${userId}`, 'true');
        localStorage.setItem(`review_likes_${reviewId}`, String(newCount));

        try {
            const data = await addReviewReaction(reviewId, userId, token);
            const returnedId = data?.Id_Reaction || data?.reactionId || data?.id;
            if (returnedId) localStorage.setItem(`reaction_${reviewId}_${userId}`, String(returnedId));
        } catch (e) {
            console.error('Error adding review reaction:', e);
            btn.classList.remove('liked');
            icon.style.color = 'rgba(255,255,255,0.7)';
            span.textContent = count;
            localStorage.removeItem(`like_${reviewId}_${userId}`);
            localStorage.setItem(`review_likes_${reviewId}`, String(count));
            showAlert('Error al dar like. Intenta de nuevo.', 'danger');
        }
    }
}

async function editCommentInDetail(commentId, reviewId, state) {
    const commentItem = document.querySelector(`.review-detail-comment-item[data-comment-id="${commentId}"]`);
    const commentTextElement = commentItem?.querySelector('.review-detail-comment-text');
    if (!commentItem || !commentTextElement) return;
    if (commentItem.classList.contains('editing')) return;
    
    // Verificar si el comentario tiene likes antes de permitir editar
    try {
        const likeBtn = commentItem.querySelector('.review-detail-comment-like-btn');
        if (likeBtn) {
            const likesCountEl = likeBtn.querySelector('.review-detail-comment-likes-count');
            if (likesCountEl) {
                const likesCount = parseInt(likesCountEl.textContent, 10) || 0;
                if (likesCount > 0) {
                    if (typeof window.showAlert === 'function') {
                        window.showAlert('No se puede editar este comentario porque ya tiene reacciones (likes).', 'warning');
                    } else {
                        alert('No se puede editar este comentario porque ya tiene reacciones (likes).');
                    }
                    return;
                }
            }
        }
    } catch (error) {
        console.warn('Error al verificar likes del comentario:', error);
    }
    
    // Verificar el estado real desde el backend antes de permitir editar
    try {
        const comments = await getCommentsByReview(reviewId);
        const currentComment = comments.find(c => {
            const cId = c.Id_Comment || c.id_Comment || c.IdComment || c.idComment || c.id || c.Id || '';
            return String(cId).trim() === String(commentId).trim();
        });
        
        if (currentComment) {
            const backendLikes = currentComment.Likes || currentComment.likes || currentComment.ReactionCount || currentComment.reactionCount || 0;
            if (backendLikes > 0) {
                // El backend dice que tiene likes, actualizar el DOM y no permitir editar
                const likeBtn = commentItem.querySelector('.review-detail-comment-like-btn');
                if (likeBtn) {
                    const likesCountEl = likeBtn.querySelector('.review-detail-comment-likes-count');
                    if (likesCountEl) {
                        likesCountEl.textContent = backendLikes;
                        const likesCacheKey = `comment_likes_${commentId}`;
                        try {
                            localStorage.setItem(likesCacheKey, String(backendLikes));
                        } catch (e) { /* ignore */ }
                    }
                }
                
                const editBtn = commentItem.querySelector('.comment-edit-btn');
                if (editBtn) {
                    editBtn.style.setProperty('display', 'none', 'important');
                }
                
                if (typeof window.showAlert === 'function') {
                    window.showAlert('No se puede editar este comentario porque ya tiene reacciones (likes).', 'warning');
                } else {
                    alert('No se puede editar este comentario porque ya tiene reacciones (likes).');
                }
                return;
            }
        }
    } catch (error) {
        console.debug('No se pudo verificar estado del comentario desde el backend, continuando con edición:', error);
    }
    
    state.originalCommentText = commentTextElement.textContent.trim();
    state.editingCommentId = commentId;
    
    const textarea = document.createElement('textarea');
    textarea.className = 'comment-text-edit';
    textarea.id = `comment-text-edit-${commentId}`;
    textarea.value = state.originalCommentText;
    textarea.maxLength = 500;
    textarea.rows = 3;
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'comment-edit-buttons';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'comment-edit-action-btn comment-edit-cancel';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', (e) => { e.preventDefault(); cancelEditCommentInDetail(commentId, state); });
    
    const wrapper = item.querySelector('.edit-wrapper');
    if (wrapper) wrapper.remove();
    
    const p = document.getElementById(`comment-text-${commentId}`);
    if (p) p.style.display = 'block';
    
    item.classList.remove('editing');
    modalState.editingCommentId = null;
}

async function confirmEditCommentInDetail(commentId, reviewId) {
    const area = document.getElementById(`edit-area-${commentId}`);
    if (!area) return;

    const newText = area.value.trim();
    if (!newText) return showAlert('El comentario no puede estar vacío', 'warning');

    // Antes de enviar, volvemos a validar que no haya interacciones en DOM (evitar 409)
    const item = document.querySelector(`.review-detail-comment-item[data-comment-id="${commentId}"]`);
    const likesReal = item ? parseInt(item.getAttribute('data-likes') || '0') : 0;
    if (likesReal > 0) {
        cancelEditCommentInDetail(commentId);
        showAlert('No puedes editar este comentario porque ya tiene interacciones.', 'warning');
        return;
    }

    try {
        await updateComment(commentId, newText);
        await loadReviewDetailComments(reviewId, null, state);
        
        // Sincronizar con el modal de comentarios si está abierto
        const commentsModal = document.getElementById('commentsModalOverlay');
        if (commentsModal && commentsModal.style.display === 'flex') {
            const { loadCommentsIntoModal } = await import('./commentsModal.js');
            await loadCommentsIntoModal(reviewId, state);
        }
        
        showAlert('Comentario editado', 'success');
    } catch (e) { 
        if (e.response?.status === 409) {
            showAlert('No se puede editar este comentario porque ya tiene reacciones (likes).', 'warning');
            // Recargar comentarios para sincronizar
            await loadReviewDetailComments(reviewId, null, state);
            const commentsModal = document.getElementById('commentsModalOverlay');
            if (commentsModal && commentsModal.style.display === 'flex') {
                const { loadCommentsIntoModal } = await import('./commentsModal.js');
                await loadCommentsIntoModal(reviewId, state);
            }
        } else {
            showAlert('Error al editar', 'danger');
        }
    }
    state.editingCommentId = null;
}

async function deleteCommentInDetail(commentId, reviewId = null) {
    if (!confirm('¿Eliminar comentario?')) return;
    const token = localStorage.getItem('authToken');

    try {
        await deleteComment(commentId, token);
        const item = document.querySelector(`.review-detail-comment-item[data-comment-id="${commentId}"]`);
        if (item) item.remove();
        
        // Actualizar cache de comentarios
        const commentsCacheKey = `review_comments_${reviewId}`;
        try {
            localStorage.setItem(commentsCacheKey, String(newCommentsCount));
        } catch (e) { /* ignore */ }
        
        // Recargar comentarios en el modal de detalle
        await loadReviewDetailComments(reviewId, comments, state);
        
        // Sincronizar con el modal de comentarios si está abierto
        const commentsModal = document.getElementById('commentsModalOverlay');
        if (commentsModal && commentsModal.style.display === 'flex') {
            const { loadCommentsIntoModal } = await import('./commentsModal.js');
            await loadCommentsIntoModal(reviewId, state);
        }
        
        // Actualizar contador en el botón de comentarios de la reseña (igual que en deleteModals)
        // Buscar en todas las páginas (home, perfil, canciones, álbum)
        const commentBtns = document.querySelectorAll(`.comment-btn[data-review-id="${reviewId}"]`);
        commentBtns.forEach(commentBtn => {
            const countSpan = commentBtn.querySelector('.review-comments-count');
            if (countSpan) {
                countSpan.textContent = newCommentsCount;
            } else {
                // Fallback: buscar cualquier span dentro del botón
                const span = commentBtn.querySelector('span');
                if (span) {
                    span.textContent = newCommentsCount;
                }
            }
        });
        
        // Actualizar contador en el modal de comentarios si está abierto
        const commentsModalOverlay = document.getElementById('commentsModalOverlay');
        if (commentsModalOverlay && commentsModalOverlay.style.display === 'flex') {
            const commentsCount = document.getElementById('commentsCount');
            if (commentsCount) {
                commentsCount.textContent = newCommentsCount;
            }
            // Recargar comentarios en el modal de comentarios
            const { loadCommentsIntoModal } = await import('./commentsModal.js');
            await loadCommentsIntoModal(reviewId, state);
        }
        
        showAlert('Comentario eliminado', 'success');
    } catch (e) {
        console.error(e);
        // Manejo específico si el backend rechaza el borrado
        if (e.response && e.response.status === 409) {
             showAlert('No se puede eliminar el comentario debido a sus interacciones.', 'warning');
        } else {
             showAlert('Error al eliminar. Ver consola.', 'danger');
        }
    }
}

async function submitReviewDetailComment() {
    const modal = document.getElementById('reviewDetailModalOverlay');
    const reviewId = modal.getAttribute('data-review-id');
    const input = document.getElementById('reviewDetailCommentInput');
    const text = input.value.trim();
    
    if (!text) return showAlert('Escribe algo...', 'warning');
    if (!localStorage.getItem('authToken')) return showLoginRequiredModal();
    
    try {
        await createComment(reviewId, text);
        input.value = '';
        await loadReviewDetailComments(reviewId); // Recargar
        showAlert('Comentario enviado', 'success');
    } catch (e) {
        console.error(e);
        showAlert('Error al enviar', 'danger');
    }
}

function hideReviewDetailModal() {
    const modal = document.getElementById('reviewDetailModalOverlay');
    if (modal) modal.style.display = 'none';
}
