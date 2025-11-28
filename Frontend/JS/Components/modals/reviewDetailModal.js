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
        }

        
        await renderMainReviewContent(contentDiv, review, likes, reviewId, userLiked);
        
       
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
    });

    const htmlItems = await Promise.all(htmlPromises);
    list.innerHTML = htmlItems.join('');
}


async function toggleCommentLikeInDetail(commentId, btn, reviewId = null) {
    const token = localStorage.getItem('authToken');
    if (!token) return showLoginRequiredModal();

    const icon = btn.querySelector('i');
    const span = btn.querySelector('.review-detail-comment-likes-count');
    const isLiked = btn.classList.contains('liked');
    const userId = localStorage.getItem('userId');
    const commentItem = document.querySelector(`.review-detail-comment-item[data-comment-id="${commentId}"]`);
    let currentLikes = 0;
    if (commentItem) {
        currentLikes = parseInt(commentItem.getAttribute('data-likes') || '0');
    } else {
        currentLikes = parseInt(span.textContent) || 0;
    }

    const newCount = isLiked ? Math.max(0, currentLikes - 1) : (currentLikes + 1);

    if (isLiked) {
        btn.classList.remove('liked');
        icon.style.color = 'rgba(255,255,255,0.6)';
        localStorage.removeItem(`like_comment_${commentId}_${userId}`);
    } else {
        btn.classList.add('liked');
        icon.style.color = '#EC4899';
        localStorage.setItem(`like_comment_${commentId}_${userId}`, 'true');
    }
    span.textContent = newCount;
    if (commentItem) commentItem.setAttribute('data-likes', String(newCount));

    
    try {
        if (isLiked) {
            
            let rId = localStorage.getItem(`reaction_comment_${commentId}_${userId}`) || commentItem?.getAttribute('data-reaction-id') || null;
            
            await deleteCommentReaction(commentId, userId, token, rId);

            if (rId) localStorage.removeItem(`reaction_comment_${commentId}_${userId}`);
     
            localStorage.removeItem(`like_comment_${commentId}_${userId}`);
        } else {
    
            const data = await addCommentReaction(commentId, userId, token);
            const returnedId = data?.Id_Reaction || data?.reactionId || data?.id;
            if (returnedId) {
                localStorage.setItem(`reaction_comment_${commentId}_${userId}`, String(returnedId));
                if (commentItem) commentItem.setAttribute('data-reaction-id', String(returnedId));
            }
            localStorage.setItem(`like_comment_${commentId}_${userId}`, 'true');
        }
    } catch (e) {
        console.error('Error toggling comment reaction:', e);

        if (isLiked) {
            btn.classList.add('liked');
            icon.style.color = '#EC4899';
            span.textContent = currentLikes;
            if (commentItem) commentItem.setAttribute('data-likes', String(currentLikes));
            localStorage.setItem(`like_comment_${commentId}_${userId}`, 'true');
        } else {
            btn.classList.remove('liked');
            icon.style.color = 'rgba(255,255,255,0.6)';
            span.textContent = currentLikes;
            if (commentItem) commentItem.setAttribute('data-likes', String(currentLikes));
            localStorage.removeItem(`like_comment_${commentId}_${userId}`);
        }
        showAlert('Error al actualizar la reacción. Intenta de nuevo.', 'danger');
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

/**
 * editCommentInDetail - bloquea edición si data-likes > 0 (evita 409 del backend)
 */
function editCommentInDetail(commentId, reviewId = null) {
    const item = document.querySelector(`.review-detail-comment-item[data-comment-id="${commentId}"]`);
    if (!item || item.classList.contains('editing')) return;

    const likesReal = parseInt(item.getAttribute('data-likes') || '0');
    if (likesReal > 0) {
        showAlert('No puedes editar este comentario porque ya tiene interacciones.', 'warning');
        return;
    }

    const p = document.getElementById(`comment-text-${commentId}`);
    if (!p) return;

    modalState.originalCommentText = p.textContent;
    modalState.editingCommentId = commentId;

    const div = document.createElement('div');
    div.className = 'edit-wrapper';
    div.innerHTML = `
        <textarea class="comment-text-edit" id="edit-area-${commentId}" style="width: 100%; background: #333; border: 1px solid #444; color: white; padding: 8px; border-radius: 6px;">${modalState.originalCommentText}</textarea>
        <div class="comment-edit-buttons" style="margin-top: 5px; display: flex; gap: 5px;">
            <button class="comment-edit-action-btn comment-edit-cancel" style="padding: 4px 8px; border-radius: 4px; border: none; background: #555; color: white; cursor: pointer;">Cancelar</button>
            <button class="comment-edit-action-btn comment-edit-confirm" style="padding: 4px 8px; border-radius: 4px; border: none; background: #EC4899; color: white; cursor: pointer;">Guardar</button>
        </div>
    `;

    p.style.display = 'none';
    p.parentNode.insertBefore(div, p.nextSibling);
    item.classList.add('editing');
}

function cancelEditCommentInDetail(commentId) {
    const item = document.querySelector(`.review-detail-comment-item[data-comment-id="${commentId}"]`);
    if (!item) return;
    
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
        const p = document.getElementById(`comment-text-${commentId}`);
        if(p) p.textContent = newText;
        cancelEditCommentInDetail(commentId);
        showAlert('Comentario editado', 'success');
    } catch (e) {
        console.error("Error al editar:", e);
        if (e.response && e.response.status === 409) {
             showAlert('No puedes editar este comentario porque ya tiene interacciones.', 'warning');
        } else {
             showAlert('Error al editar. Ver consola.', 'danger');
        }
    }
}

async function deleteCommentInDetail(commentId, reviewId = null) {
    if (!confirm('¿Eliminar comentario?')) return;
    const token = localStorage.getItem('authToken');

    try {
        await deleteComment(commentId, token);
        const item = document.querySelector(`.review-detail-comment-item[data-comment-id="${commentId}"]`);
        if (item) item.remove();
        
        const countEl = document.getElementById('reviewDetailCommentsCount');
        if (countEl) countEl.textContent = Math.max(0, parseInt(countEl.textContent)-1);
        
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
