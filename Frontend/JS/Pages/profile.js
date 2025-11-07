// ================================
// 📜 JS/Pages/profile.js
// (CORREGIDO: Vuelve a usar la lógica del Carrusel)
// ================================

// (Mock data para la sección de destacadas)
const MOCK_REVIEWS_FEATURED_BEST = [
    { id: 102, userId: 99, username: "MusicFan88", avatar: "https://placehold.co/40x40/634F94/F0F0F0?text=M", title: "Random Access Memories", text: "Un clásico moderno.", stars: 5, likes: 22, userLiked: true },
    { id: 103, userId: 98, username: "SaraTune", avatar: "https://placehold.co/40x40/9A7BFF/F0F0F0?text=S", title: "After Hours", text: "Oscuro, cinematográfico.", stars: 4.5, likes: 15, userLiked: false },
    { id: 106, userId: 96, username: "LofiLover", avatar: "https://placehold.co/40x40/FFD85E/2A1A45?text=L", title: "Modal Soul", text: "Perfecto para relajarse.", stars: 5, likes: 19, userLiked: true }
];

// 💡 ¡NUEVO! Mock data para las reseñas menos puntuadas
const MOCK_REVIEWS_FEATURED_LESS = [
    { id: 201, userId: 80, username: "CriticoMusical", avatar: "https://placehold.co/40x40/E84A5F/F0F0F0?text=C", title: "Inaudible", text: "No pude pasar de la segunda canción.", stars: 1, likes: 2, userLiked: false },
    { id: 202, userId: 81, username: "PopEnjoyer", avatar: "https://placehold.co/40x40/2A1A45/F0F0F0?text=P", title: "Decepción", text: "Esperaba más de este artista, muy genérico.", stars: 2, likes: 5, userLiked: false }
];

// Instancias globales para los modales
var commentsModalInstance = null;

/**
 * 💡 ¡NUEVA FUNCIÓN! 
 * Carga AMBAS listas (mejor y peor) en sus contenedores 
 * del carrusel al iniciar la página.
 */
async function loadAllFeaturedLists() {
    const containerBestId = "featured-reviews-list-best";
    const containerLessId = "featured-reviews-list-less";
    
    const containerBest = document.getElementById(containerBestId);
    const containerLess = document.getElementById(containerLessId);

    if (!containerBest || !containerLess) {
        console.error("Error: No se encontraron los contenedores del carrusel de reseñas.");
        return;
    }

    // 1. Cargar "Mejores Reseñas"
    try {
        containerBest.innerHTML = "<p class='text-muted p-4 text-center'>Cargando...</p>";
        // (Línea real COMENTADA)
        // const bestReviews = await window.reviewApi.getBestReviews();
        const bestReviews = MOCK_REVIEWS_FEATURED_BEST;
        console.warn("Usando MOCK DATA para 'Mejores Reseñas'");
        
        // Usamos la función de reviewList.js para renderizar
        renderReviewList(containerBestId, bestReviews);
    
    } catch (error) {
        console.error("Error al cargar 'Mejores Reseñas':", error);
        containerBest.innerHTML = "<p class='text-danger p-4 text-center'>Error al cargar reseñas.</p>";
    }

    // 2. Cargar "Menos Puntuadas"
    try {
        containerLess.innerHTML = "<p class='text-muted p-4 text-center'>Cargando...</p>";
        // (Línea real COMENTADA)
        // const lessReviews = await window.reviewApi.getLessCommentedReviews();
        const lessReviews = MOCK_REVIEWS_FEATURED_LESS;
        console.warn("Usando MOCK DATA para 'Menos Puntuadas'");
        
        // Usamos la función de reviewList.js para renderizar
        renderReviewList(containerLessId, lessReviews);
    
    } catch (error) {
        console.error("Error al cargar 'Menos Puntuadas':", error);
        containerLess.innerHTML = "<p class='text-danger p-4 text-center'>Error al cargar reseñas.</p>";
    }
}


// --- PUNTO DE ENTRADA PRINCIPAL ---
document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Inicializa el Modal de Comentarios
    const commentsModalEl = document.getElementById('commentsModal');
    if (commentsModalEl) {
        commentsModalInstance = new bootstrap.Modal(commentsModalEl); 
    }

    // 2. Llama al handler principal para cargar el perfil
    if (typeof loadUserProfile === 'function') {
        loadUserProfile();
    } else {
        console.error("Error: profileHandler.js no se cargó correctamente.");
    }

    // 3. 💡 ¡CAMBIO! Carga AMBAS listas del carrusel al inicio
    loadAllFeaturedLists();

    // 4. Asigna la lógica de clases a los botones de filtro
    // (El HTML ya maneja el slide, esto es solo para el estilo 'active')
    const btnBest = document.getElementById("btnShowBest");
    const btnLessRated = document.getElementById("btnShowLessRated");

    if (btnBest) {
        btnBest.addEventListener("click", () => {
            btnBest.classList.add("active");
            if (btnLessRated) btnLessRated.classList.remove("active");
        });
    }
    
    if (btnLessRated) {
        btnLessRated.addEventListener("click", () => {
            btnLessRated.classList.add("active");
            if (btnBest) btnBest.classList.remove("active");
        });
    }
});