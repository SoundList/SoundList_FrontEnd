// ===============================================
// ⚙️ JS/Handlers/likesHandler.js
// (ACTUALIZADO: Conectado 100% a 'reactionApi.js' y tu lógica DELETE)
// ===============================================

/**
 * Función global que maneja el toggle de like (para Reviews O Comentarios).
 * @param {Event} event - El evento de click en el botón de like.
 */
window.handleLikeToggle = async function(event) {
    event.stopPropagation();
    const button = event.currentTarget;

    // 1. Verificación de Autenticación
    // (Usamos 'authToken' como en login.js y 'reactionApi.js')
    const token = localStorage.getItem("authToken");
    if (!token) {
        // 💡 Usamos 'showAlert' (si existe) en lugar de 'alert' nativo
        if (typeof window.showAlert === 'function') {
            window.showAlert("Debes iniciar sesión para dar Me Gusta.", "Acción Requerida");
        } else {
            alert("Debes iniciar sesión para dar Me Gusta.");
        }
        // window.location.href = "../login.html"; // Opcional: redirigir
        return;
    }
    
    // 2. Guardia de Bloqueo (Para evitar 'likes' mientras se edita)
    if (document.body.classList.contains('is-editing-something')) {
        console.warn("Acción bloqueada: Hay un ítem en modo de edición.");
        window.showAlert("Termina de editar antes de dar Me Gusta.", "Aviso");
        return;
    }

    // 3. Obtener IDs y estado actual de la UI
    const reviewId = button.getAttribute('data-review-id');
    const commentId = button.getAttribute('data-comment-id');

    if (!reviewId && !commentId) {
        console.error("Botón de like no tiene ID de review o comentario.");
        return;
    }

    const icon = button.querySelector("i");
    const countEl = button.parentElement.querySelector(".like-count");
    let count = parseInt(countEl.textContent);
    
    // 'isLiked' es el estado ANTES de hacer clic
    const isLiked = icon.style.color === 'var(--magenta)'; 

    // 4. Actualización Optimista de la UI (Lo hacemos ANTES de la API)
    if (isLiked) {
        icon.style.color = "var(--blanco)"; 
        countEl.textContent = count - 1;
    } else {
        icon.style.color = "var(--magenta)"; 
        countEl.textContent = count + 1;
    }

    // 5. Llamada a la API (Con 'reactionApi.js' real)
    try {
        // Deshabilitamos el botón para evitar doble clic
        button.disabled = true;

        if (reviewId) {
            // --- Lógica de Reseña ---
            if (isLiked) {
                // 🚀 ¡Llamada a tu API ideal! (El backend busca la reacción)
                await window.reactionApi.removeReviewReaction(reviewId);
            } else {
                // 🚀 ¡Llamada a tu API!
                await window.reactionApi.addReviewReaction(reviewId);
            }
        } else if (commentId) {
            // --- Lógica de Comentario ---
            if (isLiked) {
                // 🚀 ¡Llamada a tu API ideal!
                await window.reactionApi.removeCommentReaction(commentId);
            } else {
                // 🚀 ¡Llamada a tu API!
                await window.reactionApi.addCommentReaction(commentId);
            }
        }
    } catch (error) {
        // 6. Error: Revertir la UI
        console.error("Error al manejar el like:", error);
        window.showAlert("Error al procesar la reacción.", "Error");

        // Revertimos el cambio optimista
        if (isLiked) {
            icon.style.color = "var(--magenta)"; 
            countEl.textContent = count; // Revertir al contador original
        } else {
            icon.style.color = "var(--blanco)"; 
            countEl.textContent = count; // Revertir al contador original
        }
    } finally {
        // 7. Re-habilitar el botón
        button.disabled = false;
    }
};