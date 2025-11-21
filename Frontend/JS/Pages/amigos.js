import { AmigosHandler } from '../Handlers/amigosHandler.js';
import { renderStars } from '../Components/starRenderer.js';

import { initializeCreateReviewModal, showEditReviewModal } from '../Components/modals/createReviewModal.js';
import { initializeCommentsModalLogic, showCommentsModal } from '../Components/modals/commentsModal.js';
import { initializeReviewDetailModalLogic, showReviewDetailModal } from '../Components/modals/reviewDetailModal.js';
import { initializeDeleteModalsLogic, showDeleteReviewModal } from '../Components/modals/deleteModals.js';

const getCurrentUserId = () => localStorage.getItem('userId');
const isLoggedIn = () => getCurrentUserId() !== null;
const normalizeId = (id) => String(id || '').toLowerCase().trim(); // 🚨 HELPER LOCAL
export const modalsState = {
    followingUsers: new Set(), 
    followerUsers: new Set(),  

mockReviews: [ 
        { 
            id: 'rev1', 
            userId: '22222222-2222-2222-2222-222222222222', // Antes 'user2'
            username: 'vinyl_collector', 
            song: 'Bohemian Rhapsody', 
            artist: 'Queen', 
            contentType: 'song', 
            comment: 'Una obra maestra atemporal.', 
            rating: 5, 
            likes: 45, 
            comments: 12, 
            userLiked: false, 
            avatar: '../Assets/default-avatar.png' 
        },
        { 
            id: 'rev2', 
            userId: '33333333-3333-3333-3333-333333333333', // Antes 'user3'
            username: 'jazz_night', 
            song: 'Kind of Blue', 
            artist: 'Miles Davis', 
            contentType: 'album', 
            comment: 'El álbum de jazz más importante.', 
            rating: 5, 
            likes: 38, 
            comments: 8, 
            userLiked: true, 
            avatar: '../Assets/default-avatar.png' 
        },
        { 
            id: 'rev3', 
            userId: '11111111-1111-1111-1111-111111111111', // Antes 'user1'
            username: 'musiclover23', 
            song: 'Stairway to Heaven', 
            artist: 'Led Zeppelin', 
            contentType: 'song', 
            comment: 'Desde el inicio acústico hasta el solo épico.', 
            rating: 5, 
            likes: 52, 
            comments: 15, 
            userLiked: false, 
            avatar: '../Assets/default-avatar.png' 
        },
        { 
            id: 'rev4', 
            userId: '66666666-6666-6666-6666-666666666666', // Antes 'user6'
            username: 'electronic_dreams', 
            song: 'Random Access Memories', 
            artist: 'Daft Punk', 
            contentType: 'album', 
            comment: 'Un viaje sonoro increíble.', 
            rating: 4.5, 
            likes: 29, 
            comments: 6, 
            userLiked: false, 
            avatar: '../Assets/default-avatar.png' 
        },
        { 
            id: 'rev5', 
            userId: '44444444-4444-4444-4444-444444444444', // Antes 'user4'
            username: 'pop_enthusiast', 
            song: 'Blinding Lights', 
            artist: 'The Weeknd', 
            contentType: 'song', 
            comment: 'Adictivo desde el primer segundo.', 
            rating: 4, 
            likes: 33, 
            comments: 9, 
            userLiked: false, 
            avatar: '../Assets/default-avatar.png' 
        },
        { 
            id: 'rev6', 
            userId: '55555555-5555-5555-5555-555555555555', // Antes 'user5'
            username: 'metalhead99', 
            song: 'Master of Puppets', 
            artist: 'Metallica', 
            contentType: 'album', 
            comment: 'Thrash metal en su máxima expresión.', 
            rating: 5, 
            likes: 41, 
            comments: 11, 
            userLiked: true, 
            avatar: '../Assets/default-avatar.png' 
        }
    ],

    loadReviews: (newFilter) => {
        const activeFilter = document.querySelector('.filter-btn.active');
        const filterType = newFilter || (activeFilter ? activeFilter.dataset.filter : 'seguidores'); 
        loadReviewsLogic(filterType);
    },

    toggleLike: (reviewId, buttonElement) => {
        const icon = buttonElement.querySelector('i');
        const likesSpan = buttonElement.querySelector('.review-likes-count');
        const isLiked = buttonElement.classList.contains('liked');
        let count = parseInt(likesSpan.textContent) || 0;

        if (isLiked) {
            buttonElement.classList.remove('liked');
            icon.style.color = 'rgba(255,255,255,0.7)';
            likesSpan.textContent = Math.max(0, count - 1);
        } else {
            buttonElement.classList.add('liked');
            icon.style.color = 'var(--magenta, #EC4899)';
            likesSpan.textContent = count + 1;
        }
    }
};
// LÓGICA DE RENDERIZADO
function loadReviewsLogic(filterType) {
    const reviewsList = document.getElementById('reviewsList');
    const reviewsEmpty = document.getElementById('reviewsEmpty');
    
    if (!reviewsList) return;
    
    let filteredReviews = [];

    switch (filterType) {
        case 'seguidores': 
            filteredReviews = modalsState.mockReviews.filter(review => modalsState.followerUsers.has(review.userId));
            break;
        case 'seguidos': 
            filteredReviews = modalsState.mockReviews.filter(review => modalsState.followingUsers.has(review.userId));
            break;
        default:
            filteredReviews = modalsState.mockReviews;
    }
    
    if (filteredReviews.length === 0) {
        reviewsList.innerHTML = '';
        reviewsList.style.display = 'none';
        if (reviewsEmpty) {
            reviewsEmpty.innerHTML = '<div class="review-empty"><i class="fas fa-comment-slash mb-2"></i><p>No hay reseñas en esta sección.</p></div>';
            reviewsEmpty.style.display = 'flex'; 
        }
    } else {
        if (reviewsEmpty) reviewsEmpty.style.display = 'none';
        reviewsList.style.display = 'block';
        
        renderReviews(filteredReviews); 
    }
}

