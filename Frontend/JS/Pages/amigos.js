import { AmigosHandler } from '../Handlers/amigosHandler.js';
import { renderStars } from '../Components/starRenderer.js';
import { initializeCreateReviewModal, showEditReviewModal } from '../Components/modals/createReviewModal.js';
import { initializeCommentsModalLogic, showCommentsModal } from '../Components/modals/commentsModal.js';
import { initializeReviewDetailModalLogic, showReviewDetailModal } from '../Components/modals/reviewDetailModal.js';
import { initializeDeleteModalsLogic, showDeleteReviewModal } from '../Components/modals/deleteModals.js';
import * as socialApi from '../APIs/socialApi.js';
import * as contentApi from '../APIs/contentApi.js';

// --- CONFIGURACIÓN ---
const getCurrentUserId = () => localStorage.getItem('userId');
const normalizeId = (id) => String(id || '').toLowerCase().trim();
const FALLBACK_IMAGE = '../Assets/default-avatar.png'; 
const FALLBACK_COVER = '../Assets/default-avatar.png'; 

export const modalsState = {
    followingUsers: new Set(), 
    followerUsers: new Set(),  
    
    loadReviews: (newFilter) => {
        const activeFilter = document.querySelector('.filter-btn.active');
        const filterType = newFilter || (activeFilter ? activeFilter.dataset.filter : 'seguidores'); 
        loadReviewsLogic(filterType);
    },

    toggleLike: (reviewId, buttonElement) => {
        const icon = buttonElement.querySelector('i');
        const likesSpan = buttonElement.querySelector('.review-likes-count');
        const isLiked = buttonElement.classList.contains('liked');
        let count = parseInt(likesSpan?.textContent) || 0;

        if (isLiked) {
            buttonElement.classList.remove('liked');
            if (icon) { icon.classList.remove('fas'); icon.classList.add('far'); icon.style.color = ''; }
            if (likesSpan) likesSpan.textContent = Math.max(0, count - 1);
            socialApi.deleteReviewReaction(reviewId, getCurrentUserId(), localStorage.getItem('authToken'));
        } else {
            buttonElement.classList.add('liked');
            if (icon) { icon.classList.remove('far'); icon.classList.add('fas'); icon.style.color = '#EC4899'; }
            if (likesSpan) likesSpan.textContent = count + 1;
            socialApi.addReviewReaction(reviewId, getCurrentUserId(), localStorage.getItem('authToken'));
        }
    }
};

async function loadReviewsLogic(filterType) {
    const reviewsList = document.getElementById('reviewsList');
    const reviewsEmpty = document.getElementById('reviewsEmpty');
    
    if (!reviewsList) return;
    
    reviewsList.innerHTML = '<div class="text-center text-white p-5"><i class="fas fa-spinner fa-spin fa-2x"></i><p class="mt-2">Cargando feed...</p></div>';
    if (reviewsEmpty) reviewsEmpty.style.display = 'none';

    try {
        const allReviews = await socialApi.getAllReviews();
        console.log("📦 [DEBUG] Raw Reviews del Backend:", allReviews); // LOG CLAVE 1

        // 1. MAPEO 
        let processedReviews = allReviews.map(mapBackendReviewToFrontend);

        // 2. FILTRADO 
        if (filterType === 'seguidos') {
            processedReviews = processedReviews.filter(r => 
                modalsState.followingUsers.has(normalizeId(r.userId))
            );
            
            if (processedReviews.length === 0 && modalsState.followingUsers.size === 0) {
                reviewsList.innerHTML = '';
                if (reviewsEmpty) {
                    reviewsEmpty.style.display = 'block';
                    reviewsEmpty.innerHTML = `<div style="text-align:center; padding:2rem; color:white;"><p>No sigues a nadie aún.</p></div>`;
                    return;
                }
            }
        }

        if (processedReviews.length === 0) {
            reviewsList.innerHTML = '';
            if (reviewsEmpty) {
                reviewsEmpty.style.display = 'block';
                reviewsEmpty.innerHTML = `<div style="text-align:center; padding:2rem; color:white;"><p>No hay reseñas.</p></div>`;
            }
        } else {
            if (reviewsEmpty) reviewsEmpty.style.display = 'none';
            renderReviews(processedReviews);
            enrichReviewsData(processedReviews);
        }

    } catch (e) {
        console.error("Error cargando feed:", e);
        reviewsList.innerHTML = '<div class="text-center text-danger p-4">Error al cargar.</div>';
    }
}

function mapBackendReviewToFrontend(r) {
    const emptyGuid = "00000000-0000-0000-0000-000000000000";
    
    // --- CORRECCIÓN CRÍTICA: "RED DE ARRASTRE" DE IDs ---
    // Buscamos en TODAS las posibles propiedades donde el backend pudo haber puesto el ID
    const rawSongId = r.songId || r.SongId || r.apiSongId || r.APISongId || r.ApiSongId;
    const rawAlbumId = r.albumId || r.AlbumId || r.apiAlbumId || r.APIAlbumId || r.ApiAlbumId;

    const validSongId = (rawSongId && rawSongId !== emptyGuid) ? rawSongId : null;
    const validAlbumId = (rawAlbumId && rawAlbumId !== emptyGuid) ? rawAlbumId : null;

    const type = validSongId ? 'song' : 'album';

    return {
        id: r.reviewId || r.ReviewId || r.id,
        userId: r.userId || r.UserId,
        songId: validSongId, 
        albumId: validAlbumId,
        contentType: type,
        
        username: 'Usuario', 
        song: 'Cargando...',
        artist: '...',
        image: FALLBACK_COVER, 
        
        reviewTitle: r.title || r.Title || '', 
        comment: r.content || r.Content || '',
        rating: r.rating || r.Rating || 0,
        likes: r.likes || r.Likes || r.reactionCount || 0,
        comments: r.comments || r.Comments || r.commentCount || 0,
        userLiked: r.userLiked || r.UserLiked || false,
        avatar: FALLBACK_IMAGE
    };
}

