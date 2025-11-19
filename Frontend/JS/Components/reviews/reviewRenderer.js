/**
 * Módulo de renderizado de reseñas
 * Funciones para renderizar el HTML de las reseñas y adjuntar listeners
 */

import { renderStars } from '../../Utils/reviewHelpers.js';
import { showLoginRequiredModal } from '../../Handlers/headerHandler.js';
import { addReviewReaction, deleteReviewReaction } from '../../APIs/socialApi.js';

/**
 * Renderiza las reseñas en el DOM
 * @param {Array} reviews - Array de reseñas procesadas
 */
export function renderReviews(reviews) {
    const currentUserId = localStorage.getItem('userId');
    const isLoggedIn = currentUserId !== null;
    
    const reviewsList = document.getElementById('reviewsList');
    if (!reviewsList) return; // Salir si no estamos en la página de inicio

    reviewsList.innerHTML = reviews.map((review, index) => {
        // Asegurar que siempre tengamos un ID válido
        let reviewId = review.id || review.ReviewId || review.reviewId;
        
        // Normalizar el reviewId (convertir a string y limpiar)
        if (reviewId) {
            reviewId = String(reviewId).trim();
            // Si después de normalizar está vacío o es "null" o "undefined", rechazar
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
        
        // Verificar si es la reseña del usuario actual
        const reviewUserId = review.userId || review.UserId || '';
        const isOwnReview = currentUserId && (reviewUserId === currentUserId || reviewUserId.toString() === currentUserId.toString());
        
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

    // Después de crear el HTML, llamamos a la función que agrega los listeners
    attachReviewActionListeners(reviewsList);
}

/**
 * Agrega listeners a los botones de la tarjeta de reseña (like, comment, edit, delete).
 * Esta función es llamada por renderReviews().
 * @param {HTMLElement} reviewsListElement - Elemento contenedor de las reseñas
 */
export function attachReviewActionListeners(reviewsListElement) { 
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
                // Quitar like (Optimistic Update)
                this.classList.remove('liked');
                icon.style.color = 'rgba(255,255,255,0.7)';
                const currentLikes = parseInt(likesSpan.textContent);
                const newLikesCount = Math.max(0, currentLikes - 1);
                likesSpan.textContent = newLikesCount;
                
                // Actualizar cache de likes
                try {
                    localStorage.setItem(`review_likes_${reviewId}`, String(newLikesCount));
                } catch (e) {
                    // Ignorar errores de localStorage
                }
                
                const userId = localStorage.getItem('userId');
                const reactionId = localStorage.getItem(`reaction_${reviewId}_${userId}`);
                deleteReviewReaction(reviewId, userId, authToken, reactionId)
                    .then(() => {
                        localStorage.removeItem(`like_${reviewId}_${userId}`);
                        // Actualizar cache después de confirmar en backend
                        try {
                            localStorage.setItem(`review_likes_${reviewId}`, String(newLikesCount));
                        } catch (e) {
                            // Ignorar errores de localStorage
                        }
                    })
                    .catch(err => {
                        console.warn('No se pudo eliminar like del backend', err);
                    });
            } else {
                // Agregar like (Optimistic Update)
                this.classList.add('liked');
                icon.style.color = 'var(--magenta, #EC4899)';
                const currentLikes = parseInt(likesSpan.textContent) || 0;
                const newLikesCount = currentLikes + 1;
                likesSpan.textContent = newLikesCount;
                
                // Actualizar cache de likes
                try {
                    localStorage.setItem(`review_likes_${reviewId}`, String(newLikesCount));
                } catch (e) {
                    // Ignorar errores de localStorage
                }
                
                const currentUserId = localStorage.getItem('userId');
                localStorage.setItem(`like_${reviewId}_${currentUserId}`, 'true');
                
                addReviewReaction(reviewId, currentUserId, authToken)
                    .then(data => {
                        const reactionId = data?.Id_Reaction || data?.ReactionId || data?.id;
                        if (reactionId) {
                            localStorage.setItem(`reaction_${reviewId}_${currentUserId}`, reactionId);
                        }
                        // Actualizar cache después de confirmar en backend
                        try {
                            localStorage.setItem(`review_likes_${reviewId}`, String(newLikesCount));
                        } catch (e) {
                            // Ignorar errores de localStorage
                        }
                    })
                    .catch(err => {
                        console.warn('No se pudo guardar like en el backend', err);
                    });
            }
        });
    });

    // Add event listeners for edit buttons
    reviewsListElement.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const reviewId = this.getAttribute('data-review-id');
            const title = this.getAttribute('data-review-title') || '';
            const content = this.getAttribute('data-review-content') || '';
            const rating = parseInt(this.getAttribute('data-review-rating')) || 0;
            
            // Usar función global de modals
            if (typeof window.showEditReviewModal === 'function') {
                window.showEditReviewModal(reviewId, title, content, rating);
            }
        });
    });
    
    // Add event listeners for delete buttons
    reviewsListElement.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); 
            let reviewId = this.getAttribute('data-review-id');
            const reviewTitle = this.closest('.review-item')?.querySelector('.review-title')?.textContent || 'esta reseña';
            
            // Usar función global de modals
            if (typeof window.showDeleteReviewModal === 'function') {
                window.showDeleteReviewModal(reviewId, reviewTitle);
            }
        });
    });
    
    // Add event listeners for comment buttons
    reviewsListElement.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); 
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                showLoginRequiredModal();
                return;
            }
            
            const reviewId = this.getAttribute('data-review-id');
            // Usar función global de modals
            if (typeof window.showCommentsModal === 'function') {
                window.showCommentsModal(reviewId);
            }
        });
    });
    
    // Hacer las reseñas clickeables para abrir vista detallada
    reviewsListElement.querySelectorAll('.review-clickable').forEach(element => {
        element.addEventListener('click', function(e) {
            // No abrir si se hizo clic en un botón de acción
            if (e.target.closest('.review-actions') || e.target.closest('.btn-edit') || e.target.closest('.btn-delete') || e.target.closest('.btn-like') || e.target.closest('.comment-btn')) {
                return;
            }
            
            const reviewId = this.getAttribute('data-review-id');
            if (reviewId) {
                // Usar función global de modals
                if (typeof window.showReviewDetailModal === 'function') {
                    window.showReviewDetailModal(reviewId);
                }
            }
        });
    });
}

