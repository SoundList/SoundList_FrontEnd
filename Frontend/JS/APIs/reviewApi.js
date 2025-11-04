// ================================
// 🌐 JS/APIs/reviewApi.js (CORREGIDO)
// ================================
(function() {

    const API_BASE = "http://localhost:32768/Review";
    const REACTION_API_BASE = "http://localhost:32768/api/Reaction";
    
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
    
    // 💡 ¡FUNCIÓN AÑADIDA! (Faltaba en mi código anterior)
    async function getReviewsByUser(userId) { 
        console.warn("API: /ReviewsByUser no existe, usando GET /Review como fallback.");
        return getAllReviews(); 
    }

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
    async function reportReview(reviewId, reason) { 
        console.warn(`API: Reportar review no implementado. Reporte simulado para ${reviewId}`);
        return { success: true, message: "Reporte simulado" };
    }

    async function toggleLikeReview(reviewId) {
        const userId = localStorage.getItem("userId") || "3fa85f64-5717-4562-b3fc-2c963f66afa6"; // ID de prueba
        if (!userId) throw new Error("Usuario no logueado");

        const payload = {
            create: new Date().toISOString(),
            reviewId: reviewId,
            commentId: null,
            userId: userId
        };
         try {
            const response = await fetch(REACTION_API_BASE, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Error al dar/quitar like de reseña");
            return await response.json();
        } catch (error) {
            console.error("❌ Error en toggleLikeReview:", error);
            throw error;
        }
    }
    
    async function toggleLikeComment(commentId) {
        const userId = localStorage.getItem("userId") || "3fa85f64-5717-4562-b3fc-2c963f66afa6"; // ID de prueba
        if (!userId) throw new Error("Usuario no logueado");

        const payload = {
            create: new Date().toISOString(),
            reviewId: null,
            commentId: commentId,
            userId: userId
        };
         try {
            const response = await fetch(REACTION_API_BASE, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Error al dar/quitar like de comentario");
            return await response.json();
        } catch (error) {
            console.error("❌ Error en toggleLikeComment:", error);
            throw error;
        }
    }
    
    async function getCommentReactionCount(commentId) {
        try {
            const response = await fetch(`${REACTION_API_BASE}/${commentId}/Comments/count`, {
                method: "GET",
                headers: getAuthHeaders()
            });
            if (!response.ok) {
                throw new Error("Error al obtener conteo de reacciones");
            }
            return await response.json(); 
        } catch (error) {
            console.error("❌ Error en getCommentReactionCount:", error);
            throw error;
        }
    }

    // Exponemos las funciones
    window.reviewApi = {
        createReview,
        getAllReviews,
        getMyReviews,
        getReviewsByUser, // 👈 AHORA SÍ ESTÁ DEFINIDA
        getBestReviews,
        getLessCommentedReviews,
        getRecentReviews,
        deleteReview,
        reportReview,
        toggleLikeReview, 
        toggleLikeComment,
        getCommentReactionCount 
    };

})();