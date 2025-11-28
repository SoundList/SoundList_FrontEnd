

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
    // Buscar el contador en diferentes estructuras (home usa .like-count, profile usa .review-likes-count, comentarios usa .comment-likes-count, review detail usa .review-detail-likes-count y .review-detail-comment-likes-count)
    // IMPORTANTE: Buscar primero dentro del botón (para review detail), luego en parentElement
    const countEl = button.querySelector(".review-detail-likes-count") ||
                    button.querySelector(".review-detail-comment-likes-count") ||
                    button.querySelector(".comment-likes-count") ||
                    button.parentElement.querySelector(".like-count") || 
                    button.parentElement.querySelector(".review-likes-count") ||
                    button.parentElement.querySelector(".comment-likes-count") ||
                    button.parentElement.querySelector(".review-detail-likes-count") ||
                    button.parentElement.querySelector(".review-detail-comment-likes-count") ||
                    button.closest('.review-likes-container')?.querySelector('.review-likes-count') ||
                    button.closest('.feed-likes-container')?.querySelector('.like-count');
    
    if (!countEl) {
        console.error("No se pudo encontrar el contador de likes para el botón:", button);
        return;
    }
    
    let count = parseInt(countEl.textContent) || 0;
    // Asegurar que count nunca sea negativo
    count = Math.max(0, count);
    
    // Detectar si está liked: verificar localStorage primero (más confiable)
    const currentUserId = localStorage.getItem('userId');
    let isLiked = false;
    
    if (reviewId && currentUserId) {
        // Verificar en localStorage si el usuario ya dio like
        const storedLike = localStorage.getItem(`like_${reviewId}_${currentUserId}`);
        const storedReactionId = localStorage.getItem(`reaction_${reviewId}_${currentUserId}`);
        isLiked = storedLike === 'true' || storedReactionId !== null;
    } else if (commentId && currentUserId) {
        const storedLike = localStorage.getItem(`like_comment_${commentId}_${currentUserId}`);
        const storedReactionId = localStorage.getItem(`reaction_comment_${commentId}_${currentUserId}`);
        isLiked = storedLike === 'true' || storedReactionId !== null;
    }
    
    // Si no hay en localStorage, verificar por el estado visual del botón
    // IMPORTANTE: No confiar en icon.classList.contains('fas') porque en profile siempre es 'fas'
    if (!isLiked) {
        // Verificar el color del icono (más confiable que la clase)
        const computedStyle = window.getComputedStyle(icon);
        const iconColor = icon.style.color || computedStyle.color;
        const rgbColor = computedStyle.color;
        
        // Verificar si el color es magenta (liked)
        isLiked = button.classList.contains('liked') || 
                  iconColor === 'var(--magenta)' || 
                  iconColor === 'rgb(236, 72, 153)' || 
                  iconColor === '#EC4899' ||
                  rgbColor === 'rgb(236, 72, 153)';
    } 

    if (isLiked) {
        // Quitar like
        button.classList.remove('liked');
        // En profile siempre se usa 'fas', solo cambiamos el color
        // Si tiene 'far', lo cambiamos a 'fas', sino mantenemos 'fas'
        if (icon.classList.contains('far')) {
            icon.classList.remove('far');
            icon.classList.add('fas');
        }
        // Color gris/blanco para estado sin like (igual que en la imagen)
        icon.style.color = "rgba(255,255,255,0.7)"; 
        countEl.textContent = Math.max(0, count - 1);
    } else {
        // Agregar like
        button.classList.add('liked');
        // Asegurar que tenga 'fas' (en profile siempre es 'fas')
        if (icon.classList.contains('far')) {
            icon.classList.remove('far');
        }
        icon.classList.add('fas');
        icon.style.color = "var(--magenta)"; 
        countEl.textContent = count + 1;
    }

    try {
        button.disabled = true;
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
                const reactionId = currentUserId ? localStorage.getItem(`reaction_${reviewId}_${currentUserId}`) : null;
                
                // Usar reactionApi si está disponible, sino usar socialApi directamente
                try {
                    if (window.reactionApi && window.reactionApi.removeReviewReaction) {
                        await window.reactionApi.removeReviewReaction(reviewId);
                    } else if (window.socialApi && window.socialApi.deleteReviewReaction) {
                        await window.socialApi.deleteReviewReaction(reviewId, currentUserId, localStorage.getItem('authToken'), reactionId);
                    } else {
                        console.warn('No se encontró API para eliminar reacción');
                    }
                    
                    // Solo limpiar localStorage si la eliminación fue exitosa
                    if (currentUserId) {
                        localStorage.removeItem(`like_${reviewId}_${currentUserId}`);
                        localStorage.removeItem(`reaction_${reviewId}_${currentUserId}`);
                    }
                } catch (deleteError) {
                    // Si el error es 404, significa que la reacción ya no existe (puede haber sido eliminada)
                    // Esto es aceptable, solo limpiamos localStorage
                    if (deleteError.response?.status === 404) {
                        console.debug('Reacción ya no existe en el servidor, limpiando localStorage');
                        if (currentUserId) {
                            localStorage.removeItem(`like_${reviewId}_${currentUserId}`);
                            localStorage.removeItem(`reaction_${reviewId}_${currentUserId}`);
                        }
                    } else {
                        throw deleteError; // Re-lanzar otros errores
                    }
                }
            } else {
                // Agregar like
                if (currentUserId) {
                    localStorage.setItem(`like_${reviewId}_${currentUserId}`, 'true');
                }
                // Usar reactionApi si está disponible, sino usar socialApi directamente
                let reactionData = null;
                if (window.reactionApi && window.reactionApi.addReviewReaction) {
                    reactionData = await window.reactionApi.addReviewReaction(reviewId);
                } else if (window.socialApi && window.socialApi.addReviewReaction) {
                    reactionData = await window.socialApi.addReviewReaction(reviewId, currentUserId, localStorage.getItem('authToken'));
                } else {
                    console.warn('No se encontró API para agregar reacción');
                }
                
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
            // Actualizar localStorage para sincronización (igual que con reviews)
            const commentLikesCacheKey = `comment_likes_${commentId}`;
            try {
                localStorage.setItem(commentLikesCacheKey, String(finalCount));
            } catch (e) { /* ignore */ }
            
            // Usar reactionApi si está disponible, sino usar socialApi directamente
            if (isLiked) {
                // IMPORTANTE: removeCommentReaction/deleteCommentReaction solo acepta commentId, el backend obtiene userId del token
                try {
                    if (window.reactionApi && window.reactionApi.removeCommentReaction) {
                        await window.reactionApi.removeCommentReaction(commentId);
                    } else if (window.socialApi && window.socialApi.deleteCommentReaction) {
                        await window.socialApi.deleteCommentReaction(commentId);
                    } else {
                        console.warn('No se encontró API para eliminar reacción de comentario');
                    }
                    
                    // Limpiar localStorage solo si la eliminación fue exitosa
                    if (currentUserId) {
                        localStorage.removeItem(`like_comment_${commentId}_${currentUserId}`);
                        localStorage.removeItem(`reaction_comment_${commentId}_${currentUserId}`);
                    }
                    
                    // Si el contador llegó a 0, asegurarse de que el cache también esté en 0
                    if (finalCount === 0) {
                        try {
                            localStorage.setItem(commentLikesCacheKey, '0');
                        } catch (e) { /* ignore */ }
                    }
                } catch (deleteError) {
                    // Si el error es 404, significa que la reacción ya no existe (aceptable)
                    if (deleteError.response?.status === 404) {
                        console.debug('Reacción de comentario ya no existe en el servidor, limpiando localStorage');
                        if (currentUserId) {
                            localStorage.removeItem(`like_comment_${commentId}_${currentUserId}`);
                            localStorage.removeItem(`reaction_comment_${commentId}_${currentUserId}`);
                        }
                        // Asegurarse de que el cache esté en 0 si el contador es 0
                        if (finalCount === 0) {
                            try {
                                localStorage.setItem(commentLikesCacheKey, '0');
                            } catch (e) { /* ignore */ }
                        }
                    } else {
                        throw deleteError; // Re-lanzar otros errores
                    }
                }
            } else {
                // Agregar like
                if (currentUserId) {
                    localStorage.setItem(`like_comment_${commentId}_${currentUserId}`, 'true');
                }
                
                // IMPORTANTE: addCommentReaction solo acepta commentId, el backend obtiene userId del token
                let reactionData = null;
                try {
                    if (window.reactionApi && window.reactionApi.addCommentReaction) {
                        reactionData = await window.reactionApi.addCommentReaction(commentId);
                    } else if (window.socialApi && window.socialApi.addCommentReaction) {
                        reactionData = await window.socialApi.addCommentReaction(commentId);
                    } else {
                        console.warn('No se encontró API para agregar reacción de comentario');
                    }
                    
                    if (currentUserId && reactionData) {
                        const reactionId = reactionData.Id_Reaction || reactionData.ReactionId || reactionData.id;
                        if (reactionId) {
                            localStorage.setItem(`reaction_comment_${commentId}_${currentUserId}`, String(reactionId));
                        }
                    }
                } catch (addError) {
                    // Si el error es 400, significa que la reacción ya existe (sincronización)
                    if (addError.response?.status === 400) {
                        console.debug('Reacción de comentario ya existe en el servidor (400), sincronizando estado');
                        // No revertir el cambio, solo sincronizar silenciosamente
                        // El estado ya está actualizado en la UI (optimistic update)
                    } else {
                        // Para otros errores, lanzar para que se maneje en el catch externo
                        throw addError;
                    }
                }
            }
        }
    } catch (error) {
        // Si el error es 400, puede ser que ya existe la reacción (sincronización)
        // Manejar esto silenciosamente sin mostrar errores
        if (error.response?.status === 400) {
            // Si intentamos agregar un like y recibimos 400, probablemente ya existe
            // Sincronizamos el estado: marcamos como liked
            if (!isLiked) {
                button.classList.add('liked');
                icon.style.color = "var(--magenta)"; 
                if (icon.classList.contains('far')) {
                    icon.classList.remove('far');
                }
                icon.classList.add('fas');
                countEl.textContent = count; // Ya estaba incrementado, lo mantenemos
                // No mostrar error, solo sincronizar silenciosamente
                return; // Salir temprano, no revertir cambios
            } else {
                // Si intentamos quitar y recibimos 400, mantener el estado actual (no debería pasar)
                return; // Salir temprano
            }
        }
        
        // Para otros errores (no 400), mostrar error y revertir
        console.error("Error al manejar el like:", error);
        if (typeof window.showAlert === 'function') {
            window.showAlert("Error al procesar la reacción.", "Error");
        }
        
        // Revertir cambios de UI
        if (isLiked) {
            button.classList.add('liked');
            icon.style.color = "var(--magenta)"; 
            if (icon.classList.contains('far')) {
                icon.classList.remove('far');
            }
            icon.classList.add('fas');
            countEl.textContent = count; 
        } else {
            button.classList.remove('liked');
            icon.style.color = "rgba(255,255,255,0.7)"; 
            if (icon.classList.contains('far')) {
                icon.classList.remove('far');
            }
            icon.classList.add('fas');
            countEl.textContent = count; 
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
            // Asegurar que tenga 'fas' (en profile siempre es 'fas')
            if (icon.classList.contains('far')) {
                icon.classList.remove('far');
            }
            icon.classList.add('fas');
        } else {
            btn.classList.remove('liked');
            // En profile siempre se usa 'fas', solo cambiamos el color a gris
            // Si tiene 'far', lo cambiamos a 'fas', sino mantenemos 'fas'
            if (icon.classList.contains('far')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
            }
            icon.style.color = 'rgba(255,255,255,0.7)'; // Color gris como en la imagen
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