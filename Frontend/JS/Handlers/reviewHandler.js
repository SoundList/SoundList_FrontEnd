
window.toggleReviewEditMode = function(reviewId) {
    const card = document.querySelector(`.review-card[data-review-id="${reviewId}"]`);
    if (!card) return;

    const textElement = card.querySelector('.rc-body');
    const actionsElement = card.querySelector('.rc-actions-stack');
    if (!textElement || !actionsElement) return;


    const likeCountEl = card.querySelector(".rc-likes .like-count");
    if (likeCountEl && parseInt(likeCountEl.textContent, 10) > 0) {
        window.showAlert("Esta reseña ya tiene reacciones y no se puede editar.", "Error");
        return;
    }

    const oldText = textElement.textContent;


    document.body.classList.add('is-editing-something');
    card.classList.add('is-editing');

 
    textElement.style.display = 'none';
    actionsElement.style.display = 'none';

 
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

                await window.reviewApi.updateReview(reviewId, newText);
                
                textElement.textContent = newText; 
                window.showAlert("Reseña actualizada.", "Éxito");

            } catch (error) {
                console.error("Error al actualizar reseña:", error);
                window.showAlert("No se pudo actualizar la reseña.", "Error");
                return; 
            }
        }
        exitEditMode(); 
    };
    

    buttonsContainer.appendChild(cancelBtn);
    buttonsContainer.appendChild(confirmBtn);
    editContainer.appendChild(textarea);
    editContainer.appendChild(buttonsContainer);

    textElement.after(editContainer);
    textarea.focus();
}


window.closeAllMenus = function() {
    document.querySelectorAll(".review-menu.visible").forEach(m => {
        m.classList.remove("visible");
        m.style.display = "none";
    });
    document.body.classList.remove('menu-is-open');
}


window.toggleReviewMenu = function(event, menuId) {

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


window.handleReviewMenuAction = async function(event) {
    event.stopPropagation();
    const button = event.currentTarget;
    const action = button.getAttribute('data-action');
    const reviewId = button.getAttribute('data-review-id');

    closeAllMenus();
    
    switch (action) {
        case 'edit':
            toggleReviewEditMode(reviewId);
            break;
            
        case 'delete':
            if (confirm(`¿Estás seguro de que quieres eliminar la reseña #${reviewId}? Esta acción no se puede deshacer.`)) {
                
                try {
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
                    await window.reviewApi.reportReview(reviewId, reason);

                    window.showAlert("Reseña reportada exitosamente (simulado).", "Reporte Enviado");

                } catch (error) {
                    console.error("Error al reportar:", error);
                    window.showAlert("Error: No se pudo enviar el reporte.", "Error");
                }
            }
            break;

        case 'comments':
            const commentsModalEl = document.getElementById('commentsModal');

            if (!window.commentsModalInstance && commentsModalEl && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                 window.commentsModalInstance = new bootstrap.Modal(commentsModalEl);
            }
            
            const modalList = document.getElementById("modalCommentsList");
            
            if (!modalList || !window.commentsModalInstance) {
                 console.error("Error crítico: El modal de comentarios o su instancia no están disponibles.");
                 window.showAlert("Error al abrir comentarios. Recarga la página.", "Error");
                 return;
            }


            window.commentsModalInstance.show(); 
            modalList.innerHTML = "<p class='text-center p-4'>Cargando comentarios...</p>";

            try {

                const comments = await window.commentsApi.getCommentsForReview(reviewId);
                
                const currentUserId = parseInt(localStorage.getItem("userId"), 10);
                const isLoggedIn = !isNaN(currentUserId);

                if (comments && comments.length > 0) {
                    modalList.innerHTML = ""; 
                    comments.forEach(comment => {
                        modalList.innerHTML += createCommentCard(comment, currentUserId);
                    });
                } else {
                    modalList.innerHTML = "<p class='no-reviews p-4 text-center text-muted'>Sé el primero en comentar.</p>";
                }

                const commentForm = document.getElementById('commentFormContainer');
                if (commentForm) {
                    commentForm.style.display = isLoggedIn ? 'flex' : 'none';
                }

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

