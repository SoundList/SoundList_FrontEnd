// ================================
// 📜 JS/Pages/profile.js
// (ACTUALIZADO: Lógica de carrusel CORREGIDA)
// ================================

// (Mock data de prueba)
const MOCK_BEST_REVIEWS = [
    { id: 101, userId: 1, username: "TuUsuarioDePrueba", avatar: "../../Assets/default-avatar.png", title: "Currents - Tame Impala", text: "Reseña 1 (Editable)", stars: 4.5, likes: 0, userLiked: false },
    { id: 102, userId: 99, username: "MusicFan88", avatar: "https://placehold.co/40x40/634F94/F0F0F0?text=M", title: "Random Access Memories", text: "Un clásico moderno.", stars: 4.5, likes: 221, userLiked: false },
    { id: 106, userId: 96, username: "LofiLover", avatar: "https://placehold.co/40x40/FFD85E/2A1A45?text=L", title: "Modal Soul", text: "Perfecto para relajarse.", stars: 5, likes: 260, userLiked: true },
    { id: 103, userId: 99, username: "MusicFan88", avatar: "https://placehold.co/40x40/634F94/F0F0F0?text=M", title: "Random Access Memories", text: "Un clásico moderno.", stars: 4.5, likes: 221, userLiked: false},
    { id: 104, userId: 90, username: "LofiLover", avatar: "https://placehold.co/40x40/FFD85E/2A1A45?text=L", title: "Modal Soul", text: "Perfecto para relajarse.", stars: 5, likes: 260, userLiked: true }
];
const MOCK_LESS_RATED_REVIEWS = [
    { id: 101, userId: 1, username: "TuUsuarioDePrueba", avatar: "../../Assets/default-avatar.png", title: "Currents - Tame Impala", text: "Reseña 1 (Editable)", stars: 3.5, likes: 0, userLiked: false },
    { id: 101, userId: 1, username: "TuUsuarioDePrueba", avatar: "../../Assets/default-avatar.png", title: "Currents - Tame Impala", text: "Reseña 1 (Editable)", stars: 1.5, likes: 4, userLiked: true},
    { id: 103, userId: 98, username: "SaraTune", avatar: "https://placehold.co/40x40/9A7BFF/F0F0F0?text=S", title: "After Hours", text: "Oscuro, cinematográfico.", stars: 2, likes: 1, userLiked: false },
    { id: 105, userId: 97, username: "GrooveMaster", avatar: "https://placehold.co/40x40/FF4757/F0F0F0?text=G", title: "Vulfpeck", text: "Puro funk.", stars: 1.5, likes: 0, userLiked: true },
    { id: 106, userId: 90, username: "SaraTune", avatar: "https://placehold.co/40x40/9A7BFF/F0F0F0?text=S", title: "After Hours", text: "Oscuro, cinematográfico.", stars: 2, likes: 1, userLiked: false },
    { id: 107, userId: 92, username: "GrooveMaster", avatar: "https://placehold.co/40x40/FF4757/F0F0F0?text=G", title: "Vulfpeck", text: "Puro funk.", stars: 1.5, likes: 0, userLiked: true }
];

var commentsModalInstance = null;
var featuredCarouselInstance = null; // Variable para guardar el carrusel

/**
 * Carga la lista de "Mejores Reseñas"
 */
async function loadBestReviewsList() {
    const containerId = "best-reviews-list";
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "<p class='text-muted p-4 text-center'>Cargando...</p>";
    try {
        // const reviewsToShow = await window.reviewApi.getBestReviews();
        const reviewsToShow = MOCK_BEST_REVIEWS; // <-- USANDO MOCK
        
        renderReviewList(containerId, reviewsToShow, "No hay reseñas destacadas.");
    } catch (error) {
        console.error("Error al cargar Mejores Reseñas:", error);
        container.innerHTML = "<p class='text-danger p-4 text-center'>Error al cargar.</p>";
    }
}

/**
 * Carga la lista de "Menos Votadas"
 */
async function loadLessRatedList() {
    const containerId = "less-rated-list";
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "<p class='text-muted p-4 text-center'>Cargando...</p>";
    try {
        // const reviewsToShow = await window.reviewApi.getLessCommentedReviews(); 
        const reviewsToShow = MOCK_LESS_RATED_REVIEWS; // <-- USANDO MOCK
        
        renderReviewList(containerId, reviewsToShow, "No hay reseñas menos puntuadas.");
    } catch (error) {
        console.error("Error al cargar Menos Votadas:", error);
        container.innerHTML = "<p class='text-danger p-4 text-center'>Error al cargar.</p>";
    }
}


// --- PUNTO DE ENTRADA PRINCIPAL ---
document.addEventListener("DOMContentLoaded", () => {
    
    // Inicializa Modal de Comentarios
    const modalElement = document.getElementById('commentsModal');
    if (modalElement) {
        commentsModalInstance = new bootstrap.Modal(modalElement); 
    }

    // Inicializa el Carrusel de Reseñas Destacadas
    const carouselElement = document.getElementById('featured-reviews-carousel');
    if (carouselElement) {
        featuredCarouselInstance = new bootstrap.Carousel(carouselElement, {
            interval: 1000, // No se mueve solo
            wrap: true       // 💡 CAMBIO: 'true' para que el carrusel sea cíclico
        });
    }

    // Carga el perfil (avatar, stats, y reseñas recientes)
    if (typeof loadUserProfile === 'function') {
        loadUserProfile();
    } else {
        console.error("Error: profileHandler.js no se cargó correctamente.");
    }

    // Carga el contenido de AMBOS slides del carrusel
    loadBestReviewsList();
    loadLessRatedList();

    // Lógica de botones para controlar el carrusel
    const btnBest = document.getElementById("btnShowBest");
    const btnLessRated = document.getElementById("btnShowLessRated");

    if (btnBest) {
        btnBest.addEventListener("click", () => {
            // 💡 ¡ARREGLO! Esta línea estaba comentada
            if (featuredCarouselInstance) featuredCarouselInstance.to(0); // Mueve el carrusel al slide 0
            
            btnBest.classList.add("active");
            if (btnLessRated) btnLessRated.classList.remove("active");
        });
    }
    
    if (btnLessRated) {
        btnLessRated.addEventListener("click", () => {
            // 💡 ¡ARREGLO! Esta línea estaba comentada
            if (featuredCarouselInstance) featuredCarouselInstance.to(1); // Mueve el carrusel al slide 1
            
            btnLessRated.classList.add("active");
            if (btnBest) btnBest.classList.remove("active");
        });
    }

    // 💡 ¡NUEVO! Sincroniza los botones cuando el slide cambia (si usas swipe, etc.)
    if (carouselElement) {
        carouselElement.addEventListener('slide.bs.carousel', function (e) {
            if (e.to === 0) {
                if (btnBest) btnBest.classList.add("active");
                if (btnLessRated) btnLessRated.classList.remove("active");
            } else if (e.to === 1) {
                if (btnLessRated) btnLessRated.classList.add("active");
                if (btnBest) btnBest.classList.remove("active");
            }
        });
    }
});