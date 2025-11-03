// ===============================================
// 💬 JS/Components/commentCard.js (NUEVO)
// ===============================================

/**
 * Genera el HTML para una tarjeta de comentario individual.
 * @param {object} comment - El objeto comentario del backend.
 * @returns {string} El HTML completo de la tarjeta.
 */
function createCommentCard(comment) {
    const defaultAvatar = "../../Assets/default-avatar.png";
    const isLiked = comment.userLiked || false; // Asumimos que el backend nos dice si dimos like
    const likeCount = comment.likes || 0;
    
    // (Asumimos que el ID del comentario se llama 'commentId')
    const commentId = comment.commentId || comment.id; 

    return `
    <div class="comment-item" data-comment-id="${commentId}">
        
        <img src="${comment.avatar || defaultAvatar}" alt="avatar" class="comment-avatar">
        
        <strong class="comment-username">${comment.username || 'Usuario'}</strong>
        
        <p class="comment-text">${comment.text || '...'}</p>

        <div class="comment-like">
            <!-- 
                💡 REUTILIZAMOS handleLikeToggle.
                Le pasamos 'data-comment-id' en lugar de 'data-review-id'.
            -->
            <button class="btn-like" 
                    data-comment-id="${commentId}" 
                    onclick="handleLikeToggle(event)">
                <i class="fa-solid fa-heart" style="color: ${isLiked ? 'var(--magenta)' : 'var(--blanco)'};"></i>
            </button>
            <span class="like-count">${likeCount}</span>
        </div>
        
    </div>
    `;
}