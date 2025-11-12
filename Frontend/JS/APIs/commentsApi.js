(function() {

    const GATEWAY_BASE_URL = "http://localhost:5000/api/gateway";
    const API_BASE = `${GATEWAY_BASE_URL}/comments`; 

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