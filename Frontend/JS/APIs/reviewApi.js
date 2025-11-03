// ================================
// 🌐 JS/APIs/reviewApi.js (ACTUALIZADO)
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

    // --- (Funciones de Review) ---
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

    // Fallbacks (como pediste, para que apunten a algo)
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
    
    // --- (Funciones de Reaction) ---
    
    /**
     * 🔹 [ACTUALIZADO] Dar Like a una RESEÑA
     */
    async function toggleLikeReview(reviewId) {
        const userId = localStorage.getItem("userId");
        if (!userId) throw new Error("Usuario no logueado");

        const payload = {
            create: new Date().toISOString(),
            reviewId: reviewId,
            commentId: null, // 👈 Nulo para like de reseña
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
    
    /**
     * 💡 ¡NUEVO! Dar Like a un COMENTARIO
     */
    async function toggleLikeComment(commentId) {
        const userId = localStorage.getItem("userId");
        if (!userId) throw new Error("Usuario no logueado");

        const payload = {
            create: new Date().toISOString(),
            reviewId: null, // 👈 Nulo para like de comentario
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
    
    // --- (Función de Reportar - Placeholder) ---
    async function reportReview(reviewId, reason = "Sin motivo") {
        console.warn(`API: Reportar no implementado. Reporte simulado para ${reviewId}`);
        // Cuando la API esté lista:
        // await fetch(`${API_BASE}/${reviewId}/Report`, { ... });
        return { success: true, message: "Reporte simulado" };
    }

    // Exponemos las funciones
    window.reviewApi = {
        createReview,
        getAllReviews,
        getMyReviews,
        getReviewsByUser: getAllReviews,
        getBestReviews,
        getLessCommentedReviews,
        getRecentReviews,
        deleteReview,
        toggleLikeReview, 
        toggleLikeComment, // 👈 Añadido
        reportReview
    };

})();
