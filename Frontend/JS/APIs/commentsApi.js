// ================================
// 🌐 JS/APIs/commentsApi.js (ACTUALIZADO)
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

    /**
     * 💡 ¡NUEVO! Crea un nuevo comentario
     * USA TU ENDPOINT: POST /api/Comments
     */
    async function createComment(reviewId, commentText) {
        const userId = localStorage.getItem("userId");
        if (!userId) {
            throw new Error("Usuario no logueado");
        }
        
        // 💡 Asumo que tu backend espera un campo 'text'
        // y que 'commentId' puede ser null si es un comentario principal
        const payload = {
            create: new Date().toISOString(),
            reviewId: reviewId,
            commentId: null, 
            userId: userId,
            text: commentText 
        };

        try {
            const response = await fetch(API_BASE, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error("Error al crear el comentario");
            }
            return await response.json();
        } catch (error) {
            console.error("❌ Error en createComment:", error);
            throw error;
        }
    }

    window.commentsApi = {
        getCommentsForReview,
        createComment // 👈 Añadido
    };

})();