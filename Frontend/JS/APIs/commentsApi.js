// ===============================================
// ⚙️ JS/APIs/commentsApi.js
// (ACTUALIZADO: Con las rutas públicas del Gateway /api/gateway/...)
// ===============================================

(function() {

    // 1. URL DEL GATEWAY (Unificada con login.js)
    const GATEWAY_BASE_URL = "http://localhost:5000/api/gateway";
    
    // 💡 ¡CORREGIDO! Esta es la ruta PÚBLICA para comentarios
    const API_BASE = `${GATEWAY_BASE_URL}/comments`; 

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
     * Obtiene los comentarios para una reseña específica.
     * (Gateway: GET /api/gateway/comments/review/{reviewId})
     */
    async function getCommentsForReview(reviewId) {
        try {
            // Llama a: GET .../api/gateway/comments/review/{reviewId}
            const response = await axios.get(`${API_BASE}/review/${reviewId}`, getAuthHeaders());
            return response.data; 
        } catch (error) {
            console.error("❌ Error en getCommentsForReview:", error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Crea un nuevo comentario.
     * (Gateway: POST /api/gateway/comments)
     */
    async function createComment(reviewId, commentText) {
        const userId = localStorage.getItem("userId"); 
        if (!userId) {
             console.error("❌ Error en createComment: No se encontró userId en localStorage.");
             throw new Error("Usuario no identificado. No se puede comentar.");
        }

        const payload = {
            reviewId: reviewId,
            userId: userId,
            text: commentText 
        };

        try {
            // Llama a: POST .../api/gateway/comments
            const response = await axios.post(API_BASE, payload, getAuthHeaders());
            return response.data; 
        } catch (error) {
            console.error("❌ Error en createComment:", error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Actualiza un comentario existente.
     * (Gateway: PUT /api/gateway/comments/{id})
     */
    async function updateComment(commentId, newText) {
         try {
            const payload = {
                text: newText 
            };
            // Llama a: PUT .../api/gateway/comments/{id}
            const response = await axios.put(`${API_BASE}/${commentId}`, payload, getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error("❌ Error en updateComment:", error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Elimina un comentario.
     * (Gateway: DELETE /api/gateway/comments/{id})
     */
    async function deleteComment(commentId) {
        try {
            // Llama a: DELETE .../api/gateway/comments/{id}
            await axios.delete(`${API_BASE}/${commentId}`, getAuthHeaders());
            return true; 
        } catch (error) {
            console.error("❌ Error en deleteComment:", error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Reporta un comentario (Mantenemos la simulación)
     */
    async function reportComment(commentId, reason) {
        console.warn(`API: Reportar comentario no implementado. Reporte simulado para ${commentId} (Razón: ${reason})`);
        return Promise.resolve({ success: true, message: "Reporte simulado" });
    }

    // Exponemos las funciones en 'window'
    window.commentsApi = {
        getCommentsForReview,
        createComment,
        updateComment,
        deleteComment,
        reportComment
    };

})();