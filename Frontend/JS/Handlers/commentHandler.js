// ===============================================
// 💬 JS/Handlers/commentHandler.js (NUEVO)
// ===============================================

/**
 * Prepara el formulario de "Añadir Comentario" dentro del modal.
 * @param {string} reviewId - El ID de la reseña que se está comentando.
 */
function setupCommentForm(reviewId) {
    const sendBtn = document.getElementById("sendCommentBtn");
    const textArea = document.getElementById("commentTextArea");
    
    if (!sendBtn || !textArea) {
        console.error("No se encontró el formulario de comentario.");
        return;
    }

    // (Usamos .onclick para asegurarnos de que solo haya un listener)
    sendBtn.onclick = async () => {
        const commentText = textArea.value.trim();
        if (commentText === "") {
            return; // No enviar comentarios vacíos
        }

        sendBtn.disabled = true; // Evitar doble click

        try {
            // 1. Llama a la API para crear el comentario
            const newComment = await window.commentsApi.createComment(reviewId, commentText);

            // 2. Limpia el área de texto
            textArea.value = "";

            // 3. Añade el nuevo comentario a la lista (Optimista)
            // (Asumimos que la API devuelve el comentario creado)
            const modalList = document.getElementById("modalCommentsList");
            
            // Si es el primer comentario, borra el mensaje "No hay comentarios"
            if (modalList.querySelector(".no-reviews")) {
                modalList.innerHTML = "";
            }
            
            modalList.innerHTML += createCommentCard(newComment);
            
            // Opcional: hacer scroll hasta el final
            modalList.scrollTop = modalList.scrollHeight;

        } catch (error) {
            console.error("Error al enviar comentario:", error);
            alert("No se pudo enviar tu comentario.");
        } finally {
            sendBtn.disabled = false; // Reactiva el botón
        }
    };
}