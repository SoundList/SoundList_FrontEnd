// ================================
// 🌐 JS/APIs/userApi.js
// (Este archivo está PERFECTO y ya incluye la lógica de 'editProfileApi')
// ================================
(function() {
    
    // 💡 Asume tu URL base de usuario/perfil
    const API_BASE = "http://localhost:32768/api/user"; 
    // 💡 Asume tu URL de follow (si es separada)
    const FOLLOW_API_BASE = "http://localhost:32768/api/Follows"; 

    // Función auxiliar para los headers (si usas autenticación)
    function getAuthHeaders() {
        const token = localStorage.getItem("authToken");
        return {
            "Content-Type": "application/json",
            ...(token && { "Authorization": `Bearer ${token}` })
        };
    }

    /**
     * 1. API DE EDICIÓN (de tu editProfileApi.js)
     * Actualiza el perfil del usuario logueado
     */
    async function updateUserProfile(profileData) {
        try {
            const response = await fetch(`${API_BASE}/profile`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(profileData)
            });
            if (!response.ok) throw new Error("Error al actualizar el perfil");
            const data = await response.json();
            console.log("✅ Perfil actualizado:", data);
            return data;
        } catch (error) {
            console.error("❌ Error en updateUserProfile:", error);
            throw error; // Lanza el error para que el handler lo atrape
        }
    }

    /**
     * 2. APIs DE PERFIL (de tu profileHandler.js)
     * Obtiene los datos del header del perfil (avatar, nombre, quote)
     */
    async function getUserProfile() {
        try {
            // Asume un endpoint que trae solo los datos del usuario (no reviews)
            const response = await fetch(`${API_BASE}/profile`, { 
                method: "GET", headers: getAuthHeaders() 
            });
            if (!response.ok) throw new Error("Error al obtener perfil");
            return await response.json();
        } catch (error) {
            console.error("❌ Error en getUserProfile:", error);
            throw error;
        }
    }

  async function getFollowerList() {
        try {
            // USA TU ENDPOINT: /api/Follows/followers
            const response = await fetch(`${FOLLOW_API_BASE}/followers`, { 
                method: "GET", headers: getAuthHeaders() 
            });
            if (!response.ok) throw new Error("Error al obtener seguidores");
            return await response.json();
        } catch (error) {
            console.error("❌ Error en getFollowerList:", error);
            return [];
        }
    }
    
    /**
     * Obtiene el *conteo* de seguidores de un usuario
     */
    async function getFollowerCount(userId) {
        try {
            // USA TU ENDPOINT: /api/Follows/{userId}/followers/count
            const response = await fetch(`${FOLLOW_API_BASE}/${userId}/followers/count`, {
                method: "GET", headers: getAuthHeaders()
            });
            if (!response.ok) throw new Error("Error al obtener conteo de seguidores");
            return await response.json(); // Asume que devuelve un número o { count: N }
        } catch (error) {
            console.error("❌ Error en getFollowerCount:", error);
            return 0;
        }
    }

    /**
     * Obtiene el *conteo* de seguidos de un usuario
     */
    async function getFollowingCount(userId) {
        try {
            // USA TU ENDPOINT: /api/Follows/{userId}/followings/count
            const response = await fetch(`${FOLLOW_API_BASE}/${userId}/followings/count`, {
                method: "GET", headers: getAuthHeaders()
            });
            if (!response.ok) throw new Error("Error al obtener conteo de seguidos");
            return await response.json(); // Asume que devuelve un número o { count: N }
        } catch (error) {
            console.error("❌ Error en getFollowingCount:", error);
            return 0;
        }
    }

    // 💡 Exponemos todo al objeto global 'window.userApi'
    window.userApi = {
        updateUserProfile,
        getUserProfile,
        getFollowerList,
        getFollowerCount,
        getFollowingCount
    };

})();