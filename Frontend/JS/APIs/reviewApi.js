// ================================
// 🌐 JS/APIs/reviewApi.js (ACTUALIZADO)
// ================================
(function() {

    const API_BASE = "http://localhost:32768/Review";
    const REACTION_API_BASE = "http://localhost:32768/api/Reaction"; // URL Corregida
    
    function getAuthHeaders() {
        const token = localStorage.getItem("authToken");
        return {
            "Content-Type": "application/json",
            ...(token && { "Authorization": `Bearer ${token}` })
        };
    }

    async function createReview(reviewData) {
        try {
            const response = await fetch(`${API_BASE}`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(reviewData)
            });
            if (!response.ok) throw new Error("Error al crear la reseña");
            return await response.json();
        } catch (error) {
            console.error("❌ Error en createReview:", error);
            throw error;
        }
    }

    async function getAllReviews() {
        try {
            const response = await fetch(`${API_BASE}`, {
                method: "GET", headers: getAuthHeaders()
            });
            if (!response.ok) throw new Error("Error al obtener todas las reseñas");
            return await response.json();
        } catch (error) {
            console.error("❌ Error en getAllReviews:", error);
            throw error;
        }
    }

    // 💡 ATENCIÓN: Los siguientes endpoints no están en tu lista.
    // Los apunto a 'GET /Review' como fallback.
    async function getMyReviews() {
        console.warn("API: /MyReviews no existe, usando GET /Review como fallback.");
        return getAllReviews(); 
    }
    async function getBestReviews() {
        console.warn("API: /Best no existe, usando GET /Review como fallback.");
        return getAllReviews(); 
    }
    async function getLessCommentedReviews() {
        console.warn("API: /LessCommented no existe, usando GET /Review como fallback.");
        return getAllReviews(); 
    }
    async function getRecentReviews() {
        console.warn("API: /Recent no existe, usando GET /Review como fallback.");
        return getAllReviews(); 
    }

    async function deleteReview(reviewId) {
        try {
            const response = await fetch(`${API_BASE}/${reviewId}`, {
                method: "DELETE", headers: getAuthHeaders()
            });
            if (!response.ok) throw new Error("Error al eliminar la reseña");
            return true;
        } catch (error) {
            console.error("❌ Error en deleteReview:", error);
            throw error;
        }
    }
    
    // 💡 Esta función llama a 'POST /api/Reaction'
    // Tu backend debe estar preparado para recibir esto.
    async function toggleLikeReview(reviewId) {
         try {
            const response = await fetch(`${REACTION_API_BASE}`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ ReviewId: reviewId }) 
            });
            if (!response.ok) throw new Error("Error al dar/quitar like");
            return await response.json();
        } catch (error) {
            console.error("❌ Error en toggleLikeReview:", error);
            throw error;
        }
    }
    
    async function reportReview(reviewId, reason = "Sin motivo") {
        console.warn(`API: Reportar no implementado. Reporte simulado para ${reviewId}`);
        // await fetch(`${API_BASE}/${reviewId}/Report`, { ... });
        return { success: true, message: "Reporte simulado" };
    }

    // Exponemos las funciones
    window.reviewApi = {
        createReview,
        getAllReviews,
        getMyReviews,
        getReviewsByUser: getAllReviews, // Fallback
        getBestReviews,
        getLessCommentedReviews,
        getRecentReviews,
        deleteReview,
        toggleLikeReview,
        reportReview
    };

})();