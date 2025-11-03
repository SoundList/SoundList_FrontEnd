// ================================
// ⚙️ JS/Handlers/notificationsHandler.js
// (ACTUALIZADO con la lógica del globito)
// ================================

document.addEventListener("DOMContentLoaded", () => {
    // Referencias a los elementos del DOM
    const bell = document.getElementById("notificationBell");
    const dropdown = document.getElementById("notificationDropdown");
    const list = document.getElementById("notificationList");
    const emptyMsg = document.querySelector(".no-notifications");
    const badge = document.getElementById("notificationBadge"); // 👈 El globito

    // Si no existe la campana, no estamos en una página con header
    if (!bell) {
        return; 
    }

    // --- 1. Cargar notificaciones al inicio (para saber si mostrar el globo) ---
    // (Esta función la creamos más abajo)
    checkUnreadNotifications();

    // --- 2. Manejar el clic en la campana ---
    bell.addEventListener("click", async (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("show");

        // Si estamos ABRIENDO el dropdown...
        if (dropdown.classList.contains("show")) {
            
            // 1. Apagar la iluminación y el globo INMEDIATAMENTE
            // (El usuario ya "vio" que había algo)
            bell.classList.remove("notif-unread");
            badge.style.display = "none";
            
            // 2. Cargar la lista completa de notificaciones
            await loadNotificationsList();
            
            // 3. Avisar al backend que estas notificaciones se leyeron
            // (Asume que tienes esta función en notificationsApi.js)
            try {
                // await window.notificationsApi.markAllAsRead();
                console.log("Notificaciones marcadas como leídas (simulado)");
            } catch (error) {
                console.error("Error al marcar notificaciones como leídas:", error);
            }
        }
    });

    /**
     * Carga la LISTA COMPLETA de notificaciones para el dropdown
     */
    async function loadNotificationsList() {
        list.innerHTML = "<li>Cargando...</li>";
        emptyMsg.style.display = "none";

        try {
            const notifications = await window.notificationsApi.getNotifications();
            list.innerHTML = ""; // Limpia el "Cargando..."

            if (!notifications || notifications.length === 0) {
                emptyMsg.style.display = "block";
                emptyMsg.textContent = "No hay notificaciones.";
            } else {
                emptyMsg.style.display = "none";
                notifications.forEach(n => {
                    const li = document.createElement("li");
                    // (Opcional) Marcar las no leídas en la lista
                    if (n.isRead === false) {
                        li.classList.add("unread-item");
                    }
                    li.textContent = n.message || "Notificación sin contenido";
                    list.appendChild(li);
                });
            }
        } catch (error) {
            console.error("❌ Error al cargar lista de notificaciones:", error);
            list.innerHTML = "";
            emptyMsg.style.display = "block";
            emptyMsg.textContent = "Error al cargar.";
        }
    }

    /**
     * Revisa RÁPIDAMENTE si hay notificaciones no leídas
     * (Esta es la función que enciende el globo)
     */
    async function checkUnreadNotifications() {
        try {
            // Asume que tu API devuelve un array de notificaciones
            const notifications = await window.notificationsApi.getNotifications();
            
            // 💡 Asumimos que el backend envía un flag 'isRead: false'
            const unreadCount = notifications.filter(n => n.isRead === false).length;

            if (unreadCount > 0) {
                // 1. "Se ilumina" (añade la clase CSS)
                bell.classList.add("notif-unread");
                // 2. "Aparece globito azul" (muestra el span)
                badge.style.display = "block";
            } else {
                // Sin notificaciones nuevas
                bell.classList.remove("notif-unread");
                badge.style.display = "none";
            }
        } catch (error) {
            console.error("Error al chequear notificaciones:", error);
        }
    }

    // --- 3. Cierre global (no cambia) ---
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".notification-wrapper")) {
            dropdown.classList.remove("show");
        }
    });
});