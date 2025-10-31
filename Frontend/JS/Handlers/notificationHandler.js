    document.addEventListener("DOMContentLoaded", () => {
    const bell = document.getElementById("notificationBell");
    const dropdown = document.getElementById("notificationDropdown");
    const list = document.getElementById("notificationList");
    const emptyMsg = document.querySelector(".no-notifications");

    if (!bell || !dropdown) {
        console.warn("⚠️ No se encontraron los elementos de notificaciones en el DOM");
        return;
    }

    bell.addEventListener("click", async () => {
        dropdown.classList.toggle("active");

        if (dropdown.classList.contains("active")) {
            await loadNotifications();
        }
    });


    async function loadNotifications() {
        try {
            console.log("📩 Cargando notificaciones desde el backend...");
            const response = await fetch("https://tu-backend.com/api/notifications");

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            const notifications = await response.json();

            list.innerHTML = "";

            if (!notifications || notifications.length === 0) {
                emptyMsg.style.display = "block";
            } else {
                emptyMsg.style.display = "none";
                notifications.forEach(n => {
                    const li = document.createElement("li");
                    li.textContent = n.message || "Notificación sin contenido";
                    list.appendChild(li);
                });
            }

            console.log("✅ Notificaciones cargadas correctamente");
        } catch (error) {
            console.error("❌ Error al cargar las notificaciones:", error);
            emptyMsg.style.display = "block";
            emptyMsg.textContent = "Error al cargar notificaciones.";
        }
    }
});
