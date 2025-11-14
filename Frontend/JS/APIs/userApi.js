
(function() {

    const GATEWAY_BASE = "http://localhost:5000/api/gateway"; 

    const USER_GATEWAY_ROUTE = `${GATEWAY_BASE}/users`; 
    const FOLLOW_GATEWAY_ROUTE = `${GATEWAY_BASE}/follows`; 

    // Interceptor para suprimir errores 404 de follows (endpoints pueden no existir aún)
    if (typeof axios !== 'undefined') {
        const originalRequest = axios.request;
        axios.interceptors.response.use(
            response => response,
            error => {
                // Suprimir errores 404 específicos de follows
                if (error.config && 
                    error.response && 
                    error.response.status === 404 &&
                    error.config.url && 
                    (error.config.url.includes('/follows/') && 
                     (error.config.url.includes('/followers/count') || 
                      error.config.url.includes('/followings/count')))) {
                    // Retornar una respuesta simulada en lugar de lanzar error
                    return Promise.resolve({
                        status: 404,
                        statusText: 'Not Found',
                        data: 0,
                        headers: {},
                        config: error.config
                    });
                }
                return Promise.reject(error);
            }
        );
    }

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

    async function getFollowCounts(userId) {
        // El backend tiene un solo endpoint que devuelve ambos contadores
        // Endpoint correcto: /api/gateway/users/{userId}/follow/count
        // Devuelve: { FollowerNum: int, FollowingNum: int }
        try {
            const token = localStorage.getItem("authToken");
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${USER_GATEWAY_ROUTE}/${userId}/follow/count`, {
                method: 'GET',
                headers: headers
            }).catch(() => null);
            
            if (!response || response.status === 404) {
                return { followerCount: 0, followingCount: 0 };
            }
            
            if (!response.ok) {
                return { followerCount: 0, followingCount: 0 };
            }
            
            const data = await response.json();
            return {
                followerCount: data?.FollowerNum || data?.followerNum || 0,
                followingCount: data?.FollowingNum || data?.followingNum || 0
            };
        } catch (error) {
            // Silenciosamente retornar 0 para cualquier error
            return { followerCount: 0, followingCount: 0 };
        }
    }

    async function getFollowerCount(userId) {
        // Obtener ambos contadores y retornar solo el de seguidores
        const counts = await getFollowCounts(userId);
        return counts.followerCount;
    }

    async function getFollowingCount(userId) {
        // Obtener ambos contadores y retornar solo el de seguidos
        const counts = await getFollowCounts(userId);
        return counts.followingCount;
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