function renderReviews(reviews) {
    const reviewsList = document.getElementById('reviewsList');
    if (!reviewsList) return;

    const currentUserId = getCurrentUserId();
    const defaultAvatar = '../Assets/default-avatar.png';

    reviewsList.innerHTML = reviews.map(review => {
        const reviewId = review.id;
// CORRECCIÓN:
const targetUserId = normalizeId(review.userId);
const isFollowing = modalsState.followingUsers.has(targetUserId); // <--- Usa targetUserId aquí
 const isOwn = currentUserId && (String(review.userId) === String(currentUserId));
        
        const followBtnHTML = (!isOwn && isLoggedIn()) ? `
            <button class="review-btn review-follow-btn ${isFollowing ? 'following' : ''}" 
                    data-user-id="${review.userId}"
                    data-username="${review.username}">
                <i class="fas ${isFollowing ? 'fa-user-check' : 'fa-user-plus'}"></i>
                ${isFollowing ? 'Siguiendo' : 'Seguir'}
            </button>
        ` : '';

        return `
        <div class="review-item" data-review-id="${reviewId}">
            <div class="review-user review-clickable" data-review-id="${reviewId}" style="cursor: pointer;">
                <img src="${review.avatar || defaultAvatar}" class="review-avatar" onerror="this.src='${defaultAvatar}'">
                <div class="review-info">
                    <div class="review-header">
                        <span class="review-username">${review.username}</span>
                        <span class="review-separator">•</span>
                        <span class="review-song">${review.song}</span>
                        <span class="review-separator">-</span>
                        <span class="review-artist">${review.artist}</span>
                    </div>
                    ${review.title ? `<h4 class="review-title">${review.title}</h4>` : ''}
                    <p class="review-comment">${review.comment}</p>
                </div>
            </div>
            <div class="review-actions">
                <div class="review-rating">${renderStars(review.rating)}</div>
                <div class="review-interactions">
                    ${followBtnHTML}
                    <div class="review-likes-container">
                        <span class="review-likes-count">${review.likes}</span>
                        <button class="review-btn btn-like ${review.userLiked ? 'liked' : ''}" data-review-id="${review.id}">
                            <i class="fas fa-heart" style="color: ${review.userLiked ? 'var(--magenta, #EC4899)' : 'rgba(255,255,255,0.7)'}"></i>
                        </button>
                    </div>
                    <button class="review-btn comment-btn" data-review-id="${review.id}">
                        <i class="fas fa-comment"></i>
                        <span>${review.comments}</span>
                    </button>
                    ${isLoggedIn() && (isOwn ? 
                        `<button class="review-btn btn-delete" data-review-id="${review.id}" title="Eliminar reseña"><i class="fas fa-trash"></i></button>` : 
                        `<button class="review-btn btn-report" data-review-id="${review.id}" title="Reportar reseña"><i class="fas fa-flag"></i></button>`)}
                </div>
            </div>
        </div>`;
    }).join('');
    AmigosHandler.addReviewEventListeners(reviewsList, modalsState);
}

export function initializeAmigosPage() {
    console.log('Inicializando Amigos Page...');

    initializeCreateReviewModal(modalsState);
    initializeCommentsModalLogic(modalsState);
    initializeReviewDetailModalLogic(modalsState);
    initializeDeleteModalsLogic(modalsState);

    AmigosHandler.initializeFollowData(modalsState).then(() => {
        AmigosHandler.init(modalsState); 
        modalsState.loadReviews();    
    });

    if (typeof window !== 'undefined') {
        window.showEditReviewModal = (id, t, c, r) => showEditReviewModal(id, t, c, r, modalsState);
        window.showDeleteReviewModal = (id, title) => showDeleteReviewModal(id, title, modalsState);
        window.showReviewDetailModal = (id) => showReviewDetailModal(id, modalsState);
        window.showCommentsModal = (id) => showCommentsModal(id, modalsState);
    }
}