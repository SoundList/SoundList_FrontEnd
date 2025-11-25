/**
 * Módulo del modal de comentarios
 * Maneja la visualización, creación y edición de comentarios
 */

import { getCommentsByReview, createComment, updateComment } from '../../APIs/socialApi.js';
import { showAlert } from '../../Utils/reviewHelpers.js';
import { showLoginRequiredModal, formatNotificationTime } from '../../Handlers/headerHandler.js';
// Importaciones dinámicas para evitar dependencias circulares
// import { loadReviewDetailComments } from './reviewDetailModal.js';
// import { showDeleteCommentModal } from './deleteModals.js';

/**
 * Inicializa el modal de comentarios
 * @param {Object} state - Objeto con estado compartido (editingCommentId, originalCommentText, commentsData)
 */
export function initializeCommentsModalLogic(state) {
    const closeCommentsModal = document.getElementById('closeCommentsModal');
    const submitCommentBtn = document.getElementById('submitCommentBtn');
    const commentInput = document.getElementById('commentInput');
    const commentsModalOverlay = document.getElementById('commentsModalOverlay');
    
    if (closeCommentsModal) {
        closeCommentsModal.addEventListener('click', hideCommentsModal);
    }
    if (submitCommentBtn) {
        submitCommentBtn.addEventListener('click', () => submitComment(state));
    }
    if (commentInput) {
        commentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitComment(state);
        });
    }
    if (commentsModalOverlay) {
        commentsModalOverlay.addEventListener('click', (e) => {
            if (e.target === commentsModalOverlay) hideCommentsModal();
        });
    }
}
    
/**
 * Muestra el modal de comentarios
 */
export async function showCommentsModal(reviewId, state) {
    const modal = document.getElementById('commentsModalOverlay');
    if (!modal) return;
    
    modal.setAttribute('data-review-id', reviewId);
    modal.style.display = 'flex';
    
    // Asegurar que el reviewId esté en el state
    if (state) {
        state.currentReviewId = reviewId;
    }
    
    // Actualizar el avatar del input con la foto de perfil del usuario actual
    const avatarImg = document.getElementById('commentsModalAvatar') || 
                     document.querySelector('.comments-input-avatar');
    if (avatarImg) {
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
        avatarImg.src = userAvatar || defaultAvatar;
    }
    
    await loadCommentsIntoModal(reviewId, state);
}

/**
 * Carga los comentarios en el modal
 */
