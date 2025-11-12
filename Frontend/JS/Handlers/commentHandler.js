// ===============================================
// ⚙️ JS/Handlers/commentHandler.js
// (Limpio: Sin lógica de 'Like'. Llama a 'commentsApi.js')
// ===============================================

/**
 * Entra en modo edición para un COMENTARIO
 */
window.toggleCommentEditMode = async function(commentId) {
    const card = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
    if (!card) return;

    const modalBody = card.closest('.modal-body');
    if (!modalBody) {
        console.error("Error crítico: No se pudo encontrar el '.modal-body' padre.");
        return;
    }

    // Guardia de bloqueo
    if (modalBody.classList.contains('is-editing-something')) {
        window.showAlert("Ya estás editando otro comentario.", "Aviso");
        return;
    }

    const textElement = card.querySelector('.comment-text');
    const actionsElement = card.querySelector('.comment-action-icons');
    if (!textElement || !actionsElement) return;

    // 1. Verificar si tiene reacciones (Leído desde el DOM)
    try {
        const likeCountEl = card.querySelector(".like-count");
        const count = parseInt(likeCountEl.textContent, 10) || 0;
        
        if (count > 0) {
            window.showAlert("Este comentario ya tiene reacciones y no se puede editar.", "Error");
            return;
        }
    } catch (error) {
        console.error("Error al verificar reacciones (DOM):", error);
        window.showAlert("Error al verificar reacciones del comentario.", "Error");
        return;
    }

    // Desactivar el cierre del modal (Backdrop)
    let originalModalConfig = {};
    if (window.commentsModalInstance && window.commentsModalInstance._config) {
        originalModalConfig = {
            backdrop: window.commentsModalInstance._config.backdrop,
            keyboard: window.commentsModalInstance._config.keyboard
        };
        window.commentsModalInstance._config.backdrop = 'static';
        window.commentsModalInstance._config.keyboard = false;
    }

    modalBody.classList.add('is-editing-something');
    card.classList.add('is-editing');

    // 2. Ocultar elementos originales
    const oldText = textElement.textContent;
    textElement.style.display = 'none';
    actionsElement.style.display = 'none'; 

    // 3. Crear el contenedor de edición (TextArea, botones, etc.)
    const editContainer = document.createElement('div');
    editContainer.className = 'inline-edit-container';
    const textarea = document.createElement('textarea');
    textarea.className = 'inline-edit-textarea';
    textarea.value = oldText;
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'inline-edit-buttons';
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'inline-edit-button';
    confirmBtn.textContent = 'Confirmar';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'inline-edit-button cancel';
    cancelBtn.textContent = 'Cancelar';

    // 4. Lógica de los botones
    function exitEditMode() {
        // Reactivar el cierre del modal
        if (window.commentsModalInstance && window.commentsModalInstance._config) {
            window.commentsModalInstance._config.backdrop = originalModalConfig.backdrop ?? true;
            window.commentsModalInstance._config.keyboard = originalModalConfig.keyboard ?? true;
        }
        modalBody.classList.remove('is-editing-something');
        card.classList.remove('is-editing');
        
        editContainer.remove();
        textElement.style.display = 'block';
        actionsElement.style.display = 'flex';
    }

    cancelBtn.onclick = exitEditMode;

    confirmBtn.onclick = async () => {
        const newText = textarea.value.trim();
        if (newText && newText !== oldText) {
            
            try {
                // 🚀 ¡Llamada a tu API (commentsApi.js)!
                await window.commentsApi.updateComment(commentId, newText);
                
                textElement.textContent = newText; 
                window.showAlert("Comentario actualizado.", "Éxito");

            } catch (error) {
                console.error("Error al actualizar comentario:", error);
                window.showAlert("No se pudo actualizar el comentario.", "Error");
                return; // No salimos del modo edición si falla
            }
        }
        exitEditMode();
    };

    // 5. Ensamblar e Insertar
    buttonsContainer.appendChild(cancelBtn);
    buttonsContainer.appendChild(confirmBtn);
    editContainer.appendChild(textarea);
    editContainer.appendChild(buttonsContainer);

    textElement.after(editContainer);
    textarea.focus(); 
}

