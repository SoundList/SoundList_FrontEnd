import { API_BASE_URL } from './configApi.js';
// JavaScript/API/socialApi.js
//
// Esta es la capa de API pura para el "Social Service".
// Su única responsabilidad es hablar con el API Gateway.
// No contiene lógica de DOM, ni de localStorage, ni de alertas.
// Importa la URL del Gateway desde tu nuevo archivo de configuración.

/**
 * Obtiene el feed principal de reseñas.
 * Ruta: GET /api/gateway/reviews
 */
export async function getReviews() {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/gateway/reviews`, {
            timeout: 5000
        });
        return response.data || [];
    } catch (error) {
        console.error('Error en getReviews:', error);
        throw error; // El handler (quien llama) se encargará de esto
    }
}

/**
 * Obtiene los detalles agregados de una sola reseña (info de usuario, contenido, etc.).
 * Ruta: GET /api/review-details/{reviewId}
 */
export async function getReviewDetails(reviewId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/review-details/${reviewId}`, {
            timeout: 5000
        });
        return response.data;
    } catch (error) {
        console.error(`Error en getReviewDetails (ID: ${reviewId}):`, error);
        throw error;
    }
}

/**
 * Obtiene los comentarios de una reseña específica.
 * Ruta: GET /api/gateway/comments/review/{reviewId}
 */
export async function getCommentsByReview(reviewId) {
    try {
        // Tu OpenAPI (Social) muestra: GET /api/Comments/review/{reviewId}
        // Tu home.js usa: /api/gateway/comments/review/{reviewId} (¡Esta es la correcta!)
        const response = await axios.get(`${API_BASE_URL}/api/gateway/comments/review/${reviewId}`);
        return response.data || [];
    } catch (error) {
        console.error(`Error en getCommentsByReview (ID: ${reviewId}):`, error);
        throw error;
    }
}

/**
 * Publica un nuevo comentario.
 * Ruta: POST /api/gateway/comments
 */
export async function createComment(reviewId, text, userId, authToken) {
    const commentData = {
        ReviewId: reviewId,
        Text: text,
        IdUser: userId
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/api/gateway/comments`, commentData, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error en createComment:', error);
        throw error;
    }
}

/**
 * Actualiza un comentario existente.
 * Ruta: PUT /api/gateway/comments/{commentId}
 */
export async function updateComment(commentId, newText, authToken) {
    try {
        // Intentar primero con PATCH (método más común para actualizaciones parciales)
        try {
            const response = await axios.patch(
                `${API_BASE_URL}/api/gateway/comments/${commentId}`,
                { Text: newText },
                {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                }
            );
            return response.data;
        } catch (patchError) {
            // Si PATCH falla con 405, intentar con PUT
            if (patchError.response?.status === 405) {
                const response = await axios.put(
                    `${API_BASE_URL}/api/gateway/comments/${commentId}`,
                    { Text: newText },
                    {
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 5000
                    }
                );
                return response.data;
            }
            throw patchError;
        }
    } catch (error) {
        console.error(`Error en updateComment (ID: ${commentId}):`, error);
        // Si falla el gateway, probamos la ruta directa (lógica de home.js)
        try {
            console.warn('Fallback: Intentando ruta directa de SocialAPI para updateComment');
            const SOCIAL_API_BASE_URL = 'http://localhost:8002'; // Fallback
            try {
                const response = await axios.patch(
                    `${SOCIAL_API_BASE_URL}/api/Comments/${commentId}`,
                    { Text: newText },
                    { headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }, timeout: 5000 }
                );
                return response.data;
            } catch (patchError) {
                // Si PATCH falla, intentar PUT
                if (patchError.response?.status === 405) {
                    const response = await axios.put(
                        `${SOCIAL_API_BASE_URL}/api/Comments/${commentId}`,
                        { Text: newText },
                        { headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }, timeout: 5000 }
                    );
                    return response.data;
                }
                throw patchError;
            }
        } catch (directError) {
            console.error('Error en updateComment (Fallback):', directError);
            throw directError; // Lanzamos el segundo error
        }
    }
}

/**
 * Elimina un comentario.
 * Ruta: DELETE /api/gateway/comments/{commentId}
 */
export async function deleteComment(commentId, authToken) {
    if (!commentId) {
        throw new Error('Comment ID es requerido');
    }
    
    // Normalizar el commentId (asegurarse de que sea string)
    const normalizedCommentId = String(commentId).trim();
    
    if (!normalizedCommentId || normalizedCommentId === 'null' || normalizedCommentId === 'undefined') {
        throw new Error('Comment ID inválido');
    }
    
    try {
        await axios.delete(`${API_BASE_URL}/api/gateway/comments/${normalizedCommentId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 5000
        });
    } catch (error) {
        console.error(`Error en deleteComment (ID: ${normalizedCommentId}):`, error);
        
        // Si es 404, el comentario no existe - no intentar fallback
        if (error.response?.status === 404) {
            throw new Error('El comentario no fue encontrado. Puede que ya haya sido eliminado.');
        }
        
        // Fallback a ruta directa solo para otros errores
        try {
            console.warn('Fallback: Intentando ruta directa de SocialAPI para deleteComment');
            const SOCIAL_API_BASE_URL = 'http://localhost:8002'; // Fallback
            await axios.delete(`${SOCIAL_API_BASE_URL}/api/Comments/${normalizedCommentId}`, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
                timeout: 5000
            });
        } catch (directError) {
            console.error('Error en deleteComment (Fallback):', directError);
            
            // Si el fallback también da 404, el comentario no existe
            if (directError.response?.status === 404) {
                throw new Error('El comentario no fue encontrado. Puede que ya haya sido eliminado.');
            }
            
            throw directError;
        }
    }
}

