window.toggleCommentEditMode = async function(commentId) {
    const card = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
    if (!card) return;
    
    const modalBody = card.closest('.modal-body'); // 💡 Busca el contenedor padre

    const textElement = card.querySelector('.comment-text');
    const actionsElement = card.querySelector('.comment-action-icons');
    if (!textElement || !actionsElement) return;

    // 1. Verificar si tiene reacciones (Tu lógica original)
    try {
        const thisComment = MOCK_COMMENTS.find(c => c.commentId == commentId);
        const count = thisComment.likes || 0;
        if (count > 0) {
            alert("Este comentario ya tiene reacciones y no se puede editar.");
            return;
        }
    } catch (error) {
        console.error("Error al verificar reacciones:", error);
        return;
    }

    // 💡 ¡CAMBIO! Añade clases de bloqueo
    if (modalBody) modalBody.classList.add('is-editing-something'); // Bloquea el modal
    card.classList.add('is-editing');                   // Resalta este comentario

    // 2. Ocultar elementos originales
    const oldText = textElement.textContent;
    textElement.style.display = 'none';
    actionsElement.style.display = 'none'; 

    // 3. Crear el contenedor de edición
    // ... (Crear textarea, botones, etc.) ...
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
        // 💡 ¡CAMBIO! Quita las clases de bloqueo
        if (modalBody) modalBody.classList.remove('is-editing-something');
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
                textElement.textContent = newText; 
                alert("Comentario actualizado (simulado).");
            } catch (error) {
                console.error("Error al actualizar comentario:", error);
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
    // ... (Tu código de 'switch (action)' no cambia) ...
    event.stopPropagation();
    const button = event.currentTarget;
    const action = button.getAttribute('data-action');
    const commentId = button.getAttribute('data-comment-id');

    switch (action) {
        case 'edit-comment': 
            toggleCommentEditMode(commentId);
            break;
            
        case 'delete-comment': 
            if (confirm(`¿Confirma eliminar este comentario?`)) {
                try {
                    const cardToRemove = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
                    if (cardToRemove) cardToRemove.remove();
                    alert("Comentario eliminado (simulado).");
                } catch (error) {
                    console.error("Error al eliminar comentario:", error);
                }
            }
            break;
            
        case 'report-comment': 
            const reason = prompt("¿Por qué quieres reportar este comentario?");
            if (reason) {
                alert("Comentario reportado exitosamente (simulado).");
            }
            break;
    }
};

/**
 * Maneja los "Me Gusta" de los COMENTARIOS
 */
window.handleCommentLikeToggle = async function(event) {
    // ... (Tu código de likes no cambia) ...
    event.stopPropagation();
    
    const token = localStorage.getItem("authToken");
    if (!token) {
        alert("Debes iniciar sesión para dar Me Gusta.");
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
    // ... (Tu código de 'setupCommentForm' no cambia) ...
    const sendBtn = document.getElementById("sendCommentBtn");
    const textArea = document.getElementById("commentTextArea");
    
    if (!sendBtn || !textArea) {
        console.error("No se encontró el formulario de comentario.");
        return;
    }

    sendBtn.onclick = async () => {
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
            alert("No se pudo enviar tu comentario.");
        } finally {
            sendBtn.disabled = false;
        }
    };
}