export async function loadCommentsIntoModal(reviewId, state) {
    const commentsList = document.getElementById('commentsList');
    const commentsCount = document.getElementById('commentsCount');
    if (!commentsList || !commentsCount) return;
    
    commentsList.innerHTML = '<div class="comment-empty">Cargando...</div>';
    
    try {
        let comments = await getCommentsByReview(reviewId);
        
        // Enriquecer comentarios con datos de usuario si no tienen username (igual que en profileHandler.js)
        // Usar getUserProfile de userApi que ya está bien implementada, o axios directamente
        const getUserFn = window.userApi?.getUserProfile || (async (userId) => {
            try {
                // Intentar usar getUserProfile de userApi si está disponible
                if (window.userApi && window.userApi.getUserProfile) {
                    return await window.userApi.getUserProfile(userId);
                }
                // Fallback: usar axios directamente con el endpoint correcto
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
        
        commentsCount.textContent = comments.length;
        
        const currentUserIdRaw = localStorage.getItem('userId');
        const currentUserId = currentUserIdRaw ? String(currentUserIdRaw).trim() : null;
        const currentUsername = localStorage.getItem('username') || 'Usuario';
        
        if (comments.length === 0) {
            commentsList.innerHTML = `
                <div class="comment-empty">
                    <i class="fas fa-comment-slash"></i>
                    <p>No hay comentarios aún. ¡Sé el primero en comentar!</p>
                </div>
            `;
        } else {
            commentsList.innerHTML = comments.map(comment => {
                const date = new Date(comment.Created || comment.Created || comment.date);
                const timeAgo = formatNotificationTime(comment.Created || comment.Created || comment.date);
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
                // Usamos una ruta que funcione desde ambos contextos detectando la ubicación
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
                
                if (!commentId || commentId === '' || commentId === 'null' || commentId === 'undefined') {
                    console.error('❌ [DEBUG] commentId inválido o vacío para comentario:', comment);
                    commentId = `temp-comment-${Date.now()}-${Math.random()}`;
                    console.warn('⚠️ [DEBUG] Usando ID temporal:', commentId);
                }
                
                const normalizedCommentUserId = commentUserId ? String(commentUserId).trim() : '';
                const normalizedCurrentUserId = currentUserId ? String(currentUserId).trim() : '';
                
                const isOwnComment = normalizedCurrentUserId && normalizedCommentUserId && 
                    normalizedCommentUserId.toLowerCase() === normalizedCurrentUserId.toLowerCase();
                
                let actionButtons = '';
                if (isOwnComment) {
                    actionButtons = `
                        <div class="comment-actions">
                            <button class="comment-action-btn comment-edit-btn" data-comment-id="${commentId}" title="Editar">
                                <i class="fas fa-pencil"></i>
                            </button>
                            <button class="comment-action-btn comment-delete-btn" data-comment-id="${commentId}" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                } else {
                    actionButtons = '';
                }
                
                // Determinar la ruta del fallback basado en la página actual
                const isProfilePage = window.location.pathname.includes('/Pages/profile.html');
                const fallbackAvatar = isProfilePage ? '../../Assets/default-avatar.png' : '../Assets/default-avatar.png';
                
                return `
                <div class="comment-item" data-comment-id="${commentId}">
                    <div class="comment-avatar">
                        <img src="${userAvatar}" alt="${username}" onerror="this.src='${fallbackAvatar}'">
                    </div>
                    <div class="comment-content">
                        <div class="comment-header">
                            <span class="comment-username">${username}</span>
                        <span class="comment-time">${timeAgo}</span>
                        </div>
                        <p class="comment-text" id="comment-text-${commentId}">${text}</p>
                    <div class="comment-footer">
                            <button class="comment-like-btn ${userLiked ? 'liked' : ''}" 
                                    data-comment-id="${commentId}" 
                                    title="Me gusta">
                                    <i class="fa-solid fa-heart" style="color: ${userLiked ? 'var(--magenta, #EC4899)' : 'rgba(255,255,255,0.6)'};"></i>
                                    <span class="comment-likes-count">${likes}</span>
                                </button>
                                ${actionButtons}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        attachCommentActionListeners(state, reviewId);
    } catch (error) {
        console.error("Error cargando comentarios en modal:", error);
        commentsList.innerHTML = `<div class="comment-empty">Error al cargar comentarios.</div>`;
    }
    
    // Actualizar contador en el botón de comentarios de la reseña
    const commentBtn = document.querySelector(`.comment-btn[data-review-id="${reviewId}"]`);
    if (commentBtn) {
        const countSpan = commentBtn.querySelector('.review-comments-count');
        if (countSpan) {
            const comments = await getCommentsByReview(reviewId);
            countSpan.textContent = comments.length;
        }
    }
}
    
/**
 * Oculta el modal de comentarios
 */
function hideCommentsModal() {
    const modal = document.getElementById('commentsModalOverlay');
    if (modal) modal.style.display = 'none';
}
    
/**
 * Envía un nuevo comentario
 */
async function submitComment(state) {
    const modal = document.getElementById('commentsModalOverlay');
    const reviewId = modal ? modal.getAttribute('data-review-id') : null;
    const commentInput = document.getElementById('commentInput');
    
    if (!reviewId || !commentInput) return;
    
    const commentText = commentInput.value.trim();
    if (!commentText) {
        showAlert('Por favor, escribe un comentario', 'warning');
        return;
    }
    
    try {
        const authToken = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        
        await createComment(reviewId, commentText);
        
        commentInput.value = '';
        // Recargar comentarios para obtener el username del backend
        await loadCommentsIntoModal(reviewId, state);
        
        // Actualizar vista detallada si está abierta
        const reviewDetailModal = document.getElementById('reviewDetailModalOverlay');
        if (reviewDetailModal && reviewDetailModal.style.display === 'flex') {
            const { loadReviewDetailComments } = await import('./reviewDetailModal.js');
            const detailComments = await getCommentsByReview(reviewId);
            await loadReviewDetailComments(reviewId, detailComments, state);
            const commentsCount = document.getElementById('reviewDetailCommentsCount');
            if (commentsCount) commentsCount.textContent = detailComments.length;
        }
        
        showAlert('Comentario agregado exitosamente', 'success');
    } catch (error) {
        console.error('Error agregando comentario:', error);
        showAlert('Error al agregar el comentario', 'danger');
    }
}
    
/**
 * Adjunta listeners a los botones de acción de comentarios
 */
function attachCommentActionListeners(state, reviewId) {
    // Remover listeners anteriores para evitar duplicados
    document.querySelectorAll('.comment-edit-btn[data-listener-attached]').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
    });
    
    document.querySelectorAll('.comment-edit-btn').forEach(btn => {
        // Marcar que ya tiene listener para evitar duplicados
        if (btn.hasAttribute('data-listener-attached')) return;
        btn.setAttribute('data-listener-attached', 'true');
        
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const commentId = this.getAttribute('data-comment-id');
            if (!commentId) {
                console.warn('Botón de editar sin data-comment-id');
                return;
            }
            editComment(commentId, state);
        });
    });
    
    // Remover listeners anteriores para evitar duplicados
    document.querySelectorAll('.comment-delete-btn[data-listener-attached]').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
    });
    
    document.querySelectorAll('.comment-delete-btn').forEach(btn => {
        // Marcar que ya tiene listener para evitar duplicados
        if (btn.hasAttribute('data-listener-attached')) return;
        btn.setAttribute('data-listener-attached', 'true');
        
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            e.preventDefault();
            const commentId = this.getAttribute('data-comment-id');
            if (!commentId) {
                console.warn('Botón de eliminar sin data-comment-id');
                return;
            }
            const { showDeleteCommentModal } = await import('./deleteModals.js');
            // Asegurar que el reviewId esté disponible en el state
            if (reviewId && state) {
                state.currentReviewId = reviewId;
            }
            showDeleteCommentModal(commentId, state);
        });
    });
    
    // Remover listeners anteriores para evitar duplicados
    document.querySelectorAll('.comment-like-btn[data-listener-attached]').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
    });
    
    document.querySelectorAll('.comment-like-btn').forEach(btn => {
        // Marcar que ya tiene listener para evitar duplicados
        if (btn.hasAttribute('data-listener-attached')) return;
        btn.setAttribute('data-listener-attached', 'true');
        
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const commentId = this.getAttribute('data-comment-id');
            if (!commentId) {
                console.warn('Botón de like sin data-comment-id');
                return;
            }
            toggleCommentLike(commentId, this);
        });
    });
}
    
