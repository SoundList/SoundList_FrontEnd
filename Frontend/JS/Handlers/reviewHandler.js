// ===============================================
// ⚙️ JS/Handlers/reviewHandler.js
// (ACTUALIZADO: Inicialización defensiva de commentsModalInstance)
// ===============================================

/**
 * 💡 ¡FUNCIÓN CORREGIDA! 
 * Se movió al ámbito global (como en commentHandler.js) 
 * para arreglar el bug de bloqueo.
 */
window.toggleReviewEditMode = function(reviewId) {
    const card = document.querySelector(`.review-card[data-review-id="${reviewId}"]`);
    if (!card) return;

    const textElement = card.querySelector('.rc-body');
    const actionsElement = card.querySelector('.rc-actions-stack');
    if (!textElement || !actionsElement) return;

    const oldText = textElement.textContent;

    // 1. Añade clases de bloqueo (para EDICIÓN)
    document.body.classList.add('is-editing-something');
    card.classList.add('is-editing');

    // 2. Ocultar elementos originales
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
                // (Llamada a la API...)
                textElement.textContent = newText; 
                
                // (Usando la versión del modal que te di)
                window.showAlert("Reseña actualizada (simulado).", "Éxito");

            } catch (error) {
                console.error("Error al actualizar reseña:", error);
            }
        }
        exitEditMode(); // Llama a la función de salida
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
    // 💡 CAMBIO: Quitar el bloqueo del menú
    document.body.classList.remove('menu-is-open');
}

/**
 * Muestra/Oculta un menú desplegable específico.
 */
window.toggleReviewMenu = function(event, menuId) {
    event.stopPropagation();
    const menu = document.getElementById(menuId);

    // Cierra todos los OTROS menús (y quita el lock por si acaso)
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
        // El menú ESTABA visible, así que lo cerramos (al hacer clic de nuevo)
        menu.classList.remove("visible");
        menu.style.display = "none";
        // 💡 CAMBIO: Quitar el bloqueo
        document.body.classList.remove('menu-is-open');
        return;
    }

    // El menú NO estaba visible, así que lo abrimos
    const icon = event.currentTarget;
    const rect = icon.getBoundingClientRect();
    
    document.body.appendChild(menu); 
    menu.style.position = "absolute";
    menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
    menu.style.left = `${rect.right - 180}px`; 
    menu.style.zIndex = "99999"; // z-index alto para el menú
    menu.style.display = "block";
    menu.classList.add("visible");
    
    // 💡 CAMBIO: Añadir el bloqueo
    document.body.classList.add('menu-is-open');
};

