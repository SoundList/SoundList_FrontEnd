
(function() {

    const GATEWAY_BASE = "http://localhost:5000/api/gateway"; 

    const USER_GATEWAY_ROUTE = `${GATEWAY_BASE}/users`; 
    const FOLLOW_GATEWAY_ROUTE = `${GATEWAY_BASE}/follows`; 


    function getAuthHeaders() {
        const token = localStorage.getItem("authToken");
        if (!token) return {};
        return { headers: { 'Authorization': `Bearer ${token}` } };
    }

    // --- PERFIL DE USUARIO ---
    async function updateUserProfile(userId, profileData) {
        try {
            const response = await axios.patch(`${USER_GATEWAY_ROUTE}/${userId}`, profileData, getAuthHeaders());
            console.log("✅ Perfil actualizado:", response.data);
            return response.data;
        } catch (error) {
            console.error("❌ Error en updateUserProfile:", error.response?.data || error.message);
            throw error;
        }
    }

    async function getUserProfile(userId) {
        try {
            const response = await axios.get(`${USER_GATEWAY_ROUTE}/${userId}`, getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error("❌ Error en getUserProfile:", error.response?.data || error.message);
            throw error;
        }
    }

    // --- FOLLOWS ---
    async function getFollowerList() {
        try {
            const response = await axios.get(`${FOLLOW_GATEWAY_ROUTE}/followers`, getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error("❌ Error en getFollowerList:", error.response?.data || error.message);
            return [];
        }
    }

    async function getFollowerCount(userId) {
        try {
            const response = await axios.get(`${FOLLOW_GATEWAY_ROUTE}/${userId}/followers/count`, getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error("❌ Error en getFollowerCount:", error.response?.data || error.message);
            return 0;
        }
    }

    async function getFollowingCount(userId) {
        try {
            const response = await axios.get(`${FOLLOW_GATEWAY_ROUTE}/${userId}/followings/count`, getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error("❌ Error en getFollowingCount:", error.response?.data || error.message);
            return 0;
        }
    }

    async function followUser(userIdToFollow) {
        const currentUserId = localStorage.getItem("userId");
        if (!currentUserId) throw new Error("Usuario no logueado");

        const payload = { followerId: currentUserId, followingId: userIdToFollow };

        try {
            const response = await axios.post(FOLLOW_GATEWAY_ROUTE, payload, getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error("❌ Error en followUser:", error.response?.data || error.message);
            throw error;
        }
    }

    async function unfollowUser(userIdToUnfollow) {
        const currentUserId = localStorage.getItem("userId");
        if (!currentUserId) throw new Error("Usuario no logueado");

        try {
            await axios.delete(`${FOLLOW_GATEWAY_ROUTE}/${currentUserId}/${userIdToUnfollow}`, getAuthHeaders());
            return true;
        } catch (error) {
            console.error("❌ Error en unfollowUser:", error.response?.data || error.message);
            throw error;
        }
    }

    async function checkFollowStatus(userIdToCheck) {
        const currentUserId = localStorage.getItem("userId");
        if (!currentUserId) return false;

        try {
            const response = await axios.get(`${FOLLOW_GATEWAY_ROUTE}/status`, {
                ...getAuthHeaders(),
                params: { followerId: currentUserId, followingId: userIdToCheck }
            });
            return response.data;
        } catch (error) {
            console.error("❌ Error en checkFollowStatus:", error.response?.data || error.message);
            return false;
        }
    }

    window.userApi = {
        updateUserProfile,
        getUserProfile,
        getFollowerList,
        getFollowerCount,
        getFollowingCount,
        followUser,
        unfollowUser,
        checkFollowStatus
    };

})();