/**
 * Alterna el like de un comentario
 */
async function toggleCommentLike(commentId, btn) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) { return showLoginRequiredModal(); }
    
    const icon = btn.querySelector('i');
    const likesSpan = btn.querySelector('.comment-likes-count');
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
 * Inicia la edición de un comentario
 */
function editComment(commentId, state) {
    showEditCommentModal(commentId, state);
}

/**
 * Muestra el modal de edición de comentario
 */
function showEditCommentModal(commentId, state) {
    if (!commentId || !state) {
        console.error('showEditCommentModal: commentId o state no está definido', { commentId, state });
        return;
    }
    
    // Verificar si ya hay otro comentario en edición
    if (state.editingCommentId && state.editingCommentId !== commentId) {
        const currentlyEditing = document.querySelector(`.comment-item[data-comment-id="${state.editingCommentId}"]`);
        if (currentlyEditing && currentlyEditing.classList.contains('editing')) {
            if (typeof window.showAlert === 'function') {
                window.showAlert('Termina de editar el otro comentario primero.', 'warning');
            } else {
                alert('Termina de editar el otro comentario primero.');
            }
            return;
        }
    }
    
    const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
    const commentTextElement = document.getElementById(`comment-text-${commentId}`);
    
    if (!commentItem) {
        console.error(`No se encontró commentItem con ID: ${commentId}`);
        return;
    }
    
    if (!commentTextElement) {
        console.error(`No se encontró commentTextElement con ID: comment-text-${commentId}`);
        return;
    }
    
    if (commentItem.classList.contains('editing')) {
        console.warn(`El comentario ${commentId} ya está en modo edición`);
        return;
    }
    
    // Verificar si el comentario tiene likes antes de permitir editar
    try {
        const likeBtn = commentItem.querySelector('.comment-like-btn');
        if (likeBtn) {
            const likesCountEl = likeBtn.querySelector('.comment-likes-count');
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
        // Continuar con la edición si no se puede verificar
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
    cancelBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        cancelEditComment(commentId, state);
    });
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'comment-edit-action-btn comment-edit-confirm';
    confirmBtn.textContent = 'Confirmar';
    confirmBtn.type = 'button';
    confirmBtn.setAttribute('data-comment-id', commentId);
    confirmBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        confirmEditComment(commentId, state);
    });
    
    buttonsContainer.appendChild(cancelBtn);
    buttonsContainer.appendChild(confirmBtn);
    
    commentTextElement.replaceWith(textarea);
    textarea.parentNode.insertBefore(buttonsContainer, textarea.nextSibling);
        
    commentItem.classList.add('editing');

