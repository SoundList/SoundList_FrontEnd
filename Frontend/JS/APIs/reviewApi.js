
import { API_BASE_URL } from './configApi.js';

// API_BASE_URL suele ser http://localhost:5000
const REVIEWS_ENDPOINT = `${API_BASE_URL}/api/gateway/reviews`;


const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    if (!token) console.warn("API: No token found");
    
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

export const ReviewApi = {
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

// Obtener reseñas de quienes YO SIGO (Endpoint: /api/gateway/following)
// Obtener reseñas de SEGUIDOS (Following)
    getReviewsByFollowing: async () => {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) return [];


            // La URL base sigue siendo http://localhost:5000/api/gateway
            const url = `${API_BASE_URL}/api/gateway/feeds/following?myUserId=${userId}&page=1&pageSize=50`;
            
            console.log(`🌐 Fetching Seguidos: ${url}`);
            const response = await fetch(url, { method: 'GET', headers: getAuthHeaders() });

            if (!response.ok) return [];
            const data = await response.json();
            return data.Items || data.items || [];
        } catch (error) {
            console.error('Error cargando feed de seguidos:', error);
            return [];
        }
    },

    // Obtener reseñas de SEGUIDORES (Followers)
    getReviewsByFollowers: async () => {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) return [];

            const url = `${API_BASE_URL}/api/gateway/feeds/follow?myUserId=${userId}&page=1&pageSize=50`;
            
            console.log(`🌐 Fetching Seguidores: ${url}`);
            const response = await fetch(url, { method: 'GET', headers: getAuthHeaders() });

            if (!response.ok) return [];
            const data = await response.json();
            return data.Items || data.items || [];
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