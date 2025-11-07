/**
 * ⚙️ JS/Handlers/commentHandler.js
 * (ACTUALIZADO: Con guardias de bloqueo en 'like' y 'actions')
 */

window.toggleCommentEditMode = async function(commentId) {
    const card = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
    if (!card) return;

const modalBody = card.closest('.modal-body');
    if (!modalBody) {
        console.error("Error crítico: No se pudo encontrar el '.modal-body' padre.");
        return;
    }

    // 💡 CAMBIO: La guardia ahora comprueba 'modalBody'
    if (modalBody.classList.contains('is-editing-something')) {
        window.showAlert("Ya estás editando otro comentario.", "Aviso");
        return;
    }

    const textElement = card.querySelector('.comment-text');
    const actionsElement = card.querySelector('.comment-action-icons');
    if (!textElement || !actionsElement) return;

    // 1. Verificar si tiene reacciones (usando Mocks)
    try {
        // (Simulación con Mocks)
        const thisComment = MOCK_COMMENTS.find(c => c.commentId == commentId);
        const count = thisComment.likes || 0;
        if (count > 0) {
            window.showAlert("Este comentario ya tiene reacciones y no se puede editar.", "Error");
            return;
        }
    } catch (error) {
        console.error("Error al verificar reacciones:", error);
        window.showAlert("Error al verificar reacciones del comentario.", "Error");
        return;
    }

    // Desactivar el cierre del modal
    let originalModalConfig = {};
    if (window.commentsModalInstance && window.commentsModalInstance._config) {
        originalModalConfig = {
            backdrop: window.commentsModalInstance._config.backdrop,
            keyboard: window.commentsModalInstance._config.keyboard
        };
        window.commentsModalInstance._config.backdrop = 'static';
        window.commentsModalInstance._config.keyboard = false;
    }
// 💡 CAMBIO: Clases de bloqueo aplicadas a 'modalBody'
    modalBody.classList.add('is-editing-something'); // Bloquea todo lo demás
    card.classList.add('is-editing');
    // ¡AQUÍ ESTÁ LA CLAVE!
    // Clases de bloqueo
    document.body.classList.add('is-editing-something'); // Bloquea todo lo demás
    card.classList.add('is-editing');                   // Resalta este comentario

    // 2. Ocultar elementos originales
    const oldText = textElement.textContent;
    textElement.style.display = 'none';
    actionsElement.style.display = 'none'; 

    // 3. Crear el contenedor de edición
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
// 💡 CAMBIO: Quita las clases de bloqueo de 'modalBody'
        modalBody.classList.remove('is-editing-something');
        card.classList.remove('is-editing');
        // ¡AQUÍ ESTÁ LA CLAVE!
        // Quita las clases de bloqueo
        document.body.classList.remove('is-editing-something');
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
                // (Simulación)
                textElement.textContent = newText; 
                window.showAlert("Comentario actualizado (simulado).", "Éxito");
            } catch (error) {
                console.error("Error al actualizar comentario:", error);
                window.showAlert("No se pudo actualizar el comentario.", "Error");
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
 * Maneja las acciones de un comentario
 */
window.handleCommentMenuAction = async function(event) {
    event.stopPropagation();
    const button = event.currentTarget;
    const action = button.getAttribute('data-action');
    const commentId = button.getAttribute('data-comment-id');
    const card = button.closest('.comment-item');

    // 💡 ¡NUEVA GUARDIA DE BLOQUEO!
    // Si algo se está editando Y esta *no* es la tarjeta que se está editando...
    if (document.body.classList.contains('is-editing-something') && !card.classList.contains('is-editing')) {
        console.warn("Acción bloqueada: Hay un comentario en modo de edición.");
        window.showAlert("Termina de editar el otro comentario primero.", "Aviso");
        return; // No hacer nada
    }

    switch (action) {
        case 'edit-comment': 
            toggleCommentEditMode(commentId);
            break;
            
        case 'delete-comment': 
            if (confirm(`¿Confirma eliminar este comentario?`)) {
                try {
                    const cardToRemove = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
                    if (cardToRemove) cardToRemove.remove();
                    window.showAlert("Comentario eliminado (simulado).", "Eliminado");
                } catch (error) {
                    console.error("Error al eliminar comentario:", error);
                    window.showAlert("No se pudo eliminar el comentario.", "Error");
                }
            }
            break;
            
        case 'report-comment': 
            const reason = prompt("¿Por qué quieres reportar este comentario?");
            if (reason) {
                window.showAlert("Comentario reportado exitosamente (simulado).", "Reporte Enviado");
            }
            break;
    }
};

/**
 * Maneja los "Me Gusta" de los COMENTARIOS
 */
window.handleCommentLikeToggle = async function(event) {
    event.stopPropagation();
    
    // 💡 ¡NUEVA GUARDIA DE BLOQUEO!
    // Si algo se está editando, no se puede dar like.
    if (document.body.classList.contains('is-editing-something')) {
        console.warn("Acción bloqueada: Hay un comentario en modo de edición.");
        window.showAlert("Termina de editar el comentario primero.", "Aviso");
        return; // No hacer nada
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
        window.showAlert("Debes iniciar sesión para dar Me Gusta.", "Acción Requerida");
        window.location.href = '../login.html'; 
        return;
    }
    
    const button = event.currentTarget;
    const commentId = button.getAttribute('data-comment-id');
    const icon = button.querySelector("i");
    const countEl = button.parentElement.querySelector(".like-count");
    let count = parseInt(countEl.textContent);
    
    const isLiked = icon.style.color === "var(--magenta)";

    try {
        if (isLiked) {
            icon.style.color = "var(--blanco)";
            countEl.textContent = count - 1;
        } else {
            icon.style.color = "var(--magenta)";
            countEl.textContent = count + 1;
        }
        console.log(`Like/Unlike simulado en Comentario #${commentId}`);
    } catch (error) {
        console.error("Error al dar like al comentario:", error);
        // Revertir en caso de error
        if (isLiked) {
            icon.style.color = "var(--magenta)";
            countEl.textContent = count;
        } else {
            icon.style.color = "var(--blanco)";
            countEl.textContent = count;
        }
    }
};


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

    sendBtn.onclick = async () => {
        // 💡 ¡NUEVA GUARDIA DE BLOQUEO!
        // No permitir enviar un *nuevo* comentario si se está editando uno.
        if (document.body.classList.contains('is-editing-something')) {
            window.showAlert("Termina de editar tu comentario antes de enviar uno nuevo.", "Aviso");
            return; 
        }

        const commentText = textArea.value.trim();
        if (commentText === "") return;

        sendBtn.disabled = true;

        try {
            console.warn("Usando MOCK DATA para crear comentario.");
            const newComment = { 
                commentId: Math.floor(Math.random() * 1000), 
                userId: 1, 
                username: "TuUsuarioDePrueba", 
                avatar: "../../Assets/default-avatar.png", 
                text: commentText, 
                likes: 0, 
                userLiked: false 
            };
            
            textArea.value = "";
            const modalList = document.getElementById("modalCommentsList");
            const noReviews = modalList.querySelector(".no-reviews");
            if (noReviews) noReviews.remove();
            
            const currentUserId = parseInt(localStorage.getItem("userId"), 10);
            modalList.innerHTML += createCommentCard(newComment, currentUserId);
            modalList.scrollTop = modalList.scrollHeight;

        } catch (error) {
            console.error("Error al enviar comentario:", error);
            window.showAlert("No se pudo enviar tu comentario.", "Error");
        } finally {
            sendBtn.disabled = false;
        }
    };
}