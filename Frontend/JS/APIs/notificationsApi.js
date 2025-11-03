// ================================
// 🌐 JS/APIs/notificationsApi.js (ACTUALIZADO)
// ================================
(function() {

    const API_BASE = "http://localhost:3000/api/notifications"; 

    async function getNotifications() {
        try {
            const response = await fetch(API_BASE); 
            if (!response.ok) throw new Error("Error al obtener notificaciones");

            const data = await response.json();
            console.log("🔔 Notificaciones recibidas:", data);
            return data;
        } catch (error) {
            console.error("❌ Error en getNotifications:", error);
            return []; 
        }
    }

    /**
     * 🔹 [NUEVA] Avisa al backend que el usuario vio las notificaciones
     */
    async function markAllAsRead() {
        try {
            // Asumo un endpoint PUT o POST para marcar como leídas
            const response = await fetch(`${API_BASE}/mark-as-read`, {
                method: "POST",
                // (No olvides incluir headers de autenticación si son necesarios)
                // headers: getAuthHeaders() 
            });
            if (!response.ok) throw new Error("Error al marcar notificaciones como leídas");
            
            console.log("🟢 Notificaciones marcadas como leídas");
            return true;
            
        } catch (error) {
            console.error("❌ Error en markAllAsRead:", error);
            throw error;
        }
    }

    // 💡 Exponemos ambas APIs
    window.notificationsApi = {
        getNotifications,
        markAllAsRead  // 👈 Función añadida
    };

})();