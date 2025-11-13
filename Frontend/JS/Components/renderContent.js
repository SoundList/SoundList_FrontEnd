

export function createSongListItem(song, index) {
    return `
    <li class="song-item" data-song-id="${song.apiSongId}">
        <span class="song-number">${index + 1}.</span>
        <div class="song-info">
            <span class="song-title">${song.title}</span>
            <span class="song-artist">${song.artistName || 'Artista'}</span>
        </div>
        <span class="song-duration">${formatDuration(song.duration)}</span>
    </li>`;
}

export function createReviewCard(review) {
    return `
    <div class="review-item" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 1rem 0;">
        <div class="review-user">
            <img src="${review.avatar}" alt="${review.username}" class="review-avatar" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
            <div class="review-info ms-3">
                <span class="review-username" style="font-weight: 700; color: #fff;">${review.username}</span>
                <p class="review-comment" style="margin: 0; color: rgba(255,255,255,0.8);">${review.comment}</p>
            </div>
        </div>
        <div class="review-actions">
            <div class="review-rating" style="color: #FFD700; font-size: 1rem;">
                ${createStarRating(review.rating, false)}
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



function formatDuration(durationString) {
    try {
        const parts = durationString.split(':');
        const minutes = parseInt(parts[1], 10);
        const seconds = parseInt(parts[2].split('.')[0], 10);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    } catch (e) {
        return "0:00";
    }
}

export function createAlbumListItem(album, index) {
    // Manejar mayúsculas/minúsculas de la API
    const albumId = album.apiAlbumId || album.APIAlbumId || '';
    const title = album.title || album.Title || 'Álbum Desconocido';
    const releaseDate = album.releaseDate || album.ReleaseDate;
    
    let year = '----';
    if (releaseDate) {
        try {
            // Obtener solo el año
            year = new Date(releaseDate).getFullYear();
        } catch (e) {
            console.warn(`Fecha de álbum inválida: ${releaseDate}`);
        }
    }

    // (Asegúrate de que la navegación sea correcta,
    //  si artists.html está en /HTML/, album.html también debería estarlo)
    const navigationUrl = `./album.html?id=${albumId}`;

    return `
    <li class="song-item" data-album-id="${albumId}" onclick="window.location.href='${navigationUrl}'" style="cursor: pointer;">
        <span class="song-number">${index + 1}.</span>
        <div class="song-info">
            <span class="song-title">${title}</span>
            <span class="song-artist">${year}</span>
        </div>
    </li>
    `;
}