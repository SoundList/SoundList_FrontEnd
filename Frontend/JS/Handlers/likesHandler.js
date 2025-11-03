// ===============================================
// 👍 JS/Handlers/likesHandler.js
// (ACTUALIZADO para manejar Likes de Reviews Y Comentarios)
// ===============================================

/**
 * Función global que maneja el toggle de like (para Reviews O Comentarios).
 * @param {Event} event - El evento de click en el botón de like.
 */
window.handleLikeToggle = async function(event) {
    event.stopPropagation();
    const button = event.currentTarget;
    
    // 💡 ¡CAMBIO! Revisa qué tipo de ID tiene el botón
    const reviewId = button.getAttribute('data-review-id');
    const commentId = button.getAttribute('data-comment-id');

    if (!reviewId && !commentId) {
        console.error("Botón de like no tiene ID de review o comentario.");
        return;
    }

    const icon = button.querySelector("i");
    // (Ajuste: el like-count puede estar en diferentes lugares)
    const countEl = button.parentElement.querySelector(".like-count");
    let count = parseInt(countEl.textContent);
    
    const liked = icon.style.color === 'var(--magenta)'; // (Revisa tu color 'liked')

    // 1. Lógica optimista (actualiza el frontend primero)
    if (liked) {
        icon.style.color = "var(--blanco)"; // Color no-like
        countEl.textContent = count - 1;
    } else {
        icon.style.color = "var(--magenta)"; // Color like
        countEl.textContent = count + 1;
    }

    // 2. 📡 Llama a la API
    try {
        if (reviewId) {
            // Es un like de Reseña
            await window.reviewApi.toggleLikeReview(reviewId);
        } else if (commentId) {
            // Es un like de Comentario
            // 💡 (Asegúrate de añadir 'toggleLikeComment' a reviewApi.js)
            await window.reviewApi.toggleLikeComment(commentId);
        }

    } catch (error) {
        console.error("Error al manejar el like:", error);
        
        // 3. ❌ Revertir el cambio si la llamada al API falla
        if (liked) {
            icon.style.color = "var(--magenta)";
            countEl.textContent = count;
        } else {
            icon.style.color = "var(--blanco)";
            countEl.textContent = count;
        }
        alert("Error al procesar la reacción.");
    }
};