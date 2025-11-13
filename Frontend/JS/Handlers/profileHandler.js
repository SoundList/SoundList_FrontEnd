// --- IMPORTS ---
import { API_BASE_URL } from '../APIs/configApi.js';
import {
    getReviews,
    getCommentsByReview,
    getReviewReactionCount,
    addReviewReaction,
    deleteReviewReaction,
    getUser,
    updateReview,
    deleteReview
} from '../APIs/socialApi.js';
import {
    getSongByApiId,
    getAlbumByApiId
} from '../APIs/contentApi.js';
import { showLoginRequiredModal } from './headerHandler.js';

// Variable global para almacenar el userId del perfil que se está viendo
let profileUserId = null;

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
    const sortedReviews = [...reviews].sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB - dateA;
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

        const isLiked = review.userLiked || false;
        const likeCount = review.likes || 0;
        const commentCount = review.comments || 0;

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
                                        title="Editar reseña">
                                    <i class="fas fa-pencil"></i>
                            </button>
                            <button class="review-btn btn-delete"  
                                        data-review-id="${reviewId}"
                                        title="Eliminar reseña">
                                    <i class="fas fa-trash"></i>
                            </button>
                            ` : isLoggedIn ? `
                            <button class="review-btn btn-report"  
                                        data-review-id="${reviewId}"
                                        title="Reportar reseña">
                                    <i class="fas fa-flag"></i>
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
    // Likes
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
            const isLiked = this.classList.contains('liked');
            const reviewId = this.getAttribute('data-review-id');
            const currentUserId = localStorage.getItem('userId');

            this.style.transform = 'scale(1.2)';
            setTimeout(() => { this.style.transform = ''; }, 200);

            if (isLiked) {
                this.classList.remove('liked');
                icon.style.color = 'rgba(255,255,255,0.7)';
                const currentLikes = parseInt(likesSpan.textContent);
                likesSpan.textContent = Math.max(0, currentLikes - 1);
                
                const reactionId = localStorage.getItem(`reaction_${reviewId}_${currentUserId}`);
                deleteReviewReaction(reviewId, currentUserId, authToken, reactionId)
                    .then(() => localStorage.removeItem(`like_${reviewId}_${currentUserId}`))
                    .catch(err => console.warn('No se pudo eliminar like:', err));
            } else {
                this.classList.add('liked');
                icon.style.color = 'var(--magenta, #EC4899)';
                const currentLikes = parseInt(likesSpan.textContent) || 0;
                likesSpan.textContent = currentLikes + 1;
                
                localStorage.setItem(`like_${reviewId}_${currentUserId}`, 'true');
                addReviewReaction(reviewId, currentUserId, authToken)
                    .then(data => {
                        const reactionId = data?.Id_Reaction || data?.ReactionId || data?.id;
                        if (reactionId) {
                            localStorage.setItem(`reaction_${reviewId}_${currentUserId}`, reactionId);
                        }
                    })
                    .catch(err => console.warn('No se pudo guardar like:', err));
            }
        });
    });

    // Editar (solo si es tu propio perfil)
    if (isOwnProfile) {
        container.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const reviewId = this.getAttribute('data-review-id');
                const title = this.getAttribute('data-review-title') || '';
                const content = this.getAttribute('data-review-content') || '';
                const rating = parseInt(this.getAttribute('data-review-rating')) || 0;
                
                // Llamar a función de editar (debe estar disponible globalmente o importarse)
                if (typeof showEditReviewModal === 'function') {
                    showEditReviewModal(reviewId, title, content, rating);
                } else {
                    console.warn('showEditReviewModal no está disponible');
                }
            });
        });

        // Eliminar (solo si es tu propio perfil)
        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const reviewId = this.getAttribute('data-review-id');
                const reviewTitle = this.closest('.review-item')?.querySelector('.review-title')?.textContent || 'esta reseña';
                
                if (typeof showDeleteReviewModal === 'function') {
                    showDeleteReviewModal(reviewId, reviewTitle);
                } else {
                    console.warn('showDeleteReviewModal no está disponible');
                }
            });
        });
    } else {
        // Reportar (solo si NO es tu propio perfil)
        container.querySelectorAll('.btn-report').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const reviewId = this.getAttribute('data-review-id');
                
                if (typeof reportReview === 'function') {
                    reportReview(reviewId);
                } else if (typeof showReportModal === 'function') {
                    showReportModal(reviewId, 'review');
                } else {
                    console.warn('Funciones de reportar no están disponibles');
                }
            });
        });
    }

    // Comentarios
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
            if (typeof showCommentsModal === 'function') {
                showCommentsModal(reviewId);
            } else {
                console.warn('showCommentsModal no está disponible');
            }
        });
    });

    // Click en la reseña para ver detalles
    container.querySelectorAll('.review-clickable').forEach(element => {
        element.addEventListener('click', function(e) {
            if (e.target.closest('.review-actions') || 
                e.target.closest('.btn-edit') || 
                e.target.closest('.btn-delete') || 
                e.target.closest('.btn-report') || 
                e.target.closest('.btn-like') || 
                e.target.closest('.comment-btn')) {
                return;
            }
            
            const reviewId = this.getAttribute('data-review-id');
            if (reviewId && typeof showReviewDetailModal === 'function') {
                showReviewDetailModal(reviewId);
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
        const allReviews = await getReviews();
        
        // Filtrar solo las reseñas del usuario
        const userReviews = allReviews.filter(review => {
            const reviewUserId = review.UserId || review.userId;
            return String(reviewUserId).trim() === String(userIdToLoad).trim();
        });

        if (!userReviews || userReviews.length === 0) {
            return [];
        }

        // Procesar cada reseña para obtener detalles completos (similar a loadReviewsFunction)
        const processedReviews = await Promise.all(
            userReviews.map(async (review) => {
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
                    let username = `Usuario ${userIdStr.substring(0, 8)}`;
                    let avatar = '../../Assets/default-avatar.png';
                    
                    // Obtener datos del usuario
                    try {
                        const userId = review.UserId || review.userId;
                        const userData = await getUser(userId);
                        if (userData) {
                            username = userData.Username || userData.username || username;
                            avatar = userData.imgProfile || userData.ImgProfile || avatar;
                        }
                    } catch (e) {
                        console.debug(`No se pudo obtener usuario ${review.UserId || review.userId}`);
                    }

                    // Obtener likes y comentarios
                    const [likes, comments] = await Promise.all([
                        getReviewReactionCount(reviewId).catch(() => 0),
                        getCommentsByReview(reviewId).catch(() => [])
                    ]);

                    // Verificar si el usuario actual dio like
                    let userLiked = false;
                    if (currentUserId) {
                        const storedReactionId = localStorage.getItem(`reaction_${reviewId}_${currentUserId}`);
                        const localLike = localStorage.getItem(`like_${reviewId}_${currentUserId}`);
                        userLiked = storedReactionId !== null || localLike === 'true';
                    }

                    // Obtener datos del contenido desde localStorage o Content Service
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
                        if (review.SongId) {
                            try {
                                const songData = await getSongByApiId(String(review.SongId).trim());
                                if (songData) {
                                    songName = songData.Title || songData.title || songData.Name || songName;
                                    artistName = songData.ArtistName || songData.artistName || songData.Artist || artistName;
                                }
                            } catch (e) {
                                console.debug('No se pudo obtener canción:', e);
                            }
                        } else if (review.AlbumId) {
                            try {
                                const albumData = await getAlbumByApiId(String(review.AlbumId).trim());
                                if (albumData) {
                                    albumName = albumData.Title || albumData.title || albumData.Name || albumName;
                                    // Intentar obtener artista desde primera canción
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
                        createdAt: createdAtDate
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

/**
 * Carga el perfil completo de un usuario dado su ID, conectando a la API.
 * @param {string} userIdToLoad - El ID del usuario cuyo perfil se va a mostrar.
 */
async function loadUserProfile(userIdToLoad) {
    console.log(`👤 Cargando perfil para ID: ${userIdToLoad}...`);

    profileUserId = userIdToLoad; // Guardar para usar en otras funciones
    const currentUserId = localStorage.getItem('userId');
    const isOwnProfile = currentUserId && String(currentUserId).trim() === String(userIdToLoad).trim();

    const recentContainerId = "recent-reviews"; 
    const userAvatarEl = document.querySelector(".profile-avatar");
    const userNameEl = document.querySelector(".username");
    const userQuoteEl = document.querySelector(".user-quote");
    const reviewCountEl = document.getElementById("user-reviews");
    const followingCountEl = document.getElementById("user-following");
    const followerCountEl = document.getElementById("user-followers");
    const defaultAvatar = "../../Assets/default-avatar.png";

    const recentContainer = document.getElementById(recentContainerId);
    if (recentContainer) recentContainer.innerHTML = "<p class='text-muted p-4 text-center'>Cargando reseñas...</p>";

    try {
        const user = await window.userApi.getUserProfile(userIdToLoad); 
        const followerCount = await window.userApi.getFollowerCount(userIdToLoad);
        const followingCount = await window.userApi.getFollowingCount(userIdToLoad);
        
        console.log("✅ Perfil, seguidores y seguidos cargados de la API.");

        // Poblar Header de Perfil
        if (userAvatarEl) userAvatarEl.src = user.image || defaultAvatar;
        if (userNameEl) userNameEl.textContent = user.username || "Usuario";
        if (userQuoteEl) userQuoteEl.textContent = user.quote || "Sin frase personal";
        if (followerCountEl) followerCountEl.textContent = followerCount;
        if (followingCountEl) followingCountEl.textContent = followingCount;

        // Cargar y renderizar reseñas del usuario con el formato de home
        const userReviews = await loadUserReviews(userIdToLoad);
        
        if (recentContainer) {
            if (userReviews && userReviews.length > 0) {
                renderProfileReviews(userReviews, recentContainerId, isOwnProfile);
            } else {
                recentContainer.innerHTML = "<p class='text-muted p-4 text-center'>No hay reseñas recientes de este usuario.</p>";
            }
        }
        if (reviewCountEl) reviewCountEl.textContent = userReviews.length || 0;
        
    } catch (error) {
        console.error("❌ Error al cargar el perfil completo:", error);
        
        if (userAvatarEl) userAvatarEl.src = defaultAvatar;
        if (userNameEl) userNameEl.textContent = "Error al cargar";
        if (userQuoteEl) userQuoteEl.textContent = "No disponible";
        if (recentContainer) recentContainer.innerHTML = "<p class='text-danger p-4 text-center'>Error al cargar reseñas.</p>";
        if (error.message && (error.message.includes('401') || error.message.includes('403'))) {
        if (typeof window.showAlert === 'function') {
                window.showAlert("Sesión caducada o perfil privado.", "Error");
            }
        }
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
    
    // Intentar usar el modal de home si está disponible
    const modal = document.getElementById('deleteReviewModalOverlay');
    if (modal) {
        const messageElement = document.getElementById('deleteReviewMessage');
        if (messageElement) {
            messageElement.textContent = `¿Estás seguro de que quieres eliminar la reseña "${reviewTitle}"? Esta acción no se puede deshacer.`;
        }
        modal.style.display = 'flex';
    } else {
        // Si no hay modal, usar confirm
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
        await deleteReview(reviewId, userId, authToken);
        alert('✅ Reseña eliminada exitosamente');
        
        // Recargar las reseñas del perfil
        if (profileUserId) {
            await loadUserProfile(profileUserId);
        }
    } catch (error) {
        console.error('Error eliminando reseña:', error);
        if (error.response) {
            const status = error.response.status;
            if (status === 409) {
                alert('No se puede eliminar la reseña porque tiene likes o comentarios.');
            } else if (status === 404) {
                alert('La reseña no fue encontrada.');
            } else if (status === 401) {
                alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
                setTimeout(() => {
                    window.location.href = '../login.html';
                }, 2000);
            } else if (status === 403) {
                alert('No tienes permisos para eliminar esta reseña.');
            } else {
                alert(`Error al eliminar la reseña: ${error.response.data?.message || 'Error desconocido'}`);
            }
        } else {
            alert('Error al eliminar la reseña. Intenta nuevamente.');
        }
    }
}

/**
 * Muestra el modal de reportar reseña o usa prompt si el modal no está disponible
 */
function reportReview(reviewId) {
    showReportModal(reviewId, 'review');
}

/**
 * Muestra el modal de reportar (reseña o comentario) o usa prompt si el modal no está disponible
 */
function showReportModal(id, type) {
    // Intentar usar el modal de home si está disponible
    const modal = document.getElementById('reportCommentModalOverlay');
    if (modal) {
        const textarea = document.getElementById('reportCommentTextarea');
        const confirmBtn = document.getElementById('confirmReportCommentBtn');
        const title = document.querySelector('.report-comment-title');
        const message = document.querySelector('.report-comment-message');
        
        if (title) {
            title.textContent = type === 'comment' ? 'Reportar comentario' : 'Reportar reseña';
        }
        if (message) {
            message.textContent = type === 'comment' 
                ? '¿Por qué quieres reportar este comentario?' 
                : '¿Por qué quieres reportar esta reseña?';
        }
        
        document.querySelectorAll('.report-radio').forEach(radio => radio.checked = false);
        if (textarea) {
            textarea.value = '';
            textarea.style.display = 'none';
        }
        if (confirmBtn) confirmBtn.disabled = true;
        modal.style.display = 'flex';
    } else {
        // Si no hay modal, usar prompt simple
        const reason = prompt(type === 'comment' 
            ? '¿Por qué quieres reportar este comentario?' 
            : '¿Por qué quieres reportar esta reseña?');
        if (reason) {
            console.log(`Reportar ${type}:`, { id, reason });
            alert(`${type === 'comment' ? 'Comentario' : 'Reseña'} reportada. Gracias por tu reporte.`);
        }
    }
}

/**
 * Muestra el modal de comentarios (usa el modal de Bootstrap si está disponible)
 */
async function showCommentsModal(reviewId) {
    // Intentar usar el modal de Bootstrap de profile.html
    const bootstrapModal = document.getElementById('commentsModal');
    if (bootstrapModal && typeof window.commentsModalInstance !== 'undefined' && window.commentsModalInstance) {
        window.commentsModalInstance.show();
        const modalList = document.getElementById('modalCommentsList');
        if (modalList) {
            modalList.innerHTML = '<p class="text-center p-4">Cargando comentarios...</p>';
            try {
                const comments = await getCommentsByReview(reviewId);
                // TODO: Renderizar comentarios en el modal
                modalList.innerHTML = comments.length > 0 
                    ? '<p class="text-center p-4">Comentarios cargados</p>' 
                    : '<p class="text-center p-4">No hay comentarios aún.</p>';
            } catch (error) {
                console.error('Error cargando comentarios:', error);
                modalList.innerHTML = '<p class="text-center p-4 text-danger">Error al cargar comentarios.</p>';
            }
        }
    } else {
        // Si no hay modal de Bootstrap, intentar usar el modal de home
        const modal = document.getElementById('commentsModalOverlay');
        if (modal) {
            modal.setAttribute('data-review-id', reviewId);
            modal.style.display = 'flex';
        } else {
            console.warn('Modal de comentarios no disponible');
        }
    }
}

/**
 * Muestra el modal de vista detallada de reseña (usa el modal de home si está disponible)
 */
async function showReviewDetailModal(reviewId) {
    const modal = document.getElementById('reviewDetailModalOverlay');
    if (modal) {
        modal.setAttribute('data-review-id', reviewId);
        modal.style.display = 'flex';
        // El modal de home se encargará de cargar el contenido
    } else {
        // Si no hay modal, redirigir a home
        if (confirm('Para ver los detalles de la reseña, serás redirigido a la página principal. ¿Continuar?')) {
            window.location.href = '../home.html';
        }
    }
}

// Hacer las funciones disponibles globalmente para que los listeners puedan usarlas
window.showEditReviewModal = showEditReviewModal;
window.showDeleteReviewModal = showDeleteReviewModal;
window.showReportModal = showReportModal;
window.reportReview = reportReview;
window.showCommentsModal = showCommentsModal;
window.showReviewDetailModal = showReviewDetailModal;