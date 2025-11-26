

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
    let count = parseInt(countEl.textContent) || 0;
    // Asegurar que count nunca sea negativo
    count = Math.max(0, count);
    
    // Detectar si está liked: por color del icono o por clase CSS
    const iconColor = icon.style.color || window.getComputedStyle(icon).color;
    const isLiked = button.classList.contains('liked') || 
                    iconColor === 'var(--magenta)' || 
                    iconColor === 'rgb(236, 72, 153)' || // var(--magenta) en RGB
                    icon.classList.contains('fas'); // Si tiene fas en vez de far, está liked 

    if (isLiked) {
        // Quitar like
        button.classList.remove('liked');
        icon.style.color = "var(--blanco)"; 
        icon.classList.remove('fas');
        icon.classList.add('far');
        countEl.textContent = Math.max(0, count - 1);
    } else {
        // Agregar like
        button.classList.add('liked');
        icon.style.color = "var(--magenta)"; 
        icon.classList.remove('far');
        icon.classList.add('fas');
        countEl.textContent = count + 1;
    }

    try {

        button.disabled = true;
        const currentUserId = localStorage.getItem('userId');
        const newCount = isLiked ? count - 1 : count + 1;
        const finalCount = Math.max(0, newCount);

        if (reviewId) {
            // Actualizar localStorage para sincronización
            const likesCacheKey = `review_likes_${reviewId}`;
            try {
                localStorage.setItem(likesCacheKey, String(finalCount));
            } catch (e) { /* ignore */ }

            if (isLiked) {
                // Quitar like
                if (currentUserId) {
                    localStorage.removeItem(`like_${reviewId}_${currentUserId}`);
                    localStorage.removeItem(`reaction_${reviewId}_${currentUserId}`);
                }
                await window.reactionApi.removeReviewReaction(reviewId);
            } else {
                // Agregar like
                if (currentUserId) {
                    localStorage.setItem(`like_${reviewId}_${currentUserId}`, 'true');
                }
                const reactionData = await window.reactionApi.addReviewReaction(reviewId);
                if (currentUserId && reactionData) {
                    const reactionId = reactionData.Id_Reaction || reactionData.ReactionId || reactionData.id;
                    if (reactionId) {
                        localStorage.setItem(`reaction_${reviewId}_${currentUserId}`, String(reactionId));
                    }
                }
            }

            // Sincronizar todos los botones de like visibles con el mismo reviewId
            syncLikeButtons(reviewId, !isLiked, finalCount);
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
        
        // Si el error es 400, puede ser que ya existe la reacción (sincronización)
        if (error.response?.status === 400) {
            // Si intentamos agregar un like y recibimos 400, probablemente ya existe
            // Sincronizamos el estado: marcamos como liked
            if (!isLiked) {
                button.classList.add('liked');
                icon.style.color = "var(--magenta)"; 
                icon.classList.remove('far');
                icon.classList.add('fas');
                countEl.textContent = count; // Ya estaba incrementado, lo mantenemos
                // No mostramos error, solo sincronizamos silenciosamente
                console.warn("Like ya existía en el servidor, sincronizando estado.");
            } else {
                // Si intentamos quitar y recibimos 400, revertimos
                button.classList.add('liked');
                icon.style.color = "var(--magenta)"; 
                icon.classList.remove('far');
                icon.classList.add('fas');
                countEl.textContent = count; 
            }
        } else {
            // Para otros errores, mostramos alerta y revertimos
            if (typeof window.showAlert === 'function') {
                window.showAlert("Error al procesar la reacción.", "Error");
            }
            
            if (isLiked) {
                button.classList.add('liked');
                icon.style.color = "var(--magenta)"; 
                icon.classList.remove('far');
                icon.classList.add('fas');
                countEl.textContent = count; 
            } else {
                button.classList.remove('liked');
                icon.style.color = "var(--blanco)"; 
                icon.classList.remove('fas');
                icon.classList.add('far');
                countEl.textContent = count; 
            }
        }
    } finally {

        button.disabled = false;
    }
};

/**
 * Sincroniza todos los botones de like visibles con el mismo reviewId
 * @param {string} reviewId - ID de la reseña
 * @param {boolean} shouldBeLiked - Si debe estar liked o no
 * @param {number} newCount - Nuevo contador de likes
 */
function syncLikeButtons(reviewId, shouldBeLiked, newCount) {
    // Buscar todos los botones de like con el mismo reviewId en la página
    const allLikeButtons = document.querySelectorAll(`.btn-like[data-review-id="${reviewId}"]`);
    
    allLikeButtons.forEach(btn => {
        const icon = btn.querySelector('i');
        if (!icon) return;

        // Buscar el contador de likes (puede estar en diferentes estructuras)
        let countEl = btn.parentElement.querySelector('.like-count') || 
                     btn.parentElement.querySelector('.review-likes-count') ||
                     btn.closest('.review-likes-container')?.querySelector('.review-likes-count') ||
                     btn.closest('.feed-likes-container')?.querySelector('.like-count');

        // Actualizar estado del botón
        if (shouldBeLiked) {
            btn.classList.add('liked');
            icon.style.color = 'var(--magenta)';
            icon.classList.remove('far');
            icon.classList.add('fas');
        } else {
            btn.classList.remove('liked');
            icon.style.color = 'var(--blanco)';
            icon.classList.remove('fas');
            icon.classList.add('far');
        }

        // Actualizar contador si existe
        if (countEl) {
            countEl.textContent = Math.max(0, newCount);
        }
    });

    // Disparar evento personalizado para que otras partes de la app puedan escuchar
    window.dispatchEvent(new CustomEvent('likeUpdated', {
        detail: { reviewId, isLiked: shouldBeLiked, count: newCount }
    }));
}