(function() {

    // URL Centralizada (Gateway)
    const API_BASE_URL = "http://localhost:5000";
    const GATEWAY_USERS = `${API_BASE_URL}/api/gateway/users`; 

    // ==========================================
    // 🛡️ CONFIGURACIÓN AXIOS & INTERCEPTORES
    // ==========================================

    if (typeof axios !== 'undefined') {
        // Interceptor para manejar 404s "esperados" en contadores (ej: usuario nuevo sin seguidores)
        axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response && error.response.status === 404) {
                    const url = error.config.url || '';
                    // Si falla un contador, devolvemos 0 en lugar de explotar
                    if (url.includes('/follow/count') || 
                        url.includes('/followers') ||
                        url.includes('/follow/status')) {
                        return Promise.resolve({
                            data: 0,
                            status: 200 // Simulamos éxito con valor 0
                        });
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    function getAuthHeaders() {
        const token = localStorage.getItem("authToken");
        return { 
            headers: { 
                'Authorization': token ? `Bearer ${token}` : '',
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
            // Nota: Aunque pasamos userId en la URL por REST, el backend debería validar 
            // que coincida con el token.
            const response = await axios.patch(`${GATEWAY_USERS}/${userId}`, profileData, getAuthHeaders());
            console.log("✅ Perfil actualizado:", response.data);
            return response.data;
        } catch (error) {
            console.error("❌ Error en updateUserProfile:", error);
            throw error;
        }
    }

    // ==========================================
    // 🔐 2. SEGURIDAD DE CUENTA (Auth Sensitive)
    // ==========================================

    async function updateUserEmail(newEmail, confirmEmail) {
        try {
            // CAMBIO: No enviamos userId. El backend sabe quiénes somos por el Token.
            const payload = {
                NewEmail: newEmail,
                EmailConfirm: confirmEmail
            };

            const response = await axios.put(`${GATEWAY_USERS}/email`, payload, getAuthHeaders());
            console.log("📧 Email actualizado exitosamente");
            return response.data;
        } catch (error) {
            console.error("❌ Error en updateUserEmail:", error.response?.data || error.message);
            throw error;
        }
    }

    async function updateUserPassword(oldPassword, newPassword) {
        try {
            // CAMBIO: No enviamos userId. 
            const payload = {
                oldPassword: oldPassword,
                newHashedPassword: newPassword // Nota: Idealmente el hash se hace en backend, aquí enviamos texto plano sobre HTTPS
            };

            const response = await axios.put(`${GATEWAY_USERS}/password`, payload, getAuthHeaders());
            console.log("🔐 Contraseña actualizada");
            return response.data;
        } catch (error) {
            console.error("❌ Error en updateUserPassword:", error.response?.data || error.message);
            throw error;
        }
    }

    async function deleteUserAccount() {
        try {
            // CAMBIO: Endpoint "delete-self" sin parámetros.
            // DELETE /api/gateway/users/delete-self
            const response = await axios.delete(`${GATEWAY_USERS}/delete-self`, getAuthHeaders());
            console.log("🗑️ Cuenta eliminada");
            return response.data;
        } catch (error) {
            console.error("❌ Error en deleteUserAccount:", error);
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
            // Unificado a Axios
            const response = await axios.get(`${GATEWAY_USERS}/${userId}/follow/count`, getAuthHeaders());
            const data = response.data;
            
            // Normalización de respuesta (Mayúscula/Minúscula)
            return {
                followerCount: data?.FollowerNum || data?.followerNum || 0,
                followingCount: data?.FollowingNum || data?.followingNum || 0
            };
        } catch (error) {
            // El interceptor ya manejó el 404 devolviendo 0, pero por si acaso:
            return { followerCount: 0, followingCount: 0 };
        }
    }

    // Wrappers para compatibilidad
    async function getFollowerCount(userId) {
        const counts = await getFollowCounts(userId);
        return counts.followerCount;
    }

    async function getFollowingCount(userId) {
        const counts = await getFollowCounts(userId);
        return counts.followingCount;
    }

    async function followUser(userIdToFollow) {
        try {
            // CAMBIO: Solo enviamos a quién seguir. "Quién soy yo" va en el Token.
            const payload = { FollowingId: userIdToFollow };
            
            const response = await axios.post(`${GATEWAY_USERS}/follow`, payload, getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error("❌ Error en followUser:", error);
            throw error;
        }
    }

    async function unfollowUser(userIdToUnfollow) {
        try {
            // CAMBIO: Usamos endpoint relativo al usuario logueado
            // DELETE /api/gateway/users/unfollow/{userIdToUnfollow}
            await axios.delete(`${GATEWAY_USERS}/unfollow/${userIdToUnfollow}`, getAuthHeaders());
            return true;
        } catch (error) {
            console.error("❌ Error en unfollowUser:", error);
            throw error;
        }
    }

    async function checkFollowStatus(userIdToCheck) {
        try {
            // GET /api/gateway/users/following/{targetId}
            // Pregunta al backend: "¿Yo (token) sigo a este usuario?"
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