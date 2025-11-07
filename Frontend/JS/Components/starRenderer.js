
/**
 * Genera el HTML de la calificación usando caracteres Unicode para las estrellas.
 * @param {number} rating - La calificación (ej: 4.5).
 * @returns {string} HTML de los iconos de estrellas.
 */
function renderStars(rating) {
    const safeRating = Math.max(0, Math.min(5, rating || 0)); 

    const fullStars = Math.floor(safeRating);
    const hasHalfStar = (safeRating % 1) >= 0.5;
    
    let starsHtml = '';

    // 1. Estrellas llenas (★)
    for (let i = 0; i < fullStars; i++) {
        starsHtml += '<span class="star full-star">&#9733;</span>';
    }

    // 2. Media estrella (si aplica)
    if (hasHalfStar) {
        starsHtml += '<span class="star half-star">&#9733;</span>';
    }

    // 3. Estrellas vacías para completar a 5 (☆)
    const totalStarsRendered = fullStars + (hasHalfStar ? 1 : 0);
    const emptyStars = 5 - totalStarsRendered;

    for (let i = 0; i < emptyStars; i++) {
        starsHtml += '<span class="star empty-star">&#9734;</span>';
    }

    return starsHtml;
}