state.originalCommentText = commentTextElement.textContent.trim();
state.editingCommentId = commentId;

function handleClickOutside(e) {
    // Si se hizo clic dentro del comentario en edición, no cancelar
    if (commentItem.contains(e.target)) return;

    commentItem.classList.remove('editing');
    commentTextElement.textContent = state.originalCommentText;

    state.editingCommentId = null;
    state.originalCommentText = null;

    document.removeEventListener('click', handleClickOutside);
}

setTimeout(() => {
    document.addEventListener('click', handleClickOutside);
});

    const commentFooter = commentItem.querySelector('.comment-footer');
    if (commentFooter) commentFooter.style.display = 'none';
    
    setTimeout(() => textarea.focus(), 10);
}
    
/**
 * Cancela la edición de un comentario
 */
function cancelEditComment(commentId, state) {
    if (!commentId || !state) {
        console.error('cancelEditComment: commentId o state no está definido', { commentId, state });
        return;
    }
    
    const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
    if (!commentItem) {
        console.warn(`No se encontró commentItem con ID: ${commentId} para cancelar edición`);
        // Limpiar el estado de todas formas
        if (state) {
            state.editingCommentId = null;
            state.originalCommentText = null;
        }
        return;
    }
    
    const textarea = document.getElementById(`comment-text-edit-${commentId}`);
    const buttonsContainer = commentItem.querySelector('.comment-edit-buttons');
    const commentFooter = commentItem.querySelector('.comment-footer');
    
    if (textarea) {
        const commentTextElement = document.createElement('p');
        commentTextElement.className = 'comment-text';
        commentTextElement.id = `comment-text-${commentId}`;
        commentTextElement.textContent = state.originalCommentText || '';
        textarea.replaceWith(commentTextElement);
    }
    
    if (buttonsContainer) buttonsContainer.remove();
    if (commentFooter) commentFooter.style.display = 'flex';
    
    commentItem.classList.remove('editing');
    
    // Limpiar el estado solo si este comentario es el que está en edición
    if (state.editingCommentId === commentId) {
        state.editingCommentId = null;
        state.originalCommentText = null;
    }
}
    
/**
 * Confirma la edición de un comentario
 */
async function confirmEditComment(commentId, state) {
    if (!commentId) {
        commentId = state.editingCommentId;
    }
    if (!commentId) {
        showAlert('Error: No se pudo identificar el comentario a editar', 'danger');
        return;
    }
    
    const modal = document.getElementById('commentsModalOverlay');
    const reviewId = modal ? modal.getAttribute('data-review-id') : null;
    const textarea = document.getElementById(`comment-text-edit-${commentId}`);
    
    if (!reviewId || !textarea) {
        showAlert('Error: No se pudo encontrar la reseña o el campo de edición', 'danger');
        return;
    }
    
    const newText = textarea.value.trim();
    if (!newText) {
        showAlert('El comentario no puede estar vacío', 'warning');
        return;
    }
    
    try {
        await updateCommentInData(reviewId, commentId, newText, state);
        await loadCommentsIntoModal(reviewId, state);
        
        const reviewDetailModal = document.getElementById('reviewDetailModalOverlay');
        if (reviewDetailModal && reviewDetailModal.style.display === 'flex') {
            const { loadReviewDetailComments } = await import('./reviewDetailModal.js');
            await loadReviewDetailComments(reviewId, null, state);
        }
        
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
        
        // Revertir el estado de edición si falla
        const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
        if (commentItem && commentItem.classList.contains('editing')) {
            cancelEditComment(commentId, state);
        }
    }
    
    state.editingCommentId = null;
    state.originalCommentText = null;
}
    
/**
 * Actualiza un comentario en los datos
 */
async function updateCommentInData(reviewId, commentId, newText, state) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        console.error('No hay token para actualizar comentario');
        throw new Error("No autenticado");
    }
    
    if (authToken.startsWith('dev-token-')) {
        if (state.commentsData && state.commentsData[reviewId]) {
            const comment = state.commentsData[reviewId].find(c => (c.Id_Comment || c.id) === commentId);
            if (comment) {
                comment.Text = newText;
                comment.Updated = new Date().toISOString();
            }
            return;
        }
    }
    
    // updateComment solo acepta commentId y newText, el authToken se obtiene internamente
    await updateComment(commentId, newText);
}

