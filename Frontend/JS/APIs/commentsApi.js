// ================================
// 🌐 JS/APIs/commentsApi.js
// (Maneja todas las llamadas al microservicio de Comentarios)
// ================================
(function() {

    // URL base de tu API de Comentarios
    const API_BASE = "http://localhost:32768/api/Comments";

    // Función auxiliar para los headers (si usas autenticación)
    function getAuthHeaders() {
        const token = localStorage.getItem("authToken");
        return {
            "Content-Type": "application/json",
            ...(token && { "Authorization": `Bearer ${token}` })
        };
    }

    /**
     * 🔹 Obtener comentarios de una reseña específica
     * (Conecta con tu endpoint: GET /api/Comments/review/{reviewId})
     */
    async function getCommentsForReview(reviewId) {
        try {
            const response = await fetch(`${API_BASE}/review/${reviewId}`, {
                method: "GET",
                headers: getAuthHeaders()
            });
            if (!response.ok) {
                throw new Error("Error al obtener los comentarios de la reseña");
            }
            return await response.json();
        } catch (error) {
            console.error("❌ Error en getCommentsForReview:", error);
            throw error; // Lanza el error para que el handler (reviewHandler.js) lo atrape
        }
    }

    /* // --- FUTURAS FUNCIONES ---
    // (Añadiremos estas cuando construyamos el formulario de crear comentario)

    async function createComment(reviewId, text) {
        // ... (lógica para POST /api/Comments) ...
    }

    async function deleteComment(commentId) {
        // ... (lógica para DELETE /api/Comments/{id}) ...
    }
    */


    // 💡 Exponemos las funciones al objeto global 'window'
    window.commentsApi = {
        getCommentsForReview
        // , createComment, deleteComment (cuando las añadamos)
    };

})();
