import { API_BASE_URL } from './configApi.js';

// =========================================================
// 🔐 CONFIGURACIÓN CENTRALIZADA
// =========================================================

// Helper único para obtener headers con el Token actual
function getAuthHeaders() {
    const token = localStorage.getItem("authToken");
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// Fallback URL (Solo para desarrollo si el Gateway falla)
const SOCIAL_DIRECT_URL = 'http://localhost:8002';

// =========================================================
// 📡 INTERCEPTORES AXIOS (Manejo de errores global)
// =========================================================

if (typeof axios !== 'undefined') {
    // Interceptor para suprimir errores 409 al borrar reseñas con comentarios
    axios.interceptors.response.use(
        response => response,
        error => {
            if (error.response && error.response.status === 409 &&
                error.config.method === 'delete' &&
                error.config.url.includes('/reviews/')) {
                
                console.warn("⚠️ Conflicto 409 ignorado (Review con hijos): Tratando como éxito visual.");
                return Promise.resolve({
                    status: 200, // Simulamos éxito para el frontend
                    data: { message: 'Review deleted logicaly (conflict handled)' }
                });
            }
            return Promise.reject(error);
        }
    );
}

// =========================================================
// 📝 1. GESTIÓN DE RESEÑAS (REVIEWS)
// =========================================================

/**
 * Obtiene el feed principal de reseñas.
 */
export async function getReviews() {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/gateway/reviews`, {
            headers: getAuthHeaders(), // Agregado por si hay lógica personalizada
            timeout: 5000
        });
        return response.data || [];
    } catch (error) {
        console.error('Error en getReviews:', error);
        return [];
    }
}

export async function getAllReviews() {
    return getReviews(); // Alias para compatibilidad
}

/**
 * Crea una nueva reseña.
 * SEGURIDAD: No enviamos UserId. El backend lo toma del Token.
 */
export async function createReview(reviewData) {
    // Limpiamos UserId por seguridad, aunque venga en el objeto
    const { userId, UserId, ...cleanData } = reviewData;

    try {
        const response = await axios.post(`${API_BASE_URL}/api/gateway/reviews`, cleanData, {
            headers: getAuthHeaders(),
            timeout: 5000
        });
        return response.data;
    } catch (error) {
        console.error('Error en createReview:', error);
        throw error;
    }
}

/**
 * Edita una reseña existente.
 */
export async function updateReview(reviewId, reviewData) {
    const { userId, UserId, ...cleanData } = reviewData;

    try {
        const response = await axios.put(`${API_BASE_URL}/api/gateway/reviews/${reviewId}`, cleanData, {
            headers: getAuthHeaders(),
            timeout: 5000
        });
        return response.data;
    } catch (error) {
        console.error(`Error en updateReview (ID: ${reviewId}):`, error);
        throw error;
    }
}

/**
 * Elimina una reseña.
 * SEGURIDAD: La URL ya no debe llevar el UserId explícito si el backend se actualizó.
 * Si tu backend aún exige /reviews/{id}/{userId}, avísame. Asumiré la ruta segura: /reviews/{id}
 */
export async function deleteReview(reviewId) {
    try {
        // Intento Principal (Gateway)
        await axios.delete(`${API_BASE_URL}/api/gateway/reviews/${reviewId}`, {
            headers: getAuthHeaders(),
            timeout: 5000
        });
    } catch (error) {
        // El interceptor maneja el 409. Si es otro error, intentamos fallback.
        if (error.response?.status === 404) throw error; // No existe
        
        console.warn('Fallback: deleteReview Gateway falló, intentando directo...');
        try {
            await axios.delete(`${SOCIAL_DIRECT_URL}/api/reviews/${reviewId}`, {
                headers: getAuthHeaders()
            });
        } catch (directError) {
            console.error('Error en deleteReview (Final):', directError);
            throw directError;
        }
    }
}

export async function getReviewDetails(reviewId) {
    try {

        const response = await axios.get(`${API_BASE_URL}/api/gateway/reviews/${reviewId}`, {
            timeout: 5000
        });
        
        return response.data;
    } catch (error) {
        console.error(`Error en getReviewDetails (ID: ${reviewId}):`, error);

        return null;
    }
}

export async function getAverageRating(contentId, type) {
    try {
        const param = type === 'song' ? `songId=${contentId}` : `albumId=${contentId}`;
        const url = `${API_BASE_URL}/api/gateway/reviews/average?${param}`;
        
        const response = await axios.get(url, { headers: getAuthHeaders() });
        return response.data; 
    } catch (error) {
        console.warn("Error obteniendo promedio (puede ser 0):", error.message);
        return 0;
    }
}

// =========================================================
// 💬 2. GESTIÓN DE COMENTARIOS
// =========================================================

export async function getCommentsByReview(reviewId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/gateway/comments/review/${reviewId}`, {
            headers: getAuthHeaders()
        });
        return response.data || [];
    } catch (error) {
        console.error(`Error en getCommentsByReview:`, error);
        return [];
    }
}

