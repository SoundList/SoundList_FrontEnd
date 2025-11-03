// ===============================================
// 👍 JS/Handlers/likesHandler.js
// MANEJA LA LÓGICA DE DAR Y QUITAR "ME GUSTA"
// ===============================================

/**
 * Función global que maneja el toggle de like y la interacción con la API.
 * @param {Event} event - El evento de click en el botón de like.
 */
window.handleLikeToggle = async function(event) {
    event.stopPropagation();
    const button = event.currentTarget;
    const reviewId = button.getAttribute('data-review-id');
    const icon = button.querySelector("i");
    const countEl = button.parentElement.querySelector(".like-count");
    let count = parseInt(countEl.textContent);
    
    // Estado actual del like
    const liked = icon.style.color === "red";

    try {
        // 1. Lógica optimista (actualiza el frontend primero)
        if (liked) {
            icon.style.color = "gray";
            countEl.textContent = count - 1;
        } else {
            icon.style.color = "red";
            countEl.textContent = count + 1;
        }

        // 2. 📡 Llama a la API
        // Usamos la función del API global que creamos
        await window.reviewApi.toggleLikeReview(reviewId);

        // (Opcional) Si la API devuelve el conteo real, actualízalo
        // const apiResponse = await window.reviewApi.toggleLikeReview(reviewId);
        // countEl.textContent = apiResponse.newLikeCount;

    } catch (error) {
        console.error("Error al manejar el like:", error);
        
        // 3. ❌ Revertir el cambio si la llamada al API falla
        if (liked) { // Si falló al *quitar* el like
            icon.style.color = "red";
            countEl.textContent = count;
        } else { // Si falló al *dar* el like
            icon.style.color = "gray";
            countEl.textContent = count;
        }
        alert("Error al procesar la reacción.");
    }
};