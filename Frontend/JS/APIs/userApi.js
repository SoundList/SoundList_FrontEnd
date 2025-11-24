(function() {

    // 1. CONSTANTES CENTRALIZADAS (Para evitar errores de URL)
    const API_BASE_URL = "http://localhost:5000";
    const GATEWAY_USERS = `${API_BASE_URL}/api/gateway/users`; 

    // ==========================================
    // 🛡️ CONFIGURACIÓN AXIOS & INTERCEPTORES
    // ==========================================

    if (typeof axios !== 'undefined') {
        // Interceptor para manejar 404s "esperados" en contadores
        axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response && error.response.status === 404) {
                    const url = error.config.url || '';
                    if (url.includes('/follow/count') || 
                        url.includes('/followers') ||
                        url.includes('/follow/status')) {
                        return Promise.resolve({
                            data: 0,
                            status: 200 
                        });
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    // Helper de Auth blindado
    function getAuthHeaders() {
        const token = localStorage.getItem("authToken");
        // Si no hay token o es inválido, devolvemos headers vacíos para evitar errores 400
        if (!token || token === "null" || token === "undefined" || token.length < 20) {
            return { headers: { 'Content-Type': 'application/json' } };
        }
        return { 
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            } 
        };
    }

    // ==========================================
    // 👤 1. GESTIÓN DE PERFIL (Profile)
    // ==========================================

    async function getUserProfile(userId) {
        try {
            const response = await axios.get(`${GATEWAY_USERS}/${userId}`, getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error("❌ Error en getUserProfile:", error);
            throw error;
        }
    }

    async function updateUserProfile(userId, profileData) {
        try {
            const response = await axios.patch(`${GATEWAY_USERS}/${userId}`, profileData, getAuthHeaders());
            console.log("✅ Perfil actualizado:", response.data);
            return response.data;
        } catch (error) {
            console.error("❌ Error en updateUserProfile:", error);
            throw error;
        }
    }

    // ==========================================
    // 🔐 2. SEGURIDAD DE CUENTA
    // ==========================================

    async function updateUserEmail(newEmail, confirmEmail) {
        try {
            const payload = { NewEmail: newEmail, EmailConfirm: confirmEmail };
            const response = await axios.put(`${GATEWAY_USERS}/email`, payload, getAuthHeaders());
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async function updateUserPassword(oldPassword, newPassword) {
        try {
            const payload = { oldPassword: oldPassword, newHashedPassword: newPassword };
            const response = await axios.put(`${GATEWAY_USERS}/password`, payload, getAuthHeaders());
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async function deleteUserAccount() {
        try {
            const response = await axios.delete(`${GATEWAY_USERS}/delete-self`, getAuthHeaders());
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    // ==========================================
    // 🤝 3. SISTEMA DE SEGUIDORES (Social Graph)
    // ==========================================

    async function getFollowerList(userId) {
        try {
            const response = await axios.get(`${GATEWAY_USERS}/${userId}/followers`, getAuthHeaders());
            return response.data || [];
        } catch (error) {
            return [];
        }
    }

    async function getFollowCounts(userId) {
        try {
            const response = await axios.get(`${GATEWAY_USERS}/${userId}/follow/count`, getAuthHeaders());
            const data = response.data;
            return {
                followerCount: data?.FollowerNum || data?.followerNum || 0,
                followingCount: data?.FollowingNum || data?.followingNum || 0
            };
        } catch (error) {
            return { followerCount: 0, followingCount: 0 };
        }
    }

    async function getFollowerCount(userId) {
        const counts = await getFollowCounts(userId);
        return counts.followerCount;
    }

    async function getFollowingCount(userId) {
        const counts = await getFollowCounts(userId);
        return counts.followingCount;
    }

    // ---------------------------------------------------------
    // 🚀 AQUÍ ESTÁ LA CORRECCIÓN CLAVE: followUser con Hidratación
    // ---------------------------------------------------------
    async function followUser(targetId, targetName, targetImage) {
        const currentUserId = localStorage.getItem("userId");
        const currentUserName = localStorage.getItem("username") || "Yo";
        const currentUserImage = localStorage.getItem("userAvatar") || "default.png";

        if (!currentUserId) throw new Error("Usuario no logueado");

        // Payload completo para que el backend no falle si el usuario no existe
        const payload = { 
            FollowingId: targetId,
            FollowingUserName: targetName, // Datos del otro
            FollowingImage: targetImage,
            
            FollowerUserName: currentUserName, // Mis datos
            FollowerImage: currentUserImage
        };

        try {
            // ⚠️ USO CORRECTO DE LA CONSTANTE: GATEWAY_USERS
            const response = await axios.post(`${GATEWAY_USERS}/follow`, payload, getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error("❌ Error en followUser:", error);
            throw error;
        }
    }

    async function unfollowUser(userIdToUnfollow) {
        try {
            await axios.delete(`${GATEWAY_USERS}/unfollow/${userIdToUnfollow}`, getAuthHeaders());
            return true;
        } catch (error) {
            console.error("❌ Error en unfollowUser:", error);
            throw error;
        }
    }

    async function checkFollowStatus(userIdToCheck) {
        try {
            const response = await axios.get(`${GATEWAY_USERS}/following/${userIdToCheck}/status`, getAuthHeaders());
            return response.data?.IsFollowing || response.data?.isFollowing || false;
        } catch (error) {
            return false;
        }
    }

    // Exposición Global
    window.userApi = {
        updateUserProfile,
        getUserProfile,
        updateUserEmail,
        updateUserPassword,
        deleteUserAccount,
        getFollowerList,
        getFollowerCount,
        getFollowingCount,
        followUser,
        unfollowUser,
        checkFollowStatus
    };

})();