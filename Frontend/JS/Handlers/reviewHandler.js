// ===============================================
// ⚙️ JS/Handlers/reviewHandler.js
// (ACTUALIZADO para lógica de Dropdown)
// ===============================================

/**
 * 💡 ¡REVERTIDO! Vuelve a la lógica de calcular posición
 */
window.toggleReviewMenu = function(event, menuId) {
    event.stopPropagation();
    const menu = document.getElementById(menuId);

    // Cierra otros menús abiertos
    document.querySelectorAll(".review-menu.visible").forEach(m => {
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
    
    // (Ya no usamos el overlay)
    document.body.appendChild(menu); 
    menu.style.position = "absolute";
    menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
    menu.style.left = `${rect.right - 160}px`; // Ajusta la posición
    menu.style.zIndex = "99999";
    menu.style.display = "block";
    menu.classList.add("visible");
};

/**
 * 💡 ¡RESTAURADO! Cierre global del menú al hacer click afuera
 */
document.addEventListener("click", e => {
    if (!e.target.closest(".review-menu") && !e.target.closest(".review-options")) {
        document.querySelectorAll(".review-menu.visible").forEach(m => {
            m.classList.remove("visible");
            m.style.display = "none";
        });
    }
});
const MOCK_COMMENTS = [
    {
        commentId: 1,
        userId: 1, // El dueño (asumiendo que el usuario logueado es '1')
        username: "TuUsuarioDePrueba",
        avatar: "../../Assets/default-avatar.png",
        text: "Este es mi propio comentario. Tiene 0 likes, así que SÍ puedo editarlo.",
        likes: 0, // 👈 0 LIKES = EDITABLE
        userLiked: false
    },
    {
        commentId: 2,
        userId: 99, // Otro usuario
        username: "MusicFan88",
        avatar: "https://placehold.co/40x40/634F94/F0F0F0?text=M",
        text: "Mmm, no estoy tan seguro. Creo que el álbum anterior fue mejor.",
        likes: 12,
        userLiked: false
    },
    {
        commentId: 3,
        userId: 1, // El dueño
        username: "TuUsuarioDePrueba",
        avatar: "../../Assets/default-avatar.png",
        text: "Aunque pensándolo bien... Este comentario tiene likes, así que NO puedo editarlo, solo borrarlo.",
        likes: 2, // 👈 >0 LIKES = NO EDITABLE
        userLiked: true
    },
    {
        commentId: 4,
        userId: 98, // Otro usuario
        username: "SaraTune",
        avatar: "https://placehold.co/40x40/9A7BFF/F0F0F0?text=S",
        text: "¡Gran reseña! 10/10.",
        likes: 1,
        userLiked: false
    }
];

// Función que maneja las acciones del menú
window.handleMenuAction = async function(event) {
    event.stopPropagation();
    const button = event.currentTarget;
    const action = button.getAttribute('data-action');
    const reviewId = button.getAttribute('data-review-id');

    // Cierra el menú (la cajita)
    const menu = button.closest('.review-menu');
    if (menu) {
        menu.classList.remove("visible");
        menu.style.display = "none";
    }

    switch (action) {
        case 'edit':
            alert(`Acción: Editar reseña #${reviewId}`);
            break;
            
        case 'delete':
            if (confirm(`¿Confirma eliminar la reseña #${reviewId}?`)) {
                try {
                    await window.reviewApi.deleteReview(reviewId);
                    const cardToRemove = document.querySelector(`.review-card[data-review-id="${reviewId}"]`);
                    if (cardToRemove) cardToRemove.remove();
                    alert(`Reseña #${reviewId} eliminada.`);
                } catch (error) {
                    console.error("Error al eliminar:", error);
                    alert("No se pudo eliminar la reseña.");
                }
            }
            break;
            
        case 'report':
            const reason = prompt("¿Por qué quieres reportar esta reseña?");
            if (reason) {
                try {
                    await window.reviewApi.reportReview(reviewId, reason);
                    alert("Reseña reportada exitosamente.");
                } catch (error) {
                    console.error("Error al reportar:", error);
                    alert("Error: No se pudo enviar el reporte.");
                }
            }
            break;
            
  case 'comments':
            const modalList = document.getElementById("modalCommentsList");
            if (!modalList || !commentsModalInstance) {
                console.error("El modal de comentarios no está inicializado.");
                return;
            }

            modalList.innerHTML = "<p>Cargando comentarios...</p>";
            commentsModalInstance.show();

            try {
               // const comments = await window.commentsApi.getCommentsForReview(reviewId);
                console.warn("Usando MOCK DATA para comentarios.");
                const comments = MOCK_COMMENTS;
                // 💡 ¡CAMBIO! Necesitamos el ID del usuario logueado
                const currentUserId = 1;//parseInt(localStorage.getItem("userId"), 10);

                if (comments && comments.length > 0) {
                    modalList.innerHTML = "";
                    comments.forEach(comment => {
                        // 💡 ¡CAMBIO! Pasamos el ID para la lógica de "dueño"
                        modalList.innerHTML += createCommentCard(comment, currentUserId);
                    });
                } else {
                    modalList.innerHTML = "<p class='no-reviews'>No hay comentarios en esta reseña.</p>";
                }

                if (typeof setupCommentForm === 'function') {
                    setupCommentForm(reviewId);
                }

            } catch (error) {
                console.error("Error al cargar comentarios:", error);
                modalList.innerHTML = "<p class='text-danger'>Error al cargar los comentarios.</p>";
            }
            break;
    }
};