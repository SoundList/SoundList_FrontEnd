/**
 * Módulo del modal de vista detallada de reseña
 * Maneja la visualización detallada de reseñas y sus comentarios
 */

import { getReviews, getCommentsByReview, getReviewReactionCount, createComment, updateComment, getUser, addReviewReaction, deleteReviewReaction } from '../../APIs/socialApi.js';
import { renderStars, showAlert } from '../../Utils/reviewHelpers.js';
import { showLoginRequiredModal, formatNotificationTime } from '../../Handlers/headerHandler.js';

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

export async function showReviewDetailModal(reviewId, state = null) {
    if (!state) {
        state = { editingCommentId: null, originalCommentText: null };
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
            getReviews().catch(() => []), 
            getCommentsByReview(reviewId).catch(() => []),
            getReviewReactionCount(reviewId).catch(() => 0)
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
            if (contentDiv) contentDiv.innerHTML = '<div class="review-detail-loading" style="color: #ff6b6b;">No se pudo cargar la reseña.</div>';
            return;
        }
        
        let username = 'Usuario'; // Mantener "Usuario" genérico, el badge indicará si está eliminado
        let avatar = '../Assets/default-avatar.png';
        const reviewUserId = review.UserId || review.userId;

        if (reviewUserId) {
            try {
                const userData = await getUser(reviewUserId);
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
        
        const userProfileUrl = `profile.html?userId=${reviewUserId}`;

        // --- DATOS DE CONTENIDO (MÚSICA) ---
        const storageKey = `review_content_${reviewId}`;
        const storedContentData = localStorage.getItem(storageKey);
        let contentData = null;
        if (storedContentData) {
            try { contentData = JSON.parse(storedContentData); } catch (e) {}
        }
        
        let songName = 'Canción', albumName = 'Álbum', artistName = 'Artista';
        let contentType = 'song'; 
        let contentImage = '../Assets/default-avatar.png';
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
        
        const contentName = contentType === 'song' ? songName : albumName;
        const contentLabel = contentType === 'song' ? 'Canción' : 'Álbum';

        // --- CONSTRUCCIÓN DE URL DE NAVEGACIÓN ---
        let navUrl = 'javascript:void(0)'; // Default safe URL
        let cursorStyle = 'default';
        
        if (contentApiId) {
             cursorStyle = 'pointer';
             // Usamos ruta relativa ./ para mayor compatibilidad
             if (contentType === 'album') {
                 navUrl = `./album.html?id=${contentApiId}`;
             } else {
                 navUrl = `./song.html?id=${contentApiId}`;
             }
        } else {
            console.warn("⚠️ No se encontró ID para redirigir al contenido.");
        }

        // --- RESTO DE DATOS ---
        const reviewTitle = review.Title || review.title || '';
        const reviewContent = review.Content || review.content || '';
        const reviewRating = review.Rating || review.rating || 0;
        const createdAt = review.CreatedAt || review.Created || review.createdAt || review.created || review.date || new Date();
        const timeAgo = formatNotificationTime(createdAt);
        
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
                             onerror="this.src='../Assets/default-avatar.png'">
                        
                        <div class="review-detail-user-info">
                            <span class="review-detail-username clickable-user"
                                  onclick="window.location.href='${userProfileUrl}'">
                                ${username}
                            </span>
                            <span class="review-detail-time">${timeAgo}</span>
                        </div>
                    </div>

                    <a href="${navUrl}" class="modal-music-pill" style="cursor: ${cursorStyle}; text-decoration: none; color: inherit; display: flex; align-items: center;">
                        <img src="${contentImage}" class="modal-music-cover" onerror="this.src='../Assets/default-avatar.png'">
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
                        <button class="review-detail-interaction-btn ${userLiked ? 'liked' : ''}" 
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
        
        const likeBtn = document.getElementById('reviewDetailLikeBtn');
        if (likeBtn) {
            likeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (!localStorage.getItem('authToken')) return showLoginRequiredModal();
                toggleReviewLikeInDetail(reviewId, this);
            });
        }
        
    } catch (error) {
        console.error('Error cargando vista detallada:', error);
        if (contentDiv) contentDiv.innerHTML = '<div class="review-detail-loading">Error al cargar.</div>';
    }
}

