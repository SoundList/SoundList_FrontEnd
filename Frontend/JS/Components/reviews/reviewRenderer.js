import { renderStars } from '../../Utils/reviewHelpers.js';
import { showLoginRequiredModal } from '../../Handlers/headerHandler.js';
import { addReviewReaction, deleteReviewReaction } from '../../APIs/socialApi.js';
import { AmigosHandler } from '../../Handlers/amigosHandler.js'; 
import { showCommentsModal } from '../../Components/modals/commentsModal.js';

/**
 * Renderiza las reseñas en el DOM
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
            if (!reviewId || reviewId === 'null' || reviewId === 'undefined') return '';
        } else {
            return '';
        }
        
        const isLiked = review.userLiked || false;
        const likeCount = (typeof review.likes === 'number' && !isNaN(review.likes) && review.likes >= 0) 
            ? Math.floor(review.likes) 
            : (typeof review.likes === 'string' ? Math.max(0, parseInt(review.likes, 10) || 0) : 0);
        
        const commentCount = (typeof review.comments === 'number' && !isNaN(review.comments) && review.comments >= 0)
            ? Math.floor(review.comments)
            : (typeof review.comments === 'string' ? Math.max(0, parseInt(review.comments, 10) || 0) : 0);
        const defaultAvatar = '../Assets/default-avatar.png';
        const reviewUserId = review.userId || review.UserId || '';
        const isOwnReview = currentUserId && (reviewUserId === currentUserId || reviewUserId.toString() === currentUserId.toString());
        
        let followButtonHTML = '';
        const isAmigosPage = window.location.pathname.includes('amigos.html');

        if (isLoggedIn && !isOwnReview && reviewUserId && !isAmigosPage) {
            const isFollowing = AmigosHandler.isFollowingUser(reviewUserId);
            const iconClass = isFollowing ? 'fa-user-check' : 'fa-user-plus';
            const btnTitle = isFollowing ? 'Dejar de seguir' : 'Seguir';

            followButtonHTML = `
                <button class="icon-follow-btn" 
                        data-user-id="${reviewUserId}"
                        data-username="${review.username}"
                        title="${btnTitle}"
                        style="
                            background: rgba(255, 255, 255, 0.1); 
                            border: none; 
                            border-radius: 6px; 
                            padding: 4px 8px; 
                            margin-left: 10px; 
                            cursor: pointer; 
                            color: ${isFollowing ? '#EC4899' : '#fff'}; 
                            transition: background 0.2s;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                        ">
                    <i class="fas ${iconClass}" style="font-size: 0.85rem;"></i>
                </button>
            `;
        }

        const editButtonStyle = (likeCount > 0) ? 'display: none !important;' : '';

        return `
        <div class="review-item" data-review-id="${reviewId}">
            <div class="review-user review-clickable" data-review-id="${reviewId}" style="cursor: pointer;">
                    <img src="${review.avatar || defaultAvatar}"  
                            alt="${review.username}"  
                            class="review-avatar profile-navigation-trigger"
                            data-user-id="${reviewUserId}"
                            onerror="this.src='${defaultAvatar}'"
                            style="cursor: pointer;">
                    <div class="review-info">
                        <div class="review-header">
                                <span class="review-username profile-navigation-trigger" 
                                      data-user-id="${reviewUserId}"
                                      style="cursor: pointer;">${review.username}</span>
                                ${review.isUserDeleted ? '<span class="deleted-account-badge">Cuenta eliminada</span>' : ''}
                                ${followButtonHTML}

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
                                    title="Editar reseña"
                                    style="${editButtonStyle}"> <i class="fas fa-pencil"></i>
                        </button>
                        <button class="review-btn btn-delete"  
                                    data-review-id="${reviewId}"
                                    title="Eliminar reseña">
                                <i class="fas fa-trash"></i>
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

    attachReviewActionListeners(reviewsList);
}

export function attachReviewActionListeners(reviewsListElement) { 
    reviewsListElement.querySelectorAll('.icon-follow-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault(); e.stopPropagation(); 
            const userId = this.getAttribute('data-user-id');
            const username = this.getAttribute('data-username');
            const realState = AmigosHandler.isFollowingUser(userId);
            const btnProxy = {
                disabled: false,
                classList: { 
                    add: () => {}, remove: () => {}, toggle: () => {},
                    contains: (cls) => cls === 'following' ? realState : btn.classList.contains(cls)
                },
                innerHTML: '', title: ''
            };
            await AmigosHandler.toggleFollow(userId, username, btnProxy);
            const isFollowingNow = !realState;
            const allButtons = document.querySelectorAll(`.icon-follow-btn[data-user-id="${userId}"]`);
            allButtons.forEach(otherBtn => {
                const icon = otherBtn.querySelector('i');
                if (isFollowingNow) {
                    otherBtn.classList.add('following');
                    icon.className = 'fas fa-user-check';
                    otherBtn.style.color = '#EC4899';
                    otherBtn.title = 'Dejar de seguir';
                } else {
                    otherBtn.classList.remove('following');
                    icon.className = 'fas fa-user-plus';
                    otherBtn.style.color = '#a1a1aa';
                    otherBtn.title = 'Seguir';
                }
            });
        });
    });

    reviewsListElement.querySelectorAll('.btn-like').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            
            const authToken = localStorage.getItem('authToken');
            if (!authToken) { showLoginRequiredModal(); return; }
            
            const icon = this.querySelector('i');
            const likesSpan = this.parentElement.querySelector('.review-likes-count');
            const isLiked = this.classList.contains('liked');
            const reviewId = this.getAttribute('data-review-id');
            let currentLikes = parseInt(likesSpan.textContent) || 0;
            const userId = localStorage.getItem('userId');

            this.style.transform = 'scale(1.2)';
            setTimeout(() => { this.style.transform = ''; }, 200);
            let newLikesCount = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;

            if (isLiked) {
                this.classList.remove('liked');
                icon.style.color = 'rgba(255,255,255,0.7)';
            } else {
                this.classList.add('liked');
                icon.style.color = 'var(--magenta, #EC4899)';
            }
            likesSpan.textContent = newLikesCount;
            const reviewCard = this.closest('.review-item');
            const editBtn = reviewCard.querySelector('.btn-edit');
            
            if (editBtn) {
                if (newLikesCount > 0) {

                    editBtn.style.setProperty('display', 'none', 'important');
                } else {
                    editBtn.style.removeProperty('display');
                }
            }

            const likesCacheKey = `review_likes_${reviewId}`;
            try { localStorage.setItem(likesCacheKey, String(newLikesCount)); } catch (e) { }

            if (isLiked) {
                const reactionId = localStorage.getItem(`reaction_${reviewId}_${userId}`);
                localStorage.removeItem(`like_${reviewId}_${userId}`);
                localStorage.removeItem(`reaction_${reviewId}_${userId}`);
                deleteReviewReaction(reviewId, userId, authToken, reactionId).catch(err => console.warn("Error quitando like:", err));
            } else {
                localStorage.setItem(`like_${reviewId}_${userId}`, 'true');
                addReviewReaction(reviewId, userId, authToken)
                    .then(data => {
                        const reactionId = data?.Id_Reaction || data?.ReactionId || data?.id;
                        if (reactionId) localStorage.setItem(`reaction_${reviewId}_${userId}`, String(reactionId));
                    })
                    .catch(err => console.warn("Error dando like:", err));
            }
        });
    });

    reviewsListElement.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.style.display === 'none') return; 
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

    // Navegación a perfil desde avatar/username
    reviewsListElement.querySelectorAll('.profile-navigation-trigger').forEach(element => {
        element.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.getAttribute('data-user-id');
            if (userId && typeof window.navigateToProfile === 'function') {
                window.navigateToProfile(userId);
            }
        });
    });

    reviewsListElement.querySelectorAll('.review-clickable').forEach(element => {
        element.addEventListener('click', function(e) {
            // Si se hace clic en avatar/username, no abrir el modal de reseña
            if (e.target.classList.contains('profile-navigation-trigger') || e.target.closest('.profile-navigation-trigger')) {
                return;
            }
            if (e.target.closest('.review-actions') || e.target.closest('.btn-edit') || e.target.closest('.btn-delete') || e.target.closest('.btn-like') || e.target.closest('.comment-btn') || e.target.closest('.icon-follow-btn')) {
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
}