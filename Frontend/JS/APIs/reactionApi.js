// ===============================================
// ⚙️ JS/APIs/reviewApi.js
// (ACTUALIZADO: Con las rutas públicas del Gateway /api/gateway/...)
// ===============================================

(function() {

    // 1. URL DEL GATEWAY (Unificada con login.js)
    const GATEWAY_BASE_URL = "://localhost:5000/api/gateway";
    
    // 💡 ¡CORREGIDO! Esta es la ruta PÚBLICA para reseñas
    const API_BASE = `${GATEWAY_BASE_URL}/reviews`; 
    
    /**
     * Obtiene las cabeceras de autenticación para Axios.
     */
    function getAuthHeaders() {
        const token = localStorage.getItem("authToken");
        if (!token) {
            console.warn("No se encontró authToken para la petición API.");
            return {};
        }
        return { 
            headers: { 
                'Authorization': `Bearer ${token}` 
            } 
        };
    }

    /**
     * Crea una nueva reseña.
     * (Gateway: POST /api/gateway/reviews)
     */
    async function createReview(reviewData) { 
        try {
            // Llama a: POST .../api/gateway/reviews
            const response = await axios.post(API_BASE, reviewData, getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error("❌ Error en createReview:", error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Obtiene TODAS las reseñas.
     * (Gateway: GET /api/gateway/reviews)
     */
    async function getAllReviews() { 
        try {
            // Llama a: GET .../api/gateway/reviews
            const response = await axios.get(API_BASE, getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error("❌ Error en getAllReviews:", error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Actualiza el texto de una reseña.
     * (Gateway: PUT /api/gateway/reviews/{id})
     */
    async function updateReview(reviewId, newText) {
        try {
            const payload = {
                text: newText 
            };
            // Llama a: PUT .../api/gateway/reviews/{id}
            const response = await axios.put(`${API_BASE}/${reviewId}`, payload, getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error("❌ Error en updateReview:", error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Elimina una reseña.
     * (Gateway: DELETE /api/gateway/reviews/{id})
     */
    async function deleteReview(reviewId) { 
        try {
            // Llama a: DELETE .../api/gateway/reviews/{id}
            await axios.delete(`${API_BASE}/${reviewId}`, getAuthHeaders());
            return true;
        } catch (error) {
            console.error("❌ Error en deleteReview:", error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Reporta una reseña (Mantenemos tu simulación)
     */
    async function reportReview(reviewId, reason) { 
        console.warn(`API: Reportar review no implementado. Reporte simulado para ${reviewId}`);
        return Promise.resolve({ success: true, message: "Reporte simulado" });
    }

    // --- FUNCIONES ESPECÍFICAS Y DE FALLBACK ---

    /**
     * Obtiene las MEJORES reseñas de un usuario.
     * (Gateway: GET /api/gateway/reviews/user/{UserId}/top)
     */
    async function getTopReviewsByUser(userId) {
        try {
            // 💡 ¡CORREGIDO! Esta ruta es diferente
            // Llama a: GET .../api/gateway/reviews/user/{id}/top
            const response = await axios.get(`${API_BASE}/user/${userId}/top`, getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error("❌ Error en getTopReviewsByUser:", error.response?.data || error.message);
            console.warn("Fallback: getTopReviewsByUser falló, devolviendo getAllReviews().");
            return getAllReviews(); 
        }
    }

    // Mantenemos tus fallbacks (ahora llaman a la API correcta de 'getAllReviews')
    async function getReviewsByUser(userId) { 
        console.warn("API: getReviewsByUser usando GET /api/gateway/reviews como fallback.");
        const allReviews = await getAllReviews();
        // Filtramos en el frontend ya que es un fallback
        return allReviews.filter(r => r.userId === userId);
    }
    async function getMyReviews() { 
        console.warn("API: getMyReviews usando GET /api/gateway/reviews como fallback.");
        const myUserId = localStorage.getItem("userId");
        const allReviews = await getAllReviews();
        return allReviews.filter(r => r.userId == myUserId);
    }
    async function getBestReviews() { 
        console.warn("API: getBestReviews usando GET /api/gateway/reviews como fallback.");
        return getAllReviews(); 
    }
    async function getLessCommentedReviews() { 
        console.warn("API: getLessCommentedReviews usando GET /api/gateway/reviews como fallback.");
        return getAllReviews(); 
    }
    async function getRecentReviews() { 
        console.warn("API: getRecentReviews usando GET /api/gateway/reviews como fallback.");
        return getAllReviews(); 
    }

    /*
     * 💡 NOTA: Lógica de 'Like' eliminada correctamente.
     * Es manejada por 'reactionApi.js' y 'likesHandler.js'.
     */

    // Exponemos las funciones
    window.reviewApi = {
        createReview,
        getAllReviews,
        updateReview,
        deleteReview,
        reportReview,
        getTopReviewsByUser,
        // Fallbacks
        getMyReviews,
        getReviewsByUser, 
        getBestReviews,
        getLessCommentedReviews,
        getRecentReviews
    };

})();