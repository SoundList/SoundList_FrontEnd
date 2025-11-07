
/**
 * Genera el HTML para una tarjeta de comentario individual.
 * @param {object} comment - El objeto comentario del backend.
 * @param {number} currentUserId - El ID del usuario logueado (será NaN si no está logueado).
 * @returns {string} El HTML completo de la tarjeta.
 */
function createCommentCard(comment, currentUserId) {
    const defaultAvatar = "../../Assets/default-avatar.png";
    
    const isLoggedIn = !isNaN(currentUserId);
    
    const isLiked = comment.userLiked || false; 
    const likeCount = comment.likes || 0;
    const commentId = comment.commentId || comment.id; 
    
    const isOwner = comment.userId === currentUserId;
    const canEdit = isOwner && (comment.likes || 0) === 0; 
    

    return `
    <div class="comment-item" data-comment-id="${commentId}">
        
        <img src="${comment.avatar || defaultAvatar}" alt="avatar" class="comment-avatar">
        
        <strong class="comment-username">${comment.username || 'Usuario'}</strong>
        
        <p class="comment-text">${comment.text || '...'}</p>

        <div class="comment-like">
            <button class="btn-like" 
                    data-comment-id="${commentId}" 
                    onclick="handleLikeToggle(event)"
                    ${!isLoggedIn ? 'disabled title="Inicia sesión para dar Me Gusta"' : ''}>
                <i class="fa-solid fa-heart" style="color: ${isLiked ? 'var(--magenta)' : 'var(--blanco)'};"></i>
            </button>
            <span class="like-count">${likeCount}</span>
        </div>
        
        <!-- 💡 ¡AQUÍ ESTÁ EL CAMBIO! -->
        <!-- Iconos de Acción (Sin 3 puntos, sin menú) -->
        <div class="comment-action-icons">
            ${isLoggedIn ? `
                ${isOwner ? `
                    <!-- Opciones SI ERES EL DUEÑO -->
                    ${canEdit ? `
                        <i class="fa-solid fa-pen" 
                           data-action="edit-comment" 
                           data-comment-id="${commentId}" 
                           onclick="handleCommentMenuAction(event)"
                           title="Editar"></i>` 
                    : ''}
                    <i class="fa-solid fa-trash" 
                       data-action="delete-comment" 
                       data-comment-id="${commentId}" 
                       onclick="handleCommentMenuAction(event)"
                       title="Eliminar"></i>
                ` : `
                    <!-- Opciones SI NO ERES EL DUEÑO -->
                    <i class="fa-solid fa-flag" 
                       data-action="report-comment" 
                       data-comment-id="${commentId}" 
                       onclick="handleCommentMenuAction(event)"
                       title="Reportar"></i>
                `}
            ` : ''}
        </div> <!-- Fin de .comment-action-icons -->

    </div>
    `;
}