function enrichReviewsData(reviews) {
    let hayCambios = false;
    const promises = [];

    // A. USUARIOS
    const missingUsers = reviews.filter(r => r.username === 'Usuario' && r.userId);
    if (missingUsers.length > 0) {
        const userIds = [...new Set(missingUsers.map(r => r.userId))];
        promises.push(Promise.all(userIds.map(id => socialApi.getUser(id))).then(users => {
            const userMap = {};
            users.forEach(u => { if(u) userMap[normalizeId(u.id || u.userId)] = u; });
            
            reviews.forEach(r => {
                const u = userMap[normalizeId(r.userId)];
                if (u) {
                    r.username = u.username || u.Username;
                    r.avatar = u.imgProfile || u.image || r.avatar;
                    hayCambios = true;
                }
            });
        }));
    }

    // B. MÚSICA
    const missingContent = reviews.filter(r => r.song === 'Cargando...' && (r.songId || r.albumId));
    
    if (missingContent.length > 0) {
        console.log(`[Enrich] Intentando enriquecer ${missingContent.length} reseñas.`); // LOG CLAVE 2
        
        const contentPromises = missingContent.map(async r => {
            try {
                if (r.songId) {
                    console.log(`[Enrich] Pidiendo Canción ID: ${r.songId}`); // LOG CLAVE 3
                    const data = await contentApi.getSongById(r.songId);
                    
                    if (data) {
                        r.song = data.title || data.Title || data.name;
                        r.artist = data.artistName || data.ArtistName || data.artist?.name;
                        r.image = data.image || data.Image || data.coverImage || r.image;
                        hayCambios = true;
                    } else {
                        console.warn(`[Enrich] Canción NULL para ID: ${r.songId}`);
                        r.song = "Canción no disponible";
                    }
                } else if (r.albumId) {
                    const data = await contentApi.getAlbumById(r.albumId);
                    if (data) {
                        r.song = data.title || data.Title || data.name;
                        r.artist = data.artistName || data.ArtistName || data.artist?.name;
                        r.image = data.image || data.Image || data.coverImage || r.image;
                        hayCambios = true;
                    } else {
                        r.song = "Álbum no disponible";
                    }
                }
            } catch(e) { console.log("Error fetch content", e); }
        });
        promises.push(Promise.all(contentPromises));
    }

    // C. ACTUALIZAR DOM
    Promise.all(promises).then(() => {
        if (hayCambios) renderReviews(reviews);
    });
}

function renderReviews(reviews) {
    const reviewsList = document.getElementById('reviewsList');
    if (!reviewsList) return;

    const currentUserId = normalizeId(getCurrentUserId());

    reviewsList.innerHTML = reviews.map(review => {
        const targetUserId = normalizeId(review.userId);
        const isFollowing = modalsState.followingUsers.has(targetUserId); 
        const isOwn = currentUserId && (currentUserId === targetUserId);
        
        const contentImage = (review.image && review.image.length > 10) ? review.image : FALLBACK_COVER;
        const followBtnHTML = (!isOwn && currentUserId) ? `
            <button class="feed-follow-btn ${isFollowing ? 'following' : ''}" 
                    data-user-id="${review.userId}"
                    data-username="${review.username}">
                ${isFollowing ? 'Siguiendo' : 'Seguir'}
            </button>` : '';

        const heartClass = review.userLiked ? 'fas' : 'far';
        const likeBtnClass = review.userLiked ? 'liked' : '';

        return `
        <div class="feed-card" data-review-id="${review.id}">
            <div class="feed-header">
                <div class="feed-user-info review-clickable" data-review-id="${review.id}">
                    <img src="${review.avatar}" class="feed-avatar" onerror="this.src='${FALLBACK_IMAGE}'">
                    <div class="feed-meta">
                        <span class="feed-username">${review.username}</span>
                        <span class="feed-action">reseñó ${review.contentType === 'song' ? 'una canción' : 'un álbum'}</span>
                    </div>
                </div>
                ${followBtnHTML}
            </div>

            <div class="feed-music-content review-clickable" data-review-id="${review.id}">
                <div class="music-cover-wrapper">
                    <img src="${contentImage}" class="music-cover" onerror="this.src='${FALLBACK_COVER}'">
                    <div class="music-badge"><i class="fas ${review.contentType === 'song' ? 'fa-music' : 'fa-compact-disc'}"></i></div>
                </div>
                <div class="music-details">
                    <h3 class="music-title">${review.song}</h3>
                    <p class="music-artist">${review.artist}</p>
                    <div class="feed-rating">${renderStars(review.rating)}</div>
                </div>
            </div>

            <div class="feed-review-text">
                ${review.reviewTitle ? `<h4 class="review-content-title">${review.reviewTitle}</h4>` : ''}
                <p>"${review.comment}"</p>
            </div>

            <div class="feed-footer">
                <div class="interaction-group">
                    <button class="feed-btn btn-like ${likeBtnClass}" data-review-id="${review.id}">
                        <i class="${heartClass} fa-heart"></i>
                        <span class="review-likes-count">${review.likes}</span>
                    </button>
                    <button class="feed-btn comment-btn" data-review-id="${review.id}">
                        <i class="far fa-comment"></i>
                        <span>${review.comments}</span>
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');

    AmigosHandler.addReviewEventListeners(reviewsList, modalsState);
}

export async function initializeAmigosPage() {
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
    modalsState.loadReviews(); 
}