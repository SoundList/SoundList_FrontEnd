// ================================
// 📜 JS/Pages/profile.js
// (ACTUALIZADO: El carrusel ahora usa la "tarjeta completa")
// ================================

// (Datos de prueba para el carrusel)
const MOCK_REVIEWS_FOR_CAROUSEL = [
    { id: 102, userId: 99, username: "MusicFan88", avatar: "https://placehold.co/40x40/634F94/F0F0F0?text=M", title: "Random Access Memories", text: "Un clásico moderno.", stars: 4.5, likes: 221, userLiked: true },
    { id: 103, userId: 98, username: "SaraTune", avatar: "https://placehold.co/40x40/9A7BFF/F0F0F0?text=S", title: "After Hours", text: "Oscuro, cinematográfico.", stars: 4, likes: 90, userLiked: false },
    { id: 106, userId: 96, username: "LofiLover", avatar: "https://placehold.co/40x40/FFD85E/2A1A45?text=L", title: "Modal Soul", text: "Perfecto para relajarse.", stars: 5, likes: 260, userLiked: true }
];

// Variable global para guardar la instancia del modal (la usará reviewHandler.js)
var commentsModalInstance = null;

/**
 * Función REUTILIZABLE para cargar el carrusel de reseñas destacadas.
 * @param {string} type - "best" o "less_rated"
 */
async function loadCarouselData(type) {
    const containerId = "featured-reviews-container"; 
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.warn("Contenedor de carrusel no encontrado.");
        return; 
    }
    
    container.innerHTML = `<div class="carousel-item active"><p class='text-muted p-4 text-center'>Cargando...</p></div>`;

    try {
        let reviewsToShow;
        let emptyMessage = "No hay reseñas disponibles.";

        // 💡 USANDO MOCK DATA (puedes cambiarlo por la API cuando quieras)
        if (type === "best") {
            // reviewsToShow = await window.reviewApi.getBestReviews();
            reviewsToShow = MOCK_REVIEWS_FOR_CAROUSEL; 
            emptyMessage = "No hay reseñas destacadas por ahora.";
        } else if (type === "less_rated") {
            // reviewsToShow = await window.reviewApi.getLessCommentedReviews(); 
            reviewsToShow = MOCK_REVIEWS_FOR_CAROUSEL.slice(0, 2); 
            emptyMessage = "No hay reseñas menos puntuadas.";
        } else {
            reviewsToShow = [];
        }
        
        console.warn(`Usando MOCK DATA para el carrusel (tipo: ${type}).`);

        // --- Renderizado con el Renderizador Genérico ---
        
        const currentUserId = parseInt(localStorage.getItem("userId"), 10);
        
        // 💡 ¡CAMBIO! 
        // Creamos la "función dibujadora" que llama a tu 'createReviewCard' completo.
        const reviewCardRenderer = (review) => {
            return createReviewCard(review, currentUserId);
        };

        // Le pasamos la tarjeta completa (reviewCardRenderer) al carrusel
        renderGenericCarousel(containerId, reviewsToShow, reviewCardRenderer, emptyMessage);

    } catch (error) {
        console.error(`Error al cargar ${type} reviews:`, error);
        container.innerHTML = `<div class="carousel-item active"><p class='text-danger p-4 text-center'>Error al cargar reseñas.</p></div>`;
    }
}


// --- PUNTO DE ENTRADA PRINCIPAL ---
document.addEventListener("DOMContentLoaded", () => {
    
    const modalElement = document.getElementById('commentsModal');
    if (modalElement) {
        commentsModalInstance = new bootstrap.Modal(modalElement); 
    }

    if (typeof loadUserProfile === 'function') {
        loadUserProfile();
    } else {
        console.error("Error: profileHandler.js no se cargó correctamente.");
    }

    loadCarouselData("best");

    const btnBest = document.getElementById("btnShowBest");
    const btnLessRated = document.getElementById("btnShowLessRated");

    if (btnBest) {
        btnBest.addEventListener("click", () => {
            loadCarouselData("best");
            btnBest.classList.add("active");
            if (btnLessRated) btnLessRated.classList.remove("active");
        });
    }
    
    if (btnLessRated) {
        btnLessRated.addEventListener("click", () => {
            loadCarouselData("less_rated");
            btnLessRated.classList.add("active");
            if (btnBest) btnBest.classList.remove("active");
        });
    }
});