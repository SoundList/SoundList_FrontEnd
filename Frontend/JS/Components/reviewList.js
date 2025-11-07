

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
    container.innerHTML = ""; 

    if (!reviews || reviews.length === 0) {
        container.innerHTML = "<p class='no-reviews'>No hay reseñas disponibles.</p>";
        return;
    }

    const currentUserId = localStorage.getItem("userId"); 
    const numericUserId = parseInt(currentUserId, 10);

    let reviewsHtml = "";
    reviews.forEach(review => {
        reviewsHtml += createReviewCard(review, numericUserId);
    });
    
    container.innerHTML = reviewsHtml;
}

function renderGenericCarousel(containerId, items, itemRenderer, emptyMessage = "No hay items disponibles.") {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Error: Contenedor de carrusel #${containerId} no encontrado.`);
        return;
    }
    container.innerHTML = ""; 

    if (!items || items.length === 0) {
        container.innerHTML = `
            <div class="carousel-item active">
                <p class='text-muted p-4 text-center'>${emptyMessage}</p>
            </div>`;
        return;
    }

    let carouselHtml = "";
    const currentUserId = parseInt(localStorage.getItem("userId"), 10); 

    items.forEach((item, index) => {
        const activeClass = (index === 0) ? 'active' : '';

        const itemHtml = itemRenderer(item, currentUserId); 

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