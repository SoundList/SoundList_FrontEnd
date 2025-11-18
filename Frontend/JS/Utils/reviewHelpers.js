/**
 * Utilidades compartidas para reseñas
 * Funciones reutilizables para renderizado y alertas
 */

/**
 * Renderiza estrellas según el rating
 * @param {number} rating - Rating de 0 a 5
 * @returns {string} HTML de las estrellas
 */
export function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    let stars = '';
    for (let i = 0; i < fullStars; i++) { stars += '<span class="star full-star">★</span>'; }
    if (hasHalfStar) { stars += '<span class="star half-star">★</span>'; }
    for (let i = 0; i < emptyStars; i++) { stars += '<span class="star empty-star">★</span>'; }
    return stars;
}

/**
 * Muestra una alerta en la página
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de alerta (success, error, info, warning)
 */
export function showAlert(message, type) {
    const existingAlerts = document.querySelectorAll('.custom-alert');
    existingAlerts.forEach(alert => alert.remove());

    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert custom-alert-${type}`;
    alertDiv.innerHTML = `
        <div class="alert-content">
            <i class="alert-icon"></i>
            <span class="alert-message">${message}</span>
            <button type="button" class="alert-close">&times;</button>
        </div>
    `;

    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(alertDiv, mainContent.firstChild);

    const closeBtn = alertDiv.querySelector('.alert-close');
    closeBtn.addEventListener('click', () => {
        alertDiv.remove();
    });

    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

