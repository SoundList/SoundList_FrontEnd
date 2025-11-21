
/**
 * Renderiza la lista de items en el contenedor del ranking.
 */
export function renderRankingList(items, tipo) {
    const rankingList = document.getElementById('rankingList');
    if (!rankingList) return;

    // Ya filtramos en el handler, pero si queda vacía, mostramos estado vacío
    if (!items || items.length === 0) {
        showEmptyState();
        return;
    }

    rankingList.innerHTML = items.map((item, index) => {
        const position = index + 1;
        const defaultImg = '../Assets/default-avatar.png';

        // Mapeamos los campos
        const name = item.title;
        const artist = item.artistName || 'Artista Desconocido'; 
        const image = item.image || defaultImg;
        const rating = item.calification;
        const reviews = item.reviewCount; // <--- USAMOS EL CAMPO ENRIQUECIDO

            return `
            <div class="ranking-item">
                <div class="ranking-position">${position}.</div>
                <div class="ranking-info">
                    <img src="${image}" 
                        alt="${name}" 
                        class="ranking-cover"
                        onerror="this.src='${defaultImg}'">
                    <div class="ranking-details">
                        <div class="ranking-name">${name} - ${artist}</div>
                    </div>
                </div>
                <div class="ranking-rating-container">
                    <div class="ranking-rating">
                        ${generateStars(rating)}
                    </div>
                    <div class="ranking-review-count">${reviews} reviews</div>
                </div>
            </div>
            `;
        }).join('');
}

/**
 * Muestra un mensaje de cargando en la lista.
 */
export function showLoading() {
    const rankingList = document.getElementById('rankingList');
    if (rankingList) {
        rankingList.innerHTML = `<p class="ranking-message">Cargando rankings...</p>`;
    }
}

/**
 * Muestra un mensaje de "No hay datos" en la lista.
 */
export function showEmptyState() {
    const rankingList = document.getElementById('rankingList');
    if (rankingList) {
        rankingList.innerHTML = `<p class="ranking-message">No hay datos para mostrar con estos filtros.</p>`;
    }
}

/**
 * Genera el HTML para las estrellas de calificación.
 * (Copiado de la lógica de 'renderStars' en home.js)
 */
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<span class="star full-star"><i class="fas fa-star"></i></span>';
    }
    if (hasHalfStar) {
        stars += '<span class="star half-star"><i class="fas fa-star-half-alt"></i></span>';
    }
    for (let i = 0; i < emptyStars; i++) {
        stars += '<span class="star empty-star"><i class="far fa-star"></i></span>';
    }
    return stars;
}

/**
 * Actualiza el título principal de la sección de rankings.
 */
export function updateRankingTitle(title) {
    const contentTitle = document.querySelector('.rankings-content-title');
    if (contentTitle) {
        contentTitle.textContent = title;
    }
}

/**
 * Actualiza los tags de filtros activos.
 */
export function updateActiveFiltersTags(tags) {
    const activeFiltersTags = document.querySelector('.filters-active-tags');
    if (activeFiltersTags) {
        activeFiltersTags.textContent = tags;
    }
}