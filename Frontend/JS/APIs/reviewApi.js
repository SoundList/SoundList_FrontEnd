/* =================================================
   JS/APIs/reviewApi.js
   (Formato ES6 Module - Compatible con amigosHandler)
   ================================================= */

import { API_BASE_URL } from './configApi.js';

// Construimos la URL base igual que en tu código anterior
// API_BASE_URL suele ser http://localhost:5000
const REVIEWS_ENDPOINT = `${API_BASE_URL}/api/gateway/reviews`;

// Helper para headers (igual que en AmigosApi)
const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    if (!token) console.warn("API: No token found");
    
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

export const ReviewApi = {

    // --- 1. FUNCIONES BÁSICAS (CRUD) ---

    // Crear Reseña
    createReview: async (reviewData) => {
        try {
            const response = await fetch(REVIEWS_ENDPOINT, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(reviewData)
            });
            if (!response.ok) throw new Error('Error creating review');
            return await response.json();
        } catch (error) {
            console.error("❌ Error createReview:", error);
            throw error;
        }
    },

    // Obtener TODAS las reseñas
    getAllReviews: async () => {
        try {
            const response = await fetch(REVIEWS_ENDPOINT, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (!response.ok) throw new Error('Error fetching all reviews');
            return await response.json();
        } catch (error) {
            console.error("❌ Error getAllReviews:", error);
            return [];
        }
    },

    // Actualizar Reseña
    updateReview: async (reviewId, newText, newRating) => {
        try {
            // Nota: Agregué rating por si acaso, si no lo usas, el backend lo ignorará
            const payload = { text: newText, rating: newRating }; 
            const response = await fetch(`${REVIEWS_ENDPOINT}/${reviewId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('Error updating review');
            return await response.json();
        } catch (error) {
            console.error("❌ Error updateReview:", error);
            throw error;
        }
    },

    // Eliminar Reseña
    deleteReview: async (reviewId) => {
        try {
            const response = await fetch(`${REVIEWS_ENDPOINT}/${reviewId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            return response.ok;
        } catch (error) {
            console.error("❌ Error deleteReview:", error);
            return false;
        }
    },

    // --- 2. FUNCIONES DE FILTRADO DE USUARIO ---

    // Top reseñas de un usuario
    getTopReviewsByUser: async (userId) => {
        try {
            const response = await fetch(`${REVIEWS_ENDPOINT}/user/${userId}/top`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (!response.ok) throw new Error('Failed to get top reviews');
            return await response.json();
        } catch (error) {
            console.warn("⚠️ Fallback: getTopReviewsByUser falló, devolviendo todas.");
            return ReviewApi.getAllReviews(); // Tu fallback original
        }
    },

    // Todas las reseñas de un usuario
    getReviewsByUser: async (userId) => {
        try {
            // Intento optimizado si tuvieras endpoint directo
            // const response = await fetch(`${REVIEWS_ENDPOINT}/user/${userId}`, ...);
            
            // Tu lógica original (Fallback): Traer todas y filtrar en el cliente
            const allReviews = await ReviewApi.getAllReviews();
            // Filtrar por userId o UserId (el backend puede usar cualquiera)
            return allReviews.filter(r => {
                const reviewUserId = r.userId || r.UserId;
                return String(reviewUserId).trim() === String(userId).trim();
            });
        } catch (error) {
            console.error("Error getReviewsByUser:", error);
            return [];
        }
    },

    // Mis reseñas
    getMyReviews: async () => {
        const myUserId = localStorage.getItem("userId");
        if (!myUserId) return [];
        return await ReviewApi.getReviewsByUser(myUserId);
    },

    // --- 3. 👇 LAS NUEVAS FUNCIONES PARA AMIGOS 👇 ---

    // Reseñas de gente que YO SIGO (Seguidos)
    getReviewsByFollowing: async () => {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) return [];

            // Ruta: GET /api/gateway/reviews/user/{id}/following
            const response = await fetch(`${REVIEWS_ENDPOINT}/user/${userId}/following`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                // Si el backend no tiene la ruta aún, devolvemos vacío para no romper
                console.warn("Backend sin ruta /following reviews, retornando vacío.");
                return []; 
            }
            return await response.json();
        } catch (error) {
            console.error('Error cargando feed de seguidos:', error);
            return [];
        }
    },

    // Reseñas de gente que ME SIGUE (Seguidores)
    getReviewsByFollowers: async () => {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) return [];

            // Ruta: GET /api/gateway/reviews/user/{id}/followers
            const response = await fetch(`${REVIEWS_ENDPOINT}/user/${userId}/followers`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                console.warn("Backend sin ruta /followers reviews, retornando vacío.");
                return [];
            }
            return await response.json();
        } catch (error) {
            console.error('Error cargando feed de seguidores:', error);
            return [];
        }
    },

    // --- 4. EXTRAS (Placeholders para evitar errores si los llamas) ---
    reportReview: async (reviewId) => {
        console.log(`[MOCK] Reseña ${reviewId} reportada.`);
        return true;
    },

    getBestReviews: async () => {
        return ReviewApi.getAllReviews(); // Fallback a todas
    },

    getRecentReviews: async () => {
        return ReviewApi.getAllReviews(); // Fallback a todas
    }
};

// Mantener compatibilidad global por si algún HTML viejo usa onclick="window.reviewApi..."
if (typeof window !== 'undefined') {
    window.reviewApi = ReviewApi;
}