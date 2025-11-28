import { initializeReviewDetailModalLogic, showReviewDetailModal } from '../Components/modals/reviewDetailModal.js';

async function reloadProfileReviews() {
    await loadAllFeaturedLists();
    if (typeof loadRecentReviews === 'function' && window.currentProfileUserId) {
        await loadRecentReviews(window.currentProfileUserId);
    } else {
        console.warn("loadRecentReviews no está definida. Solo se recargaron las destacadas.");
    }
}



async function loadAllFeaturedLists() {
    const containerBestId = "featured-reviews-list-best";

    const containerBest = document.getElementById(containerBestId);

    if (!containerBest) {
        console.error("Error: No se encontró el contenedor de reseñas destacadas.");
        return;
    }

    try {
        containerBest.innerHTML = "<p class='text-muted p-4 text-center'>Cargando...</p>";
        const allReviews = await window.reviewApi.getBestReviews();
        
        // Ordenar por likes (más populares primero)
        const bestReviews = [...allReviews].sort((a, b) => {
            const likesA = Number(a.likes) || Number(a.Likes) || 0;
            const likesB = Number(b.likes) || Number(b.Likes) || 0;
            // Si tienen los mismos likes, ordenar por fecha (más recientes primero)
            if (likesB === likesA) {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : (a.CreatedAt ? new Date(a.CreatedAt).getTime() : 0);
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : (b.CreatedAt ? new Date(b.CreatedAt).getTime() : 0);
                return dateB - dateA;
            }
            return likesB - likesA; // Más likes primero
        });
        
        renderReviewList(containerBestId, bestReviews);

    } catch (error) {
        console.error("Error al cargar 'Mejores Reseñas':", error);
        containerBest.innerHTML = "<p class='text-danger p-4 text-center'>Error al cargar reseñas.</p>";
    }
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

    window.currentProfileUserId = userIdToLoad;
    if (window.modalsState) {
        window.modalsState.loadReviews = reloadProfileReviews;
    }

    // --- INICIALIZACIÓN DEL MODAL DE DETALLE (NUEVO) ---
    // Pasamos un estado básico o el global si existe
    const modalState = window.modalsState || {};
    initializeReviewDetailModalLogic(modalState);

    // Exponer la función globalmente para que los onclicks del HTML funcionen
    window.showReviewDetailModal = showReviewDetailModal;

    if (typeof loadUserProfile === 'function') {
        loadUserProfile(userIdToLoad);
    }

    if (typeof setupEditProfileButton === 'function') {
        setupEditProfileButton();
    }

    loadAllFeaturedLists();
});
