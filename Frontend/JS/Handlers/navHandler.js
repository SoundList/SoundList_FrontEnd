// ================================
// ⚙️ JS/Handlers/navHandler.js
// ================================

// 💡 Ya no hay 'import'. Usamos 'window.navApi'

function setupNavButtons() {
    const inicioBtn = document.getElementById("btnInicio");
    const rankingBtn = document.getElementById("btnRankings");
    const explorarBtn = document.getElementById("btnExplorar");

    if (!inicioBtn || !rankingBtn || !explorarBtn) {
        // console.warn("⚠️ No se encontraron los botones de navegación");
        // (Es normal si no estás en una página que cargó el header)
        return;
    }

    inicioBtn.addEventListener("click", () => handleNavClick("inicio"));
    rankingBtn.addEventListener("click", () => handleNavClick("rankings"));
    explorarBtn.addEventListener("click", () => handleNavClick("explorar"));
}

async function handleNavClick(section) {
    console.log(`🟣 Botón "${section}" clickeado`);

    try {
        let data;

        // 💡 Llama a la API global
        switch (section) {
            case "inicio":
                data = await window.navApi.getInicioData();
                break;
            case "rankings":
                data = await window.navApi.getRankingsData();
                break;
            case "explorar":
                data = await window.navApi.getExplorarData();
                break;
        }
        console.log(`✅ Datos recibidos de ${section}:`, data);

        // Aquí iría tu lógica para MOSTRAR los datos

    } catch (error) {
        console.error(`❌ Error al conectar con la API de "${section}":`, error);
        alert("Hubo un error al cargar la sección.");
    }
}

// 💡 Se ejecuta cuando el HTML está listo
document.addEventListener("DOMContentLoaded", setupNavButtons);