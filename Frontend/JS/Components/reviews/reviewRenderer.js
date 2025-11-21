
import { renderStars } from '../../Utils/reviewHelpers.js';
import { showLoginRequiredModal } from '../../Handlers/headerHandler.js';
import { addReviewReaction, deleteReviewReaction } from '../../APIs/socialApi.js';
import { AmigosHandler } from '../../Handlers/amigosHandler.js';
/**
 * Renderiza las reseñas en el DOM
 * @param {Array} reviews - Array de reseñas procesadas
 */
export function renderReviews(reviews) {
    const currentUserId = localStorage.getItem('userId');
    const isLoggedIn = currentUserId !== null;
    
    const reviewsList = document.getElementById('reviewsList');
    if (!reviewsList) return; 

    reviewsList.innerHTML = reviews.map((review, index) => {
        let reviewId = review.id || review.ReviewId || review.reviewId;

        if (reviewId) {
            reviewId = String(reviewId).trim();
            if (!reviewId || reviewId === 'null' || reviewId === 'undefined') {
                console.warn('⚠️ Reseña con ID inválido en renderReviews, omitiendo:', { review, reviewId });
                return '';
            }
        } else {
            console.warn('⚠️ Reseña sin ID en renderReviews, omitiendo:', review);
            return '';
        }
        
        const isLiked = review.userLiked || false;
        // Asegurar que likeCount sea un número válido (incluso si es 0)
        const likeCount = (typeof review.likes === 'number' && !isNaN(review.likes) && review.likes >= 0) 
            ? Math.floor(review.likes) 
            : (typeof review.likes === 'string' ? Math.max(0, parseInt(review.likes, 10) || 0) : 0);
        // Asegurar que commentCount sea un número válido (incluso si es 0)
        const commentCount = (typeof review.comments === 'number' && !isNaN(review.comments) && review.comments >= 0)
            ? Math.floor(review.comments)
            : (typeof review.comments === 'string' ? Math.max(0, parseInt(review.comments, 10) || 0) : 0);
        const defaultAvatar = '../Assets/default-avatar.png';
        const reviewUserId = review.userId || review.UserId || '';
        const isOwnReview = currentUserId && (reviewUserId === currentUserId || reviewUserId.toString() === currentUserId.toString());
        
        let followButtonHTML = '';
        if (isLoggedIn && !isOwnReview && reviewUserId) {
            const isFollowing = review.isFollowingAuthor || false;
            const btnClass = isFollowing ? 'following' : 'follow';
            const btnText = isFollowing ? 'Siguiendo' : 'Seguir';
            const iconClass = isFollowing ? 'fa-user-check' : 'fa-user-plus';
            
            followButtonHTML = `
                <button class="follow-btn-small ${btnClass}" 
                        data-user-id="${reviewUserId}"
                        title="${btnText}">
                    <i class="fas ${iconClass}"></i>
                    <span>${btnText}</span>
                </button>
            `;
        }
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
                        ${isLoggedIn && isOwnReview ? `
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
                        ` : ''}
                        <div class="review-likes-container">
                                <span class="review-likes-count">${likeCount || 0}</span>
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
                                <span class="review-comments-count">${commentCount || 0}</span>
                        </button>
                    </div>
            </div>
        </div>
        `;
    }).join('');

    attachReviewActionListeners(reviewsList);
}


export function attachReviewActionListeners(reviewsListElement) { 
    reviewsListElement.querySelectorAll('.follow-btn-small').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation(); 
            
            const userId = this.getAttribute('data-user-id');
            const isFollowing = this.classList.contains('following');
            await AmigosHandler.toggleFollow(userId, isFollowing, this);
        });
    });
    reviewsListElement.querySelectorAll('.btn-like').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                showLoginRequiredModal();
                return;
            }
            
            const icon = this.querySelector('i');
            const likesSpan = this.parentElement.querySelector('.review-likes-count');
            const isLiked = this.classList.contains('liked');
            const reviewId = this.getAttribute('data-review-id');

            this.style.transform = 'scale(1.2)';
            setTimeout(() => { this.style.transform = ''; }, 200);

            if (isLiked) {

                this.classList.remove('liked');
                icon.style.color = 'rgba(255,255,255,0.7)';
                const currentLikes = parseInt(likesSpan.textContent) || 0;
                const newLikesCount = Math.max(0, currentLikes - 1);
                likesSpan.textContent = newLikesCount;
                
                // ACTUALIZAR CACHE INMEDIATAMENTE (fuente de verdad)
                const likesCacheKey = `review_likes_${reviewId}`;
                try {
                    localStorage.setItem(likesCacheKey, String(newLikesCount));
                } catch (e) {
                    // Ignorar errores de localStorage
                }
                
                const userId = localStorage.getItem('userId');
                const reactionId = localStorage.getItem(`reaction_${reviewId}_${userId}`);
                
                // Sincronizar con backend
                deleteReviewReaction(reviewId, userId, authToken, reactionId)
                    .then(() => {
                        // Confirmar eliminación en localStorage
                        localStorage.removeItem(`like_${reviewId}_${userId}`);
                        localStorage.removeItem(`reaction_${reviewId}_${userId}`);
                        // Mantener el cache actualizado
                        try {
                            localStorage.setItem(likesCacheKey, String(newLikesCount));
                        } catch (e) {
                            // Ignorar errores de localStorage
                        }
                    })
                    .catch(err => {
                        console.warn('No se pudo eliminar like del backend', err);
                        // Revertir cambio si falla
                        this.classList.add('liked');
                        icon.style.color = 'var(--magenta, #EC4899)';
                        likesSpan.textContent = currentLikes;
                        // Revertir cache
                        try {
                            localStorage.setItem(likesCacheKey, String(currentLikes));
                        } catch (e) {
                            // Ignorar errores de localStorage
                        }
                    });
            } else {

                this.classList.add('liked');
                icon.style.color = 'var(--magenta, #EC4899)';
                const currentLikes = parseInt(likesSpan.textContent) || 0;
                const newLikesCount = currentLikes + 1;
                likesSpan.textContent = newLikesCount;
                
                // ACTUALIZAR CACHE INMEDIATAMENTE (fuente de verdad)
                const likesCacheKey = `review_likes_${reviewId}`;
                try {
                    localStorage.setItem(likesCacheKey, String(newLikesCount));
                } catch (e) {
                    // Ignorar errores de localStorage
                }
                
                const currentUserId = localStorage.getItem('userId');
                // Guardar estado de like en localStorage INMEDIATAMENTE
                localStorage.setItem(`like_${reviewId}_${currentUserId}`, 'true');
                
                // Sincronizar con backend
                addReviewReaction(reviewId, currentUserId, authToken)
                    .then(data => {
                        const reactionId = data?.Id_Reaction || data?.ReactionId || data?.id;
                        if (reactionId) {
                            localStorage.setItem(`reaction_${reviewId}_${currentUserId}`, String(reactionId));
                        }
                        // Mantener el cache actualizado
                        try {
                            localStorage.setItem(likesCacheKey, String(newLikesCount));
                        } catch (e) {
                            // Ignorar errores de localStorage
                        }
                    })
                    .catch(err => {
                        console.warn('No se pudo guardar like en el backend', err);
                        // Revertir cambio si falla
                        this.classList.remove('liked');
                        icon.style.color = 'rgba(255,255,255,0.7)';
                        likesSpan.textContent = currentLikes;
                        localStorage.removeItem(`like_${reviewId}_${currentUserId}`);
                        // Revertir cache
                        try {
                            localStorage.setItem(likesCacheKey, String(currentLikes));
                        } catch (e) {
                            // Ignorar errores de localStorage
                        }
                    });
            }
        });
    });

    reviewsListElement.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const reviewId = this.getAttribute('data-review-id');
            const title = this.getAttribute('data-review-title') || '';
            const content = this.getAttribute('data-review-content') || '';
            const rating = parseInt(this.getAttribute('data-review-rating')) || 0;

            if (typeof window.showEditReviewModal === 'function') {
                window.showEditReviewModal(reviewId, title, content, rating);
            }
        });
    });

    reviewsListElement.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); 
            let reviewId = this.getAttribute('data-review-id');
            const reviewTitle = this.closest('.review-item')?.querySelector('.review-title')?.textContent || 'esta reseña';

            if (typeof window.showDeleteReviewModal === 'function') {
                window.showDeleteReviewModal(reviewId, reviewTitle);
            }
        });
    });

    reviewsListElement.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); 
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                showLoginRequiredModal();
                return;
            }
            
            const reviewId = this.getAttribute('data-review-id');
            if (typeof window.showCommentsModal === 'function') {
                window.showCommentsModal(reviewId);
            }
        });
    });

    reviewsListElement.querySelectorAll('.review-clickable').forEach(element => {
        element.addEventListener('click', function(e) {
            if (e.target.closest('.review-actions') || e.target.closest('.btn-edit') || e.target.closest('.btn-delete') || e.target.closest('.btn-like') || e.target.closest('.comment-btn')) {
                return;
            }
            
            const reviewId = this.getAttribute('data-review-id');
            if (reviewId) {
                if (typeof window.showReviewDetailModal === 'function') {
                    window.showReviewDetailModal(reviewId);
                }
            }
        });
    });

    reviewsListElement.querySelectorAll('.review-clickable').forEach(element => {
        element.addEventListener('click', function(e) {
            if (e.target.closest('.review-actions') || 
                e.target.closest('.btn-edit') || 
                e.target.closest('.btn-delete') || 
                e.target.closest('.btn-like') || 
                e.target.closest('.comment-btn') ||
                e.target.closest('.follow-btn-small')) { 
                return;
            }
            
            const reviewId = this.getAttribute('data-review-id');
            if (reviewId && typeof window.showReviewDetailModal === 'function') {
                window.showReviewDetailModal(reviewId);
            }
        });
    });
}


