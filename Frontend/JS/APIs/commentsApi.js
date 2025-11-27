import { API_BASE_URL } from "./configApi.js";
(function() {

    const GATEWAY_BASE_URL = `${API_BASE_URL}/api/gateway`;
    const API_BASE = `${GATEWAY_BASE_URL}/comments`; 

    function getAuthHeaders() {
        const token = localStorage.getItem("authToken"); // Confirmado que esta es la key
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

    async function getCommentsForReview(reviewId) {
        try {
            const response = await axios.get(`${API_BASE}/review/${reviewId}`, getAuthHeaders());
            return response.data; 
        } catch (error) {
            console.error("❌ Error en getCommentsForReview:", error.response?.data || error.message);
            throw error;
        }
    }

    async function createComment(reviewId, commentText) {
        // ELIMINADO: Ya no buscamos userId en localStorage.
        // La identidad viaja segura dentro del token en los headers.

        const payload = {
            reviewId: reviewId,
            // userId: userId, <--- ELIMINADO
            text: commentText 
        };

        try {
            // El backend extraerá el usuario del token 'Authorization'
            const response = await axios.post(API_BASE, payload, getAuthHeaders());
            return response.data; 
        } catch (error) {
            console.error("❌ Error en createComment:", error.response?.data || error.message);
            throw error;
        }
    }

    async function updateComment(commentId, newText) {
         try {
            const payload = {
                text: newText 
            };
            const response = await axios.put(`${API_BASE}/${commentId}`, payload, getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error("❌ Error en updateComment:", error.response?.data || error.message);
            throw error;
        }
    }

    async function deleteComment(commentId) {
        try {
            await axios.delete(`${API_BASE}/${commentId}`, getAuthHeaders());
            return true; 
        } catch (error) {
            console.error("❌ Error en deleteComment:", error.response?.data || error.message);
            throw error;
        }
    }

    async function reportComment(commentId, reason) {
        console.warn(`API: Reportar comentario no implementado. Reporte simulado para ${commentId} (Razón: ${reason})`);
        return Promise.resolve({ success: true, message: "Reporte simulado" });
    }

    window.commentsApi = {
        getCommentsForReview,
        createComment,
        updateComment,
        deleteComment,
        reportComment
    };

})();