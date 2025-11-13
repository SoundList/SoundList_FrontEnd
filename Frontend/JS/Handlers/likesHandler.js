

/**
 * Función global que maneja el toggle de like (para Reviews O Comentarios).
 * @param {Event} event - El evento de click en el botón de like.
 */
window.handleLikeToggle = async function(event) {
    event.stopPropagation();
    const button = event.currentTarget;

    const token = localStorage.getItem("authToken");
    if (!token) {

        if (typeof window.showAlert === 'function') {
            window.showAlert("Debes iniciar sesión para dar Me Gusta.", "Acción Requerida");
        } else {
            alert("Debes iniciar sesión para dar Me Gusta.");
        }

        return;
    }

    if (document.body.classList.contains('is-editing-something')) {
        console.warn("Acción bloqueada: Hay un ítem en modo de edición.");
        window.showAlert("Termina de editar antes de dar Me Gusta.", "Aviso");
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
    

    const isLiked = icon.style.color === 'var(--magenta)'; 

    if (isLiked) {
        icon.style.color = "var(--blanco)"; 
        countEl.textContent = count - 1;
    } else {
        icon.style.color = "var(--magenta)"; 
        countEl.textContent = count + 1;
    }

    try {

        button.disabled = true;

        if (reviewId) {

            if (isLiked) {

                await window.reactionApi.removeReviewReaction(reviewId);
            } else {

                await window.reactionApi.addReviewReaction(reviewId);
            }
        } else if (commentId) {

            if (isLiked) {

                await window.reactionApi.removeCommentReaction(commentId);
            } else {

                await window.reactionApi.addCommentReaction(commentId);
            }
        }
    } catch (error) {
        // 6. Error: Revertir la UI
        console.error("Error al manejar el like:", error);
        window.showAlert("Error al procesar la reacción.", "Error");

        if (isLiked) {
            icon.style.color = "var(--magenta)"; 
            countEl.textContent = count; 
        } else {
            icon.style.color = "var(--blanco)"; 
            countEl.textContent = count; 
        }
    } finally {

        button.disabled = false;
    }
};