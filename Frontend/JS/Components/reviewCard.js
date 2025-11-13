function createReviewCard(review, currentUserId) {
    const menuId = `menu-${review.id || Math.random().toString(36).substr(2, 9)}`;

    const isLoggedIn = !isNaN(currentUserId);
    const isOwner = review.userId === currentUserId;
    const isLiked = review.userLiked || false;
    const likeCount = review.likes || 0;
    const canEdit = isOwner && likeCount === 0;
    const canDelete = isOwner; 
    const defaultAvatar = "../../Assets/default-avatar.png";

    return `
    <div class="review-card review-card-grid position-relative" data-review-id="${review.id}">
        
        <!-- ... (Avatar, Título, Opinión, Stack de Acciones) ... -->
        
        <div class="rc-avatar">
            <img src="${review.avatar || defaultAvatar}" 
                 alt="${review.username} avatar" 
                 class="review-avatar rounded-circle">
        </div>

        <h6 class="rc-title">${review.username} – ${review.title || 'Reseña sin título'}</h6>
        <p class="rc-body">${review.text || 'Sin contenido.'}</p>

        <div class="rc-actions-stack">
            <div class="rc-stars">
                <div class="review-stars">
                    ${renderStars(review.stars)}
                </div>
            </div>
            <div class="rc-likes">
                <span class="like-count">${likeCount}</span>
                <button class="btn-like" 
                        data-review-id="${review.id}" 
                        onclick="handleLikeToggle(event)" 
                        ${!isLoggedIn ? 'disabled title="Inicia sesión para dar Me Gusta"' : ''}>
                    <i class="fa-solid fa-heart" style="color: ${isLiked ? 'var(--magenta)' : 'var(--blanco)'};"></i>
                </button>
            </div>
            <div class="rc-view-comments">
                <button data-action="comments" data-review-id="${review.id}" onclick="handleReviewMenuAction(event)">
                    <i class="fa-solid fa-comment"></i>
                </button>
            </div>
            

            <div class="rc-menu">
                ${isLoggedIn ? `
                    <i class="fa-solid fa-ellipsis-vertical review-options" 
                       onclick="toggleReviewMenu(event, '${menuId}')"></i>
                    
                    <!-- Este es el Menú Dropdown que se oculta/muestra -->
                    <div id="${menuId}" class="review-menu">
                        
                        <!-- 💡 ¡NUEVO! Botón "X" -->
                        <button class="btn-close-review-menu" onclick="closeAllMenus()">&times;</button>

                        ${isOwner ? `
                            ${canEdit ? `
                                <button data-action="edit" data-review-id="${review.id}" onclick="handleReviewMenuAction(event)">
                                    <i class="fa-solid fa-pen"></i> Editar
                                </button>` 
                            : ''}
                            <button data-action="delete" data-review-id="${review.id}" onclick="handleReviewMenuAction(event)">
                                <i class="fa-solid fa-trash"></i> Eliminar
                            </button>
                        ` : `
                            <button data-action="report" data-review-id="${review.id}" onclick="handleReviewMenuAction(event)">
                                <i class="fa-solid fa-flag"></i> Reportar
                            </button>
                        `}
                    </div>
                ` : ``}
            </div>

        </div> 

    </div>
    `;
}