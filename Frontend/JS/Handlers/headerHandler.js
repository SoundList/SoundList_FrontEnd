// ================================
// ⚙️ JS/Handlers/headerHandler.js
// (ACTUALIZADO con lógica de búsqueda)
// ================================

// Esta función se llama desde el script inyector en tu HTML
function setupHeaderHandlers() {
    
    const userMenuButton = document.getElementById("userMenuButton");
    const userMenuDropdown = document.getElementById("userMenuDropdown");
    const logoutButton = document.getElementById("logoutButton");

    // --- 💡 NUEVA LÓGICA DE BÚSQUEDA ---
    const searchInput = document.getElementById("searchInput");
    const searchIcon = document.getElementById("searchIcon");

    if (searchIcon && searchInput) {
        searchIcon.addEventListener("click", () => {
            performSearch(searchInput.value);
        });

        // Opcional: que también busque al presionar "Enter"
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === 'Enter') {
                performSearch(searchInput.value);
            }
        });
    }
    // --- FIN DE LA NUEVA LÓGICA ---

    // 1. Manejar el clic en el ícono de usuario
    if (userMenuButton) {
        userMenuButton.addEventListener("click", (e) => {
            e.stopPropagation(); // Evita el cierre global
            userMenuDropdown.classList.toggle("visible"); // Usa 'visible' como review-menu
        });
    }

    // 2. Manejar el clic en "Cerrar Sesión"
    if (logoutButton) {
        logoutButton.addEventListener("click", (e) => {
            e.preventDefault(); 
            
            localStorage.removeItem("authToken");
            localStorage.removeItem("userId");
            localStorage.removeItem("username");
            localStorage.removeItem("userAvatar");
            
            alert("Has cerrado sesión.");
            window.location.href = "index.html"; 
        });
    }

    // 3. Cierre global para el menú de usuario
    document.addEventListener("click", (e) => {
        if (userMenuDropdown && !e.target.closest(".user-menu-wrapper")) {
            userMenuDropdown.classList.remove("visible");
        }
    });
}

/**
 * 💡 NUEVA FUNCIÓN: Llama a la API de búsqueda
 */
function performSearch(query) {
    if (!query || query.trim() === "") {
        console.log("El campo de búsqueda está vacío.");
        return;
    }

    console.log(`Buscando: "${query}"...`);
    
    // Aquí es donde llamarías a tu API de búsqueda
    // (Asegúrate de tener un 'searchApi.js' o añadirlo a 'navApi.js')
    
    // try {
    //     const results = await window.searchApi.search(query);
    //     console.log(results);
    //     // Aquí iría la lógica para mostrar los resultados
    // } catch (error) {
    //     console.error("Error en la búsqueda:", error);
    // }
}

// Se adjunta a DOMContentLoaded para que esté listo 
// para ser llamado por el script inyector en profile.html
document.addEventListener("DOMContentLoaded", () => {
    // La función existe, pero se llamará desde el script
    // inyector en profile.html
});