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
        
        let username = `Usuario ${String(review.UserId || review.userId || '').substring(0, 8)}`;
        let avatar = '../Assets/default-avatar.png';
        
        if (review.UserId || review.userId) {
            try {
                const userId = review.UserId || review.userId;
                const userData = await getUser(userId);
                if (userData) {
                    username = userData.Username || userData.username || username;
                    avatar = userData.imgProfile || userData.ImgProfile || avatar;
                }
            } catch (userError) {
                console.debug(`No se pudo obtener usuario ${review.UserId || review.userId}`);
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
                        <img src="${avatar}" alt="${username}" class="review-detail-avatar" onerror="this.src='../Assets/default-avatar.png'">
                        <div class="review-detail-user-info">
                            <span class="review-detail-username">${username}</span>
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
        
        await loadReviewDetailComments(reviewId, comments, state);
        
        const likeBtn = document.getElementById('reviewDetailLikeBtn');
        if (likeBtn) {
            likeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (!localStorage.getItem('authToken')) return showLoginRequiredModal();
                toggleReviewLikeInDetail(reviewId, this);
            });
        }
        
        const inputAvatar = document.getElementById('reviewDetailInputAvatar');
        if (inputAvatar) {
            inputAvatar.src = localStorage.getItem('userAvatar') || '../Assets/default-avatar.png';
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
                const timeAgo = formatNotificationTime(comment.Created || comment.Created || comment.date);
                const username = comment.UserName || comment.username || 'Usuario';
                const text = comment.Text || comment.text || '';
                let commentId = comment.Id_Comment || comment.id_Comment || comment.IdComment || comment.idComment || comment.id || comment.Id || '';
                if (commentId) {
                    commentId = String(commentId).trim();
                }
                const commentUserId = comment.IdUser || comment.idUser || comment.Id_User || comment.id_user || comment.userId || '';
                const likes = comment.Likes || comment.likes || 0;
                const userLiked = comment.userLiked || false;
                
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
                        <img src="../Assets/default-avatar.png" alt="${username}" class="review-detail-comment-avatar" onerror="this.src='../Assets/default-avatar.png'">
                        <div class="review-detail-comment-content">
                            <div class="review-detail-comment-header">
                                <span class="review-detail-comment-username">${username}</span>
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
        
        attachReviewDetailCommentListeners(reviewId, state);
    } catch (error) {
        console.error('Error cargando comentarios en vista detallada:', error);
        commentsList.innerHTML = '<div class="review-detail-comment-empty">Error al cargar comentarios.</div>';
    }
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
    
    if (isLiked) {
        btn.classList.remove('liked');
        icon.style.color = 'rgba(255,255,255,0.6)';
        likesSpan.textContent = Math.max(0, currentLikes - 1);
    } else {
        btn.classList.add('liked');
        icon.style.color = 'var(--magenta, #EC4899)';
        likesSpan.textContent = currentLikes + 1;
    }
    
    if (authToken.startsWith('dev-token-')) {
        console.log('Like en comentario simulado (vista detallada):', commentId);
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
        await updateComment(commentId, newText, authToken);
        
        await loadReviewDetailComments(reviewId, null, state);
        
        showAlert('Comentario editado exitosamente', 'success');
    } catch (error) {
        console.error('❌ Error al actualizar comentario:', error);
        showAlert('Error al actualizar el comentario. Por favor, intenta nuevamente.', 'danger');
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
    
    if (isLiked) {
        btn.classList.remove('liked');
        icon.style.color = 'rgba(255,255,255,0.7)';
        const currentLikes = parseInt(likesSpan.textContent) || 0;
        likesSpan.textContent = Math.max(0, currentLikes - 1);
        
        const reactionId = localStorage.getItem(`reaction_${reviewId}_${userId}`);
        try {
            await deleteReviewReaction(reviewId, userId, authToken, reactionId);
            localStorage.removeItem(`like_${reviewId}_${userId}`);
            localStorage.removeItem(`reaction_${reviewId}_${userId}`);
        } catch (err) {
            console.warn('No se pudo eliminar like del backend', err);
        }
    } else {
        btn.classList.add('liked');
        icon.style.color = 'var(--magenta, #EC4899)';
        const currentLikes = parseInt(likesSpan.textContent) || 0;
        likesSpan.textContent = currentLikes + 1;
        
        localStorage.setItem(`like_${reviewId}_${userId}`, 'true');
        try {
            const data = await addReviewReaction(reviewId, userId, authToken);
            const reactionId = data?.Id_Reaction || data?.ReactionId || data?.id;
            if (reactionId) {
                localStorage.setItem(`reaction_${reviewId}_${userId}`, reactionId);
            }
        } catch (err) {
            console.warn('No se pudo guardar like en el backend', err);
        }
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
        
        await createComment(reviewId, commentText, userId, authToken);
        
        commentInput.value = '';
        await loadReviewDetailComments(reviewId, null, state);
        
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

