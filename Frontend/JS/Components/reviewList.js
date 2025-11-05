// ===============================================
// 📋 JS/Components/reviewList.js
// (ACTUALIZADO con renderMultiItemCarousel)
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
    container.innerHTML = reviewsHtml;
}


/**
 * 🚀 ¡NUEVO! Renderizador de Carrusel Multi-Ítem 🚀
 * Agrupa varios items (reseñas) dentro de un solo slide (.carousel-item).
 *
 * @param {string} containerId - El ID del elemento ".carousel-inner".
 * @param {Array<object>} items - El array de datos (ej: reseñas).
 * @param {Function} itemRenderer - La FUNCIÓN que sabe cómo dibujar un item (ej: createReviewCard).
 * @param {number} [itemsPerSlide=3] - Cuántos items mostrar por slide.
 * @param {string} [emptyMessage="No hay items."] - Mensaje si el array está vacío.
 */
function renderMultiItemCarousel(containerId, items, itemRenderer, itemsPerSlide = 3, emptyMessage = "No hay items disponibles.") {
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

    const currentUserId = parseInt(localStorage.getItem("userId"), 10);
    let carouselHtml = "";

    // Agrupa los items de N en N (ej: de 3 en 3)
    for (let i = 0; i < items.length; i += itemsPerSlide) {
        const chunk = items.slice(i, i + itemsPerSlide);
        
        const activeClass = (i === 0) ? 'active' : '';

        carouselHtml += `
            <div class="carousel-item ${activeClass}">
                <!-- Contenedor Flex para los items lado a lado -->
                <div class="multi-carousel-slide">
        `;

        // Dibuja cada item dentro del slide
        chunk.forEach(item => {
            carouselHtml += `
                <div class="multi-carousel-item">
                    ${itemRenderer(item, currentUserId)}
                </div>
            `;
        });

        carouselHtml += `
                </div>
            </div>
        `;
    }
    
    container.innerHTML = carouselHtml;
}