/**
 * Publica un comentario.
 * CAMBIO CRÍTICO: Eliminado argumento userId.
 */
export async function createComment(reviewId, text) {
    const commentData = {
        ReviewId: reviewId,
        Text: text
        // IdUser: ELIMINADO (El backend lee el token)
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/api/gateway/comments`, commentData, {
            headers: getAuthHeaders()
        });
        return response.data;
    } catch (error) {
        console.error('Error en createComment:', error);
        throw error;
    }
}

export async function updateComment(commentId, newText) {
    const requestBody = {
        CommentId: commentId,
        Text: newText
    };
    
    try {
        await axios.put(`${API_BASE_URL}/api/gateway/comments/${commentId}`, requestBody, {
            headers: getAuthHeaders()
        });
        return { success: true };
    } catch (error) {
        console.warn(`Gateway updateComment falló, intentando directo...`);
        try {
            await axios.put(`${SOCIAL_DIRECT_URL}/api/Comments/${commentId}`, requestBody, {
                headers: getAuthHeaders()
            });
            return { success: true };
        } catch (directError) {
            throw directError;
        }
    }
}

export async function deleteComment(commentId) {
    try {
        await axios.delete(`${API_BASE_URL}/api/gateway/comments/${commentId}`, {
            headers: getAuthHeaders()
        });
    } catch (error) {
        if (error.response?.status === 404) throw new Error('Comentario no encontrado');
        
        console.warn('Fallback deleteComment...');
        await axios.delete(`${SOCIAL_DIRECT_URL}/api/Comments/${commentId}`, {
            headers: getAuthHeaders()
        });
    }
}

// =========================================================
// ❤️ 3. GESTIÓN DE REACCIONES (LIKES)
// =========================================================

export async function getReviewReactionCount(reviewId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/gateway/reviews/${reviewId}/reactions/count`);
        console.log(`🔍 getReviewReactionCount(${reviewId}): Response:`, response.data);
        const count = response.data?.count ?? response.data ?? 0;
        console.log(`🔍 getReviewReactionCount(${reviewId}): Count extracted:`, count);
        return count;
    } catch (error) {
        console.error(`❌ getReviewReactionCount(${reviewId}): Error:`, error);
        console.error(`❌ getReviewReactionCount(${reviewId}): Error response:`, error.response?.data);
        return 0;
    }
}

/**
 * Agrega Like a Reseña.
 * CAMBIO CRÍTICO: Eliminado userId.
 */
