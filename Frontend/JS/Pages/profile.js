// ================================
// 📜 JS/Pages/profile.js
// (Controlador UNIFICADO para la Página de Perfil)
// ================================
// (Datos de prueba - copiados de profileHandler.js para que esta función también los tenga)
const MOCK_REVIEWS_FOR_CAROUSEL = [
    { id: 102, userId: 99, username: "MusicFan88", avatar: "https://placehold.co/40x40/634F94/F0F0F0?text=M", title: "Random Access Memories", text: "Un clásico moderno.", stars: 4.5, likes: 22, userLiked: true },
    { id: 103, userId: 98, username: "SaraTune", avatar: "https://placehold.co/40x40/9A7BFF/F0F0F0?text=S", title: "After Hours", text: "Oscuro, cinematográfico.", stars: 4, likes: 15, userLiked: false },
    { id: 106, userId: 96, username: "LofiLover", avatar: "https://placehold.co/40x40/FFD85E/2A1A45?text=L", title: "Modal Soul", text: "Perfecto para relajarse.", stars: 5, likes: 19, userLiked: true }
];
// Variable global para guardar la instancia del modal (la usará reviewHandler.js)
var commentsModalInstance = null;

/**
 * Función REUTILIZABLE para cargar el carrusel de reseñas destacadas.
 * @param {string} type - "best" o "less_rated"
 */
async function loadCarouselData(type) {
    const containerId = "featured-reviews-container"; // ID del .carousel-inner
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.warn("Contenedor de carrusel no encontrado.");
        return; 
    }
    
    container.innerHTML = `<div class="carousel-item active"><p class='text-muted p-4 text-center'>Cargando...</p></div>`;

    try {
        let reviewsToShow;
        let emptyMessage = "No hay reseñas disponibles.";

        if (type === "best") {
            reviewsToShow = await window.reviewApi.getBestReviews();
            emptyMessage = "No hay reseñas destacadas por ahora.";
        } else if (type === "less_rated") {
            reviewsToShow = await window.reviewApi.getLessCommentedReviews(); 
            emptyMessage = "No hay reseñas menos puntuadas.";
        } else {
            reviewsToShow = [];
        }
        console.warn(`Usando MOCK DATA para el carrusel (tipo: ${type}).`);
        // --- Renderizado con el Renderizador Genérico ---
        
        const currentUserId = parseInt(localStorage.getItem("userId"), 10);
        
        // 1. Creamos la "función dibujadora" que le pasaremos
        const reviewCardRenderer = (review) => {
            // Pasamos ambos argumentos a createReviewCard
            return createReviewCard(review, currentUserId);
        };

        // 2. Llamamos a la función correcta 'renderGenericCarousel'
        renderGenericCarousel(containerId, reviewsToShow, reviewCardRenderer, emptyMessage);

    } catch (error) {
        console.error(`Error al cargar ${type} reviews:`, error);
        container.innerHTML = `<div class="carousel-item active"><p class='text-danger p-4 text-center'>Error al cargar reseñas.</p></div>`;
    }
}


// --- PUNTO DE ENTRADA PRINCIPAL ---
document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Inicializa la instancia del Modal de Comentarios
    const modalElement = document.getElementById('commentsModal');
    if (modalElement) {
        commentsModalInstance = new bootstrap.Modal(modalElement); 
    }

    // 2. Llama al handler principal para cargar el perfil y las reseñas recientes
    // (Esta función 'loadUserProfile' viene de profileHandler.js)
    if (typeof loadUserProfile === 'function') {
        loadUserProfile();
    } else {
        console.error("Error: profileHandler.js no se cargó correctamente.");
    }

    // 3. Carga el carrusel con el filtro "Mejores Reseñas" por defecto
    loadCarouselData("best");

    // 4. Asigna la lógica a los botones de filtro del carrusel
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