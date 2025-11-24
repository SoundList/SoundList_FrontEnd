import { AmigosHandler } from '../Handlers/amigosHandler.js';
import { renderStars } from '../Components/starRenderer.js';
import { initializeCreateReviewModal, showEditReviewModal } from '../Components/modals/createReviewModal.js';
import { initializeCommentsModalLogic, showCommentsModal } from '../Components/modals/commentsModal.js';
import { initializeReviewDetailModalLogic, showReviewDetailModal } from '../Components/modals/reviewDetailModal.js';
import { initializeDeleteModalsLogic, showDeleteReviewModal } from '../Components/modals/deleteModals.js';
import * as socialApi from '../APIs/socialApi.js';
// Importamos todo de contentApi para tener acceso a tus nuevas funciones
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
        
        let processedReviews = allReviews.map(mapBackendReviewToFrontend);

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
            
            // Aquí llamamos a la función que usa tus NUEVOS endpoints
            enrichReviewsData(processedReviews);
        }

    } catch (e) {
        console.error("Error cargando feed:", e);
        reviewsList.innerHTML = '<div class="text-center text-danger p-4">Error al cargar.</div>';
    }
}

function mapBackendReviewToFrontend(r) {
    const emptyGuid = "00000000-0000-0000-0000-000000000000";
    
    // Capturamos IDs. Priorizamos el GUID (songId) porque tus nuevos endpoints
    // getSongByDbId funcionan con el ID de base de datos.
    const rawSongId = r.songId || r.SongId;
    const rawAlbumId = r.albumId || r.AlbumId;

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
        song: 'Cargando...', // Se actualizará en enrichReviewsData
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

    // A. USUARIOS (Lógica existente)
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

    // B. MÚSICA - USANDO TUS NUEVOS ENDPOINTS DE DB
    const missingContent = reviews.filter(r => r.song === 'Cargando...' && (r.songId || r.albumId));
    
    if (missingContent.length > 0) {
        console.log(`[Enrich] Buscando metadata para ${missingContent.length} reseñas...`);
        
        const contentPromises = missingContent.map(async r => {
            try {
                if (r.songId) {
                    // 1. Usamos tu nueva función getSongByDbId
                    console.log(`[Enrich] Buscando canción por DB ID: ${r.songId}`);
                    // Asegúrate de que en contentApi exportes 'getSongByDbId'
                    const data = await contentApi.getSongByDbId(r.songId);
                    
                    if (data) {
                        // Mapeamos según tu Swagger (title, artistName, image)
                        r.song = data.title || data.Title;
                        r.artist = data.artistName || data.ArtistName || 'Artista Desconocido';
                        r.image = data.image || data.Image || FALLBACK_COVER;
                        hayCambios = true;
                    } else {
                        r.song = "Canción no disponible";
                    }
                } else if (r.albumId) {
                    // 2. Usamos tu nueva función getAlbumById (versión DB)
                    console.log(`[Enrich] Buscando álbum por DB ID: ${r.albumId}`);
                    const data = await contentApi.getAlbumById(r.albumId);
                    
                    if (data) {
                        r.song = data.title || data.Title;
                        r.artist = data.artistName || data.ArtistName || 'Artista Desconocido';
                        r.image = data.image || data.Image || FALLBACK_COVER;
                        hayCambios = true;
                    } else {
                        r.song = "Álbum no disponible";
                    }
                }
            } catch(e) { 
                console.error("Error enriqueciendo contenido:", e); 
            }
        });
        promises.push(Promise.all(contentPromises));
    }

    // C. ACTUALIZAR DOM SI HUBO CAMBIOS
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

        // Determinar icono según tipo
        const iconClass = review.contentType === 'song' ? 'fa-music' : 'fa-compact-disc';
        const contentTypeText = review.contentType === 'song' ? 'una canción' : 'un álbum';

        return `
        <div class="feed-card" data-review-id="${review.id}">
            <div class="feed-header">
                <div class="feed-user-info review-clickable" data-review-id="${review.id}">
                    <img src="${review.avatar}" class="feed-avatar" onerror="this.src='${FALLBACK_IMAGE}'">
                    <div class="feed-meta">
                        <span class="feed-username">${review.username}</span>
                        <span class="feed-action">reseñó ${contentTypeText}</span>
                    </div>
                </div>
                ${followBtnHTML}
            </div>

            <div class="feed-music-content review-clickable" data-review-id="${review.id}">
                <div class="music-cover-wrapper">
                    <img src="${contentImage}" class="music-cover" onerror="this.src='${FALLBACK_COVER}'">
                    <div class="music-badge"><i class="fas ${iconClass}"></i></div>
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