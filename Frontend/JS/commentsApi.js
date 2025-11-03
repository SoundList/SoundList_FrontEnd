// ================================
// 🌐 JS/APIs/commentsApi.js (NUEVO)
// ================================
(function() {

    const API_BASE = "http://localhost:32768/api/Comments";

    function getAuthHeaders() {
        const token = localStorage.getItem("authToken");
        return {
            "Content-Type": "application/json",
            ...(token && { "Authorization": `Bearer ${token}` })
        };
    }

    /**
     * 🔹 Obtener comentarios de una reseña específica
     * USA TU ENDPOINT: GET /api/Comments/review/{reviewId}
     */
    async function getCommentsForReview(reviewId) {
        try {
            const response = await fetch(`${API_BASE}/review/${reviewId}`, {
                method: "GET",
                headers: getAuthHeaders()
            });
            if (!response.ok) {
                throw new Error("Error al obtener los comentarios");
            }
            return await response.json();
        } catch (error) {
            console.error("❌ Error en getCommentsForReview:", error);
            throw error;
        }
    }

    // 💡 Exponemos la API
    window.commentsApi = {
        getCommentsForReview
        // (Aquí puedes añadir 'createComment', 'deleteComment', etc. en el futuro)
    };

})();