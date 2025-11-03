// ===============================================
// 💬 JS/Components/reviewCard.js
// (ACTUALIZADO: Añadido botón "X" estilo Bootstrap)
// ===============================================

/**
 * Genera el HTML para una tarjeta de reseña estándar.
 */
function createReviewCard(review, currentUserId) {
    const menuId = `menu-${review.id || Math.random().toString(36).substr(2, 9)}`;

    const isOwner = review.userId === currentUserId;
    const isLiked = review.userLiked || false;
    const likeCount = review.likes || 0;
    const canEdit = isOwner && likeCount === 0;
    const canDelete = isOwner; 
    const defaultAvatar = "../../Assets/default-avatar.png";

    return `
    <div class="review-card position-relative" data-review-id="${review.id}">
        
        <!-- Fila 1, Col 1: Avatar -->
        <div class="rc-avatar">
            <img src="${review.avatar || defaultAvatar}" 
                 alt="${review.username} avatar" 
                 class="review-avatar rounded-circle">
        </div>

        <!-- Fila 1, Col 2: Título -->
        <h6 class="rc-title">${review.username} – ${review.title || 'Reseña sin título'}</h6>

        <!-- Fila 1, Col 3: Estrellas -->
        <div class="rc-stars">
            <div class="review-stars">
                ${renderStars(review.stars)}
            </div>
        </div>

        <!-- Fila 1, Col 4: Likes -->
        <div class="rc-likes">
            <span class="like-count">${likeCount}</span>
            <button class="btn-like" data-review-id="${review.id}" onclick="handleLikeToggle(event)">
                <i class="fa-solid fa-heart" style="color: ${isLiked ? 'var(--magenta)' : 'var(--blanco)'};"></i>
            </button>
        </div>

        <!-- Fila 1, Col 5: Menú -->
        <div class="rc-menu">
            <i class="fa-solid fa-ellipsis-vertical review-options" 
               onclick="toggleReviewMenu(event, '${menuId}')"></i>
            
            <!-- Este es el menú dropdown -->
            <div id="${menuId}" class="review-menu">
                
                <!-- 💡 ¡AÑADIDO! La "cruz" estilo Bootstrap -->
                <!-- Llama a closeAllMenus() de reviewHandler.js -->
                <button type="button" class="btn-close-review-menu" onclick="closeAllMenus()"></button>

                ${isOwner ? `
                    <!-- Opciones SI ERES EL DUEÑO -->
                    ${canEdit ? `
                        <button data-action="edit" data-review-id="${review.id}" onclick="handleMenuAction(event)">
                            <i class="fa-solid fa-pen"></i> Editar
                        </button>` 
                    : ''}<!-- Bug de sintaxis arreglado aquí -->
                    <button data-action="delete" data-review-id="${review.id}" onclick="handleMenuAction(event)">
                        <i class="fa-solid fa-trash"></i> Eliminar
                    </button>
                ` : `
                    <!-- Opciones SI NO ERES EL DUEÑO -->
                    <button data-action="report" data-review-id="${review.id}" onclick="handleMenuAction(event)">
                        <i class="fa-solid fa-flag"></i> Reportar
                    </button>
                `}
                
                <button data-action="comments" data-review-id="${review.id}" onclick="handleMenuAction(event)">
                    <i class="fa-solid fa-comment"></i> Ver comentarios
                </button>
            </div>
        </div>

        <!-- Fila 2, Col 2 (expandida): Opinión -->
        <p class="rc-body">${review.text || 'Sin contenido.'}</p>

    </div>
    `;
}