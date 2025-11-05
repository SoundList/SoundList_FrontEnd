// ===============================================
// 💬 JS/Components/reviewCard.js
// (ACTUALIZADO: Lógica para "no logueado")
// ===============================================

function createReviewCard(review, currentUserId) {
    const menuId = `menu-${review.id || Math.random().toString(36).substr(2, 9)}`;

    // 💡 ¡NUEVO! Comprueba si el usuario está logueado
    // (parseInt(null) da NaN, !isNaN(NaN) es false)
    const isLoggedIn = !isNaN(currentUserId);
    
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
            <!-- 💡 ¡CAMBIO! Deshabilitado si no está logueado -->
            <button class="btn-like" 
                    data-review-id="${review.id}" 
                    onclick="handleLikeToggle(event)" 
                    ${!isLoggedIn ? 'disabled' : ''}>
                <i class="fa-solid fa-heart" style="color: ${isLiked ? 'var(--magenta)' : 'var(--blanco)'};"></i>
            </button>
        </div>

        <!-- Fila 1, Col 5: Menú -->
        <div class="rc-menu">
            <i class="fa-solid fa-ellipsis-vertical review-options" 
               onclick="toggleReviewMenu(event, '${menuId}')"></i>
            
            <div id="${menuId}" class="review-menu">
                
                <button type="button" class="btn-close-review-menu" onclick="closeAllMenus()"></button>

                <!-- 💡 ¡CAMBIO! Solo muestra botones de acción si está logueado -->
                ${isLoggedIn ? `
                    ${isOwner ? `
                        <!-- Opciones SI ERES EL DUEÑO -->
                        ${canEdit ? `
                            <button data-action="edit" data-review-id="${review.id}" onclick="handleMenuAction(event)">
                                <i class="fa-solid fa-pen"></i> Editar
                            </button>` 
                        : ''}
                        <button data-action="delete" data-review-id="${review.id}" onclick="handleMenuAction(event)">
                            <i class="fa-solid fa-trash"></i> Eliminar
                        </button>
                    ` : `
                        <!-- Opciones SI NO ERES EL DUEÑO (pero estás logueado) -->
                        <button data-action="report" data-review-id="${review.id}" onclick="handleMenuAction(event)">
                            <i class="fa-solid fa-flag"></i> Reportar
                        </button>
                    `}
                ` : ''} <!-- Fin del check isLoggedIn -->
                
                <!-- "Ver comentarios" se muestra SIEMPRE -->
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