/**
 * Utilidades para el feed de reseñas
 * Funciones para filtros y gestión del estado de reviews
 */

/**
 * Establece el filtro de reseñas (popular o recent)
 * @param {string} filter - 'popular' o 'recent'
 * @param {Function} setCurrentFilter - Función para actualizar el filtro actual
 * @param {Function} loadReviewsCallback - Función para recargar reseñas
 */
export function setReviewFilter(filter, setCurrentFilter, loadReviewsCallback) {
    // Actualizar estado del filtro
    if (typeof setCurrentFilter === 'function') {
        setCurrentFilter(filter);
    }
    
    // Actualizar UI
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    // Recargar reseñas con el nuevo filtro
    if (typeof loadReviewsCallback === 'function') {
        loadReviewsCallback();
    }
}

