// ================================
// 🌐 JS/APIs/commentsApi.js (CORREGIDO)
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
     */
    async function getCommentsForReview(reviewId) {
        try {
            const response = await fetch(`${API_BASE}/review/${reviewId}`, {
                method: "GET",
                headers: getAuthHeaders()
            });
            if (!response.ok) throw new Error("Error al obtener los comentarios");
            return await response.json();
        } catch (error) {
            console.error("❌ Error en getCommentsForReview:", error);
            throw error;
        }
    }

    /**
     * 🔹 Crea un nuevo comentario
     */
    async function createComment(reviewId, commentText) {
        const userId = localStorage.getItem("userId") || "3fa85f64-5717-4562-b3fc-2c963f66afa6"; // ID de prueba

        // 💡 ¡CAMBIO! Payload simplificado para la API de Comments
        const payload = {
            reviewId: reviewId,
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
                const errorBody = await response.text();
                console.error("Error del backend (createComment):", errorBody);
                throw new Error("Error al crear el comentario");
            }
            return await response.json();
        } catch (error) {
            console.error("❌ Error en createComment:", error);
            throw error;
        }
    }

    /**
     * 🔹 Actualiza un comentario
     */
    async function updateComment(commentId, newText) {
         try {
            const payload = {
                text: newText 
            };
            const response = await fetch(`${API_BASE}/${commentId}`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Error al actualizar el comentario");
            return await response.json();
        } catch (error) {
            console.error("❌ Error en updateComment:", error);
            throw error;
        }
    }


    /**
     * 🔹 Elimina un comentario
     */
    async function deleteComment(commentId) {
        try {
            const response = await fetch(`${API_BASE}/${commentId}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            if (!response.ok) throw new Error("Error al eliminar el comentario");
            return true; 
        } catch (error) {
            console.error("❌ Error en deleteComment:", error);
            throw error;
        }
    }

    /**
     * 🔹 Reporta un comentario (Simulado)
     */
    async function reportComment(commentId, reason) {
        console.warn(`API: Reportar comentario no implementado. Reporte simulado para ${commentId} (Razón: ${reason})`);
        return { success: true, message: "Reporte simulado" };
    }


    window.commentsApi = {
        getCommentsForReview,
        createComment,
        updateComment,
        deleteComment,
        reportComment
    };

})();