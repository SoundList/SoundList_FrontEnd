import { getFollowing, searchUsers } from '../APIs/AmigosApi.js';

// ----------------------------------------------------------------------
// A. FUNCIONES DE UTILIDAD VISUAL
// ----------------------------------------------------------------------


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
export function showAlert(message, type = 'info') {
    const existingAlerts = document.querySelectorAll('.custom-alert');
    existingAlerts.forEach(alert => alert.remove());

    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'warning') iconClass = 'fa-exclamation-triangle';
    if (type === 'danger' || type === 'error') {
        iconClass = 'fa-times-circle';
        type = 'danger'; 
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert custom-alert-${type}`;
    
    alertDiv.innerHTML = `
        <div class="alert-content">
            <div class="alert-icon">
                <i class="fas ${iconClass}"></i>
            </div>
            <span class="alert-message">${message}</span>
            <button type="button" class="alert-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    const mainContent = document.querySelector('.main-content');
    const alertContainer = document.getElementById('alertContainer'); 
    
    if (alertContainer) {
        alertContainer.innerHTML = '';
        alertContainer.append(alertDiv);
    } else if (mainContent) {
        mainContent.insertBefore(alertDiv, mainContent.firstChild);
    } else {
        document.body.insertBefore(alertDiv, document.body.firstChild);
    }

    const closeBtn = alertDiv.querySelector('.alert-close');
    closeBtn.addEventListener('click', () => {
        alertDiv.remove();
    });

    setTimeout(() => {
        if (alertDiv && alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 4000);
}

if (typeof window !== 'undefined') {
    window.showAlert = showAlert;
}

/**
 * @param {Array<Object>} reviews La lista de reseñas a enriquecer.
 * @returns {Promise<Array<Object>>} La lista de reseñas con la bandera isFollowingAuthor.
 */
export async function enrichReviewsWithSocialStatus(reviews) {
    if (!reviews || reviews.length === 0) return [];

    try {
        // Obtenemos la lista de IDs (Strings)
        const rawFollowing = await getFollowing(); 
        const myFollowingIds = Array.isArray(rawFollowing) ? rawFollowing : [];

        return reviews.map(review => {
            const authorId = review.userId || review.authorId;
            
            // CORRECCIÓN: Usamos .includes() porque myFollowingIds es una lista de IDs
            const isFollowingAuthor = myFollowingIds.includes(authorId);

            return {
                ...review,
                isFollowingAuthor: isFollowingAuthor,
                authorId: authorId 
            };
        });
    } catch (error) {
        console.error("Error enriqueciendo reseñas:", error);
        return reviews; // Retorna las reseñas originales si falla la API
    }
}

