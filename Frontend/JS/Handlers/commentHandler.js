// ===============================================
// 💬 JS/Handlers/commentHandler.js (¡ESTE ES EL ARCHIVO QUE FALTABA!)
// (Define las funciones para los iconos)
// ===============================================

/**
 * 💡 Cierra TODOS los menús de comentarios abiertos
 */
window.closeAllCommentMenus = function() {
    document.querySelectorAll(".comment-menu.visible").forEach(m => {
        m.classList.remove("visible");
        m.style.display = "none";
    });
}

/**
 * 💡 Abre/Cierra el menú de un comentario (Dropdown)
 */
window.toggleCommentMenu = function(event, menuId) {
    event.stopPropagation();
    const menu = document.getElementById(menuId);

    // Cierra otros menús de comentarios
    document.querySelectorAll(".comment-menu.visible").forEach(m => {
        if (m !== menu) {
            m.classList.remove("visible");
            m.style.display = "none";
        }
    });

    const isVisible = menu.classList.contains("visible");
    if (isVisible) {
        menu.classList.remove("visible");
        menu.style.display = "none";
        return;
    }

    // Lógica de visualización y posicionamiento
    const icon = event.currentTarget;
    const rect = icon.getBoundingClientRect();
    
    document.body.appendChild(menu); 
    menu.style.position = "absolute";
    menu.style.top = `${rect.top + window.scrollY - menu.offsetHeight - 5}px`; 
    menu.style.left = `${rect.right - 160}px`; 
    menu.style.zIndex = "999999";
    menu.style.display = "block";
    menu.classList.add("visible");
};

/**
 * 💡 Cierre global (si se hace clic fuera)
 */
document.addEventListener("click", e => {
    if (!e.target.closest(".comment-menu") && !e.target.closest(".comment-menu-options")) {
        closeAllCommentMenus();
    }
});


/**
 * 💡 ¡ESTA ES LA FUNCIÓN QUE HACE CLICKABLES LOS ICONOS!
 * Maneja las acciones de Editar/Borrar/Reportar un comentario
 */
window.handleCommentMenuAction = async function(event) {
    event.stopPropagation();
    const button = event.currentTarget;
    const action = button.getAttribute('data-action');
    const commentId = button.getAttribute('data-comment-id');

    closeAllCommentMenus(); // Cierra los menús (si es que hay)

    switch (action) {
        case 'edit':
            // 💡 1. Verifica si tiene reacciones
            try {
                // (Asumiendo que 'getCommentReactionCount' existe en 'reviewApi.js')
                const reactionData = await window.reviewApi.getCommentReactionCount(commentId);
                const count = reactionData.count || (typeof reactionData === 'number' ? reactionData : 0);

                if (count > 0) {
                    alert("Este comentario ya tiene reacciones y no se puede editar.");
                    return;
                }
                
                // 2. Si no tiene reacciones, permite editar
                const card = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
                const textElement = card.querySelector('.comment-text');
                const oldText = textElement.textContent;
                
                const newText = prompt("Edita tu comentario:", oldText);
                
                if (newText && newText !== oldText) {
                    // (Llama a 'commentsApi.js' para actualizar)
                    await window.commentsApi.updateComment(commentId, newText);
                    textElement.textContent = newText; // Actualización optimista
                    alert("Comentario actualizado.");
                }

            } catch (error) {
                console.error("Error al verificar/editar:", error);
                alert("Error al intentar editar el comentario.");
            }
            break;
            
        case 'delete':
            if (confirm(`¿Confirma eliminar este comentario?`)) {
                try {
                    await window.commentsApi.deleteComment(commentId);
                    const cardToRemove = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
                    if (cardToRemove) cardToRemove.remove();
                } catch (error) {
                    console.error("Error al eliminar comentario:", error);
                    alert("No se pudo eliminar el comentario.");
                }
            }
            break;
            
        case 'report':
            const reason = prompt("¿Por qué quieres reportar este comentario?");
            if (reason) {
                try {
                    await window.commentsApi.reportComment(commentId, reason);
                    alert("Comentario reportado exitosamente.");
                } catch (error) {
                    console.error("Error al reportar comentario:", error);
                    alert("Error: No se pudo enviar el reporte.");
                }
            }
            break;
    }
};


/**
 * Prepara el formulario de "Añadir Comentario" dentro del modal.
 */
function setupCommentForm(reviewId) {
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
            const newComment = await window.commentsApi.createComment(reviewId, commentText);
            textArea.value = "";

            const modalList = document.getElementById("modalCommentsList");
            
            if (modalList.querySelector(".no-reviews") || modalList.querySelector(".text-danger")) {
                modalList.innerHTML = "";
            }
            
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