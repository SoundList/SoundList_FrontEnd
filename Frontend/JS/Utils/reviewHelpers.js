import { getFollowing, searchUsers } from '../APIs/AmigosApi.js';

const alertQueue = [];
let isAlertVisible = false;
let alertTimeout = null;

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


function ensureAlertContainerExists() {
    let container = document.getElementById('alertContainer');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'alertContainer';

        document.body.insertBefore(container, document.body.firstChild);
        
        console.log("🔧 Sistema de Alertas: Contenedor creado automáticamente.");
    }
    return container;
}

// --- LÓGICA PRINCIPAL ---

export function showAlert(message, type = 'info') {
    ensureAlertContainerExists();
    
    alertQueue.push({ message, type });
    processAlertQueue();
}

function processAlertQueue() {
    if (isAlertVisible || alertQueue.length === 0) return;
    isAlertVisible = true;

    const nextAlert = alertQueue.shift();
    renderAlert(nextAlert.message, nextAlert.type);
}

function renderAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer'); // Ya sabemos que existe

    // Iconos
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

    alertContainer.innerHTML = '';
    alertContainer.append(alertDiv);

    const closeThisAlert = () => {
        if (alertTimeout) clearTimeout(alertTimeout);
    
        alertDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        alertDiv.style.opacity = '0';
        alertDiv.style.transform = 'translateY(-10px)';

        setTimeout(() => {
            if (alertDiv.parentNode) alertDiv.remove();
            isAlertVisible = false;
            processAlertQueue(); 
        }, 200); 
    };

    const closeBtn = alertDiv.querySelector('.alert-close');
    closeBtn.addEventListener('click', closeThisAlert);
    
    alertTimeout = setTimeout(closeThisAlert, 3000);
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

