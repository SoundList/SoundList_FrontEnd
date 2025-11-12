// ===============================================
// ⚙️ JS/Handlers/reviewHandler.js
// (ACTUALIZADO: Conectado 100% a 'reviewApi.js' y 'commentsApi.js')
// ===============================================

/**
 * Entra en modo edición para una RESEÑA
 */
window.toggleReviewEditMode = function(reviewId) {
    const card = document.querySelector(`.review-card[data-review-id="${reviewId}"]`);
    if (!card) return;

    // (Tu lógica de UI para 'is-editing-something' es correcta)
    const textElement = card.querySelector('.rc-body');
    const actionsElement = card.querySelector('.rc-actions-stack');
    if (!textElement || !actionsElement) return;

    // (Verificación de 'Likes' desde el DOM - Tu lógica original)
    // 💡 NOTA: Esto no es 100% seguro si el conteo de likes
    // 💡 se actualizó pero la tarjeta no se recargó.
    const likeCountEl = card.querySelector(".rc-likes .like-count");
    if (likeCountEl && parseInt(likeCountEl.textContent, 10) > 0) {
        window.showAlert("Esta reseña ya tiene reacciones y no se puede editar.", "Error");
        return;
    }

    const oldText = textElement.textContent;

    // 1. Añade clases de bloqueo (para EDICIÓN)
    document.body.classList.add('is-editing-something');
    card.classList.add('is-editing');

    // 2. Ocultar elementos originales
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
                // 🚀 ¡Llamada a tu API real! (reviewApi.js)
                await window.reviewApi.updateReview(reviewId, newText);
                
                textElement.textContent = newText; 
                window.showAlert("Reseña actualizada.", "Éxito");

            } catch (error) {
                console.error("Error al actualizar reseña:", error);
                window.showAlert("No se pudo actualizar la reseña.", "Error");
                return; // No salimos si falla
            }
        }
        exitEditMode(); 
    };
    
    // 5. Ensamblar
    buttonsContainer.appendChild(cancelBtn);
    buttonsContainer.appendChild(confirmBtn);
    editContainer.appendChild(textarea);
    editContainer.appendChild(buttonsContainer);

    textElement.after(editContainer);
    textarea.focus();
}

/**
 * Cierra TODOS los menús desplegables de reseñas.
 */
window.closeAllMenus = function() {
    document.querySelectorAll(".review-menu.visible").forEach(m => {
        m.classList.remove("visible");
        m.style.display = "none";
    });
    document.body.classList.remove('menu-is-open');
}

/**
 * Muestra/Oculta un menú desplegable específico.
 */
window.toggleReviewMenu = function(event, menuId) {
    // (Tu lógica de UI para mostrar/ocultar el menú es correcta)
    // ... (La omito por brevedad, pero la copio tal cual)
    // ...
    event.stopPropagation();
    const menu = document.getElementById(menuId);

    let otherMenuWasOpen = false;
    document.querySelectorAll(".review-menu.visible").forEach(m => {
        if (m !== menu) {
            m.classList.remove("visible");
            m.style.display = "none";
            otherMenuWasOpen = true;
        }
    });
    
    if (otherMenuWasOpen) {
        document.body.classList.remove('menu-is-open');
    }

    const isVisible = menu.classList.contains("visible");
    if (isVisible) {
        menu.classList.remove("visible");
        menu.style.display = "none";
        document.body.classList.remove('menu-is-open');
        return;
    }

    const icon = event.currentTarget;
    const rect = icon.getBoundingClientRect();
    
    document.body.appendChild(menu); 
    menu.style.position = "absolute";
    menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
    menu.style.left = `${rect.right - 180}px`; 
    menu.style.zIndex = "99999"; 
    menu.style.display = "block";
    menu.classList.add("visible");
    
    document.body.classList.add('menu-is-open');
};


/**
 * Maneja acciones de una RESEÑA (Dropdown o Comentarios)
 */
