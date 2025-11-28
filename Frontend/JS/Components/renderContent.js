import { createAudioPlayer } from './audioPlayer.js';
import { renderStars } from '../Utils/reviewHelpers.js';

export function createSongListItem(song, index) {
    // 1. Normalización de datos (Evita errores de undefined)
    const apiId = song.apiSongId || song.ApiSongId;
    const preview = song.previewUrl || song.PreviewUrl;
    const title = song.title || song.Title || "Canción sin título";
    // const artist = ... (Ya no lo necesitamos)
    
    const domId = song.songId || song.SongId || index;
    const listPlayerId = `list-player-${domId}`;
    
    // 2. Lógica del Botón de Play
    const hasPreview = preview && preview !== "";
    
    const playButtonHtml = hasPreview 
        ? `<button class="list-play-btn" onclick="event.stopPropagation(); toggleListPlay('${listPlayerId}', '${preview}')">
            <i class="fas fa-play" id="icon-${listPlayerId}"></i>
        </button>
        <audio id="audio-${listPlayerId}" src="${preview}"></audio>`
        : `<span class="no-preview-text" title="Vista previa no disponible">-</span>`;

    // 3. Acción de navegación segura
    const rowAction = apiId 
        ? `window.location.href='song.html?id=${apiId}'`
        : `console.warn('Fila sin ID:', '${title}')`;

    return `
    <li class="song-item" onclick="${rowAction}">
        <span class="song-number">${index + 1}</span>

        <div class="song-info" style="justify-content: center;"> <span class="song-title ${hasPreview ? 'text-white' : 'text-muted'}">${title}</span>
            </div>
        
        <div class="song-actions">
            ${playButtonHtml}
        </div>
    </li>`;
}

export function createReviewCard(review) {
    const currentUserId = localStorage.getItem('userId');
    const isLoggedIn = currentUserId !== null;
    let reviewId = review.id || review.ReviewId || review.reviewId;

    if (reviewId) {
        reviewId = String(reviewId).trim();
        if (!reviewId || reviewId === 'null' || reviewId === 'undefined') {
            console.warn('Reseña con ID inválido en createReviewCard, omitiendo:', { review, reviewId });
            return '';
        }
    } else {
        console.warn(' Reseña sin ID en createReviewCard, omitiendo:', review);
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

    // --- LÓGICA RECUPERADA: Ocultar botón editar si tiene likes ---
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
                                style="${editButtonStyle}">
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
}


export function createStarRating(rating, large = true) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const halfStar = (rating % 1) >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    const starClass = large ? 'fas' : 'fas fa-sm'; // Bootstrap 5 no usa 'fa-lg' igual

    for (let i = 0; i < fullStars; i++) {
        stars += `<i class="${starClass} fa-star"></i>`;
    }
    if (halfStar) {
        stars += `<i class="${starClass} fa-star-half-alt"></i>`;
    }
    for (let i = 0; i < emptyStars; i++) {
        stars += `<i class="far fa-star"></i>`; 
    }
    return stars;
}



export function createAlbumListItem(album, index) {
    const apiId = album.apiAlbumId || album.ApiAlbumId || album.id;
    const title = album.title || album.Title || "Álbum sin título";
    const releaseDate = album.releaseDate || album.ReleaseDate || "-";
    
    // Formatear fecha si es necesario (simple)
    const year = releaseDate.split('T')[0].split('-')[0];

    // Acción de navegación
    const rowAction = apiId 
        ? `window.location.href='album.html?id=${apiId}'`
        : `console.error('Error: Álbum sin ID:', '${title}')`;

    return `
    <li class="song-item" onclick="${rowAction}" style="cursor: pointer;">
        <span class="song-number">${index + 1}</span>

        <div class="song-info">
            <span class="song-title text-white">${title}</span>
            <span class="song-artist">${year}</span>
        </div>
        
        <div class="song-actions">
            <i class="fas fa-chevron-right" style="color: rgba(255,255,255,0.3); font-size: 0.9rem;"></i>
        </div>
    </li>`;
}

// Lógica global para el reproductor de lista
window.toggleListPlay = function(id, url) {
    const audio = document.getElementById(`audio-${id}`);
    const icon = document.getElementById(`icon-${id}`);

    if (!audio) return;

    // 1. Pausar TODOS los audios que estén sonando (incluyendo el player grande si existe)
    document.querySelectorAll('audio').forEach(a => {
        if (a.id !== `audio-${id}`) {
            a.pause();
            a.currentTime = 0; // Reiniciar
            
            // Resetear íconos de otros botones de lista
            const otherId = a.id.replace('audio-', '');
            const otherIcon = document.getElementById(`icon-${otherId}`);
            if (otherIcon) {
                otherIcon.classList.remove('fa-pause');
                otherIcon.classList.add('fa-play');
            }
        }
    });

    // 2. Toggle Play/Pause del actual
    if (audio.paused) {
        audio.play();
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
        
        // Efecto visual en la fila (opcional)
        const row = icon.closest('.song-item');
        if (row) row.classList.add('playing');
    } else {
        audio.pause();
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
        
        const row = icon.closest('.song-item');
        if (row) row.classList.remove('playing');
    }

    // 3. Cuando termine, resetear icono
    audio.onended = () => {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
        const row = icon.closest('.song-item');
        if (row) row.classList.remove('playing');
    };
};

