// ===============================================
// 💬 JS/Components/reviewCard.js
// ===============================================

/**
 * Genera el HTML para una tarjeta de reseña.
 * @param {object} review - El objeto reseña del backend.
 * @param {number} currentUserId - El ID del usuario logueado.
 * @returns {string} El HTML completo de la tarjeta.
 */
function createReviewCard(review, currentUserId) {
    // Genera un ID único para el menú
    const menuId = `menu-${review.id || Math.random().toString(36).substr(2, 9)}`;

    // Datos necesarios
    const isOwner = review.userId === currentUserId;
    const isLiked = review.userLiked || false;
    const likeCount = review.likes || 0;

    // Lógica de Opciones (Editar solo si es dueño Y no tiene likes)
    const canEdit = isOwner && likeCount === 0;
    const canDelete = isOwner; 
    const defaultAvatar = "../../Assets/default-avatar.png";

    // Inicia el template literal
    return `
    <div class="review-card position-relative" data-review-id="${review.id}">
        
        <div class="d-flex justify-content-between align-items-start">
            <div class="d-flex align-items-center">
                <img src="${review.avatar || defaultAvatar}" 
                     alt="${review.username} avatar" 
                     class="review-avatar me-2 rounded-circle">
                <h6>${review.username} – ${review.title || 'Reseña sin título'}</h6>
            </div>

            <i class="fa-solid fa-ellipsis-vertical review-options" 
               onclick="toggleReviewMenu(event, '${menuId}')"></i>
        </div>

        <div class="review-content mt-2">
            <p>${review.text}</p>
            <div class="review-stars">
                ${renderStars(review.stars)}
            </div>
        </div>

        <div class="review-actions d-flex justify-content-between align-items-center mt-2">
            <button class="btn-like" data-review-id="${review.id}" onclick="handleLikeToggle(event)">
                <i class="fa-solid fa-heart" style="color: ${isLiked ? 'red' : 'gray'};"></i>
            </button>
            <span class="like-count">${likeCount}</span>
        </div>

        <div id="${menuId}" class="review-menu">
            
            ${isOwner ? `
                <!-- 1. Opciones SI ERES EL DUEÑO -->
                ${canEdit ? `
                    <button data-action="edit" data-review-id="${review.id}" onclick="handleMenuAction(event)">
                        <i class="fa-solid fa-pen"></i> Editar
                    </button>` 
                : ''}<!-- 💡 El 'else' (string vacío) está en la misma línea, arreglando el bug -->
                <button data-action="delete" data-review-id="${review.id}" onclick="handleMenuAction(event)">
                    <i class="fa-solid fa-trash"></i> Eliminar
                </button>
            ` : `
                <!-- 2. Opciones SI NO ERES EL DUEÑO -->
                <button data-action="report" data-review-id="${review.id}" onclick="handleMenuAction(event)">
                    <i class="fa-solid fa-flag"></i> Reportar
                </button>
            `}
            
            <!-- 3. "Ver comentarios" se muestra SIEMPRE -->
            <button data-action="comments" data-review-id="${review.id}" onclick="handleMenuAction(event)">
                <i class="fa-solid fa-comment"></i> Ver comentarios
            </button>
        
        </div>
    </div>
    `; // Fin del template literal
}