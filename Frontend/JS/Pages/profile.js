
async function loadAllFeaturedLists() {
    const containerBestId = "featured-reviews-list-best";
    const containerLessId = "featured-reviews-list-less";
    
    const containerBest = document.getElementById(containerBestId);
    const containerLess = document.getElementById(containerLessId);

    if (!containerBest || !containerLess) {
        console.error("Error: No se encontraron los contenedores del carrusel de reseñas.");
        return;
    }

    try {
        containerBest.innerHTML = "<p class='text-muted p-4 text-center'>Cargando...</p>";
        const bestReviews = await window.reviewApi.getBestReviews();
        
        renderReviewList(containerBestId, bestReviews);
    
    } catch (error) {
        console.error("Error al cargar 'Mejores Reseñas':", error);
        containerBest.innerHTML = "<p class='text-danger p-4 text-center'>Error al cargar reseñas.</p>";
    }


document.addEventListener("DOMContentLoaded", () => {

    const urlParams = new URLSearchParams(window.location.search);
    let userIdToLoad = urlParams.get('userId'); 

    if (!userIdToLoad) {
        userIdToLoad = localStorage.getItem('userId');
    }

    if (!userIdToLoad) {
        console.warn("⚠️ No hay ID de perfil para cargar. Redirigiendo a Login.");
        window.location.href = '../login.html'; 
        return;
    }

    if (typeof loadUserProfile === 'function') {
        loadUserProfile(userIdToLoad);
    }

    if (typeof setupEditProfileButton === 'function') {
        setupEditProfileButton();
    }

    loadAllFeaturedLists();

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