// 💡 CAMBIO IMPORTANTE:
// Se eliminó el 'document.addEventListener("click", ...)'
// que cerraba el menú al hacer clic fuera.
// Ahora, solo closeAllMenus() (el botón 'X') o seleccionar
// una acción (handleReviewMenuAction) pueden cerrar el menú.


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
            // 💡 ¡CAMBIO! Llama a la nueva función global
            toggleReviewEditMode(reviewId);
            break;
            
        case 'delete':
            // 💡 CAMBIO: Volvemos al 'confirm' nativo.
            // El 'window.showConfirm' (modal) está chocando
            // con el overlay 'menu-is-open' (nuestro 'backdrop' manual).
            // Usamos 'confirm()' nativo, que SÍ funciona (igual que 'prompt()').
            if (confirm(`¿Estás seguro de que quieres eliminar la reseña #${reviewId}? Esta acción no se puede deshacer.`)) {
            
            // if (confirmed) { // Esta línea se reemplaza
                try {
                    // await window.reviewApi.deleteReview(reviewId);
                    const cardToRemove = document.querySelector(`.review-card[data-review-id="${reviewId}"]`);
                    if (cardToRemove) cardToRemove.remove();
                    window.showAlert(`Reseña #${reviewId} eliminada (simulado).`, "Eliminada");
                } catch (error) {
                    console.error("Error al eliminar:", error);
                    window.showAlert("No se pudo eliminar la reseña.", "Error");
                }
            }
            break;
            
        case 'report':
            // Usamos prompt nativo porque showConfirm no es para inputs
            const reason = prompt("¿Por qué quieres reportar esta RESEÑA?");
            if (reason) {
                try {
                    // await window.reviewApi.reportReview(reviewId, reason);
                    window.showAlert("Reseña reportada exitosamente (simulado).", "Reporte Enviado");
                } catch (error) {
                    console.error("Error al reportar:", error);
                    window.showAlert("Error: No se pudo enviar el reporte.", "Error");
                }
            }
            break;
            
        // 💡 ¡LÓGICA CORREGIDA!
        case 'comments':
            const commentsModalEl = document.getElementById('commentsModal');
            
            // 💡 SOLUCIÓN: Si la instancia del modal no existe (por si acaso), la inicializamos aquí.
            if (!window.commentsModalInstance && commentsModalEl && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                 window.commentsModalInstance = new bootstrap.Modal(commentsModalEl);
            }
            
            const modalList = document.getElementById("modalCommentsList");
            
            // Verificamos si la instancia y la lista existen
            if (!modalList || !window.commentsModalInstance) {
                 console.error("Error crítico: El modal de comentarios o su instancia no están disponibles.");
                 window.showAlert("Error al abrir comentarios. Recarga la página.", "Error");
                 return;
            }

            window.commentsModalInstance.show(); 
            modalList.innerHTML = "<p>Cargando comentarios...</p>";

            try {
                console.warn("Usando MOCK DATA para comentarios.");
                const comments = MOCK_COMMENTS; // Usa los mocks de abajo
                // 💡 Nota: Esto carga los mismos mocks para TODAS las reseñas.
                // Una implementación real debería filtrar por reviewId.
                
                const currentUserId = parseInt(localStorage.getItem("userId"), 10);
                const isLoggedIn = !isNaN(currentUserId);

                if (comments && comments.length > 0) {
                    modalList.innerHTML = "";
                    comments.forEach(comment => {
                        // Llama a la función de 'commentCard.js'
                        modalList.innerHTML += createCommentCard(comment, currentUserId);
                    });
                } else {
                    modalList.innerHTML = "<p class='no-reviews'>No hay comentarios en esta reseña.</p>";
                }
                
                // Muestra/Oculta el formulario de escribir
                const commentForm = document.getElementById('commentFormContainer');
                if (commentForm) {
                    commentForm.style.display = isLoggedIn ? 'flex' : 'none';
                }

                // Prepara el formulario (si existe y estás logueado)
                if (isLoggedIn && typeof setupCommentForm === 'function') {
                    setupCommentForm(reviewId); // Llama a 'commentHandler.js'
                }
            } catch (error) {
                console.error("Error al cargar comentarios:", error);
                modalList.innerHTML = "<p class='text-danger'>Error al cargar los comentarios.</p>";
            }
            break;
    }
};

// 💡 ¡MOCKS RESTAURADOS!
const MOCK_COMMENTS = [
    { commentId: 1, userId: 1, username: "TuUsuarioDePrueba", avatar: "../../Assets/default-avatar.png", text: "Este es mi propio comentario. Tiene 0 likes, así que SÍ puedo editarlo.", likes: 0, userLiked: false },
    { commentId: 2, userId: 99, username: "MusicFan88", avatar: "https://placehold.co/40x40/634F94/F0F0F0?text=M", text: "Mmm, no estoy tan seguro. Creo que el álbum anterior fue mejor.", likes: 12, userLiked: false },
    { commentId: 3, userId: 1, username: "TuUsuarioDePrueba", avatar: "../../Assets/default-avatar.png", text: "Este comentario tiene likes, así que NO puedo editarlo, solo borrarlo.", likes: 2, userLiked: true },
    { commentId: 4, userId: 98, username: "SaraTune", avatar: "https://placehold.co/40x40/9A7BFF/F0F0F0?text=S", text: "¡Gran reseña! 10/10.", likes: 1, userLiked: false }
];