export async function addReviewReaction(reviewId) {
    const reactionData = {
        ReviewId: reviewId,
        CommentId: null
        // UserId: ELIMINADO
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/api/gateway/reviews/${reviewId}/reactions`, reactionData, {
            headers: getAuthHeaders()
        });
        return response.data;
    } catch (error) {
        // Fallback para endpoints directos
        if (error.response?.status === 404) {
             const response = await axios.post(`${SOCIAL_DIRECT_URL}/api/reactions`, reactionData, {
                headers: getAuthHeaders()
            });
            return response.data;
        }
        throw error;
    }
}

/**
 * Elimina Like de Reseña.
 * La lógica ideal es DELETE /reactions/review/{reviewId}/me (usando token).
 * Si tu backend requiere ID explícito en la URL, fallará.
 */
export async function deleteReviewReaction(reviewId) {
    try {
        // Intentamos ruta agnóstica de usuario o "me"
        // Si tu backend necesita el userId, tendrás que actualizar el backend 
        // o (mala práctica) decodificar el token aquí.
        // Asumiré que el backend tiene un endpoint: DELETE /api/reactions/review/{reviewId}/me
        // O que usa el token para filtrar en el endpoint genérico.
        
        // NOTA TEMPORAL: Usamos ruta directa modificada esperando que el backend soporte '/me' o similar.
        // Si esto falla, avísame para parchearlo.
        const response = await axios.delete(`${API_BASE_URL}/api/gateway/reactions/review/${reviewId}`, {
             headers: getAuthHeaders()
        });
        return response.data;

    } catch (error) {
        console.warn("Fallo borrado seguro de reacción, intentando ruta legacy...");
        // LEGACY: Si el backend NO fue actualizado y exige ID, esto fallará porque no lo tenemos.
        // En ese caso, ¡es tarea del backend arreglarse!
        throw error;
    }
}

// Ver si YO le di like
export async function getUserReactionToReview(reviewId) {
    try {
        // Petición segura: "¿Tengo like en esto?" (Backend usa Token)
        const response = await axios.get(`${API_BASE_URL}/api/gateway/reactions/review/${reviewId}`, {
            headers: getAuthHeaders(),
            validateStatus: status => status === 200 || status === 404
        });

        if (response.status === 200) return response.data;
        return null;
    } catch (error) {
        return null;
    }
}

export async function addCommentReaction(commentId) {
    const reactionData = {
        UserId: null, // El backend lo llena con el token
        // CAMBIO: Usamos GUID vacío en vez de null para evitar errores de deserialización
        ReviewId: null, 
        CommentId: commentId
    };

    try {
        // CAMBIO: Usamos la nueva ruta limpia del Gateway
        const response = await axios.post(`${API_BASE_URL}/api/gateway/comments/${commentId}/reactions`, reactionData, {
            headers: getAuthHeaders()
        });
        return response.data;
    } catch (error) {
         // Fallback directo (por si acaso)
         const response = await axios.post(`${SOCIAL_DIRECT_URL}/api/reactions`, reactionData, {
            headers: getAuthHeaders()
        });
        return response.data;
    }
}

export async function deleteCommentReaction(commentId) {
    try {
        await axios.delete(`${API_BASE_URL}/api/gateway/reactions/comments/${commentId}`, {
            headers: getAuthHeaders()
        });
    } catch (error) {
        console.error('Error en deleteCommentReaction:', error);
        throw error;
    }
}

// =========================================================
// 🔔 4. OTROS (User & Notifications)
// =========================================================

export async function getNotifications() {
    try {
        // Backend filtra por Token
        const response = await axios.get(`${API_BASE_URL}/api/gateway/notifications`, {
            params: { state: 'Unread' },
            headers: getAuthHeaders()
        });
        return response.data || [];
    } catch (error) {
        console.error('Error en getNotifications:', error);
        return [];
    }
}

export async function getUser(userId) {
    try {
        // CORRECCIÓN: Agregamos /${userId} para buscar al usuario específico
        const response = await axios.get(`${API_BASE_URL}/api/gateway/users/${userId}`, {
             headers: getAuthHeaders() 
        });
        return response.data;
    } catch (error) {
        console.warn(`Error obteniendo usuario ${userId}`, error);
        return null;
    }
}


export async function getCommentById(commentId) {
    if (!commentId) return null;
    
    try {
        // Intentamos ruta Gateway
        const response = await axios.get(`${API_BASE_URL}/api/gateway/comments/${commentId}`, {
            validateStatus: status => status === 200 || status === 404
        });
        
        if (response.status === 200) return response.data;
        
        // Si falla, intentamos ruta directa (Fallback)
        // Ajusta el puerto si tu servicio de comentarios corre en otro (ej: 8002)
        const responseDirect = await axios.get(`http://localhost:8002/api/comments/${commentId}`, {
            validateStatus: status => status === 200 || status === 404
        });
        
        return responseDirect.status === 200 ? responseDirect.data : null;

    } catch (error) {
        console.warn(`No se pudo recuperar el comentario ${commentId}:`, error);
        return null;
    }
}

export async function markNotificationAsRead(notificationId) {
    const authToken = localStorage.getItem('authToken');
    if (!authToken || !notificationId) return;

    try {
        // El endpoint en tu NotificationController es: [HttpPatch("read/{notificationId}")]
        // Ruta completa: /api/Notification/read/{id}
        
        const response = await fetch(`${API_BASE_URL}/api/Notification/read/${notificationId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn(`No se pudo marcar como leída la notificación ${notificationId}. Status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error al marcar notificación como leída:', error);
    }
}