// ===============================================
// 💬 JS/Components/commentCard.js (ACTUALIZADO)
// (Menú de 3 puntos REEMPLAZADO por iconos directos)
// ===============================================

/**
 * Genera el HTML para una tarjeta de comentario individual.
 * @param {object} comment - El objeto comentario del backend.
 * @param {number} currentUserId - El ID del usuario logueado.
 * @returns {string} El HTML completo de la tarjeta.
 */
function createCommentCard(comment, currentUserId) {
    const defaultAvatar = "../../Assets/default-avatar.png";
    const isLiked = comment.userLiked || false; 
    const likeCount = comment.likes || 0;
    
    const commentId = comment.commentId || comment.id; 
    
    const isOwner = comment.userId === currentUserId;
    // 💡 Lógica de "contar" del front:
    // Asumimos que el 'comment' que viene de la API tiene la prop 'likes'
    const canEdit = isOwner && (comment.likes || 0) === 0; 

    return `
    <div class="comment-item" data-comment-id="${commentId}">
        
        <img src="${comment.avatar || defaultAvatar}" alt="avatar" class="comment-avatar">
        
        <strong class="comment-username">${comment.username || 'Usuario'}</strong>
        
        <p class="comment-text">${comment.text || '...'}</p>

        <div class="comment-like">
            <button class="btn-like" 
                    data-comment-id="${commentId}" 
                    onclick="handleLikeToggle(event)">
                <i class="fa-solid fa-heart" style="color: ${isLiked ? 'var(--magenta)' : 'var(--blanco)'};"></i>
            </button>
            <span class="like-count">${likeCount}</span>
        </div>
        
        <!-- 💡 ¡CAMBIO! Menú de 3 puntos reemplazado por iconos de acción -->
        <div class="comment-action-icons">
            
            ${isOwner ? `
                <!-- Opciones SI ERES EL DUEÑO -->
                ${canEdit ? `
                    <!-- Lápiz (Editar) -->
                    <i class="fa-solid fa-pen" 
                       data-action="edit" 
                       data-comment-id="${commentId}" 
                       onclick="handleCommentMenuAction(event)"
                       title="Editar"></i>`
                : ''}
                <!-- Tacho (Eliminar) -->
                <i class="fa-solid fa-trash" 
                   data-action="delete" 
                   data-comment-id="${commentId}" 
                   onclick="handleCommentMenuAction(event)"
                   title="Eliminar"></i>
            ` : `
                <!-- Opciones SI NO ERES EL DUEÑO -->
                <!-- Bandera (Reportar) -->
                <i class="fa-solid fa-flag" 
                   data-action="report" 
                   data-comment-id="${commentId}" 
                   onclick="handleCommentMenuAction(event)"
                   title="Reportar"></i>
            `}
            
        </div> <!-- Fin de comment-action-icons -->

    </div>
    `;
}