/**
 * Maneja las acciones de un comentario (Eliminar, Reportar)
 */
window.handleCommentMenuAction = async function(event) {
    event.stopPropagation();
    const button = event.currentTarget;
    const action = button.getAttribute('data-action');
    const commentId = button.getAttribute('data-comment-id');
    const card = button.closest('.comment-item');

    // Guardia de bloqueo
    if (document.body.classList.contains('is-editing-something') && !card.classList.contains('is-editing')) {
        console.warn("Acción bloqueada: Hay un comentario en modo de edición.");
        window.showAlert("Termina de editar el otro comentario primero.", "Aviso");
        return; 
    }

    switch (action) {
        case 'edit-comment': 
            toggleCommentEditMode(commentId);
            break;
            
        case 'delete-comment': 
            if (confirm(`¿Confirma eliminar este comentario?`)) {
                try {
                    // 🚀 ¡Llamada a tu API (commentsApi.js)!
                    await window.commentsApi.deleteComment(commentId);

                    const cardToRemove = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
                    if (cardToRemove) cardToRemove.remove();
                    window.showAlert("Comentario eliminado.", "Eliminado");

                } catch (error) {
                    console.error("Error al eliminar comentario:", error);
                    window.showAlert("No se pudo eliminar el comentario.", "Error");
                }
            }
            break;
            
        case 'report-comment': 
            const reason = prompt("¿Por qué quieres reportar este comentario?");
            if (reason) {
                 try {
                    // 🚀 ¡Llamada a tu API (commentsApi.js)!
                    await window.commentsApi.reportComment(commentId, reason);
                    window.showAlert("Comentario reportado exitosamente (simulado).", "Reporte Enviado");
                } catch (error) {
                    console.error("Error al reportar comentario:", error);
                    window.showAlert("No se pudo enviar el reporte.", "Error");
                }
            }
            break;
    }
};

/* * 💡 NOTA: La lógica de 'Likes' de comentarios fue 
 * movida a 'likesHandler.js' para centralizarla.
 */

/**
 * Prepara el formulario de "Añadir Comentario"
 */
function setupCommentForm(reviewId) {
    const sendBtn = document.getElementById("sendCommentBtn");
    const textArea = document.getElementById("commentTextArea");
    
    if (!sendBtn || !textArea) {
        console.error("No se encontró el formulario de comentario.");
        return;
    }

    // Evita múltiples listeners si se llama varias veces
    sendBtn.onclick = null; 

    sendBtn.onclick = async () => {
        // Guardia de bloqueo
        if (document.body.classList.contains('is-editing-something')) {
            window.showAlert("Termina de editar tu comentario antes de enviar uno nuevo.", "Aviso");
            return; 
        }

        const commentText = textArea.value.trim();
        if (commentText === "") return;

        sendBtn.disabled = true;

        try {
            // 🚀 ¡Llamada a tu API (commentsApi.js) para CREAR un comentario!
            const newComment = await window.commentsApi.createComment(reviewId, commentText);
            
            textArea.value = "";
            const modalList = document.getElementById("modalCommentsList");
            const noReviews = modalList.querySelector(".no-reviews");
            if (noReviews) noReviews.remove();
            
            const currentUserId = parseInt(localStorage.getItem("userId"), 10);
            
            // Completamos datos del usuario local si la API no los devuelve
            if (!newComment.username) newComment.username = localStorage.getItem("username") || "Usuario";
            if (!newComment.avatar) newComment.avatar = localStorage.getItem("userAvatar") || "../../Assets/default-avatar.png";
            if (!newComment.userId) newComment.userId = currentUserId;
            if (newComment.likes === undefined) newComment.likes = 0;
            if (newComment.userLiked === undefined) newComment.userLiked = false;


            modalList.innerHTML += createCommentCard(newComment, currentUserId);
            modalList.scrollTop = modalList.scrollHeight; // Scroll al final

        } catch (error) {
            console.error("Error al enviar comentario:", error);
            window.showAlert("No se pudo enviar tu comentario.", "Error");
        } finally {
            sendBtn.disabled = false;
        }
    };
}