export async function loadReviewDetailComments(reviewId, comments, state) {
    const commentsList = document.getElementById('reviewDetailCommentsList');
    const commentsCountEl = document.getElementById('reviewDetailCommentsCount');
    if (!commentsList) return;
    
    try {
        if (!comments) comments = await getCommentsByReview(reviewId);
        
        // Enriquecer con usuarios
        const getUserFn = window.socialApi?.getUser || getUser;
        comments = await Promise.all(comments.map(async (comment) => {
            // Buscamos ID para enriquecer
            const userId = comment.IdUser || comment.idUser || comment.UserId || comment.userId || comment.Id_User;
            
            if (userId && !comment.username) {
                try {
                    const userData = await getUserFn(userId);
                    if (userData) {
                        // Devolvemos el comentario con datos de usuario y EL ID NORMALIZADO 'userId'
                        return { 
                            ...comment, 
                            username: userData.username || 'Usuario', 
                            avatar: userData.imgProfile || userData.image,
                            userId: userId // Guardamos el ID encontrado en una propiedad estándar
                        };
                    }
                } catch (e) {}
            }
            // Si no se enriqueció, aseguramos que tenga la propiedad userId seteada
            if (!comment.userId && userId) comment.userId = userId;
            return comment;
        }));
        
        if (commentsCountEl) commentsCountEl.textContent = comments.length;
        const currentUserId = localStorage.getItem('userId');
        
        if (comments.length === 0) {
            commentsList.innerHTML = `<div class="review-detail-comment-empty"><p>No hay comentarios aún.</p></div>`;
        } else {
            commentsList.innerHTML = comments.map(comment => {
                const dateRaw = comment.Created || comment.CreatedAt || comment.created || comment.createdAt || comment.date;
                const timeAgo = formatNotificationTime(dateRaw);
                const username = comment.username || comment.UserName || 'Usuario';
                const text = comment.Text || comment.text || '';
                const commentId = comment.Id_Comment || comment.id || '';
                
                // --- CORRECCIÓN CRÍTICA: EXTRACCIÓN ROBUSTA DEL ID DE USUARIO ---
                // Buscamos en todas las variantes posibles para que nunca sea undefined
                const commentUserId = comment.userId || comment.UserId || comment.IdUser || comment.idUser || comment.Id_User;

                const avatar = comment.avatar || comment.UserProfilePicUrl || '../Assets/default-avatar.png';
                
                // Link al perfil con ruta absoluta
                // Si por alguna razón sigue siendo undefined, ponemos # para no romper la URL
                const profileUrl = commentUserId ? `/Frontend/HTML/Pages/profile.html?userId=${commentUserId}` : '#';

                const likes = comment.Likes || 0;
                let userLiked = false;
                if (currentUserId) {
                    userLiked = localStorage.getItem(`like_comment_${commentId}_${currentUserId}`) === 'true';
                }

                // Comparación de Strings para asegurar que coincida aunque uno sea número y otro texto
                const isOwnComment = currentUserId && commentUserId && String(commentUserId).trim() === String(currentUserId).trim();
                
                let actionButtons = isOwnComment ? `
                    <div class="review-detail-comment-actions">
                        <button class="review-detail-comment-action-btn comment-edit-btn" data-comment-id="${commentId}"><i class="fas fa-pencil"></i></button>
                        <button class="review-detail-comment-action-btn comment-delete-btn" data-comment-id="${commentId}"><i class="fas fa-trash"></i></button>
                    </div>` : '';

                return `
                    <div class="review-detail-comment-item" data-comment-id="${commentId}">
                        <img src="${avatar}" class="review-detail-comment-avatar clickable-user" 
                             onclick="window.location.href='${profileUrl}'"
                             onerror="this.src='../Assets/default-avatar.png'">
                        
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
                                <button class="review-detail-comment-like-btn ${userLiked ? 'liked' : ''}" data-comment-id="${commentId}">
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
        console.error('Error comentarios:', error);
    }
}

function attachReviewDetailCommentListeners(reviewId, state) {
    document.querySelectorAll('.review-detail-comment-like-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            const commentId = this.getAttribute('data-comment-id');
            if (commentId) toggleCommentLikeInDetail(commentId, this, reviewId);
        });
    });

    document.querySelectorAll('.review-detail-comment-item .comment-edit-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            const commentId = this.getAttribute('data-comment-id');
            if (commentId) editCommentInDetail(commentId, reviewId, state);
        });
    });
    document.querySelectorAll('.review-detail-comment-item .comment-delete-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            const commentId = this.getAttribute('data-comment-id');
            if (commentId) deleteCommentInDetail(commentId, reviewId, state);
        });
    });
}

async function toggleCommentLikeInDetail(commentId, btn, reviewId) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return showLoginRequiredModal();
    
    const icon = btn.querySelector('i');
    const likesSpan = btn.querySelector('.review-detail-comment-likes-count');
    const isLiked = btn.classList.contains('liked');
    const currentLikes = parseInt(likesSpan.textContent) || 0;
    const currentUserId = localStorage.getItem('userId');
    
    if (isLiked) {
        btn.classList.remove('liked');
        icon.style.color = 'rgba(255,255,255,0.6)';
        likesSpan.textContent = Math.max(0, currentLikes - 1);
        localStorage.setItem(`comment_likes_${commentId}`, String(Math.max(0, currentLikes - 1)));
        
        const { deleteCommentReaction } = await import('../../APIs/socialApi.js');
        deleteCommentReaction(commentId, currentUserId, authToken).then(() => {
            localStorage.removeItem(`like_comment_${commentId}_${currentUserId}`);
        });
    } else {
        btn.classList.add('liked');
        icon.style.color = 'var(--magenta, #EC4899)';
        likesSpan.textContent = currentLikes + 1;
        localStorage.setItem(`comment_likes_${commentId}`, String(currentLikes + 1));
        
        const { addCommentReaction } = await import('../../APIs/socialApi.js');
        addCommentReaction(commentId, currentUserId, authToken).then(() => {
            localStorage.setItem(`like_comment_${commentId}_${currentUserId}`, 'true');
        });
    }
}

async function toggleReviewLikeInDetail(reviewId, btn) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return showLoginRequiredModal();
    
    const icon = btn.querySelector('i');
    const likesSpan = btn.querySelector('.review-detail-likes-count');
    const isLiked = btn.classList.contains('liked');
    const currentLikes = parseInt(likesSpan.textContent) || 0;
    const currentUserId = localStorage.getItem('userId');

    btn.style.transform = 'scale(1.2)';
    setTimeout(() => { btn.style.transform = ''; }, 200);
    
    if (isLiked) {
        btn.classList.remove('liked');
        icon.style.color = 'rgba(255,255,255,0.7)';
        likesSpan.textContent = Math.max(0, currentLikes - 1);
        
        localStorage.removeItem(`like_${reviewId}_${currentUserId}`);
        localStorage.setItem(`review_likes_${reviewId}`, String(Math.max(0, currentLikes - 1)));
        
        try {
            const reactionId = localStorage.getItem(`reaction_${reviewId}_${currentUserId}`);
            await deleteReviewReaction(reviewId, currentUserId, authToken, reactionId);
            localStorage.removeItem(`reaction_${reviewId}_${currentUserId}`);
        } catch(e) { console.warn(e); }

    } else {
        btn.classList.add('liked');
        icon.style.color = 'var(--magenta, #EC4899)';
        likesSpan.textContent = currentLikes + 1;
        
        localStorage.setItem(`like_${reviewId}_${currentUserId}`, 'true');
        localStorage.setItem(`review_likes_${reviewId}`, String(currentLikes + 1));

        try {
            const data = await addReviewReaction(reviewId, currentUserId, authToken);
            if (data?.Id_Reaction) {
                localStorage.setItem(`reaction_${reviewId}_${currentUserId}`, data.Id_Reaction);
            }
        } catch(e) { console.warn(e); }
    }
}

function editCommentInDetail(commentId, reviewId, state) {
    const commentItem = document.querySelector(`.review-detail-comment-item[data-comment-id="${commentId}"]`);
    const commentTextElement = commentItem?.querySelector('.review-detail-comment-text');
    if (!commentItem || !commentTextElement) return;
    if (commentItem.classList.contains('editing')) return;
    
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
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'comment-edit-action-btn comment-edit-confirm';
    confirmBtn.textContent = 'Confirmar';
    confirmBtn.addEventListener('click', (e) => { e.preventDefault(); confirmEditCommentInDetail(commentId, reviewId, state); });
    
    buttonsContainer.appendChild(cancelBtn);
    buttonsContainer.appendChild(confirmBtn);
    
    commentTextElement.replaceWith(textarea);
    textarea.parentNode.insertBefore(buttonsContainer, textarea.nextSibling);
    commentItem.classList.add('editing');
}

function cancelEditCommentInDetail(commentId, state) {
    const commentItem = document.querySelector(`.review-detail-comment-item[data-comment-id="${commentId}"]`);
    if (!commentItem) return;
    const textarea = document.getElementById(`comment-text-edit-${commentId}`);
    const buttonsContainer = commentItem.querySelector('.comment-edit-buttons');
    
    if (textarea) {
        const p = document.createElement('p');
        p.className = 'review-detail-comment-text';
        p.textContent = state.originalCommentText;
        textarea.replaceWith(p);
    }
    if (buttonsContainer) buttonsContainer.remove();
    commentItem.classList.remove('editing');
    state.editingCommentId = null;
}

async function confirmEditCommentInDetail(commentId, reviewId, state) {
    const textarea = document.getElementById(`comment-text-edit-${commentId}`);
    if (!textarea) return;
    const newText = textarea.value.trim();
    if (!newText) return showAlert('El comentario no puede estar vacío', 'warning');
    
    try {
        await updateComment(commentId, newText);
        await loadReviewDetailComments(reviewId, null, state);
        showAlert('Comentario editado', 'success');
    } catch (e) { showAlert('Error al editar', 'danger'); }
    state.editingCommentId = null;
}

async function deleteCommentInDetail(commentId, reviewId, state) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return showLoginRequiredModal();
    if (!confirm('¿Eliminar comentario?')) return;
    
    try {
        const { deleteComment } = await import('../../APIs/socialApi.js');
        await deleteComment(commentId, authToken);
        await loadReviewDetailComments(reviewId, null, state);
        showAlert('Comentario eliminado', 'success');
    } catch (e) { showAlert('Error al eliminar', 'danger'); }
}

async function submitReviewDetailComment(state) {
    const modal = document.getElementById('reviewDetailModalOverlay');
    const reviewId = modal.getAttribute('data-review-id');
    const input = document.getElementById('reviewDetailCommentInput');
    const text = input.value.trim();
    
    if (!text) return showAlert('Escribe un comentario', 'warning');
    if (!localStorage.getItem('authToken')) return showLoginRequiredModal();
    
    try {
        await createComment(reviewId, text);
        input.value = '';
        await loadReviewDetailComments(reviewId, null, state);
        showAlert('Comentario agregado', 'success');
    } catch (e) { showAlert('Error al comentar', 'danger'); }
}

function hideReviewDetailModal() {
    const modal = document.getElementById('reviewDetailModalOverlay');
    if (modal) modal.style.display = 'none';
}