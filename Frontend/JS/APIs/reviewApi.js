import { API_BASE_URL } from './configApi.js';

// API_BASE_URL suele ser http://localhost:5000
const REVIEWS_ENDPOINT = `${API_BASE_URL}/api/gateway/reviews`;
const FEEDS_ENDPOINT = `${API_BASE_URL}/api/gateway/feeds`;

const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    if (!token) console.warn("API: No token found");
    
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

export const ReviewApi = {
    // 1. CREAR RESEÑA (Secure)
    createReview: async (reviewData) => {
        try {
            // SEGURIDAD: Extraemos userId para NO enviarlo. El Backend lo saca del Token.
            const { userId, ...payload } = reviewData; 

            const response = await fetch(REVIEWS_ENDPOINT, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Error creating review');
            }
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

    // Top reseñas de un usuario (Público o Privado, pero de OTRO usuario)
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
            return ReviewApi.getAllReviews(); 
        }
    },

    // Todas las reseñas de un usuario (Perfil de terceros)
    getReviewsByUser: async (userId) => {
        try {
            // Opción 1: Si el backend soporta filtrado server-side
            // const response = await fetch(`${REVIEWS_ENDPOINT}/user/${userId}`, { headers: getAuthHeaders() });
            
            // Opción 2 (Tu Fallback actual): Traer todas y filtrar en cliente
            const allReviews = await ReviewApi.getAllReviews();
            return allReviews.filter(r => {
                const reviewUserId = r.userId || r.UserId;
                return String(reviewUserId).trim() === String(userId).trim();
            });
        } catch (error) {
            console.error("Error getReviewsByUser:", error);
            return [];
        }
    },

    // --- 3. FUNCIONES DE IDENTIDAD (Token Dependent) ---

    // Mis reseñas
    getMyReviews: async () => {
        try {
            // INTENTO 1: Endpoint seguro (Token decide quién soy)
            // Si tu backend no tiene '/my-reviews', caerá al catch
            const response = await fetch(`${REVIEWS_ENDPOINT}/my-reviews`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            
            if (response.ok) return await response.json();
            
            throw new Error("Endpoint no encontrado");
        } catch (error) {
            // FALLBACK: Usar localStorage solo si falla el endpoint dedicado
            const myUserId = localStorage.getItem("userId");
            if (!myUserId) return [];
            return await ReviewApi.getReviewsByUser(myUserId);
        }
    },

    // Obtener reseñas de quienes YO SIGO (Following)
    getReviewsByFollowing: async () => {
        try {
            // CAMBIO CRÍTICO: Eliminamos 'myUserId=' de la URL.
            // El backend debe leer el token para saber quién soy.
            const url = `${FEEDS_ENDPOINT}/following?page=1&pageSize=50`;
            
            console.log(`🌐 Fetching Seguidos (Secure): ${url}`);
            const response = await fetch(url, { method: 'GET', headers: getAuthHeaders() });

            if (!response.ok) return [];
            const data = await response.json();
            return data.Items || data.items || [];
        } catch (error) {
            console.error('Error cargando feed de seguidos:', error);
            return [];
        }
    },

    // Obtener reseñas de MIS SEGUIDORES (Followers)
    getReviewsByFollowers: async () => {
        try {
            // CAMBIO CRÍTICO: Eliminamos 'myUserId=' de la URL.
            const url = `${FEEDS_ENDPOINT}/follow?page=1&pageSize=50`;
            
            console.log(`🌐 Fetching Seguidores (Secure): ${url}`);
            const response = await fetch(url, { method: 'GET', headers: getAuthHeaders() });

            if (!response.ok) return [];
            const data = await response.json();
            return data.Items || data.items || [];
        } catch (error) {
            console.error('Error cargando feed de seguidores:', error);
            return [];
        }
    },

    // --- 4. EXTRAS ---
    reportReview: async (reviewId) => {
        console.log(`[MOCK] Reseña ${reviewId} reportada.`);
        return true;
    },

    getBestReviews: async () => {
        return ReviewApi.getAllReviews(); 
    },

    getRecentReviews: async () => {
        return ReviewApi.getAllReviews(); 
    }
};

// Compatibilidad Global
if (typeof window !== 'undefined') {
    window.reviewApi = ReviewApi;
}