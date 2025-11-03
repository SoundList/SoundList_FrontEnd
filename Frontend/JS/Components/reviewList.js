// ===============================================
// 📋 JS/Components/reviewList.js
// (CORREGIDO: Arreglado el bucle 'innerHTML +=')
// ===============================================

/**
 * Renderiza una lista de reseñas (para el scroll de "Reseñas Recientes").
 * @param {string} containerId - El ID del contenedor donde se insertarán.
 * @param {Array<object>} reviews - El array de reseñas a mostrar.
 */
function renderReviewList(containerId, reviews) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Error: Contenedor #${containerId} no encontrado.`);
        return;
    }
    container.innerHTML = ""; // Limpia el contenedor

    if (!reviews || reviews.length === 0) {
        container.innerHTML = "<p class='no-reviews'>No hay reseñas disponibles.</p>";
        return;
    }

    const currentUserId = localStorage.getItem("userId"); 
    const numericUserId = parseInt(currentUserId, 10);

    // 💡 PASO 1: Construir todo el HTML en una variable primero.
    let reviewsHtml = "";
    reviews.forEach(review => {
        // Añade el HTML de la tarjeta a la variable
        reviewsHtml += createReviewCard(review, numericUserId);
    });
    
    // 💡 PASO 2: Insertar el HTML en el DOM una sola vez.
    // Esto evita que el navegador rompa el HTML a mitad del bucle.
    container.innerHTML = reviewsHtml;
}


/**
 * 🚀 Renderizador de Carrusel GENÉRICO 🚀
 * (Esta función ya estaba correcta, pero la incluimos)
 */
function renderGenericCarousel(containerId, items, itemRenderer, emptyMessage = "No hay items disponibles.") {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Error: Contenedor de carrusel #${containerId} no encontrado.`);
        return;
    }
    container.innerHTML = ""; // Limpia el contenedor

    if (!items || items.length === 0) {
        container.innerHTML = `
            <div class="carousel-item active">
                <p class='text-muted p-4 text-center'>${emptyMessage}</p>
            </div>`;
        return;
    }

    let carouselHtml = "";
    const currentUserId = parseInt(localStorage.getItem("userId"), 10); // Necesario para el renderer

    items.forEach((item, index) => {
        const activeClass = (index === 0) ? 'active' : '';

        // Llama a la función "dibujadora" (itemRenderer)
        const itemHtml = itemRenderer(item, currentUserId); // Pasamos el userId

        carouselHtml += `
            <div class="carousel-item ${activeClass}">
                <div class="p-2"> 
                    ${itemHtml}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = carouselHtml;
}