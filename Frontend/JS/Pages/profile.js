// ===============================================
// 📜 JS/Pages/profile.js
// (ACTUALIZADO: Lee el ID de la URL y conecta la API)
// ===============================================

/**
 * Carga las listas de reseñas destacadas (Carrusel).
 * Ahora llama a la reviewApi real.
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
        // 🚀 Llama a la API real
        const bestReviews = await window.reviewApi.getBestReviews();
        
        renderReviewList(containerBestId, bestReviews);
    
    } catch (error) {
        console.error("Error al cargar 'Mejores Reseñas':", error);
        containerBest.innerHTML = "<p class='text-danger p-4 text-center'>Error al cargar reseñas.</p>";
    }

// --- PUNTO DE ENTRADA PRINCIPAL ---
document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Determinar qué perfil cargar
    const urlParams = new URLSearchParams(window.location.search);
    let userIdToLoad = urlParams.get('userId'); // Lee el ID de la URL

    // Si no hay ID en la URL, asumimos que quiere ver su propio perfil (si está logueado)
    if (!userIdToLoad) {
        userIdToLoad = localStorage.getItem('userId');
    }

    if (!userIdToLoad) {
        console.warn("⚠️ No hay ID de perfil para cargar. Redirigiendo a Login.");
        window.location.href = '../login.html'; 
        return;
    }

    // 2. Cargar datos del perfil (llama a profileHandler.js)
    if (typeof loadUserProfile === 'function') {
        loadUserProfile(userIdToLoad);
    }
    
    // 3. Configurar el botón de edición (llama a editProfileHandler.js)
    if (typeof setupEditProfileButton === 'function') {
        setupEditProfileButton();
    }

    // 4. Carga las listas del carrusel al inicio
    loadAllFeaturedLists();

    // 5. Asigna la lógica de clases a los botones de filtro (UI)
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
}