import { AmigosHandler } from '../Handlers/amigosHandler.js';
import { renderStars } from '../Components/starRenderer.js';
import { ReviewApi } from '../APIs/reviewApi.js';
import { initializeCreateReviewModal, showEditReviewModal } from '../Components/modals/createReviewModal.js';
import { initializeCommentsModalLogic, showCommentsModal } from '../Components/modals/commentsModal.js';
import { initializeReviewDetailModalLogic, showReviewDetailModal } from '../Components/modals/reviewDetailModal.js';
import { initializeDeleteModalsLogic, showDeleteReviewModal } from '../Components/modals/deleteModals.js';

const getCurrentUserId = () => localStorage.getItem('userId');
const isLoggedIn = () => getCurrentUserId() !== null;
const normalizeId = (id) => String(id || '').toLowerCase().trim();

export const modalsState = {
    followingUsers: new Set(), 
    followerUsers: new Set(),  
    
    mockReviews: [ 
        { 
            id: 'rev1', userId: '22222222-2222-2222-2222-222222222222', username: 'vinyl_collector', 
            song: 'Bohemian Rhapsody', artist: 'Queen', contentType: 'song', 
            comment: 'Una obra maestra atemporal.', rating: 5, likes: 45, comments: 12, userLiked: false, 
            avatar: '../Assets/default-avatar.png' 
        },
        { 
            id: 'rev2', userId: '33333333-3333-3333-3333-333333333333', username: 'jazz_night', 
            song: 'Kind of Blue', artist: 'Miles Davis', contentType: 'album', 
            comment: 'El álbum de jazz más importante.', rating: 5, likes: 38, comments: 8, userLiked: true, 
            avatar: '../Assets/default-avatar.png' 
        },
        { 
            id: 'rev6', userId: '55555555-5555-5555-5555-555555555555', username: 'metalhead99', 
            song: 'Master of Puppets', artist: 'Metallica', contentType: 'album', 
            comment: 'Thrash metal en su máxima expresión.', rating: 5, likes: 41, comments: 11, userLiked: true, 
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

async function loadReviewsLogic(filterType) {
    const reviewsList = document.getElementById('reviewsList');
    const reviewsEmpty = document.getElementById('reviewsEmpty');
    
    if (!reviewsList) return;
    
    // Mostrar spinner o limpiar mientras carga
    reviewsList.innerHTML = '<div class="text-center text-white p-3"><i class="fas fa-spinner fa-spin"></i> Cargando reseñas...</div>';
    if (reviewsEmpty) reviewsEmpty.style.display = 'none';

    let rawReviews = [];

    try {
        switch (filterType) {
            case 'seguidores': 
                // Traer reseñas de quienes ME SIGUEN (Followers)
                rawReviews = await ReviewApi.getReviewsByFollowers();
                break;
            case 'seguidos': 
                // Traer reseñas de quienes YO SIGO (Following)
                rawReviews = await ReviewApi.getReviewsByFollowing();
                break;
            default:
                rawReviews = [];
        }
    } catch (e) {
        console.error("Error cargando reseñas:", e);
        rawReviews = [];
    }
    
    // Si no hay datos, mostrar vacío
    if (!rawReviews || rawReviews.length === 0) {
        reviewsList.innerHTML = '';
        reviewsList.style.display = 'none';
        if (reviewsEmpty) {
            reviewsEmpty.innerHTML = '<div class="review-empty"><i class="fas fa-comment-slash mb-2"></i><p>No hay reseñas en esta sección.</p></div>';
            reviewsEmpty.style.display = 'flex'; 
        }
    } else {
        // Mapear datos del backend al formato visual
        const frontendReviews = rawReviews.map(mapBackendReviewToFrontend);

        if (reviewsEmpty) reviewsEmpty.style.display = 'none';
        reviewsList.style.display = 'block';
        
        // Renderizar
        renderReviews(frontendReviews); 
    }
}
function mapBackendReviewToFrontend(r) {
    // Como el ReviewResponse del backend es limitado, usamos placeholders para lo que falta.
    return {
        id: r.reviewId || r.ReviewId,
        userId: r.userId || r.UserId,
        username: 'Usuario', // El backend actual no envía Username en este endpoint
        song: r.title || 'Título Desconocido',   // Usamos Title como canción
        artist: 'Artista', // El backend no envía artista
        comment: r.content || r.Content || '',
        rating: r.rating || r.Rating || 0,
        likes: 0, // Dato no disponible en este endpoint
        comments: 0,
        userLiked: false,
        avatar: '../Assets/default-avatar.png'
    };
}

// En JS/Pages/amigos.js

function renderReviews(reviews) {
    const reviewsList = document.getElementById('reviewsList');
    if (!reviewsList) return;

    const currentUserId = getCurrentUserId();
    const defaultAvatar = '../Assets/default-avatar.png';
    // Usamos una imagen de disco genérica si no hay portada, o la que venga del backend
    const defaultCover = '../Assets/default-album-cover.png'; // Asegúrate de tener algo similar o usa el avatar como fallback

    reviewsList.innerHTML = reviews.map(review => {
        const reviewId = review.id;
        const targetUserId = normalizeId(review.userId);
        const isFollowing = modalsState.followingUsers.has(targetUserId); 
        const isOwn = currentUserId && (normalizeId(currentUserId) === targetUserId);
        
        // Simulamos o recuperamos la imagen del contenido (Asegúrate de que tu backend la envíe en el futuro)
        // Si tu objeto review ya tiene 'image', úsalo. Si no, usaremos el avatar como placeholder visual temporal.
        const contentImage = review.image || review.cover || review.img || 'https://via.placeholder.com/150/000000/FFFFFF/?text=Music'; 

        const followBtnHTML = (!isOwn && isLoggedIn()) ? `
            <button class="feed-follow-btn ${isFollowing ? 'following' : ''}" 
                    data-user-id="${review.userId}"
                    data-username="${review.username}">
                ${isFollowing ? 'Siguiendo' : 'Seguir'}
            </button>
        ` : '';

        return `
        <div class="feed-card" data-review-id="${reviewId}">
            
            <div class="feed-header">
                <div class="feed-user-info review-clickable" data-review-id="${reviewId}">
                    <img src="${review.avatar || defaultAvatar}" class="feed-avatar" onerror="this.src='${defaultAvatar}'">
                    <div class="feed-meta">
                        <span class="feed-username">${review.username}</span>
                        <span class="feed-action">reseñó ${review.contentType === 'song' ? 'una canción' : 'un álbum'}</span>
                    </div>
                </div>
                ${followBtnHTML}
            </div>

            <div class="feed-music-content review-clickable" data-review-id="${reviewId}">
                <div class="music-cover-wrapper">
                    <img src="${contentImage}" class="music-cover" alt="${review.song}" onerror="this.src='${defaultAvatar}'">
                    <div class="music-badge">
                        <i class="fas ${review.contentType === 'song' ? 'fa-music' : 'fa-compact-disc'}"></i>
                    </div>
                </div>
                <div class="music-details">
                    <h3 class="music-title">${review.song}</h3>
                    <p class="music-artist">${review.artist}</p>
                    <div class="feed-rating">
                        ${renderStars(review.rating)}
                    </div>
                </div>
            </div>

            <div class="feed-review-text">
                <p>"${review.comment}"</p>
            </div>

            <div class="feed-footer">
                <div class="interaction-group">
                    <button class="feed-btn btn-like ${review.userLiked ? 'liked' : ''}" data-review-id="${review.id}">
                        <i class="${review.userLiked ? 'fas' : 'far'} fa-heart"></i>
                        <span>${review.likes}</span>
                    </button>
                    <button class="feed-btn comment-btn" data-review-id="${review.id}">
                        <i class="far fa-comment"></i>
                        <span>${review.comments || 0}</span>
                    </button>
                    <button class="feed-btn share-btn">
                        <i class="far fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');

    AmigosHandler.addReviewEventListeners(reviewsList, modalsState);
}


export async function initializeAmigosPage() {
    console.log('🚀 Inicializando Amigos Page...');

    // 1. Inicializar lógica de modales
    initializeCreateReviewModal(modalsState);
    initializeCommentsModalLogic(modalsState);
    initializeReviewDetailModalLogic(modalsState);
    initializeDeleteModalsLogic(modalsState);

    if (typeof window !== 'undefined') {
        window.showEditReviewModal = (id, t, c, r) => showEditReviewModal(id, t, c, r, modalsState);
        window.showDeleteReviewModal = (id, title) => showDeleteReviewModal(id, title, modalsState);
        window.showReviewDetailModal = (id) => showReviewDetailModal(id, modalsState);
        window.showCommentsModal = (id) => showCommentsModal(id, modalsState);
    }

    await AmigosHandler.init(modalsState);
    
    console.log(`✅ Datos cargados. Seguidos: ${modalsState.followingUsers.size}`);

    modalsState.loadReviews(); 
}