window.handleReviewMenuAction = async function(event) {
    event.stopPropagation();
    const button = event.currentTarget;
    const action = button.getAttribute('data-action');
    const reviewId = button.getAttribute('data-review-id');

    // Cierra el menú (y quita el 'lock') DESPUÉS de seleccionar una acción
    closeAllMenus();
    
    switch (action) {
        case 'edit':
            // Llama a la función de edición (ahora real)
            toggleReviewEditMode(reviewId);
            break;
            
        case 'delete':
            if (confirm(`¿Estás seguro de que quieres eliminar la reseña #${reviewId}? Esta acción no se puede deshacer.`)) {
                
                try {
                    // 🚀 ¡Llamada a tu API real! (reviewApi.js)
                    await window.reviewApi.deleteReview(reviewId);
                    
                    const cardToRemove = document.querySelector(`.review-card[data-review-id="${reviewId}"]`);
                    if (cardToRemove) cardToRemove.remove();
                    window.showAlert(`Reseña #${reviewId} eliminada.`, "Eliminada");

                } catch (error) {
                    console.error("Error al eliminar:", error);
                    window.showAlert("No se pudo eliminar la reseña.", "Error");
                }
            }
            break;
            
        case 'report':
            const reason = prompt("¿Por qué quieres reportar esta RESEÑA?");
            if (reason) {
                try {
                    // 💡 ¡COMENTARIO CORREGIDO!
                    // Llamamos a la función 'reportReview' (que está en reviewApi.js).
                    // Esta función es una SIMULACIÓN (como tú la definiste).
                    await window.reviewApi.reportReview(reviewId, reason);
                    
                    // Mostramos el mensaje de éxito de la simulación
                    window.showAlert("Reseña reportada exitosamente (simulado).", "Reporte Enviado");

                } catch (error) {
                    console.error("Error al reportar:", error);
                    window.showAlert("Error: No se pudo enviar el reporte.", "Error");
                }
            }
            break;
            
        // 💡 ¡LÓGICA DE COMENTARIOS AHORA ES REAL!
        case 'comments':
            const commentsModalEl = document.getElementById('commentsModal');
            
            // Inicialización defensiva
            if (!window.commentsModalInstance && commentsModalEl && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                 window.commentsModalInstance = new bootstrap.Modal(commentsModalEl);
            }
            
            const modalList = document.getElementById("modalCommentsList");
            
            if (!modalList || !window.commentsModalInstance) {
                 console.error("Error crítico: El modal de comentarios o su instancia no están disponibles.");
                 window.showAlert("Error al abrir comentarios. Recarga la página.", "Error");
                 return;
            }

            // Mostramos el modal y el 'Cargando...'
            window.commentsModalInstance.show(); 
            modalList.innerHTML = "<p class='text-center p-4'>Cargando comentarios...</p>";

            try {
                // 🚀 ¡Llamada a tu API real! (commentsApi.js)
                const comments = await window.commentsApi.getCommentsForReview(reviewId);
                
                const currentUserId = parseInt(localStorage.getItem("userId"), 10);
                const isLoggedIn = !isNaN(currentUserId);

                if (comments && comments.length > 0) {
                    modalList.innerHTML = ""; // Limpiamos el 'Cargando...'
                    comments.forEach(comment => {
                        // Llama a la función de 'commentCard.js'
                        modalList.innerHTML += createCommentCard(comment, currentUserId);
                    });
                } else {
                    modalList.innerHTML = "<p class='no-reviews p-4 text-center text-muted'>Sé el primero en comentar.</p>";
                }
                
                // Muestra/Oculta el formulario de escribir
                const commentForm = document.getElementById('commentFormContainer');
                if (commentForm) {
                    commentForm.style.display = isLoggedIn ? 'flex' : 'none';
                }

                // Prepara el formulario (Llama a 'commentHandler.js')
                if (isLoggedIn && typeof setupCommentForm === 'function') {
                    setupCommentForm(reviewId);
                }

            } catch (error) {
                console.error("Error al cargar comentarios:", error);
                modalList.innerHTML = "<p class='text-danger p-4 text-center'>Error al cargar los comentarios.</p>";
            }
            break;
    }
};

