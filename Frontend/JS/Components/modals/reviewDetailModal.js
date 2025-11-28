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
        
        const contentName = contentType === 'song' ? songName : albumName;
        const contentLabel = contentType === 'song' ? 'Canción' : 'Álbum';

        // --- CONSTRUCCIÓN DE URL DE NAVEGACIÓN ---
        let navUrl = 'javascript:void(0)'; // Default safe URL
        let cursorStyle = 'default';
        
        if (contentApiId) {
                cursorStyle = 'pointer';
                
                // CORRECCIÓN: Usamos ruta absoluta desde la raíz (/Frontend/HTML/)
                // Esto evita que falle si estamos dentro de /Pages/ (como en profile.html)
                if (contentType === 'album') {
                    navUrl = `/Frontend/HTML/album.html?id=${contentApiId}`;
                } else {
                    navUrl = `/Frontend/HTML/song.html?id=${contentApiId}`;
                }
        } else {
            console.warn("⚠️ No se encontró ID para redirigir al contenido.");
        }

        // --- RESTO DE DATOS ---
        const reviewTitle = review.Title || review.title || '';
        const reviewContent = review.Content || review.content || '';
        const reviewRating = review.Rating || review.rating || 0;
        
        // --- FIX FECHAS: Búsqueda exhaustiva de la propiedad de fecha ---
        // --- FIX FECHAS V5: MANEJO DE "FECHA NULA" (0001-01-01) ---
        
        // 1. Buscamos cualquier rastro de fecha
        const rawDate = review.CreatedAt || review.Created || review.createdAt || review.created || 
                       review.Date || review.date || review.DateCreated || review.dateCreated || 
                       review.createdDate || review.CreatedDate;
        
        let createdAtDate = null;

        // 2. Intentamos parsear si existe
        if (rawDate) {
            const parsed = new Date(rawDate);
            // Solo aceptamos fechas mayores al año 2000. 
            // El año 0001 (backend default) y 1970 (unix 0) quedan descartados.
            if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) {
                createdAtDate = parsed;
            }
        }

        // 3. Fallback a caché local (por si el feed la tenía bien)
        if (!createdAtDate) {
            const normalizedId = String(reviewId).trim();
            const cachedTimestamp = localStorage.getItem(`review_created_at_${normalizedId}`);
            if (cachedTimestamp) {
                const ts = parseInt(cachedTimestamp, 10);
                if (!isNaN(ts) && ts > 0) {
                    createdAtDate = new Date(ts);
                }
            }
        }

        // 4. GENERACIÓN DEL STRING DE TIEMPO
        // Si después de todo createdAtDate sigue siendo null, significa que la fecha PERDIDA.
        // No usamos "new Date()" (Ahora) para no mentir. Dejamos string vacío.
        let timeAgo = ""; 
        
        if (createdAtDate) {
            timeAgo = typeof formatNotificationTime === 'function' 
                ? formatNotificationTime(createdAtDate) 
                : createdAtDate.toLocaleDateString();
        }
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
        
        attachReviewDetailCommentListeners(reviewId, state);
    } catch (error) {
        console.error('Error comentarios:', error);
    }
}

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
}

async function toggleCommentLikeInDetail(commentId, btn, reviewId) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return showLoginRequiredModal();
    
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

async function deleteCommentInDetail(commentId, reviewId, state) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return showLoginRequiredModal();
    if (!confirm('¿Eliminar comentario?')) return;
    
    try {
        const { deleteComment } = await import('../../APIs/socialApi.js');
        await deleteComment(commentId, authToken);
        
        // Obtener el nuevo número de comentarios
        const comments = await getCommentsByReview(reviewId);
        const newCommentsCount = comments.length;
        
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
        console.error('Error al eliminar:', e);
        showAlert('Error al eliminar', 'danger'); 
    }
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
        
        // Obtener el nuevo número de comentarios
        const comments = await getCommentsByReview(reviewId);
        const newCommentsCount = comments.length;
        
        // Recargar comentarios en el modal de detalle
        await loadReviewDetailComments(reviewId, comments, state);
        
        // Actualizar contador en el botón de comentarios de la reseña (igual que en commentsModal)
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
        const commentsModal = document.getElementById('commentsModalOverlay');
        if (commentsModal && commentsModal.style.display === 'flex') {
            const commentsCount = document.getElementById('commentsCount');
            if (commentsCount) {
                commentsCount.textContent = newCommentsCount;
            }
        }
        
        showAlert('Comentario agregado', 'success');
    } catch (e) { 
        console.error('Error al comentar:', e);
        showAlert('Error al comentar', 'danger'); 
    }
}

function hideReviewDetailModal() {
    const modal = document.getElementById('reviewDetailModalOverlay');
    if (modal) modal.style.display = 'none';
}