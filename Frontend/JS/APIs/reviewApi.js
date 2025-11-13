
(function() {

    const GATEWAY_BASE_URL = "http://localhost:5/api/gateway";

    const API_BASE = `${GATEWAY_BASE_URL}/reviews`; 

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

    async function createReview(reviewData) { 
        try {
            const response = await axios.post(API_BASE, reviewData, getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error("❌ Error en createReview:", error.response?.data || error.message);
            throw error;
        }
    }

    async function getAllReviews() { 
        try {
            const response = await axios.get(API_BASE, getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error("❌ Error en getAllReviews:", error.response?.data || error.message);
            throw error;
        }
    }

    async function updateReview(reviewId, newText) {
        try {
            const payload = {
                text: newText 
            };

            const response = await axios.put(`${API_BASE}/${reviewId}`, payload, getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error("❌ Error en updateReview:", error.response?.data || error.message);
            throw error;
        }
    }

    async function deleteReview(reviewId) { 
        try {
            await axios.delete(`${API_BASE}/${reviewId}`, getAuthHeaders());
            return true;
        } catch (error) {
            console.error("❌ Error en deleteReview:", error.response?.data || error.message);
            throw error;
        }
    }

    async function reportReview(reviewId, reason) { 
        console.warn(`API: Reportar review no implementado. Reporte simulado para ${reviewId}`);
        return Promise.resolve({ success: true, message: "Reporte simulado" });
    }


    async function getTopReviewsByUser(userId) {
        try {
            const response = await axios.get(`${API_BASE}/user/${userId}/top`, getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error("❌ Error en getTopReviewsByUser:", error.response?.data || error.message);
            console.warn("Fallback: getTopReviewsByUser falló, devolviendo getAllReviews().");
            return getAllReviews(); 
        }
    }

    async function getReviewsByUser(userId) { 
        console.warn("API: getReviewsByUser usando GET /api/gateway/reviews como fallback.");
        const allReviews = await getAllReviews();
        return allReviews.filter(r => r.userId === userId);
    }
    async function getMyReviews() { 
        console.warn("API: getMyReviews usando GET /api/gateway/reviews como fallback.");
        const myUserId = localStorage.getItem("userId");
        const allReviews = await getAllReviews();
        return allReviews.filter(r => r.userId == myUserId);
    }
    async function getBestReviews() { 
        console.warn("API: getBestReviews usando GET /api/gateway/reviews como fallback.");
        return getAllReviews(); 
    }
    async function getLessCommentedReviews() { 
        console.warn("API: getLessCommentedReviews usando GET /api/gateway/reviews como fallback.");
        return getAllReviews(); 
    }
    async function getRecentReviews() { 
        console.warn("API: getRecentReviews usando GET /api/gateway/reviews como fallback.");
        return getAllReviews(); 
    }

    window.reviewApi = {
        createReview,
        getAllReviews,
        updateReview,
        deleteReview,
        reportReview,
        getTopReviewsByUser,
        getMyReviews,
        getReviewsByUser, 
        getBestReviews,
        getLessCommentedReviews,
        getRecentReviews
    };

})();