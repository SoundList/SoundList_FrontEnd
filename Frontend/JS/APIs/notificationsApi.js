export async function getNotifications() {
    try {
        const response = await fetch("http://localhost:3000/api/notifications"); 
        if (!response.ok) throw new Error("Error al obtener notificaciones");

        const data = await response.json();
        console.log("🔔 Notificaciones recibidas:", data);
        return data;
    } catch (error) {
        console.error("❌ Error en la API de notificaciones:", error);
    }
}
