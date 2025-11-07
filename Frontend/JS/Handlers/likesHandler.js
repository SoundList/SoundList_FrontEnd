/**
 * Función global que maneja el toggle de like (para Reviews O Comentarios).
 * @param {Event} event - El evento de click en el botón de like.
 */
window.handleLikeToggle = async function(event) {
    event.stopPropagation();
    const button = event.currentTarget;

    const currentUserId = localStorage.getItem("userId");
    if (!currentUserId) {
        alert("Debes iniciar sesión para dar Me Gusta.");
        window.location.href = "../login.html"; 
        return;
    }
    
    const reviewId = button.getAttribute('data-review-id');
    const commentId = button.getAttribute('data-comment-id');

    if (!reviewId && !commentId) {
        console.error("Botón de like no tiene ID de review o comentario.");
        return;
    }

    const icon = button.querySelector("i");
    const countEl = button.parentElement.querySelector(".like-count");
    let count = parseInt(countEl.textContent);
    
    const liked = icon.style.color === 'var(--magenta)'; 

    if (liked) {
        icon.style.color = "var(--blanco)"; 
        countEl.textContent = count - 1;
    } else {
        icon.style.color = "var(--magenta)"; 
        countEl.textContent = count + 1;
    }

    try {
        if (reviewId) {
            await window.reviewApi.toggleLikeReview(reviewId);
        } else if (commentId) {
            await window.reviewApi.toggleLikeComment(commentId);
        }

    } catch (error) {
        console.error("Error al manejar el like:", error);

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