/**
 * Obtiene el número de "likes" (reacciones) de una reseña.
 * Ruta: GET /api/gateway/reviews/{reviewId}/reactions/count
 */
export async function getReviewReactionCount(reviewId) {
    try {
        const response = await axios.get(
            `${API_BASE_URL}/api/gateway/reviews/${reviewId}/reactions/count`,
            { timeout: 3000 }
        );
        return response.data?.count || 0;
    } catch (error) {
        // Fallback a ruta directa
        try {
            const SOCIAL_API_BASE_URL = 'http://localhost:8002'; // Fallback
            const response = await axios.get(
                `${SOCIAL_API_BASE_URL}/api/reactions/review/${reviewId}/count`, // Ruta de tu OpenAPI (Social)
                { timeout: 3000 }
            );
            return response.data?.count || 0;
        } catch (e) {
            console.warn(`No se pudieron obtener likes para review ${reviewId}:`, e.message);
            return 0;
        }
    }
}

/**
 * Agrega un "like" (reacción) a una reseña.
 * Ruta: POST /api/gateway/reviews/{reviewId}/reactions
 */
export async function addReviewReaction(reviewId, userId, authToken) {
    const reactionData = {
        UserId: userId,
        ReviewId: reviewId,
        CommentId: null
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/api/gateway/reviews/${reviewId}/reactions`, reactionData, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 5000
        });
        return response.data;
    } catch (gatewayError) {
        // Fallback a ruta directa
        if (gatewayError.response && gatewayError.response.status === 404) {
            try {
                console.warn('Fallback: Intentando ruta directa de SocialAPI para addReviewReaction');
                const SOCIAL_API_BASE_URL = 'http://localhost:8002'; // Fallback
                const response = await axios.post(`${SOCIAL_API_BASE_URL}/api/reactions`, reactionData, {
                    headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
                    timeout: 5000
                });
                return response.data;
            } catch (directError) {
                console.error('Error en addReviewReaction (Fallback):', directError);
                throw directError;
            }
        } else {
            throw gatewayError;
        }
    }
}

/**
 * Elimina un "like" (reacción) de una reseña.
 * Ruta: DELETE /api/reactions/review/{reviewId}/{userId} (Ruta directa, no parece estar en el gateway)
 */
export async function deleteReviewReaction(reviewId, userId, authToken, reactionId) {
    // Tu lógica de home.js usaba una ruta directa, lo cual es correcto.
    // El OpenAPI (Social) muestra: DELETE /api/reactions/{reactionId}/{userId}
    // PERO tu home.js usa: DELETE /api/reactions/review/{reviewId}/{userId}
    // Voy a usar la ruta de tu home.js, que parece la correcta.
    
    // Nota: El gateway no parece tener esta ruta, así que usamos la URL del Social API.
    const SOCIAL_API_BASE_URL = 'http://localhost:8002';
    try {
        await axios.delete(`${SOCIAL_API_BASE_URL}/api/reactions/review/${reviewId}/${userId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 5000
        });
    } catch (error) {
        console.error('Error en deleteReviewReaction:', error);
        throw error;
    }
}

/**
 * Crea una nueva reseña.
 * Ruta: POST /api/gateway/reviews
 */
export async function createReview(reviewData, authToken) {
    // reviewData debe ser: { UserId, Rating, Title, Content, SongId?, AlbumId? }
    try {
        const response = await axios.post(`${API_BASE_URL}/api/gateway/reviews`, reviewData, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
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
 * Ruta: PUT /api/gateway/reviews/{reviewId}
 */
export async function updateReview(reviewId, reviewData, authToken) {
    // reviewData debe ser: { UserId, Rating, Title, Content }
    try {
        const response = await axios.put(`${API_BASE_URL}/api/gateway/reviews/${reviewId}`, reviewData, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
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
 * Ruta: DELETE /api/gateway/reviews/{reviewId}/{userId}
 */
export async function deleteReview(reviewId, userId, authToken) {
    try {
        // Tu home.js intenta varias rutas. Esta es la que configuraste en el Gateway.
        const gatewayUrl = `${API_BASE_URL}/api/gateway/reviews/${reviewId}/${userId}`;
        await axios.delete(gatewayUrl, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 5000
        });
    } catch (gatewayError) {
        // Fallback a ruta directa (basado en tu OpenAPI)
        try {
            console.warn('Fallback: Intentando ruta directa de SocialAPI para deleteReview');
            const SOCIAL_API_BASE_URL = 'http://localhost:8002'; // Fallback
            const socialUrl = `${SOCIAL_API_BASE_URL}/api/reviews/${reviewId}/${userId}`;
            await axios.delete(socialUrl, {
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
                timeout: 5000
            });
        } catch (directError) {
            console.error('Error en deleteReview (Fallback):', directError);
            throw directError;
        }
    }
}

/**
 * Obtiene las notificaciones de un usuario.
 * Ruta: GET /api/gateway/notifications
 */
export async function getNotifications(userId, authToken) {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/gateway/notifications`, {
            params: { 
                userId: userId,
                state: 'Unread'
            },
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            timeout: 5000
        });
        return response.data || [];
    } catch (error) {
        console.error('Error en getNotifications:', error);
        throw error;
    }
}

/**
 * Obtiene los datos de un usuario.
 * Ruta: GET /api/gateway/users/{userId}
 */
export async function getUser(userId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/gateway/users/${userId}`, {
            timeout: 2000 
        });
        return response.data;
    } catch (error) {
        console.error(`Error en getUser (ID: ${userId}):`, error);
        throw error;
    }
}