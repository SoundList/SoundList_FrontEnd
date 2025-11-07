
(function() {
    
    const API_BASE = "http://localhost:32768/api/user"; 
    const FOLLOW_API_BASE = "http://localhost:32768/api/Follows"; 

    function getAuthHeaders() {
        const token = localStorage.getItem("authToken");
        return {
            "Content-Type": "application/json",
            ...(token && { "Authorization": `Bearer ${token}` })
        };
    }

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

    async function getUserProfile() {
        try {
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

    async function getFollowerCount(userId) {
        try {
            const response = await fetch(`${FOLLOW_API_BASE}/${userId}/followers/count`, {
                method: "GET", headers: getAuthHeaders()
            });
            if (!response.ok) throw new Error("Error al obtener conteo de seguidores");
            return await response.json();
        } catch (error) {
            console.error("❌ Error en getFollowerCount:", error);
            return 0;
        }
    }

    async function getFollowingCount(userId) {
        try {
            const response = await fetch(`${FOLLOW_API_BASE}/${userId}/followings/count`, {
                method: "GET", headers: getAuthHeaders()
            });
            if (!response.ok) throw new Error("Error al obtener conteo de seguidos");
            return await response.json(); 
        } catch (error) {
            console.error("❌ Error en getFollowingCount:", error);
            return 0;
        }
    }

    window.userApi = {
        updateUserProfile,
        getUserProfile,
        getFollowerList,
        getFollowerCount,
        getFollowingCount
    };

})();