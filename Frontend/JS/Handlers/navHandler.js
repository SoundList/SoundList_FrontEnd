import { getInicioData, getRankingsData, getExplorarData } from "../../JS/APIs/navApi.js";

export function setupNavButtons() {
    const inicioBtn = document.getElementById("btnInicio");
    const rankingBtn = document.getElementById("btnRankings");
    const explorarBtn = document.getElementById("btnExplorar");

    if (!inicioBtn || !rankingBtn || !explorarBtn) {
        console.warn("⚠️ No se encontraron los botones de navegación");
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

        switch (section) {
            case "inicio":
                console.log("🔹 Cargando datos de INICIO...");
                data = await getInicioData();
                break;
            case "rankings":
                console.log("🔹 Cargando datos de RANKINGS...");
                data = await getRankingsData();
                break;
            case "explorar":
                console.log("🔹 Cargando datos de EXPLORAR...");
                data = await getExplorarData();
                break;
        }

        console.log(`✅ Datos recibidos de ${section}:`, data);

    } catch (error) {
        console.error(`❌ Error al conectar con la API de "${section}":`, error);
        alert("Hubo un error al cargar la sección. Intenta de nuevo más tarde.");
    }

    const btn = document.getElementById(`btn${capitalize(section)}`);
    if (btn) {
        btn.classList.add("clicked");
        setTimeout(() => btn.classList.remove("clicked"), 100);
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

document.addEventListener("DOMContentLoaded", setupNavButtons);
