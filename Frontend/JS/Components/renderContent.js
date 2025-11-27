import { createAudioPlayer } from './audioPlayer.js'; 

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
    const title = review.itemTitle || review.song || review.title || review.Title || review.album;
    const artist =review.artistName || review.artist || review.ArtistName;
    const type = review.contentType || review.type;
    const username = review.username || "Usuario";
    const avatar = review.avatar || "../Assets/default-avatar.png";
    const comment = review.comment || "";
    const rating = review.rating || 0;

    const starsHtml = typeof createStarRating === 'function' ? createStarRating(rating, false) : `${rating}/5 ⭐`;

    return `
    <div class="review-item" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 1rem 0;">
        <div class="review-user">
            <img src="${avatar}" alt="${username}" class="review-avatar" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
            <div class="review-info ms-3">
                <div style="font-size: 0.8rem; margin-bottom: 4px; color: #aaa; display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
                    <span style="color: #fff; font-weight: 700;">${username}</span>
                    <span>•</span>
                    <span style="color: #7C3AED; font-weight: 600; text-transform: uppercase; font-size: 0.7rem;">${type}</span>
                    <span>-</span>
                    <span style="color: #fff; font-weight: 600;">${title}</span>
                    <span>-</span>
                    <span>${artist}</span>
                </div>
                <strong style="display:block; color: #fff; margin-bottom: 2px;">${review.title || ''}</strong>
                <p class="review-comment" style="margin: 0; color: rgba(255,255,255,0.9); font-size: 0.95rem;">${comment}</p>
            </div>
        </div>
        <div class="review-actions">
            <div class="review-rating" style="color: #FFD700; font-size: 0.9rem;">
                ${starsHtml}
            </div>
        </div>
    </div>`;
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

